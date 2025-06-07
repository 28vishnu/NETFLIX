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
    const bufferingSpinner = document.getElementById('buffering-spinner'); // Get the buffering spinner


    // --- Global Variables ---
    let currentHeroSlide = 0;
    let heroInterval;
    let lastScrollY = 0;
    let userId = localStorage.getItem('netflixCloneUserId');
    let heroMoviesData = [];
    let searchTimeout; // For debouncing search input

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
     * Creates a movie/series card element.
     * Uses data-src for lazy loading images.
     * @param {object} item - The movie/series data object.
     * @returns {HTMLElement} The created movie card div.
     */
    const createMovieCard = (item) => {
        const card = document.createElement('div');
        card.className = 'movie-card-container relative flex-shrink-0 w-32 md:w-40 lg:w-48 rounded-md overflow-hidden cursor-pointer';
        card.dataset.imdbId = item.imdbID;
        card.dataset.type = item.type;

        const posterUrl = isValidPosterUrl(item.poster) ? item.poster : `https://placehold.co/300x450/000000/FFFFFF?text=${encodeURIComponent(item.title || 'No Title')}`;

        // Use data-src for lazy loading, initial src can be a tiny placeholder or empty
        card.innerHTML = `
            <img data-src="${posterUrl}" alt="${item.title || 'No Title'} Poster" class="w-full h-48 md:h-60 lg:h-72 object-cover rounded-md lazy-load-img"
                 onerror="this.onerror=null;this.src='https://placehold.co/300x450/000000/FFFFFF?text=Image+Missing'; console.error('Image failed to load for: ${item.title || 'No Title'} (${item.imdbID || 'N/A'}) - Original URL: ${item.poster || 'N/A'}');">
            <div class="movie-card-info">
                <h3 class="text-sm md:text-base font-semibold truncate">${item.title || 'No Title'}</h3>
                <p class="text-xs text-gray-400">${item.year || 'N/A'}</p>
            </div>
        `;

        // Observe the image for lazy loading
        const imgElement = card.querySelector('img');
        if (imgElement) {
            lazyLoadObserver.observe(imgElement);
        }

        card.addEventListener('click', () => {
            showDetailsOverlay(card.dataset.imdbId, card.dataset.type);
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

            const filteredItems = itemsToDisplay.filter(item => isValidPosterUrl(item.poster));

            if (filteredItems && filteredItems.length > 0) {
                filteredItems.forEach(item => {
                    if (item.imdbID && item.type) {
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
            const endpoint = `${API_BASE_URL}/${type}s/${imdbId}`;
            const data = await fetchData(endpoint);

            if (data) {
                const overlayPosterUrl = isValidPosterUrl(data.poster) ? data.poster : `https://placehold.co/400x600/000000/FFFFFF?text=No+Image`;

                const playableUrl = data.telegramPlayableUrl;
                let playButtonHtml = '';
                if (playableUrl) {
                    playButtonHtml = `
                        <button id="detail-play-btn" class="bg-white text-black px-6 py-3 rounded-md font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center w-full" data-playable-url="${playableUrl}">
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
                                <button class="add-to-list-btn bg-gray-700 text-white px-6 py-3 rounded-md font-semibold hover:bg-gray-600 transition-colors flex items-center justify-center w-full" data-imdb-id="${data.imdbID}" data-title="${data.title}" data-poster="${data.poster}" data-type="${data.type}" data-year="${data.year}">
                                    <i class="fas fa-plus mr-2"></i> My List
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
                        if (urlToPlay) {
                            playMovie(urlToPlay);
                        } else {
                            showMessageBox('No playable link available for this content.', 'info');
                        }
                    });
                }

                const addToListBtn = detailOverlayContainer.querySelector('.add-to-list-btn');
                if (addToListBtn) {
                    addToListBtn.addEventListener('click', async (e) => {
                        const itemToAdd = {
                            imdbID: e.currentTarget.dataset.imdbId,
                            title: e.currentTarget.dataset.title,
                            poster: e.currentTarget.dataset.poster,
                            type: e.currentTarget.dataset.type,
                            year: e.currentTarget.dataset.year
                        };
                        await addToMyList(itemToAdd);
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

            // Hide spinner once iframe content starts loading (or after a short delay)
            // Note: iframe onload might not always fire reliably or be indicative of video buffer
            moviePlayer.onload = () => {
                bufferingSpinner.classList.add('hidden');
                moviePlayer.onload = null; // Remove handler
            };

            // Fallback: hide spinner after a short delay if onload doesn't fire or is too slow
            setTimeout(() => {
                if (!bufferingSpinner.classList.contains('hidden')) {
                    bufferingSpinner.classList.add('hidden');
                }
            }, 3000); // Hide after 3 seconds if not already hidden
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
                heroMoviesData = data.filter(item => isValidPosterUrl(item.poster)).slice(0, 5);

                if (heroMoviesData.length > 0) {
                    console.log(`Found ${heroMoviesData.length} valid trending movies for hero section.`);
                    heroSlidesContainer.innerHTML = '';
                    heroDotsContainer.innerHTML = '';

                    heroMoviesData.forEach((movie, index) => {
                        const slide = document.createElement('div');
                        slide.className = 'hero-slide';

                        // Use a tiny placeholder or empty src and data-src for hero images if they are also lazy-loaded
                        // For hero, we want it to load quickly, so direct src is better for the first slide
                        const heroPosterUrl = isValidPosterUrl(movie.poster) ? movie.poster : 'https://placehold.co/1920x1080/000000/FFFFFF?text=No+Hero+Image';

                        slide.innerHTML = `
                            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
                            <div class="hero-text-content">
                                <h1 class="text-4xl md:text-6xl font-bold mb-4">${movie.title || 'No Title'}</h1>
                                <p class="text-lg md:text-xl mb-6 line-clamp-3">${movie.plot || 'No description available.'}</p>
                                <div class="flex space-x-4">
                                    <button class="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-300 transition-colors flex items-center play-btn" data-imdb-id="${movie.imdbID}" data-type="${movie.type}" data-title="${movie.title}" data-playable-url="${movie.telegramPlayableUrl || ''}">
                                        <i class="fas fa-play mr-2"></i> Play
                                    </button>
                                    <button class="bg-gray-700 text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-600 transition-colors flex items-center add-to-list-btn" data-imdb-id="${movie.imdbID}" data-title="${movie.title}" data-poster="${movie.poster}" data-type="${movie.type}" data-year="${movie.year}">
                                        <i class="fas fa-plus mr-2"></i> My List
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
                            if (urlToPlay) {
                                playMovie(urlToPlay);
                            } else {
                                showMessageBox(`No playable link available for ${e.currentTarget.dataset.title || 'this content'}.`, 'info');
                            }
                        });
                    });
                    heroSlidesContainer.querySelectorAll('.add-to-list-btn').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            const itemToAdd = {
                                imdbID: e.currentTarget.dataset.imdbId,
                                title: e.currentTarget.dataset.title,
                                poster: e.currentTarget.dataset.poster,
                                type: e.currentTarget.dataset.type,
                                year: e.currentTarget.dataset.year
                            };
                            await addToMyList(itemToAdd);
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
            const currentHeroImageUrl = isValidPosterUrl(currentHeroMovie.poster) ? currentHeroMovie.poster : 'https://placehold.co/1920x1080/000000/FFFFFF?text=No+Hero+Image';
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
    const addToMyList = async (item) => {
        try {
            const response = await fetch(`${API_BASE_URL}/mylist/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, item }),
            });
            const result = await response.json();
            if (response.ok) {
                showMessageBox(result.message || 'Item added to My List!', 'success');
            } else {
                showMessageBox(result.message || 'Failed to add item to My List.', 'error');
            }
        } catch (error) {
            console.error('Error adding to My List:', error);
            showMessageBox('Error adding to My List. Please try again.', 'error');
        }
    };

    const removeFromMyList = async (imdbID) => {
        try {
            const response = await fetch(`${API_BASE_URL}/mylist/remove`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, imdbID }),
            });
            const result = await response.json();
            if (response.ok) {
                showMessageBox(result.message || 'Item removed from My List!', 'success');
                if (document.querySelector('.nav-link.active')?.dataset.content === 'mylist') {
                    loadContent('mylist');
                }
            } else {
                showMessageBox(result.message || 'Failed to remove item from My List.', 'error');
            }
        } catch (error) {
            console.error('Error removing from My List:', error);
            showMessageBox('Error removing from My List. Please try again.', 'error');
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
            if (searchInputWrapper && !searchInputWrapper.classList.contains('hidden')) {
                searchInputWrapper.classList.add('hidden');
                searchInput.value = '';
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
            const mobileSearchOverlay = document.getElementById('mobile-search-overlay');
            if (mobileSearchOverlay) {
                mobileSearchOverlay.classList.add('active');
                mobileSearchOverlay.style.display = 'flex';
                document.body.classList.add('overflow-hidden');
                document.getElementById('mobile-search-input')?.focus();
            }
        });

        // Close mobile search overlay
        document.querySelector('#mobile-search-overlay .close-search-btn')?.addEventListener('click', () => {
            const mobileSearchOverlay = document.getElementById('mobile-search-overlay');
            if (mobileSearchOverlay) {
                mobileSearchOverlay.classList.remove('active');
                setTimeout(() => {
                    mobileSearchOverlay.style.display = 'none';
                    document.body.classList.remove('overflow-hidden');
                    document.getElementById('mobile-search-input').value = '';
                }, 300);
            }
        });


        // Debounce search input for both desktop and mobile
        const handleSearchInput = (event) => {
            clearTimeout(searchTimeout);
            const query = event.target.value.trim();
            searchTimeout = setTimeout(() => {
                if (query.length > 2) {
                    handleSearch(query);
                } else if (query.length === 0) {
                    // If search box is empty, go back to home content
                    if (document.getElementById('search-results-section')) {
                         document.getElementById('search-results-section').classList.add('hidden');
                    }
                    loadContent('home'); // Reload home content when search is cleared
                }
            }, 300); // 300ms debounce time
        };

        searchInput.addEventListener('input', handleSearchInput);
        document.getElementById('mobile-search-input')?.addEventListener('input', handleSearchInput);
    }

    /**
     * Handles the search logic.
     * @param {string} query - The search query.
     */
    const handleSearch = async (query) => {
        showLoading();
        movieSectionsContainer.innerHTML = '';
        heroSection.classList.add('hidden-hero');
        clearInterval(heroInterval);

        const searchResultsSection = document.getElementById('search-results-section');
        const searchResultsGrid = document.getElementById('search-results-grid');
        const allContentView = document.getElementById('all-content-view');

        if (searchResultsSection) searchResultsSection.classList.remove('hidden');
        if (allContentView) allContentView.classList.add('hidden'); // Hide other full view

        if (searchResultsGrid) searchResultsGrid.innerHTML = ''; // Clear previous results

        try {
            const searchResults = await fetchData(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
            const allResults = [...(searchResults.movies || []), ...(searchResults.series || [])];
            const filteredResults = allResults.filter(item => isValidPosterUrl(item.poster));

            if (filteredResults.length > 0) {
                filteredResults.forEach(item => {
                    if (item.imdbID && item.type) {
                        searchResultsGrid.appendChild(createMovieCard(item));
                    }
                });
            } else {
                searchResultsGrid.innerHTML = `<p class="text-gray-400 p-4">No results found for "${query}" with valid images.</p>`;
            }
            // Pagination for search results is not implemented yet, so hide buttons
            document.getElementById('search-pagination')?.classList.add('hidden');
        } catch (error) {
            if (searchResultsGrid) searchResultsGrid.innerHTML = `<p class="text-red-500 p-4">Error performing search for "${query}". Please try again later.</p>`;
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

        if (searchInputWrapper && !searchInputWrapper.classList.contains('hidden')) {
            searchInputWrapper.classList.add('hidden');
            searchInput.value = '';
        }
        if (document.getElementById('mobile-search-overlay')) {
            document.getElementById('mobile-search-overlay').classList.remove('active');
            document.getElementById('mobile-search-overlay').style.display = 'none';
        }

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

        try {
            if (contentType === 'home') {
                // Load other sections progressively
                const homeSectionEndpoints = [
                    { title: 'Most Popular Movies', endpoint: `${API_BASE_URL}/movies/popular` },
                    { title: 'Best Series', endpoint: `${API_BASE_URL}/series/best` },
                    { title: 'Most Popular Series', endpoint: `${API_BASE_URL}/series/popular` },
                    { title: 'Action Movies', endpoint: `${API_BASE_URL}/movies/genre/action` },
                    { title: 'Comedy Films', endpoint: `${API_BASE_URL}/movies/genre/comedy` },
                    { title: 'Drama Series', endpoint: `${API_BASE_URL}/series/genre/drama` },
                    // Removed 'Sci-Fi Movies' to avoid potential backend errors
                    // { title: 'Sci-Fi Movies', endpoint: `${API_BASE_URL}/movies/genre/sci-fi` },
                    { title: 'Animation Series', endpoint: `${API_BASE_URL}/series/genre/animation` },
                    { title: 'Horror Films', endpoint: `${API_BASE_URL}/movies/genre/horror` },
                    { title: 'Fantasy Movies', endpoint: `${API_BASE_URL}/movies/genre/fantasy` },
                    { title: 'Crime Series', endpoint: `${API_BASE_URL}/series/genre/crime` }
                ];

                for (const section of homeSectionEndpoints) {
                    await fetchAndDisplaySection(section.title, section.endpoint);
                }

            } else if (contentType === 'movies') {
                await fetchAndDisplaySection('All Movies', `${API_BASE_URL}/movies`, true);
            } else if (contentType === 'series') {
                await fetchAndDisplaySection('All Series', `${API_BASE_URL}/series`, true);
            } else if (contentType === 'mylist') {
                const userList = await fetchData(`${API_BASE_URL}/mylist/${userId}`);
                const mylistSection = document.createElement('div');
                mylistSection.className = 'movie-section mb-8';
                mylistSection.innerHTML = `<h2 class="text-xl md:text-2xl font-bold mb-4 text-white">My List</h2><div class="movie-grid-category grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4"></div>`;
                const mylistGrid = mylistSection.querySelector('.movie-grid-category');
                movieSectionsContainer.appendChild(mylistSection); // Append immediately

                if (userList && userList.items && userList.items.length > 0) {
                    const filteredMyListItems = userList.items.filter(item => isValidPosterUrl(item.poster));

                    if (filteredMyListItems.length > 0) {
                        filteredMyListItems.forEach(item => {
                            const card = createMovieCard(item);
                            const removeBtn = document.createElement('button');
                            removeBtn.className = 'absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300';
                            removeBtn.innerHTML = `<i class="fas fa-times"></i>`;
                            removeBtn.title = `Remove ${item.title} from My List`;
                            removeBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                removeFromMyList(item.imdbID);
                            });
                            card.appendChild(removeBtn);
                            mylistGrid.appendChild(card);
                        });
                    } else {
                        mylistGrid.innerHTML = `<p class="text-lg text-gray-400">Your list is empty or contains no items with valid images.</p>`;
                    }
                } else {
                    mylistGrid.innerHTML = `<p class="text-lg text-gray-400">Your list is empty. Add movies or series to your list!</p>`;
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
