// Filename: script.js
// This script handles all frontend interactions, dynamic content loading,
// and communication with the backend API.

console.log("script.js loaded successfully!");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired!");

    // Base URL for your backend API
    const API_BASE_URL = 'https://netflix-ydfu.onrender.com/api'; // *** Ensure this is your Render backend URL ***
    // OMDb API Key for fetching hero section details directly (not used in this version as backend fetches details)
    const OMDB_API_KEY = '48bff862'; // Kept for reference, but backend handles OMDb calls now

    // --- DOM Element References ---
    const movieSectionsContainer = document.getElementById('movie-sections');
    const loadingIndicator = document.getElementById('loading-indicator');
    const userDetailsSpan = document.querySelector('#user-details span');
    const userProfileImg = document.querySelector('#user-details img');
    const header = document.getElementById('main-header');

    // Select all nav links (both desktop and new mobile bottom nav)
    const navLinks = document.querySelectorAll('.nav-link');

    // Search Elements (now unified for desktop and mobile)
    const searchToggleBtn = document.getElementById('search-toggle-btn'); // Renamed from desktopSearchToggleBtn
    const searchInputWrapper = document.getElementById('search-input-wrapper'); // Renamed from desktopSearchInputWrapper
    const searchInput = document.getElementById('search-input'); // Renamed from desktopSearchInput

    // Hero Section Elements
    const heroSection = document.getElementById('hero-section');
    const heroSlidesContainer = document.getElementById('hero-slides-container');
    const heroPrevBtn = document.getElementById('hero-prev-btn');
    const heroNextBtn = document.getElementById('hero-next-btn');
    const heroDotsContainer = document.getElementById('hero-dots-container');

    const detailOverlayContainer = document.getElementById('detail-overlay-container');
    // messageBox is dynamically created/appended, so no need to get it here initially

    // --- Global Variables ---
    let currentHeroSlide = 0;
    let heroInterval;
    let lastScrollY = 0; // For header hide/show on scroll
    let userId = localStorage.getItem('netflixCloneUserId'); // Get user ID from local storage

    // Generate a unique user ID if one doesn't exist (for My List persistence)
    if (!userId) {
        userId = crypto.randomUUID(); // Generates a unique ID
        localStorage.setItem('netflixCloneUserId', userId);
        console.log('Generated new user ID:', userId);
    } else {
        console.log('Existing user ID:', userId);
    }
    // REMOVED: Display user ID. User requested to remove this.
    if (userDetailsSpan) {
        userDetailsSpan.textContent = `Guest`; // Always display "Guest"
    }


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
             // Create it if it doesn't exist (e.g., if it was removed after a previous message)
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

        // Ensure it's visible and then fade out
        messageBox.style.opacity = '1';

        setTimeout(() => {
            messageBox.style.opacity = '0';
            // Remove element from DOM after transition to clean up
            messageBox.addEventListener('transitionend', () => {
                if (messageBox.parentNode) {
                    messageBox.parentNode.removeChild(messageBox);
                }
            }, { once: true }); // Ensure listener runs only once
        }, duration);
    };

    /**
     * Fetches data from a given URL with loading indicators.
     * @param {string} url - The URL to fetch from.
     * @returns {Promise<Object>} - A promise that resolves to the JSON data.
     */
    async function fetchData(url) {
        showLoading();
        try {
            const response = await fetch(url);
            if (!response.ok) {
                // Try to parse error message from backend if available
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                console.error(`HTTP error! Status: ${response.status}, URL: ${url}, Message: ${errorData.error || errorData.message || response.statusText}`);
                throw new Error(`Failed to fetch data from ${url}: ${errorData.error || errorData.message || response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        } finally {
            hideLoading();
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
        // Check for common invalid strings and minimum length for a URL
        return trimmedUrl !== '' &&
               trimmedUrl.toLowerCase() !== 'n/a' &&
               trimmedUrl.toLowerCase() !== 'null' &&
               trimmedUrl.toLowerCase() !== 'undefined' &&
               trimmedUrl.length > 10; // Simple check: a URL is usually longer than this
    };

    /**
     * Creates a movie/series card element.
     * @param {object} item - The movie/series data object.
     * @returns {HTMLElement} The created movie card div.
     */
    const createMovieCard = (item) => {
        const card = document.createElement('div');
        card.className = 'movie-card relative flex-shrink-0 w-32 md:w-40 lg:w-48 rounded-md overflow-hidden cursor-pointer transform transition-transform duration-300 hover:scale-105 hover:z-10 group';
        card.dataset.imdbId = item.imdbID; // Store IMDb ID for detail fetching
        card.dataset.type = item.type; // Store type (movie/series)

        // Determine poster URL with robust fallback handling
        const posterUrl = isValidPosterUrl(item.poster) ? item.poster : `https://placehold.co/300x450/000000/FFFFFF?text=${encodeURIComponent(item.title || 'No Title')}`;

        card.innerHTML = `
            <img src="${posterUrl}" alt="${item.title || 'No Title'} Poster" class="w-full h-48 md:h-60 lg:h-72 object-cover rounded-md"
                 onerror="this.onerror=null;this.src='https://placehold.co/300x450/000000/FFFFFF?text=Image+Missing'; console.error('Image failed to load for: ${item.title || 'No Title'} (${item.imdbID || 'N/A'}) - Original URL: ${item.poster || 'N/A'}');">
            <div class="movie-card-info absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black via-black/70 to-transparent">
                <h3 class="text-sm md:text-base font-semibold truncate">${item.title || 'No Title'}</h3>
                <p class="text-xs text-gray-400">${item.year || 'N/A'}</p>
            </div>
        `;

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
     */
    const fetchAndDisplaySection = async (title, endpoint, isGridCategory = false) => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'movie-section mb-8';
        sectionDiv.innerHTML = `<h2 class="text-xl md:text-2xl font-bold mb-4 text-white">${title}</h2><div class="movie-row flex space-x-3 overflow-x-auto scrollbar-hide pb-4"></div>`;
        const movieRow = sectionDiv.querySelector('.movie-row');

        if (isGridCategory) {
            movieRow.classList.remove('flex', 'space-x-3', 'overflow-x-auto', 'scrollbar-hide', 'pb-4');
            movieRow.classList.add('movie-grid-category', 'grid', 'grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4', 'lg:grid-cols-5', 'xl:grid-cols-6', 'gap-2', 'md:gap-4');
        }

        try {
            const data = await fetchData(endpoint); // fetchData already handles loading indicator

            let itemsToDisplay = [];
            if (endpoint.includes('/api/search')) {
                itemsToDisplay = [...(data.movies || []), ...(data.series || [])];
            } else if (endpoint.includes('/api/mylist')) {
                itemsToDisplay = data.items || [];
            } else {
                itemsToDisplay = data;
            }

            // Filter out items with invalid poster URLs before rendering
            const filteredItems = itemsToDisplay.filter(item => isValidPosterUrl(item.poster));

            if (filteredItems && filteredItems.length > 0) {
                filteredItems.forEach(item => {
                    // Ensure item has imdbID and type before creating card
                    if (item.imdbID && item.type) {
                        movieRow.appendChild(createMovieCard(item));
                    }
                });
            } else {
                movieRow.innerHTML = `<p class="text-gray-400">No content found for "${title}" with valid images.</p>`;
            }
        } catch (error) {
            console.error(`Failed to load content for "${title}" from our servers:`, error);
            movieRow.innerHTML = `<p class="text-red-500">Failed to load content for "${title}" from our servers. Please try again later.</p>`;
        }
        movieSectionsContainer.appendChild(sectionDiv);
    };

    /**
     * Fetches details for a specific movie/series and displays them in an overlay.
     * @param {string} imdbId - The IMDb ID of the movie/series.
     * @param {string} type - The type of content ('movie' or 'series').
     */
    const showDetailsOverlay = async (imdbId, type) => {
        showLoading(); // Show loading indicator
        try {
            const endpoint = `${API_BASE_URL}/${type}s/${imdbId}`; // e.g., /api/movies/tt1234567
            const data = await fetchData(endpoint);

            if (data) {
                // Populate overlay with data
                const overlayPosterUrl = isValidPosterUrl(data.poster) ? data.poster : `https://placehold.co/400x600/000000/FFFFFF?text=No+Image`;
                detailOverlayContainer.innerHTML = `
                    <div class="detail-overlay-content relative bg-[#1a1a1a] rounded-lg shadow-xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden">
                        <button class="absolute top-3 right-3 text-white text-3xl font-bold z-10 close-overlay-btn">
                            &times;
                        </button>
                        <div class="md:w-1/3 flex-shrink-0">
                            <img src="${overlayPosterUrl}" alt="${data.title || 'No Title'} Poster" class="w-full h-auto object-cover md:h-full rounded-t-lg md:rounded-l-lg md:rounded-t-none" onerror="this.onerror=null;this.src='https://placehold.co/400x600/000000/FFFFFF?text=No+Image';">
                        </div>
                        <div class="md:w-2/3 p-6 text-white overflow-y-auto max-h-[80vh]">
                            <h2 class="text-3xl md:text-4xl font-bold mb-2">${data.title || 'N/A'}</h2>
                            <p class="text-gray-400 text-sm mb-4">
                                ${data.year || 'N/A'} | ${data.rated || 'N/A'} | ${data.runtime || 'N/A'} | ${Array.isArray(data.genre) ? data.genre.join(', ') : data.genre || 'N/A'}
                            </p>
                            <p class="mb-4 text-base">${data.plot || 'No plot available.'}</p>
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
                            <div class="flex space-x-4">
                                <button class="bg-red-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-red-700 transition-colors flex items-center">
                                    <i class="fas fa-play mr-2"></i> Play
                                </button>
                                <button class="bg-gray-700 text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-600 transition-colors flex items-center add-to-list-btn" data-imdb-id="${data.imdbID}" data-title="${data.title}" data-poster="${data.poster}" data-type="${data.type}" data-year="${data.year}">
                                    <i class="fas fa-plus mr-2"></i> Add to My List
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                detailOverlayContainer.classList.add('active'); // Activate overlay for fade-in
                detailOverlayContainer.style.display = 'flex'; // Ensure it's visible for transition
                document.body.classList.add('overflow-hidden'); // Prevent scrolling body

                // Add event listener to close button
                detailOverlayContainer.querySelector('.close-overlay-btn').addEventListener('click', closeDetailsOverlay);

                // Add event listener for clicking outside the content to close
                detailOverlayContainer.addEventListener('click', (e) => {
                    if (e.target === detailOverlayContainer) {
                        closeDetailsOverlay();
                    }
                });

                // Add to My List button functionality
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
            hideLoading(); // Always hide loading indicator
        }
    };

    /**
     * Closes the detail overlay.
     */
    const closeDetailsOverlay = () => {
        detailOverlayContainer.classList.remove('active');
        // Give time for transition before hiding completely
        setTimeout(() => {
            detailOverlayContainer.style.display = 'none';
            document.body.classList.remove('overflow-hidden');
            detailOverlayContainer.innerHTML = ''; // Clear content after closing
        }, 300); // Matches the CSS transition duration
    };

    // --- Hero Section (Carousel) Functions ---
    /**
     * Fetches hero movies and populates the hero section.
     */
    const fetchHeroMovies = async () => {
        console.log("Fetching hero movies...");
        try {
            // Fetch trending movies from your backend
            const data = await fetchData(`${API_BASE_URL}/movies/trending`);

            if (data && data.length > 0) {
                // Filter out hero movies with invalid poster URLs
                const heroMovies = data.filter(item => isValidPosterUrl(item.poster)).slice(0, 5); // Take top 5 valid ones

                if (heroMovies.length > 0) {
                    console.log(`Found ${heroMovies.length} valid trending movies for hero section.`);
                    heroSlidesContainer.innerHTML = '';
                    heroDotsContainer.innerHTML = '';

                    heroMovies.forEach((movie, index) => {
                        const slide = document.createElement('div');
                        slide.className = 'hero-slide';
                        const slidePosterUrl = isValidPosterUrl(movie.poster) ? movie.poster : 'https://placehold.co/1920x1080/000000/FFFFFF?text=No+Hero+Image';
                        slide.style.backgroundImage = `url('${slidePosterUrl}')`;
                        slide.dataset.imdbId = movie.imdbID;
                        slide.dataset.type = movie.type;

                        slide.innerHTML = `
                            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
                            <div class="hero-text-content">
                                <h1 class="text-4xl md:text-6xl font-bold mb-4">${movie.title || 'No Title'}</h1>
                                <p class="text-lg md:text-xl mb-6 line-clamp-3">${movie.plot || 'No description available.'}</p>
                                <div class="flex space-x-4">
                                    <button class="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-300 transition-colors flex items-center play-btn" data-imdb-id="${movie.imdbID}" data-type="${movie.type}" data-title="${movie.title}">
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

                    // Add event listeners for buttons within hero slides
                    heroSlidesContainer.querySelectorAll('.play-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            showMessageBox(`Playing ${e.currentTarget.dataset.title || 'content'} (feature coming soon!)`, 'info');
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


                    startHeroCarousel();
                } else {
                    console.log("No valid trending movies with images found for hero section. Hiding hero.");
                    if (heroSection) {
                        heroSection.innerHTML = '<p class="text-center text-red-500">No trending movies with valid images found for hero section.</p>';
                        heroSection.classList.add('hidden-hero'); // Ensure it's hidden if no valid content
                    }
                }
            } else {
                console.log("No trending movies found from backend. Hiding hero.");
                if (heroSection) { // Check if heroSection exists before manipulating
                    heroSection.innerHTML = '<p class="text-center text-red-500">No trending movies found for hero section.</p>';
                    heroSection.classList.add('hidden-hero'); // Hide if no data
                }
            }
        } catch (error) {
            console.error('Error fetching hero movies:', error);
            if (heroSection) { // Check if heroSection exists before manipulating
                heroSection.innerHTML = '<p class="text-center text-red-500">Error loading hero content. Please try again later.</p>';
                heroSection.classList.add('hidden-hero'); // Hide if error
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

        // Update dots
        heroDotsContainer.querySelectorAll('div').forEach((dot, i) => {
            if (i === currentHeroSlide) {
                dot.classList.add('bg-white');
                dot.classList.remove('bg-gray-500');
            } else {
                dot.classList.remove('bg-white');
                dot.classList.add('bg-gray-500');
            }
        });
    };

    /**
     * Moves to the next hero slide.
     */
    const nextSlide = () => {
        updateHeroCarousel(currentHeroSlide + 1);
    };

    /**
     * Moves to the previous hero slide.
     */
    const prevSlide = () => {
        updateHeroCarousel(currentHeroSlide - 1);
    };

    /**
     * Goes to a specific hero slide.
     * @param {number} index - The index of the slide.
     */
    const goToSlide = (index) => {
        clearInterval(heroInterval); // Stop auto-play when manually navigating
        updateHeroCarousel(index);
        startHeroCarousel(); // Restart auto-play
    };

    /**
     * Starts the automatic hero carousel rotation.
     */
    const startHeroCarousel = () => {
        clearInterval(heroInterval); // Clear any existing interval
        heroInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
    };

    // --- My List Functions ---

    /**
     * Adds an item to the user's list.
     * @param {object} item - The item to add (imdbID, title, poster, type, year).
     */
    const addToMyList = async (item) => {
        try {
            const response = await fetch(`${API_BASE_URL}/mylist/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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

    /**
     * Removes an item from the user's list.
     * @param {string} imdbID - The IMDb ID of the item to remove.
     */
    const removeFromMyList = async (imdbID) => {
        try {
            const response = await fetch(`${API_BASE_URL}/mylist/remove`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, imdbID }),
            });

            const result = await response.json();
            if (response.ok) {
                showMessageBox(result.message || 'Item removed from My List!', 'success');
                // Reload my list if currently viewing it
                if (document.querySelector('.nav-link.active')?.dataset.content === 'mylist') {
                    loadContent('mylist'); // Reloads the My List section to reflect changes
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
    if (header) { // Ensure header element exists
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            // Hide/show header on scroll down/up (only for desktop, mobile header is always visible)
            if (window.innerWidth >= 768) {
                if (window.scrollY > lastScrollY && window.scrollY > 200) { // Scroll down
                    header.classList.add('hide-header');
                } else { // Scroll up
                    header.classList.remove('hide-header');
                }
            }
            lastScrollY = window.scrollY;
        });
    }

    // Navigation links click handler (for both desktop top nav and mobile bottom nav)
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior

            // Remove 'active' from all nav links
            navLinks.forEach(nav => nav.classList.remove('active'));
            // Add 'active' to the clicked link
            e.currentTarget.classList.add('active');

            const contentType = link.dataset.content;
            loadContent(contentType);

            // Hide search input if it was open when navigating
            if (searchInputWrapper && !searchInputWrapper.classList.contains('hidden')) {
                searchInputWrapper.classList.add('hidden');
                searchInput.value = ''; // Clear input when hiding
            }
        });
    });

    // Search toggle and input functionality (unified for all screen sizes)
    if (searchToggleBtn && searchInputWrapper && searchInput) {
        searchToggleBtn.addEventListener('click', () => {
            console.log("Search toggle clicked.");
            console.log("Initial searchInputWrapper classes:", searchInputWrapper.classList.value);
            console.log("Current window width:", window.innerWidth);

            searchInputWrapper.classList.toggle('hidden');
            console.log("searchInputWrapper classes AFTER toggle:", searchInputWrapper.classList.value);


            if (!searchInputWrapper.classList.contains('hidden')) {
                console.log("Search input wrapper is now visible. Attempting to focus.");
                searchInput.focus(); // Focus on input when shown
            } else {
                console.log("Search input wrapper is now hidden. Clearing input and reloading home.");
                searchInput.value = ''; // Clear input when hiding
                loadContent('home'); // Reload home content if search is cleared/hidden
            }
        });

        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                console.log("Search input: Enter pressed. Query:", searchInput.value.trim());
                await handleSearch(searchInput.value.trim());
                // Hide search input after search
                searchInputWrapper.classList.add('hidden');
            }
        });
    }


    /**
     * Handles the search logic for both desktop and mobile search inputs.
     * @param {string} query - The search query.
     */
    const handleSearch = async (query) => {
        console.log("handleSearch called with query:", query);
        if (query.length > 2) { // Require at least 3 characters for search
            movieSectionsContainer.innerHTML = ''; // Clear existing content
            heroSection.classList.add('hidden-hero'); // Hide hero during search
            clearInterval(heroInterval); // Stop hero carousel

            try {
                console.log("Fetching search results from:", `${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
                const searchResults = await fetchData(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
                const allResults = [...(searchResults.movies || []), ...(searchResults.series || [])];
                console.log("Search results received:", allResults);

                // Filter search results to only show items with valid images
                const filteredResults = allResults.filter(item => isValidPosterUrl(item.poster));

                if (filteredResults.length > 0) {
                    // Create a new section for search results
                    const searchSectionDiv = document.createElement('div');
                    searchSectionDiv.className = 'movie-section mb-8';
                    searchSectionDiv.innerHTML = `<h2 class="text-xl md:text-2xl font-bold mb-4 text-white">Search Results for "${query}"</h2><div class="movie-grid-category grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4"></div>`;
                    const searchGrid = searchSectionDiv.querySelector('.movie-grid-category');

                    filteredResults.forEach(item => {
                        if (item.imdbID && item.type) {
                            searchGrid.appendChild(createMovieCard(item));
                        }
                    });
                    movieSectionsContainer.appendChild(searchSectionDiv); // Append the new search section
                } else {
                    const noResultsDiv = document.createElement('div');
                    noResultsDiv.className = 'movie-section p-4 md:p-8 text-center text-gray-400';
                    noResultsDiv.innerHTML = `<p>No results found for "${query}" with valid images.</p>`;
                    movieSectionsContainer.appendChild(noResultsDiv);
                }
            } catch (error) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'movie-section p-4 md:p-8 pt-20 text-center text-red-500';
                errorDiv.innerHTML = `<p>Error performing search for "${query}". Please try again later.</p>`;
                movieSectionsContainer.appendChild(errorDiv);
                console.error('Search error:', error);
            } finally {
                hideLoading(); // Ensure loading indicator is hidden after search
            }
        } else {
            showMessageBox('Please enter at least 3 characters for search.', 'info');
        }
    };


    // Hero carousel navigation
    if (heroNextBtn) heroNextBtn.addEventListener('click', nextSlide);
    if (heroPrevBtn) heroPrevBtn.addEventListener('click', prevSlide);

    // --- Initial Content Load ---

    /**
     * Loads content based on the specified type (home, movies, series, mylist).
     * @param {string} contentType - The type of content to load.
     */
    const loadContent = async (contentType) => {
        showLoading();
        movieSectionsContainer.innerHTML = ''; // Clear previous content

        // Hide search input wrapper when changing content type
        if (searchInputWrapper && !searchInputWrapper.classList.contains('hidden')) {
            searchInputWrapper.classList.add('hidden');
            searchInput.value = '';
        }

        // Hide hero section for non-home pages
        if (heroSection) { // Check if heroSection exists
            if (contentType !== 'home') {
                heroSection.classList.add('hidden-hero');
                clearInterval(heroInterval); // Clear hero interval when hero section is hidden
                console.log('Hero section is being hidden for non-home page.');
            } else {
                heroSection.classList.remove('hidden-hero');
                startHeroCarousel(); // Restart hero carousel if returning to home
                console.log('Hero section is being shown for home page.');
            }
        }

        try {
            if (contentType === 'home') {
                await fetchHeroMovies(); // This will also start the carousel
                await fetchAndDisplaySection('Most Popular Movies', `${API_BASE_URL}/movies/popular`);
                await fetchAndDisplaySection('Best Series', `${API_BASE_URL}/series/best`); // Now fetches random sample
                await fetchAndDisplaySection('Most Popular Series', `${API_BASE_URL}/series/popular`);
                await fetchAndDisplaySection('Action Movies', `${API_BASE_URL}/movies/genre/action`);
                await fetchAndDisplaySection('Comedy Films', `${API_BASE_URL}/movies/genre/comedy`);
                await fetchAndDisplaySection('Drama Series', `${API_BASE_URL}/series/genre/drama`);
                await fetchAndDisplaySection('Sci-Fi Movies', `${API_BASE_URL}/movies/genre/sci-fi`);
                await fetchAndDisplaySection('Animation Series', `${API_BASE_URL}/series/genre/animation`);
                await fetchAndDisplaySection('Horror Films', `${API_BASE_URL}/movies/genre/horror`);
                await fetchAndDisplaySection('Fantasy Movies', `${API_BASE_URL}/movies/genre/fantasy`);
                await fetchAndDisplaySection('Crime Series', `${API_BASE_URL}/series/genre/crime`);
            } else if (contentType === 'movies') {
                await fetchAndDisplaySection('All Movies', `${API_BASE_URL}/movies`, true); // True for grid layout
            } else if (contentType === 'series') {
                await fetchAndDisplaySection('All Series', `${API_BASE_URL}/series`, true); // True for grid layout
            } else if (contentType === 'mylist') {
                const userList = await fetchData(`${API_BASE_URL}/mylist/${userId}`);
                if (userList && userList.items && userList.items.length > 0) {
                    const mylistSection = document.createElement('div');
                    mylistSection.className = 'movie-section mb-8';
                    mylistSection.innerHTML = `<h2 class="text-xl md:text-2xl font-bold mb-4 text-white">My List</h2><div class="movie-grid-category grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4"></div>`;
                    const mylistGrid = mylistSection.querySelector('.movie-grid-category');

                    // Filter My List items to only show those with valid images
                    const filteredMyListItems = userList.items.filter(item => isValidPosterUrl(item.poster));

                    if (filteredMyListItems.length > 0) {
                        filteredMyListItems.forEach(item => {
                            const card = createMovieCard(item);
                            // Add a remove button to my list items
                            const removeBtn = document.createElement('button');
                            removeBtn.className = 'absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300';
                            removeBtn.innerHTML = `<i class="fas fa-times"></i>`;
                            removeBtn.title = `Remove ${item.title} from My List`;
                            removeBtn.addEventListener('click', (e) => {
                                e.stopPropagation(); // Prevent card click from opening detail overlay
                                removeFromMyList(item.imdbID);
                            });
                            card.appendChild(removeBtn);
                        });
                        movieSectionsContainer.appendChild(mylistSection);
                    } else {
                        const noContentDiv = document.createElement('div');
                        noContentDiv.className = 'movie-section p-4 md:p-8 text-center text-gray-400';
                        noContentDiv.innerHTML = `<p class="text-lg">Your list is empty or contains no items with valid images. Add movies or series to your list!</p>`;
                        movieSectionsContainer.appendChild(noContentDiv);
                    }
                } else {
                    const noContentDiv = document.createElement('div');
                    noContentDiv.className = 'movie-section p-4 md:p-8 text-center text-gray-400';
                    noContentDiv.innerHTML = `<p class="text-lg">Your list is empty. Add movies or series to your list!</p>`;
                    movieSectionsContainer.appendChild(noContentDiv);
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
