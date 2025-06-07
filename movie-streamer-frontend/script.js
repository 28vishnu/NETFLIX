// Filename: script.js
// This script handles all frontend interactions, dynamic content loading,
// and communication with the backend API, with performance optimizations.

console.log("script.js loaded successfully!");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired!");

    // Base URL for your backend API
    const API_BASE_URL = 'https://netflix-ydfu.onrender.com/api'; // *** Ensure this is your Render backend URL ***

    // --- DOM Element References ---
    const movieSectionsContainer = document.getElementById('movie-sections');
    const loadingIndicator = document.getElementById('loading-indicator');
    const userDetailsSpan = document.querySelector('#user-details span');
    const header = document.getElementById('main-header');
    const navLinks = document.querySelectorAll('.nav-link');
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const searchInputWrapper = document.getElementById('search-input-wrapper');
    const searchInput = document.getElementById('search-input');
    const heroSection = document.getElementById('hero-section');
    const heroSlidesContainer = document.getElementById('hero-slides-container');
    const heroPrevBtn = document.getElementById('hero-prev-btn');
    const heroNextBtn = document.getElementById('hero-next-btn');
    const heroDotsContainer = document.getElementById('hero-dots-container');
    const detailOverlayContainer = document.getElementById('detail-overlay');
    const videoPlayerOverlay = document.getElementById('video-player-overlay');
    const moviePlayer = document.getElementById('movie-player');
    const closePlayerBtn = document.getElementById('close-player-btn');
    const bufferingSpinner = document.getElementById('buffering-spinner');
    const mobileSearchOverlay = document.getElementById('mobile-search-overlay'); // New: mobile search overlay
    const mobileSearchInput = document.getElementById('mobile-search-input'); // New: mobile search input
    const mobileSearchResultsGrid = document.getElementById('mobile-search-results-grid'); // New: mobile search results grid
    const mobileSearchNoResults = document.getElementById('mobile-search-no-results'); // New: mobile search no results message

    // --- Global Variables ---
    let currentHeroSlide = 0;
    let heroInterval;
    let lastScrollY = 0;
    let userId = localStorage.getItem('netflixCloneUserId');
    let heroMoviesData = [];
    let searchTimeout; // For debouncing search input
    let userMyList = []; // Array to hold user's My List items for quick lookups

    // Generate a unique user ID if one doesn't exist (for My List persistence)
    if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('netflixCloneUserId', userId);
        console.log('Generated new user ID:', userId);
    } else {
        console.log('Existing user ID:', userId);
    }
    if (userDetailsSpan) {
        userDetailsSpan.textContent = `Guest`;
    }

    // --- Intersection Observer for Lazy Loading Images ---
    // Options for the Intersection Observer
    const lazyLoadOptions = {
        root: null, // viewport
        rootMargin: '200px', // start loading images 200px before they enter the viewport
        threshold: 0.1 // 10% of the image needs to be visible
    };

    // Callback function for the Intersection Observer
    const lazyLoadCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src; // Get the actual image source from data-src
                if (src) {
                    img.src = src; // Set the src to load the image
                    img.onload = () => {
                        console.log(`Image loaded: ${src}`);
                    };
                    img.onerror = () => {
                        console.error(`Error loading lazy image: ${src}`);
                        img.src = 'https://placehold.co/300x450/000000/FFFFFF?text=Image+Error'; // Fallback
                    };
                }
                observer.unobserve(img); // Stop observing once the image is loaded
            }
        });
    };

    // Create a new Intersection Observer instance
    const lazyLoadObserver = new IntersectionObserver(lazyLoadCallback, lazyLoadOptions);

    // --- Utility Functions ---

    /**
     * Displays a loading indicator.
     */
    const showLoading = () => {
        if (loadingIndicator) {
            loadingIndicator.classList.remove('hidden');
            loadingIndicator.style.opacity = '1';
        }
    };

    /**
     * Hides the loading indicator.
     */
    const hideLoading = () => {
        if (loadingIndicator) {
            loadingIndicator.style.opacity = '0';
            setTimeout(() => {
                loadingIndicator.classList.add('hidden');
            }, 300); // Matches CSS transition
        }
    };

    /**
     * Displays a temporary message to the user.
     * @param {string} message - The message to display.
     * @param {string} type - 'success', 'error', or 'info'.
     * @param {number} duration - How long to display the message in milliseconds.
     */
    const showMessageBox = (message, type = 'info', duration = 3000) => {
        let messageBox = document.getElementById('message-box');
        if (!messageBox) {
            messageBox = document.createElement('div');
            messageBox.id = 'message-box';
            document.body.appendChild(messageBox);
        }

        messageBox.textContent = message;
        messageBox.className = `fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg text-white font-semibold text-center z-[9999] opacity-0 transition-opacity duration-300`;

        if (type === 'success') {
            messageBox.classList.add('bg-green-600');
        } else if (type === 'error') {
            messageBox.classList.add('bg-red-600');
        } else {
            messageBox.classList.add('bg-blue-600');
        }

        messageBox.style.opacity = '1';

        setTimeout(() => {
            messageBox.style.opacity = '0';
            messageBox.addEventListener('transitionend', () => {
                if (messageBox.parentNode) {
                    messageBox.parentNode.removeChild(messageBox);
                }
            }, { once: true });
        }, duration);
    };

    /**
     * Fetches data from a given URL.
     * @param {string} url - The URL to fetch from.
     * @returns {Promise<Object>} - A promise that resolves to the JSON data.
     */
    async function fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                console.error(`HTTP error! Status: ${response.status}, URL: ${url}, Message: ${errorData.error || errorData.message || response.statusText}`);
                throw new Error(`Failed to fetch data from ${url}: ${errorData.error || errorData.message || response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    /**
     * Validates if a poster URL is likely usable.
     * @param {string} url - The poster URL string.
     * @returns {boolean} True if the URL seems valid, false otherwise.
     */
    const isValidPosterUrl = (url) => {
        if (!url || typeof url !== 'string') {
            return false;
        }
        const trimmedUrl = url.trim();
        return trimmedUrl !== '' &&
               trimmedUrl.toLowerCase() !== 'n/a' &&
               trimmedUrl.toLowerCase() !== 'null' &&
               trimmedUrl.toLowerCase() !== 'undefined' &&
               trimmedUrl.length > 10;
    };

    /**
     * Checks if an item is in the user's My List.
     * @param {string} imdbId - The IMDb ID of the item.
     * @returns {boolean} True if the item is in My List, false otherwise.
     */
    const isItemInMyList = (imdbId) => {
        return userMyList.some(item => item.imdbID === imdbId);
    };

    /**
     * Fetches and updates the user's My List.
     */
    const fetchMyListStatus = async () => {
        try {
            const response = await fetchData(`${API_BASE_URL}/mylist/${userId}`);
            userMyList = response.items || [];
            console.log('My List status updated:', userMyList);
        } catch (error) {
            console.error('Error fetching My List status:', error);
            userMyList = []; // Reset to empty on error
        }
    };


    /**
     * Creates a movie/series card element.
     * Includes play and info buttons on hover.
     * @param {object} item - The movie/series data object.
     * @returns {HTMLElement} The created movie card div.
     */
    const createMovieCard = (item) => {
        const card = document.createElement('div');
        card.className = 'movie-card-container relative flex-shrink-0 w-32 md:w-40 lg:w-48 rounded-md overflow-hidden cursor-pointer group'; // Added 'group' class

        const posterUrl = isValidPosterUrl(item.poster) ? item.poster : `https://placehold.co/300x450/000000/FFFFFF?text=${encodeURIComponent(item.title || 'No Title')}`;

        // Determine initial My List button state
        const isInList = isItemInMyList(item.imdbID);
        const myListIcon = isInList ? 'fas fa-check' : 'fas fa-plus';
        const myListBtnClass = isInList ? 'mylist-toggle-btn added' : 'mylist-toggle-btn';
        const myListBtnTitle = isInList ? `Remove ${item.title} from My List` : `Add ${item.title} to My List`;


        card.innerHTML = `
            <img data-src="${posterUrl}" alt="${item.title || 'No Title'} Poster" class="w-full h-48 md:h-60 lg:h-72 object-cover rounded-md lazy-load-img"
                 onerror="this.onerror=null;this.src='https://placehold.co/300x450/000000/FFFFFF?text=Image+Missing'; console.error('Image failed to load for: ${item.title || 'No Title'} (${item.imdbID || 'N/A'}) - Original URL: ${item.poster || 'N/A'}');">
            <div class="movie-card-info">
                <h3 class="text-sm md:text-base font-semibold truncate">${item.title || 'No Title'}</h3>
                <p class="text-xs text-gray-400">${item.year || 'N/A'}</p>
            </div>
            <div class="movie-card-buttons absolute hidden group-hover:flex">
                <button class="play-small-btn" data-imdb-id="${item.imdbID}" data-type="${item.type}" data-playable-url="${item.telegramPlayableUrl || ''}" title="Play ${item.title}">
                    <i class="fas fa-play"></i>
                </button>
                <button class="${myListBtnClass}" data-imdb-id="${item.imdbID}" data-title="${item.title}" data-poster="${item.poster}" data-type="${item.type}" data-year="${item.year}" title="${myListBtnTitle}">
                    <i class="${myListIcon}"></i>
                </button>
                <button class="info-small-btn" data-imdb-id="${item.imdbID}" data-type="${item.type}" title="More info on ${item.title}">
                    <i class="fas fa-info-circle"></i>
                </button>
            </div>
        `;

        // Observe the image for lazy loading
        const imgElement = card.querySelector('img');
        if (imgElement) {
            lazyLoadObserver.observe(imgElement);
        }

        // Add event listeners for the new buttons on the card
        card.querySelector('.play-small-btn')?.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click from opening detail overlay
            const urlToPlay = e.currentTarget.dataset.playableUrl;
            if (urlToPlay && urlToPlay !== 'null') { // Ensure url is not "null" string
                playMovie(urlToPlay);
            } else {
                showMessageBox(`No playable link available for ${item.title || 'this content'}.`, 'info');
            }
        });

        card.querySelector('.info-small-btn')?.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click from opening detail overlay
            showDetailsOverlay(item.imdbID, item.type);
        });

        card.querySelector('.mylist-toggle-btn')?.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent card click from opening detail overlay
            const btn = e.currentTarget;
            const itemImdbID = btn.dataset.imdbId;
            const itemTitle = btn.dataset.title;
            const itemPoster = btn.dataset.poster;
            const itemType = btn.dataset.type;
            const itemYear = btn.dataset.year;

            if (isItemInMyList(itemImdbID)) {
                await removeFromMyList(itemImdbID, true); // Pass true to indicate card update
            } else {
                await addToMyList({ imdbID: itemImdbID, title: itemTitle, poster: itemPoster, type: itemType, year: itemYear }, true); // Pass true to indicate card update
            }
            // The card's state will be updated by refreshMyListAndUI
        });

        // The main card click listener (for background image area, or if buttons not clicked)
        card.addEventListener('click', () => {
            showDetailsOverlay(item.imdbID, item.type);
        });

        return card;
    };

    /**
     * Fetches and displays a section of movies or series.
     * @param {string} title - The title of the section (e.g., "Trending Now").
     * @param {string} endpoint - The API endpoint to fetch data from.
     * @param {boolean} isGridCategory - If true, displays as a full grid instead of a scrollable carousel.
     * @returns {Promise<void>} A promise that resolves when the section is displayed.
     */
    const fetchAndDisplaySection = async (title, endpoint, isGridCategory = false) => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'movie-section mb-8';
        const movieRowClasses = isGridCategory ?
            'movie-grid-category grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4' :
            'movie-row flex space-x-3 overflow-x-auto scrollbar-hide pb-4 scroll-snap-x';

        sectionDiv.innerHTML = `<h2 class="text-xl md:text-2xl font-bold mb-4 text-white">${title}</h2><div class="${movieRowClasses}"></div>`;
        const movieRow = sectionDiv.querySelector(`.${isGridCategory ? 'movie-grid-category' : 'movie-row'}`);

        movieSectionsContainer.appendChild(sectionDiv); // Append the section container immediately

        try {
            const data = await fetchData(endpoint);

            let itemsToDisplay = [];
            if (endpoint.includes('/api/search')) {
                itemsToDisplay = [...(data.movies || []), ...(data.series || [])];
            } else if (endpoint.includes('/api/mylist')) {
                itemsToDisplay = data.items || [];
            } else {
                itemsToDisplay = data;
            }

            // Filter for items with valid posters. Backend now tries to return valid posters.
            const filteredItems = itemsToDisplay.filter(item => isValidPosterUrl(item.poster));

            if (filteredItems && filteredItems.length > 0) {
                filteredItems.forEach(item => {
                    if (item.imdbID && item.type) { // Ensure basic identifiers exist
                        const card = createMovieCard(item);
                        if (!isGridCategory) {
                            card.classList.add('scroll-snap-start');
                        }
                        movieRow.appendChild(card);
                    }
                });
            } else {
                movieRow.innerHTML = `<p class="text-gray-400">No content found for "${title}" with valid images.</p>`;
            }
        } catch (error) {
            console.error(`Failed to load content for "${title}" from our servers:`, error);
            movieRow.innerHTML = `<p class="text-red-500">Failed to load content for "${title}" from our servers. Please try again later.</p>`;
        }
    };

    /**
     * Fetches details for a specific movie/series and displays them in an overlay.
     * @param {string} imdbId - The IMDb ID of the movie/series.
     * @param {string} type - The type of content ('movie' or 'series').
     */
    const showDetailsOverlay = async (imdbId, type) => {
        showLoading();
        try {
            // First try to get it from local list if available and then fetch details
            const localItem = userMyList.find(item => item.imdbID === imdbId && item.type === type);
            let data = null;

            if (localItem && localItem.plot && localItem.director) { // Basic check if local item has enough detail
                data = localItem;
                console.log('Using local item data for detail overlay:', localItem);
            } else {
                const endpoint = `${API_BASE_URL}/${type}s/${imdbId}`;
                data = await fetchData(endpoint);
                console.log('Fetched fresh data for detail overlay:', data);
            }


            if (data) {
                const overlayPosterUrl = isValidPosterUrl(data.poster) ? data.poster : `https://placehold.co/400x600/000000/FFFFFF?text=No+Image`;

                // Update My List button state dynamically
                const isInList = isItemInMyList(data.imdbID);
                const myListIconClass = isInList ? 'fas fa-check' : 'fas fa-plus';
                const myListText = isInList ? 'In My List' : 'My List';

                const playableUrl = data.telegramPlayableUrl;
                let playButtonHtml = '';
                if (playableUrl && playableUrl !== 'null') { // Ensure url is not "null" string
                    playButtonHtml = `
                        <button id="detail-play-btn" class="bg-white text-black px-6 py-3 rounded-md font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center w-full play-btn" data-playable-url="${playableUrl}">
                            <i class="fas fa-play mr-2"></i> Play
                        </button>
                    `;
                } else {
                    playButtonHtml = `
                        <button id="detail-play-btn" class="bg-gray-700 text-gray-400 px-6 py-3 rounded-md font-semibold cursor-not-allowed flex items-center justify-center w-full" disabled>
                            <i class="fas fa-ban mr-2"></i> No Playable Link
                        </button>
                    `;
                }

                detailOverlayContainer.innerHTML = `
                    <div class="detail-overlay-content relative bg-[#1a1a1a] rounded-lg shadow-xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden">
                        <button id="close-detail-overlay-btn" class="absolute top-3 right-3 text-white text-3xl font-bold z-10 close-overlay-btn">
                            &times;
                        </button>
                        <div class="md:w-1/3 flex-shrink-0">
                            <img src="${overlayPosterUrl}" alt="${data.title || 'No Title'} Poster" class="w-full h-auto object-cover md:h-full rounded-t-lg md:rounded-l-lg md:rounded-t-none" onerror="this.onerror=null;this.src='https://placehold.co/400x600/000000/FFFFFF?text=No+Image';">
                        </div>
                        <div class="md:w-2/3 p-6 text-white custom-scrollbar overflow-y-auto max-h-[80vh]">
                            <h2 class="text-3xl md:text-4xl font-bold mb-2">${data.title || 'N/A'}</h2>
                            <p class="text-gray-400 text-sm mb-4">
                                ${data.year || 'N/A'} | ${data.rated || 'N/A'} | ${data.runtime || 'N/A'} | ${Array.isArray(data.genre) ? data.genre.join(', ') : data.genre || 'N/A'}
                            </p>
                            <p class="mb-4 text-base">${data.plot || 'No plot available.'}</p>
                            <div class="flex flex-col space-y-4 mb-6">
                                ${playButtonHtml}
                                <button id="detail-my-list-btn" class="bg-gray-700 text-white px-6 py-3 rounded-md font-semibold hover:bg-gray-600 transition-colors flex items-center justify-center w-full add-to-list-btn"
                                    data-imdb-id="${data.imdbID}" data-title="${data.title}" data-poster="${data.poster}" data-type="${data.type}" data-year="${data.year}">
                                    <i class="${myListIconClass} mr-2"></i> <span>${myListText}</span>
                                </button>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-6">
                                <p><strong>Director:</strong> ${data.director || 'N/A'}</p>
                                <p><strong>Writer:</strong> ${data.writer || 'N/A'}</p>
                                <p><strong>Actors:</strong> ${data.actors || 'N/A'}</p>
                                <p><strong>Language:</strong> ${data.language || 'N/A'}</p>
                                <p><strong>Country:</strong> ${data.country || 'N/A'}</p>
                                <p><strong>Awards:</b> ${data.awards || 'N/A'}</p>
                                <p><strong>IMDb Rating:</b> ${data.imdbRating || 'N/A'}</p>
                                <p><strong>IMDb ID:</strong> ${data.imdbID || 'N/A'}</p>
                                ${type === 'series' && data.totalSeasons ? `<p><strong>Total Seasons:</strong> ${data.totalSeasons}</p>` : ''}
                            </div>
                        </div>
                    </div>
                `;
                detailOverlayContainer.classList.add('active');
                detailOverlayContainer.style.display = 'flex';
                document.body.classList.add('overflow-hidden');

                detailOverlayContainer.querySelector('#close-detail-overlay-btn').addEventListener('click', closeDetailsOverlay);
                detailOverlayContainer.addEventListener('click', (e) => {
                    if (e.target === detailOverlayContainer) {
                        closeDetailsOverlay();
                    }
                });

                const detailPlayBtn = detailOverlayContainer.querySelector('#detail-play-btn');
                if (detailPlayBtn && !detailPlayBtn.disabled) {
                    detailPlayBtn.addEventListener('click', () => {
                        const urlToPlay = detailPlayBtn.dataset.playableUrl;
                        if (urlToPlay && urlToPlay !== 'null') {
                            playMovie(urlToPlay);
                        } else {
                            showMessageBox('No playable link available for this content.', 'info');
                        }
                    });
                }

                const addToListBtn = detailOverlayContainer.querySelector('#detail-my-list-btn');
                if (addToListBtn) {
                    addToListBtn.addEventListener('click', async (e) => {
                        const itemToAdd = {
                            imdbID: e.currentTarget.dataset.imdbId,
                            title: e.currentTarget.dataset.title,
                            poster: e.currentTarget.dataset.poster,
                            type: e.currentTarget.dataset.type,
                            year: e.currentTarget.dataset.year
                        };
                        if (isItemInMyList(itemToAdd.imdbID)) {
                            await removeFromMyList(itemToAdd.imdbID);
                        } else {
                            await addToMyList(itemToAdd);
                        }
                        // Refresh the button state after action
                        const updatedIsInList = isItemInMyList(itemToAdd.imdbID);
                        addToListBtn.querySelector('i').className = updatedIsInList ? 'fas fa-check mr-2' : 'fas fa-plus mr-2';
                        addToListBtn.querySelector('span').textContent = updatedIsInList ? 'In My List' : 'My List';
                    });
                }

            } else {
                console.error('No data received for details overlay.');
                showMessageBox('Error fetching details: No data received.', 'error');
            }

        } catch (error) {
            console.error('Error fetching details:', error);
            showMessageBox('Error fetching details. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    };

    /**
     * Closes the detail overlay.
     */
    const closeDetailsOverlay = () => {
        detailOverlayContainer.classList.remove('active');
        setTimeout(() => {
            detailOverlayContainer.style.display = 'none';
            document.body.classList.remove('overflow-hidden');
            detailOverlayContainer.innerHTML = '';
        }, 300);
    };

    /**
     * Plays a movie by loading its URL into the video player iframe.
     * Shows a buffering spinner.
     * @param {string} url - The URL of the video to play.
     */
    const playMovie = (url) => {
        if (moviePlayer && videoPlayerOverlay && bufferingSpinner) {
            // Show buffering spinner immediately
            bufferingSpinner.classList.remove('hidden');

            moviePlayer.src = url;
            videoPlayerOverlay.classList.add('active');
            videoPlayerOverlay.style.display = 'flex';
            document.body.classList.add('overflow-hidden');

            // Set a timeout to hide the spinner, as iframe onload is not reliable for video buffering
            const spinnerTimeout = setTimeout(() => {
                if (!bufferingSpinner.classList.contains('hidden')) {
                    bufferingSpinner.classList.add('hidden');
                    console.log('Buffering spinner hidden by timeout.');
                }
            }, 3000); // Hide after 3 seconds if not already hidden

            // Optional: You could listen for messages from the iframe if it sends playback events,
            // but for external embeds, this is often not feasible.
            // window.addEventListener('message', (event) => {
            //     if (event.origin === 'https://www.youtube.com' && event.data.event === 'onReady') {
            //         bufferingSpinner.classList.add('hidden');
            //         clearTimeout(spinnerTimeout);
            //     }
            // });

        } else {
            showMessageBox('Video player not available.', 'error');
        }
    };

    /**
     * Closes the video player overlay.
     */
    const closeMoviePlayer = () => {
        if (moviePlayer && videoPlayerOverlay && bufferingSpinner) {
            moviePlayer.src = ''; // Stop video playback
            bufferingSpinner.classList.add('hidden'); // Hide spinner immediately
            videoPlayerOverlay.classList.remove('active');
            setTimeout(() => {
                videoPlayerOverlay.style.display = 'none';
                document.body.classList.remove('overflow-hidden');
            }, 300);
        }
    };

    if (closePlayerBtn) {
        closePlayerBtn.addEventListener('click', closeMoviePlayer);
    }
    if (videoPlayerOverlay) {
        videoPlayerOverlay.addEventListener('click', (e) => {
            if (e.target === videoPlayerOverlay) {
                closeMoviePlayer();
            }
        });
    }

    // --- Hero Section (Carousel) Functions ---
    /**
     * Fetches hero movies and populates the hero section.
     * @returns {Promise<void>} A promise that resolves when hero content is fetched and displayed.
     */
    const fetchHeroMovies = async () => {
        console.log("Fetching hero movies for carousel...");
        try {
            const data = await fetchData(`${API_BASE_URL}/movies/trending`);

            if (data && data.length > 0) {
                heroMoviesData = data.filter(item => isValidPosterUrl(item.poster) && isValidPosterUrl(item.backdrop)).slice(0, 5); // Ensure backdrop exists for hero

                if (heroMoviesData.length > 0) {
                    console.log(`Found ${heroMoviesData.length} valid trending movies for hero section.`);
                    heroSlidesContainer.innerHTML = '';
                    heroDotsContainer.innerHTML = '';

                    heroMoviesData.forEach((movie, index) => {
                        const slide = document.createElement('div');
                        slide.className = 'hero-slide';

                        const heroPosterUrl = isValidPosterUrl(movie.backdrop) ? movie.backdrop : (isValidPosterUrl(movie.poster) ? movie.poster : 'https://placehold.co/1920x1080/000000/FFFFFF?text=No+Hero+Image');

                        slide.innerHTML = `
                            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
                            <div class="hero-text-content">
                                <h1 class="text-4xl md:text-6xl font-bold mb-4">${movie.title || 'No Title'}</h1>
                                <p class="text-lg md:text-xl mb-6 line-clamp-3">${movie.plot || 'No description available.'}</p>
                                <div class="flex space-x-4">
                                    <button class="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-300 transition-colors flex items-center play-btn" data-imdb-id="${movie.imdbID}" data-type="${movie.type}" data-title="${movie.title}" data-playable-url="${movie.telegramPlayableUrl || ''}">
                                        <i class="fas fa-play mr-2"></i> Play
                                    </button>
                                    <button class="bg-gray-700 text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-600 transition-colors flex items-center info-btn" data-imdb-id="${movie.imdbID}" data-type="${movie.type}">
                                        <i class="fas fa-info-circle mr-2"></i> More Info
                                    </button>
                                </div>
                            </div>
                        `;
                        heroSlidesContainer.appendChild(slide);

                        const dot = document.createElement('div');
                        dot.className = `w-3 h-3 bg-gray-500 rounded-full cursor-pointer transition-colors ${index === 0 ? 'bg-white' : ''}`;
                        dot.dataset.slideIndex = index;
                        dot.addEventListener('click', () => goToSlide(index));
                        heroDotsContainer.appendChild(dot);
                    });

                    updateHeroCarousel(0); // Set to the first slide and update background

                    heroSlidesContainer.querySelectorAll('.play-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const urlToPlay = e.currentTarget.dataset.playableUrl;
                            if (urlToPlay && urlToPlay !== 'null') {
                                playMovie(urlToPlay);
                            } else {
                                showMessageBox(`No playable link available for ${e.currentTarget.dataset.title || 'this content'}.`, 'info');
                            }
                        });
                    });
                    heroSlidesContainer.querySelectorAll('.info-btn').forEach(btn => { // Added info button listener
                        btn.addEventListener('click', (e) => {
                            showDetailsOverlay(e.currentTarget.dataset.imdbId, e.currentTarget.dataset.type);
                        });
                    });


                    if (heroPrevBtn) heroPrevBtn.style.display = 'flex';
                    if (heroNextBtn) heroNextBtn.style.display = 'flex';
                    if (heroDotsContainer) heroDotsContainer.style.display = 'flex';

                    startHeroCarousel();
                } else {
                    console.log("No valid trending movies with images found for hero section. Hiding hero.");
                    if (heroSection) {
                        heroSection.innerHTML = '<p class="text-center text-red-500">No trending movies with valid images found for hero section.</p>';
                        heroSection.classList.add('hidden-hero');
                    }
                }
            } else {
                console.log("No trending movies found from backend. Hiding hero.");
                if (heroSection) {
                    heroSection.innerHTML = '<p class="text-center text-red-500">No trending movies found for hero section.</p>';
                    heroSection.classList.add('hidden-hero');
                }
            }
        } catch (error) {
            console.error('Error fetching hero movies:', error);
            if (heroSection) {
                heroSection.innerHTML = '<p class="text-center text-red-500">Error loading hero content. Please try again later.</p>';
                heroSection.classList.add('hidden-hero');
            }
        }
    };

    /**
     * Updates the hero carousel display to the specified slide.
     * @param {number} index - The index of the slide to show.
     */
    const updateHeroCarousel = (index) => {
        const totalSlides = heroSlidesContainer.children.length;
        if (totalSlides === 0) return;

        currentHeroSlide = (index + totalSlides) % totalSlides;
        const offset = -currentHeroSlide * 100;
        heroSlidesContainer.style.transform = `translateX(${offset}%)`;

        heroDotsContainer.querySelectorAll('div').forEach((dot, i) => {
            if (i === currentHeroSlide) {
                dot.classList.add('bg-white');
                dot.classList.remove('bg-gray-500');
            } else {
                dot.classList.remove('bg-white');
                dot.classList.add('bg-gray-500');
            }
        });

        if (heroMoviesData.length > 0 && heroSection) {
            const currentHeroMovie = heroMoviesData[currentHeroSlide];
            // Prefer backdrop for hero, fall back to poster
            const currentHeroImageUrl = isValidPosterUrl(currentHeroMovie.backdrop) ? currentHeroMovie.backdrop : (isValidPosterUrl(currentHeroMovie.poster) ? currentHeroMovie.poster : 'https://placehold.co/1920x1080/000000/FFFFFF?text=No+Hero+Image');
            heroSection.style.setProperty('--hero-bg-image', `url('${currentHeroImageUrl}')`);
        }
    };

    const nextSlide = () => {
        updateHeroCarousel(currentHeroSlide + 1);
    };

    const prevSlide = () => {
        updateHeroCarousel(currentHeroSlide - 1);
    };

    const goToSlide = (index) => {
        clearInterval(heroInterval);
        updateHeroCarousel(index);
        startHeroCarousel();
    };

    const startHeroCarousel = () => {
        clearInterval(heroInterval);
        heroInterval = setInterval(nextSlide, 5000);
    };


    // --- My List Functions ---
    /**
     * Adds an item to the user's My List.
     * @param {object} item - The item to add.
     * @param {boolean} [isFromCard=false] - True if called from a movie card, to avoid full page refresh.
     */
    const addToMyList = async (item, isFromCard = false) => {
        try {
            const response = await fetch(`${API_BASE_URL}/mylist/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, item }),
            });
            const result = await response.json();
            if (response.ok) {
                showMessageBox(result.message || 'Item added to My List!', 'success');
                await refreshMyListAndUI(isFromCard);
            } else {
                showMessageBox(result.message || 'Failed to add item to My List.', 'error');
            }
        } catch (error) {
            console.error('Error adding to My List:', error);
            showMessageBox('Error adding to My List. Please try again.', 'error');
        }
    };

    /**
     * Removes an item from the user's My List.
     * @param {string} imdbID - The IMDb ID of the item to remove.
     * @param {boolean} [isFromCard=false] - True if called from a movie card, to avoid full page refresh.
     */
    const removeFromMyList = async (imdbID, isFromCard = false) => {
        try {
            const response = await fetch(`${API_BASE_URL}/mylist/remove`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, imdbID }),
            });
            const result = await response.json();
            if (response.ok) {
                showMessageBox(result.message || 'Item removed from My List!', 'success');
                await refreshMyListAndUI(isFromCard);
            } else {
                showMessageBox(result.message || 'Failed to remove item from My List.', 'error');
            }
        } catch (error) {
            console.error('Error removing from My List:', error);
            showMessageBox('Error removing from My List. Please try again.', 'error');
        }
    };

    /**
     * Refreshes the user's My List data and updates the UI accordingly.
     * @param {boolean} [keepCurrentView=false] - If true, only updates card buttons without reloading the whole page.
     */
    const refreshMyListAndUI = async (keepCurrentView = false) => {
        await fetchMyListStatus(); // Re-fetch the latest list

        // Update all movie card buttons across the page
        document.querySelectorAll('.movie-card-container').forEach(card => {
            const imdbId = card.dataset.imdbId;
            const myListBtn = card.querySelector('.mylist-toggle-btn');
            if (myListBtn) {
                const isInList = isItemInMyList(imdbId);
                myListBtn.querySelector('i').className = isInList ? 'fas fa-check' : 'fas fa-plus';
                myListBtn.classList.toggle('added', isInList);
                myListBtn.title = isInList ? `Remove ${card.dataset.title} from My List` : `Add ${card.dataset.title} to My List`;
            }
        });

        // Update the detail overlay button if it's currently open for the relevant item
        if (detailOverlayContainer.classList.contains('active')) {
            const detailImdbId = detailOverlayContainer.querySelector('#detail-my-list-btn')?.dataset.imdbId;
            if (detailImdbId) {
                const detailMyListBtn = detailOverlayContainer.querySelector('#detail-my-list-btn');
                const updatedIsInList = isItemInMyList(detailImdbId);
                detailMyListBtn.querySelector('i').className = updatedIsInList ? 'fas fa-check mr-2' : 'fas fa-plus mr-2';
                detailMyListBtn.querySelector('span').textContent = updatedIsInList ? 'In My List' : 'My List';
            }
        }

        // If currently on My List page, re-load it to reflect changes
        if (!keepCurrentView && document.querySelector('.nav-link.active')?.dataset.content === 'mylist') {
            await loadContent('mylist');
        }
    };


    // --- Event Listeners ---

    // Header scroll effect
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            if (window.innerWidth >= 768) {
                if (window.scrollY > lastScrollY && window.scrollY > 200) {
                    header.classList.add('hide-header');
                } else {
                    header.classList.remove('hide-header');
                }
            }
            lastScrollY = window.scrollY;
        });
    }

    // Navigation links click handler
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const contentType = link.dataset.content;
            loadContent(contentType);
            // Close desktop search if open
            if (searchInputWrapper && !searchInputWrapper.classList.contains('hidden')) {
                searchInputWrapper.classList.add('hidden');
                searchInput.value = '';
            }
            // Close mobile search if open
            if (mobileSearchOverlay && mobileSearchOverlay.classList.contains('active')) {
                mobileSearchOverlay.classList.remove('active');
                mobileSearchOverlay.style.display = 'none';
                document.body.classList.remove('overflow-hidden');
                mobileSearchInput.value = '';
                mobileSearchResultsGrid.innerHTML = '';
            }
        });
    });

    // Search toggle and input functionality
    if (searchToggleBtn && searchInputWrapper && searchInput) {
        // Toggle desktop search input visibility
        searchToggleBtn.addEventListener('click', () => {
            searchInputWrapper.classList.toggle('hidden');
            if (!searchInputWrapper.classList.contains('hidden')) {
                searchInput.focus();
            } else {
                searchInput.value = '';
            }
        });

        // Toggle mobile search overlay
        document.getElementById('search-toggle-btn-mobile')?.addEventListener('click', () => {
            if (mobileSearchOverlay) {
                mobileSearchOverlay.classList.add('active');
                mobileSearchOverlay.style.display = 'flex';
                document.body.classList.add('overflow-hidden');
                mobileSearchInput?.focus();
            }
        });

        // Close mobile search overlay
        document.querySelector('#mobile-search-overlay .close-search-btn')?.addEventListener('click', () => {
            if (mobileSearchOverlay) {
                mobileSearchOverlay.classList.remove('active');
                setTimeout(() => {
                    mobileSearchOverlay.style.display = 'none';
                    document.body.classList.remove('overflow-hidden');
                    mobileSearchInput.value = '';
                    mobileSearchResultsGrid.innerHTML = '';
                }, 300);
            }
        });


        // Debounce search input for both desktop and mobile
        const handleSearchInput = (event) => {
            clearTimeout(searchTimeout);
            const query = event.target.value.trim();
            searchTimeout = setTimeout(() => {
                if (query.length > 2) {
                    handleSearch(query, event.target.id === 'mobile-search-input');
                } else if (query.length === 0) {
                    // If search box is empty, go back to home content or clear search results
                    if (document.getElementById('search-results-section')) {
                         document.getElementById('search-results-section').classList.add('hidden');
                    }
                    if (mobileSearchResultsGrid) {
                        mobileSearchResultsGrid.innerHTML = '';
                        mobileSearchNoResults.classList.add('hidden');
                    }
                    // Only reload home if on search page and query is empty, otherwise stay on current page
                    if (window.innerWidth >= 768 && document.getElementById('search-results-section') && !document.getElementById('search-results-section').classList.contains('hidden')) {
                        loadContent('home');
                    }
                }
            }, 300); // 300ms debounce time
        };

        searchInput.addEventListener('input', handleSearchInput);
        mobileSearchInput?.addEventListener('input', handleSearchInput);
    }

    /**
     * Handles the search logic.
     * @param {string} query - The search query.
     * @param {boolean} isMobileSearch - True if the search is from the mobile overlay.
     */
    const handleSearch = async (query, isMobileSearch) => {
        showLoading();
        movieSectionsContainer.innerHTML = ''; // Clear home content
        heroSection.classList.add('hidden-hero'); // Hide hero
        clearInterval(heroInterval); // Stop hero carousel

        const searchResultsSection = document.getElementById('search-results-section');
        const searchResultsGrid = document.getElementById('search-results-grid');
        const allContentView = document.getElementById('all-content-view');

        // Manage visibility based on where the search is performed
        if (!isMobileSearch) {
            if (searchResultsSection) searchResultsSection.classList.remove('hidden');
            if (searchResultsGrid) searchResultsGrid.innerHTML = ''; // Clear previous desktop results
        } else {
            // Mobile search overlay handles its own grid
            if (mobileSearchResultsGrid) mobileSearchResultsGrid.innerHTML = '';
            if (mobileSearchNoResults) mobileSearchNoResults.classList.add('hidden');
        }
        if (allContentView) allContentView.classList.add('hidden'); // Hide other full view

        try {
            const searchResults = await fetchData(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
            const allResults = [...(searchResults.movies || []), ...(searchResults.series || [])];
            const filteredResults = allResults.filter(item => isValidPosterUrl(item.poster));

            const targetGrid = isMobileSearch ? mobileSearchResultsGrid : searchResultsGrid;
            const targetNoResults = isMobileSearch ? mobileSearchNoResults : null; // Desktop uses its own grid messages

            if (filteredResults.length > 0) {
                filteredResults.forEach(item => {
                    if (item.imdbID && item.type) {
                        targetGrid.appendChild(createMovieCard(item));
                    }
                });
                if (targetNoResults) targetNoResults.classList.add('hidden');
            } else {
                targetGrid.innerHTML = ''; // Ensure grid is empty
                if (targetNoResults) {
                    targetNoResults.classList.remove('hidden');
                    targetNoResults.textContent = `No results found for "${query}".`;
                } else {
                    // For desktop, put message directly into grid if no results
                    if (searchResultsGrid) searchResultsGrid.innerHTML = `<p class="text-gray-400 p-4">No results found for "${query}" with valid images.</p>`;
                }
            }
            // Pagination for search results is not implemented yet, so hide buttons
            document.getElementById('search-pagination')?.classList.add('hidden');
        } catch (error) {
            const targetGrid = isMobileSearch ? mobileSearchResultsGrid : searchResultsGrid;
            const targetNoResults = isMobileSearch ? mobileSearchNoResults : null;

            if (targetGrid) targetGrid.innerHTML = `<p class="text-red-500 p-4">Error performing search for "${query}". Please try again later.</p>`;
            if (targetNoResults) targetNoResults.classList.remove('hidden');
            console.error('Search error:', error);
        } finally {
            hideLoading();
        }
    };


    // Hero carousel navigation
    if (heroNextBtn) heroNextBtn.addEventListener('click', nextSlide);
    if (heroPrevBtn) heroPrevBtn.addEventListener('click', prevSlide);

    // --- Initial Content Load ---

    /**
     * Loads content based on the specified type (home, movies, series, mylist).
     * Now includes progressive loading for home page.
     * @param {string} contentType - The type of content to load.
     */
    const loadContent = async (contentType) => {
        showLoading();
        movieSectionsContainer.innerHTML = ''; // Clear previous content

        const searchResultsSection = document.getElementById('search-results-section');
        const allContentView = document.getElementById('all-content-view');

        // Hide search results and all content view sections
        if (searchResultsSection) searchResultsSection.classList.add('hidden');
        if (allContentView) allContentView.classList.add('hidden');

        // Close search inputs/overlays if they are open
        if (searchInputWrapper && !searchInputWrapper.classList.contains('hidden')) {
            searchInputWrapper.classList.add('hidden');
            searchInput.value = '';
        }
        if (mobileSearchOverlay && mobileSearchOverlay.classList.contains('active')) {
            mobileSearchOverlay.classList.remove('active');
            mobileSearchOverlay.style.display = 'none';
            document.body.classList.remove('overflow-hidden'); // Re-enable scrolling
            mobileSearchInput.value = '';
            mobileSearchResultsGrid.innerHTML = '';
        }

        // Handle hero section visibility
        if (heroSection) {
            if (contentType !== 'home') {
                heroSection.classList.add('hidden-hero');
                clearInterval(heroInterval);
                console.log('Hero section is being hidden for non-home page.');
            } else {
                heroSection.classList.remove('hidden-hero');
                // Fetch hero movies first for immediate display
                await fetchHeroMovies(); // Await ensures hero is loaded before other sections
                console.log('Hero section is being shown for home page.');
            }
        }

        // Always fetch latest My List status before rendering content
        await fetchMyListStatus();

        try {
            if (contentType === 'home') {
                // Load other sections progressively
                const homeSectionEndpoints = [
                    { title: 'Most Popular Movies', endpoint: `${API_BASE_URL}/movies/popular` },
                    { title: 'Best Series', endpoint: `${API_BASE_URL}/series/best` },
                    { title: 'Most Popular Series', endpoint: `${API_BASE_URL}/series/popular` },
                    { title: 'Action Movies', endpoint: `${API_BASE_URL}/movies/genre/Action` }, // Capitalized genres for consistency
                    { title: 'Comedy Films', endpoint: `${API_BASE_URL}/movies/genre/Comedy` },
                    { title: 'Drama Series', endpoint: `${API_BASE_URL}/series/genre/Drama` },
                    { title: 'Animation Series', endpoint: `${API_BASE_URL}/series/genre/Animation` },
                    { title: 'Horror Films', endpoint: `${API_BASE_URL}/movies/genre/Horror` },
                    { title: 'Fantasy Movies', endpoint: `${API_BASE_URL}/movies/genre/Fantasy` },
                    { title: 'Crime Series', endpoint: `${API_BASE_URL}/series/genre/Crime` }
                ];

                for (const section of homeSectionEndpoints) {
                    await fetchAndDisplaySection(section.title, section.endpoint);
                }

            } else if (contentType === 'movies') {
                await fetchAndDisplaySection('All Movies', `${API_BASE_URL}/movies`, true);
            } else if (contentType === 'series') {
                await fetchAndDisplaySection('All Series', `${API_BASE_URL}/series`, true);
            } else if (contentType === 'mylist') {
                // My list data is already fetched by fetchMyListStatus()
                const mylistSection = document.createElement('div');
                mylistSection.className = 'movie-section mb-8';
                mylistSection.innerHTML = `<h2 class="text-xl md:text-2xl font-bold mb-4 text-white">My List</h2><div class="movie-grid-category grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4"></div>`;
                const mylistGrid = mylistSection.querySelector('.movie-grid-category');
                movieSectionsContainer.appendChild(mylistSection); // Append immediately

                if (userMyList && userMyList.length > 0) {
                    const filteredMyListItems = userMyList.filter(item => isValidPosterUrl(item.poster));

                    if (filteredMyListItems.length > 0) {
                        filteredMyListItems.forEach(item => {
                            const card = createMovieCard(item);
                            // Override card's hover buttons to only show remove on My List page
                            const cardButtons = card.querySelector('.movie-card-buttons');
                            if (cardButtons) {
                                cardButtons.innerHTML = `
                                    <button class="bg-red-600 text-white p-2 rounded-full text-lg flex items-center justify-center hover:bg-red-700 transition-colors"
                                        title="Remove ${item.title} from My List" data-imdb-id="${item.imdbID}">
                                        <i class="fas fa-times"></i>
                                    </button>
                                    <button class="bg-gray-700 text-white p-2 rounded-full text-lg flex items-center justify-center hover:bg-gray-600 transition-colors"
                                        title="More info on ${item.title}" data-imdb-id="${item.imdbID}" data-type="${item.type}">
                                        <i class="fas fa-info-circle"></i>
                                    </button>
                                `;
                                // Re-attach event listeners for these specific buttons
                                card.querySelector('.bg-red-600')?.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    removeFromMyList(e.currentTarget.dataset.imdbId); // No keepCurrentView true, will reload page
                                });
                                card.querySelector('.bg-gray-700')?.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    showDetailsOverlay(e.currentTarget.dataset.imdbId, e.currentTarget.dataset.type);
                                });
                            }
                            mylistGrid.appendChild(card);
                        });
                    } else {
                        mylistGrid.innerHTML = `<p class="text-lg text-gray-400 p-4">Your list is empty or contains no items with valid images.</p>`;
                    }
                } else {
                    mylistGrid.innerHTML = `<p class="text-lg text-gray-400 p-4">Your list is empty. Add movies or series to your list!</p>`;
                }
            }
        } catch (error) {
            console.error(`Error loading ${contentType} content:`, error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'movie-section p-4 md:p-8 pt-20 text-center text-red-500';
            errorDiv.innerHTML = `<p>Error loading ${contentType} content. Please try again later.</p>`;
            movieSectionsContainer.appendChild(errorDiv);
        } finally {
            hideLoading();
        }
    };

    // Load home content initially
    loadContent('home');
});
