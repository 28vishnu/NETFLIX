// Filename: script.js
// This script handles all frontend interactions, dynamic content loading,
// and communication with the backend API.

console.log("script.js loaded successfully!");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired!");

    // Base URL for your backend API
    const API_BASE_URL = 'http://localhost:3000/api';
    // OMDb API Key for fetching hero section details directly
    // This key is loaded from the .env file in the backend, but for the frontend
    // we use the provided key directly as it's client-side.
    const OMDB_API_KEY = '48bff862'; // *** Your OMDb API Key ***

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
    const closeOverlayBtn = document.querySelector('.close-overlay-btn');
    const messageBox = document.getElementById('message-box');

    // Mobile Navigation Elements
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const mobileNavCloseBtn = document.getElementById('mobile-nav-close-btn');
    const mobileNavLinks = mobileNavOverlay.querySelectorAll('.nav-link'); // Links inside mobile nav

    // --- Global Variables ---
    let currentHeroSlide = 0;
    let heroInterval;
    let lastScrollY = 0; // For header hide/show on scroll

    // --- Utility Functions ---

    /**
     * Displays a loading indicator.
     */
    const showLoading = () => {
        loadingIndicator.classList.remove('hidden');
    };

    /**
     * Hides the loading indicator.
     */
    const hideLoading = () => {
        loadingIndicator.classList.add('hidden');
    };

    /**
     * Displays a temporary message to the user.
     * @param {string} message - The message to display.
     * @param {number} duration - How long to display the message in milliseconds.
     */
    const showMessageBox = (message, duration = 3000) => {
        messageBox.textContent = message;
        messageBox.classList.add('show');
        setTimeout(() => {
            messageBox.classList.remove('show');
        }, duration);
    };

    /**
     * Creates a movie/series card element.
     * @param {object} item - The movie/series data object.
     * @returns {HTMLElement} The created movie card div.
     */
    const createMovieCard = (item) => {
        const card = document.createElement('div');
        card.className = 'movie-card relative rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-300 ease-in-out';
        card.dataset.id = item.imdbID; // Store IMDb ID for detail fetching
        card.dataset.type = item.type; // Store type (movie/series)

        // Use a placeholder image if the poster is 'N/A' or an empty string
        const posterUrl = item.poster && item.poster !== 'N/A' ? item.poster : 'https://placehold.co/300x450/000000/FFFFFF?text=No+Image';

        card.innerHTML = `
            <img src="${posterUrl}" alt="${item.title} Poster" class="w-full h-auto object-cover rounded-md" onerror="this.onerror=null;this.src='https://placehold.co/300x450/000000/FFFFFF?text=No+Image';">
            <div class="movie-card-info absolute bottom-0 left-0 right-0 p-3 text-white">
                <h3 class="text-sm font-semibold truncate">${item.title}</h3>
                <p class="text-xs text-gray-400">${item.year}</p>
            </div>
        `;

        card.addEventListener('click', () => {
            showDetailsOverlay(card.dataset.id, card.dataset.type);
        });

        return card;
    };

    /**
     * Fetches and displays a section of movies or series.
     * @param {string} title - The title of the section (e.g., "Trending Now").
     * @param {string} endpoint - The API endpoint to fetch data from.
     */
    const fetchAndDisplaySection = async (title, endpoint) => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'movie-section p-4 md:p-8 pt-20'; // Adjusted padding for sections
        sectionDiv.innerHTML = `<h2 class="text-xl md:text-2xl font-bold mb-4">${title}</h2><div class="movie-row flex space-x-3 overflow-x-auto scrollbar-hide pb-4"></div>`;
        const movieRow = sectionDiv.querySelector('.movie-row');

        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data && data.length > 0) {
                data.forEach(item => {
                    movieRow.appendChild(createMovieCard(item));
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
     * @param {string} id - The IMDb ID of the movie/series.
     * @param {string} type - The type of content ('movie' or 'series').
     */
    const showDetailsOverlay = async (id, type) => {
        showLoading(); // Show loading indicator
        try {
            let endpoint = '';
            if (type === 'movie') {
                endpoint = `${API_BASE_URL}/movies/${id}`;
            } else if (type === 'series') {
                endpoint = `${API_BASE_URL}/series/${id}`;
            } else {
                console.error('Unknown content type:', type);
                showMessageBox('Error: Unknown content type.');
                return;
            }

            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data) {
                // Use a placeholder image if the poster is 'N/A' or an empty string
                const overlayPosterUrl = data.poster && data.poster !== 'N/A' ? data.poster : 'https://placehold.co/300x450/000000/FFFFFF?text=No+Image';
                document.getElementById('overlay-poster').src = overlayPosterUrl;
                document.getElementById('overlay-poster').onerror = function() {
                    this.onerror=null;
                    this.src='https://placehold.co/300x450/000000/FFFFFF?text=No+Image';
                };

                document.getElementById('overlay-title').textContent = data.title;
                document.getElementById('overlay-plot').textContent = data.plot;
                // Ensure genre is displayed correctly, handling both array and string formats
                document.getElementById('overlay-genre').textContent = Array.isArray(data.genre) ? data.genre.join(', ') : data.genre || 'N/A';
                document.getElementById('overlay-released').textContent = data.released || 'N/A';
                document.getElementById('overlay-runtime').textContent = data.runtime || 'N/A';
                document.getElementById('overlay-rating').textContent = data.imdbRating || 'N/A';

                detailOverlayContainer.classList.add('active'); // Use 'active' class for transition
                detailOverlayContainer.style.display = 'flex'; // Ensure it's visible for transition
                document.body.classList.add('overflow-hidden'); // Prevent scrolling body
            } else {
                console.error('No data received for details overlay.');
                showMessageBox('Error fetching details: No data received.');
            }

        } catch (error) {
            console.error('Error fetching details:', error);
            showMessageBox('Error fetching details. Please try again.');
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
        }, 300); // Matches the CSS transition duration
    };

    // --- Hero Section (Carousel) Functions ---
    /**
     * Fetches hero movies and populates the hero section.
     */
    const fetchHeroMovies = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/movies/trending`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data && data.length > 0) {
                // Take top 5 for hero slides
                const heroMovies = data.slice(0, 5);
                heroSlidesContainer.innerHTML = '';
                heroDotsContainer.innerHTML = '';

                heroMovies.forEach((movie, index) => {
                    const slide = document.createElement('div');
                    slide.className = 'hero-slide';
                    // Use a placeholder if the poster is 'N/A' or an empty string
                    const slidePosterUrl = movie.poster && movie.poster !== 'N/A' ? movie.poster : 'https://placehold.co/1920x1080/000000/FFFFFF?text=No+Hero+Image';
                    slide.style.backgroundImage = `url('${slidePosterUrl}')`;
                    slide.dataset.id = movie.imdbID;
                    slide.dataset.type = movie.type;

                    slide.innerHTML = `
                        <div class="absolute inset-0"></div>
                        <div class="hero-text-content">
                            <h1 class="text-4xl md:text-6xl font-bold mb-4">${movie.title}</h1>
                            <p class="text-lg md:text-xl mb-6 line-clamp-3">${movie.plot}</p>
                            <div class="flex space-x-4">
                                <button class="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-300 transition-colors flex items-center" onclick="showDetailsOverlay('${movie.imdbID}', '${movie.type}')">
                                    <i class="fas fa-play mr-2"></i> Play
                                </button>
                                <button class="bg-gray-700 text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-600 transition-colors flex items-center" onclick="showMessageBox('Added to My List (functionality not implemented)')">
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

                startHeroCarousel();
            } else {
                heroSection.innerHTML = '<p class="text-center text-red-500">No trending movies found for hero section.</p>';
            }
        } catch (error) {
            console.error('Error fetching hero movies:', error);
            heroSection.innerHTML = '<p class="text-center text-red-500">Error loading hero content. Please try again later.</p>';
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

    // --- Event Listeners ---

    // Header scroll effect
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

    // Navigation links click handler
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            const contentType = link.dataset.content;
            loadContent(contentType);

            // Close mobile nav if open
            mobileNavOverlay.classList.remove('active');
            mobileNavOverlay.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        });
    });

    // Mobile menu toggle
    mobileMenuToggle.addEventListener('click', () => {
        mobileNavOverlay.classList.remove('hidden');
        mobileNavOverlay.classList.add('active');
        document.body.classList.add('overflow-hidden'); // Prevent body scroll
    });

    // Close mobile nav
    mobileNavCloseBtn.addEventListener('click', () => {
        mobileNavOverlay.classList.remove('active');
        // Delay hiding to allow transition
        setTimeout(() => {
            mobileNavOverlay.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }, 300);
    });

    // Mobile nav links click handler (inside overlay)
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const contentType = link.dataset.content;
            loadContent(contentType);
            mobileNavOverlay.classList.remove('active');
            // Delay hiding to allow transition
            setTimeout(() => {
                mobileNavOverlay.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            }, 300);
        });
    });


    // Search toggle for mobile
    searchToggleBtn.addEventListener('click', () => {
        searchInputWrapper.classList.toggle('hidden');
        if (!searchInputWrapper.classList.contains('hidden')) {
            searchInput.focus(); // Focus on input when shown
        }
    });

    // Search input functionality (simplified for now)
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                showMessageBox(`Searching for "${query}" (functionality not implemented)`);
                // In a real app, you'd call a search API endpoint here
            }
            searchInput.value = ''; // Clear input
            // Optionally hide search input after search on mobile
            if (window.innerWidth < 768) { // md breakpoint
                searchInputWrapper.classList.add('hidden');
            }
        }
    });

    // Hero carousel navigation
    heroNextBtn.addEventListener('click', nextSlide);
    heroPrevBtn.addEventListener('click', prevSlide);

    // Close detail overlay
    closeOverlayBtn.addEventListener('click', closeDetailsOverlay);
    // Close overlay if clicking outside the content
    detailOverlayContainer.addEventListener('click', (e) => {
        if (e.target === detailOverlayContainer) {
            closeDetailsOverlay();
        }
    });

    // --- Initial Content Load ---

    /**
     * Loads content based on the specified type (home, movies, series, mylist).
     * @param {string} contentType - The type of content to load.
     */
    const loadContent = async (contentType) => {
        showLoading();
        movieSectionsContainer.innerHTML = ''; // Clear previous content

        // Hide hero section for non-home pages
        if (contentType !== 'home') {
            heroSection.classList.add('hidden-hero');
            // Clear hero interval when hero section is hidden
            clearInterval(heroInterval);
            console.log('Hero section is being hidden for non-home page.');
        } else {
            heroSection.classList.remove('hidden-hero');
            // Restart hero carousel if returning to home
            startHeroCarousel();
            console.log('Hero section is being shown for home page.');
        }

        try {
            if (contentType === 'home') {
                // For home, display hero and then popular sections
                await fetchHeroMovies(); // This will also start the carousel
                await fetchAndDisplaySection('Most Popular Movies', `${API_BASE_URL}/movies/popular`);
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
                await fetchAndDisplaySection('All Movies', `${API_BASE_URL}/movies`);
            } else if (contentType === 'series') {
                await fetchAndDisplaySection('All Series', `${API_BASE_URL}/series`);
            } else if (contentType === 'mylist') {
                await fetchAndDisplaySection('My List', `${API_BASE_URL}/mylist`);
            }
        } catch (error) {
            console.error(`Error loading ${contentType} content:`, error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'movie-section p-4 md:p-8 pt-20 text-center text-red-500';
            errorDiv.innerHTML = `<p>Error loading ${contentType} content. Please try again later.</p>`;
            movieSectionsContainer.appendChild(errorDiv);
        } finally {
            // Ensure loading indicator is hidden even if errors occur
            hideLoading();
        }
    };

    // Load home content initially
    loadContent('home');
});
