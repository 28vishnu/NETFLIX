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
    const navLinks = document.querySelectorAll('.nav-link');
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const searchInputWrapper = document.getElementById('search-input-wrapper');
    const searchInput = document.getElementById('search-input');
    const heroSection = document.getElementById('hero-section');
    const heroSlidesContainer = document.getElementById('hero-slides-container');
    const heroPrevBtn = document.getElementById('hero-prev-btn');
    const heroNextBtn = document.getElementById('hero-next-btn');
    const heroDotsContainer = document.getElementById('hero-dots-container');
    const detailOverlayContainer = document.getElementById('detail-overlay-container');
    // messageBox is dynamically created/appended, so no need to get it here initially

    // Mobile Navigation Elements
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const mobileNavCloseBtn = document.getElementById('mobile-nav-close-btn');
    const mobileNavLinks = mobileNavOverlay ? mobileNavOverlay.querySelectorAll('.nav-link') : []; // Check if mobileNavOverlay exists

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
    // Display user ID (for debugging/identification in multi-user apps)
    if (userDetailsSpan) {
        userDetailsSpan.textContent = `User: ${userId.substring(0, 8)}...`; // Show truncated ID
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
     * Creates a movie/series card element.
     * @param {object} item - The movie/series data object.
     * @returns {HTMLElement} The created movie card div.
     */
    const createMovieCard = (item) => {
        const card = document.createElement('div');
        card.className = 'movie-card relative flex-shrink-0 w-32 md:w-40 lg:w-48 rounded-md overflow-hidden cursor-pointer transform transition-transform duration-300 hover:scale-105 hover:z-10 group';
        card.dataset.imdbId = item.imdbID; // Store IMDb ID for detail fetching
        card.dataset.type = item.type; // Store type (movie/series)

        // Use a placeholder image if the poster is 'N/A' or an empty string
        const posterUrl = item.poster && item.poster !== 'N/A' ? item.poster : `https://placehold.co/300x450/000000/FFFFFF?text=${encodeURIComponent(item.title || 'No Title')}`;

        card.innerHTML = `
            <img src="${posterUrl}" alt="${item.title || 'No Title'} Poster" class="w-full h-48 md:h-60 lg:h-72 object-cover rounded-md" onerror="this.onerror=null;this.src='https://placehold.co/300x450/000000/FFFFFF?text=No+Image';">
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
                // Search results come as { movies: [], series: [] }
                itemsToDisplay = [...(data.movies || []), ...(data.series || [])];
            } else if (endpoint.includes('/api/mylist')) {
                // My list returns { userId: ..., items: [] }
                itemsToDisplay = data.items || [];
            } else {
                // Other endpoints return direct arrays
                itemsToDisplay = data;
            }

            if (itemsToDisplay && itemsToDisplay.length > 0) {
                itemsToDisplay.forEach(item => {
                    // Ensure item has imdbID and type before creating card
                    if (item.imdbID && item.type) {
                        movieRow.appendChild(createMovieCard(item));
                    }
                });
            } else {
                movieRow.innerHTML = `<p class="text-gray-400">No content found for "${title}".</p>`;
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
                const overlayPosterUrl = data.poster && data.poster !== 'N/A' ? data.poster : `https://placehold.co/400x600/000000/FFFFFF?text=No+Image`;
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
                                <p><strong>Awards:</strong> ${data.awards || 'N/A'}</p>
                                <p><strong>IMDb Rating:</strong> ${data.imdbRating || 'N/A'}</p>
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
        try {
            // Fetch trending movies from your backend
            const data = await fetchData(`${API_BASE_URL}/movies/trending`);

            if (data && data.length > 0) {
                // Take top 5 for hero slides
                const heroMovies = data.slice(0, 5);
                heroSlidesContainer.innerHTML = '';
                heroDotsContainer.innerHTML = '';

                heroMovies.forEach((movie, index) => {
                    const slide = document.createElement('div');
                    slide.className = 'hero-slide';
                    const slidePosterUrl = movie.poster && movie.poster !== 'N/A' ? movie.poster : 'https://placehold.co/1920x1080/000000/FFFFFF?text=No+Hero+Image';
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
                if (heroSection) { // Check if heroSection exists before manipulating
                    heroSection.innerHTML = '<p class="text-center text-red-500">No trending movies found for hero section.</p>';
                }
            }
        } catch (error) {
            console.error('Error fetching hero movies:', error);
            if (heroSection) { // Check if heroSection exists before manipulating
                heroSection.innerHTML = '<p class="text-center text-red-500">Error loading hero content. Please try again later.</p>';
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

            // Hide/show header on scroll down/up
            if (window.scrollY > lastScrollY && window.scrollY > 200) { // Scroll down
                header.classList.add('hide-header');
            } else { // Scroll up
                header.classList.remove('hide-header');
            }
            lastScrollY = window.scrollY;
        });
    }


    // Navigation links click handler
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior

            // Remove 'active' from all nav links
            navLinks.forEach(nav => nav.classList.remove('active'));
            // Add 'active' to the clicked link
            e.currentTarget.classList.add('active');

            const contentType = link.dataset.content;
            loadContent(contentType);

            // Close mobile nav if open
            if (mobileNavOverlay) {
                mobileNavOverlay.classList.remove('active');
                mobileNavOverlay.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            }
        });
    });

    // Mobile menu toggle
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            if (mobileNavOverlay) {
                mobileNavOverlay.classList.remove('hidden');
                mobileNavOverlay.classList.add('active');
                document.body.classList.add('overflow-hidden'); // Prevent body scroll
            }
        });
    }

    // Close mobile nav
    if (mobileNavCloseBtn) {
        mobileNavCloseBtn.addEventListener('click', () => {
            if (mobileNavOverlay) {
                mobileNavOverlay.classList.remove('active');
                // Delay hiding to allow transition
                setTimeout(() => {
                    mobileNavOverlay.classList.add('hidden');
                    document.body.classList.remove('overflow-hidden');
                }, 300);
            }
        });
    }

    // Mobile nav links click handler (inside overlay)
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove 'active' from all mobile nav links
            mobileNavLinks.forEach(nav => nav.classList.remove('active'));
            // Add 'active' to the clicked link
            e.currentTarget.classList.add('active');

            const contentType = link.dataset.content;
            loadContent(contentType);
            if (mobileNavOverlay) {
                mobileNavOverlay.classList.remove('active');
                // Delay hiding to allow transition
                setTimeout(() => {
                    mobileNavOverlay.classList.add('hidden');
                    document.body.classList.remove('overflow-hidden');
                }, 300);
            }
        });
    });

    // Search toggle for mobile
    if (searchToggleBtn && searchInputWrapper && searchInput) {
        searchToggleBtn.addEventListener('click', () => {
            searchInputWrapper.classList.toggle('hidden');
            if (!searchInputWrapper.classList.contains('hidden')) {
                searchInput.focus(); // Focus on input when shown
            } else {
                searchInput.value = ''; // Clear input when hiding
                loadContent('home'); // Reload home content if search is cleared/hidden
            }
        });
    }

    // Search input functionality
    if (searchInput && movieSectionsContainer && heroSection) {
        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query.length > 2) { // Require at least 3 characters for search
                    movieSectionsContainer.innerHTML = ''; // Clear existing content
                    heroSection.classList.add('hidden-hero'); // Hide hero during search
                    clearInterval(heroInterval); // Stop hero carousel

                    try {
                        const searchResults = await fetchData(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
                        const allResults = [...(searchResults.movies || []), ...(searchResults.series || [])];

                        if (allResults.length > 0) {
                            // Create a new section for search results
                            const searchSectionDiv = document.createElement('div');
                            searchSectionDiv.className = 'movie-section mb-8';
                            searchSectionDiv.innerHTML = `<h2 class="text-xl md:text-2xl font-bold mb-4 text-white">Search Results for "${query}"</h2><div class="movie-grid-category grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4"></div>`;
                            const searchGrid = searchSectionDiv.querySelector('.movie-grid-category');

                            allResults.forEach(item => {
                                if (item.imdbID && item.type) {
                                    searchGrid.appendChild(createMovieCard(item));
                                }
                            });
                            movieSectionsContainer.appendChild(searchSectionDiv); // Append the new search section
                        } else {
                            const noResultsDiv = document.createElement('div');
                            noResultsDiv.className = 'movie-section p-4 md:p-8 text-center text-gray-400';
                            noResultsDiv.innerHTML = `<p>No results found for "${query}".</p>`;
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
                // Optionally hide search input after search on mobile
                if (window.innerWidth < 768) { // md breakpoint
                    searchInputWrapper.classList.add('hidden');
                }
            }
        });
    }


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
                await fetchAndDisplaySection('Best Series', `${API_BASE_URL}/series/best`); // NEW: Best Series section
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

                    userList.items.forEach(item => {
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
                        mylistGrid.appendChild(card);
                    });
                    movieSectionsContainer.appendChild(mylistSection);
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
