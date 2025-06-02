// Filename: script.js
// This script handles all frontend interactions, dynamic content loading,
// and communication with the backend API.

console.log("script.js loaded successfully!");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired!");

    // Base URL for your backend API
    // *** YOU MUST CHANGE THIS LINE ***
    const API_BASE_URL = 'https://netflix-ydfu.onrender.com'; // <--- CHANGE THIS TO YOUR RENDER URL
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

    let heroMovies = []; // Stores data for the hero carousel
    let currentHeroSlide = 0; // Tracks the current slide index
    let heroSlideInterval; // Holds the interval for auto-sliding

    // Example movie/TV show titles for the hero section.
    // These will be used to fetch details from OMDb.
    const heroContentTitles = [
        { title: 'Dune', type: 'movie' },
        { title: 'Oppenheimer', type: 'movie' },
        { title: 'Barbie', type: 'movie' },
        { title: 'Spider-Man: Into the Spider-Verse', type: 'movie' },
        { title: 'Guardians of the Galaxy', type: 'movie' },
        { title: 'The Super Mario Bros. Movie', type: 'movie' },
        { title: 'Wonka', type: 'movie' },
        { title: 'Mission: Impossible - Fallout', type: 'movie' },
        { title: 'Breaking Bad', type: 'series' },
        { title: 'Stranger Things', type: 'series' }
    ];

    // --- Utility Functions ---

    /**
     * Shows the global loading indicator.
     */
    function showLoading() {
        if (loadingIndicator) {
            loadingIndicator.classList.remove('hidden');
            loadingIndicator.style.opacity = '1'; // Ensure it fades in
        }
    }

    /**
     * Hides the global loading indicator.
     */
    function hideLoading() {
        if (loadingIndicator) {
            loadingIndicator.style.opacity = '0'; // Start fade out
            // Use a timeout to ensure the transition completes before adding 'hidden'
            setTimeout(() => {
                loadingIndicator.classList.add('hidden');
            }, 300); // Matches the CSS transition duration
        }
    }

    /**
     * Fetches data from a given URL.
     * @param {string} url - The URL to fetch from.
     * @returns {Promise<Object>} - A promise that resolves to the JSON data.
     */
    async function fetchData(url) {
        showLoading(); // Show loading indicator before fetch
        try {
            const response = await fetch(url);
            if (!response.ok) {
                // Attempt to parse error message from response body
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                console.error(`HTTP error! Status: ${response.status}, URL: ${url}, Message: ${errorData.error || errorData.message || response.statusText}`);
                throw new Error(`Failed to fetch data from ${url}: ${errorData.error || errorData.message || response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        } finally {
            hideLoading(); // Hide loading indicator after fetch (success or failure)
        }
    }

    /**
     * Creates a movie card element.
     * @param {Object} item - The movie/series data object.
     * @param {string} type - 'movie' or 'series'.
     * @returns {HTMLElement} - The created div element for the movie card.
     */
    function createMovieCard(item, type) {
        const card = document.createElement('div');
        card.className = 'movie-card relative flex-shrink-0 w-32 md:w-40 lg:w-48 rounded-md overflow-hidden cursor-pointer transform transition-transform duration-300 hover:scale-105 hover:z-10 group';
        // Use imdbID for detail fetching
        card.dataset.imdbId = item.imdbID; 
        card.dataset.type = type; 

        // Fallback image if Poster is 'N/A' or missing
        const posterUrl = item.poster && item.poster !== 'N/A' ? item.poster : `https://placehold.co/300x450/000000/FFFFFF?text=${encodeURIComponent(item.title || 'No Title')}`;

        card.innerHTML = `
            <img src="${posterUrl}" alt="${item.title || 'No Title'} Poster" class="w-full h-48 md:h-60 lg:h-72 object-cover rounded-md" onerror="this.onerror=null;this.src='https://placehold.co/300x450/000000/FFFFFF?text=No+Poster';">
            <div class="movie-card-info absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/70 to-transparent p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <h3 class="text-sm md:text-base font-semibold truncate">${item.title || 'No Title'}</h3>
                <p class="text-xs text-gray-400">${item.year || 'N/A'}</p>
            </div>
        `;

        card.addEventListener('click', () => showDetailOverlay(item.imdbID, type)); // Use imdbID
        return card;
    }

    /**
     * Displays a temporary message box.
     * @param {string} message - The message to display.
     * @param {string} type - 'success', 'error', or 'info'.
     */
    function showMessageBox(message, type = 'info') {
        const messageBox = document.createElement('div');
        messageBox.className = `fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg text-white font-semibold text-center z-[9999] opacity-0 transition-opacity duration-300`;

        if (type === 'success') {
            messageBox.classList.add('bg-green-600');
        } else if (type === 'error') {
            messageBox.classList.add('bg-red-600');
        } else {
            messageBox.classList.add('bg-blue-600');
        }

        messageBox.textContent = message;
        document.body.appendChild(messageBox);

        setTimeout(() => {
            messageBox.style.opacity = '1';
        }, 10); // Small delay to trigger CSS transition

        setTimeout(() => {
            messageBox.style.opacity = '0';
            messageBox.addEventListener('transitionend', () => messageBox.remove());
        }, 3000);
    }


    // --- Hero Section Carousel Logic ---

    /**
     * Fetches details for hero content (movies/TV) and populates the carousel.
     */
    async function fetchHeroMovies() {
        heroMovies = [];
        for (const content of heroContentTitles) {
            try {
                // Fetch from OMDb directly for hero section to get rich details
                // This still uses the OMDb API Key directly in the frontend, which is fine for this use case.
                const data = await fetchData(`http://www.omdbapi.com/?t=${encodeURIComponent(content.title)}&plot=full&apikey=${OMDB_API_KEY}`);
                if (data.Response === 'True') {
                    // Map OMDb data to a consistent structure for hero display
                    const heroItem = {
                        imdbID: data.imdbID,
                        title: data.Title,
                        plot: data.Plot,
                        poster: data.Poster, // OMDb provides full URL
                        type: data.Type // 'movie' or 'series'
                    };
                    heroMovies.push(heroItem);
                } else {
                    console.warn(`Could not fetch hero content details for "${content.title}": ${data.Error}`);
                }
            } catch (error) {
                console.error(`Error fetching hero content "${content.title}":`, error);
            }
        }
        renderHeroSlides();
        startHeroSlideShow();
    }

    /**
     * Renders the hero carousel slides and dots.
     */
    function renderHeroSlides() {
        if (!heroSlidesContainer) {
            console.error("Error: heroSlidesContainer is null inside renderHeroSlides. Cannot render hero slides.");
            return;
        }
        heroSlidesContainer.innerHTML = '';

        if (!heroDotsContainer) {
            console.error("Error: heroDotsContainer is null inside renderHeroSlides. Cannot update hero dots.");
        } else {
            heroDotsContainer.innerHTML = '';
        }
        

        heroMovies.forEach((movie, index) => {
            const slide = document.createElement('div');
            slide.className = 'hero-slide relative flex-shrink-0 w-full h-full bg-cover bg-center flex items-end';
            // Fallback image for hero if Poster is N/A
            const posterUrl = movie.poster && movie.poster !== 'N/A' ? movie.poster : 'https://placehold.co/1200x800/000000/FFFFFF?text=Featured+Content';
            
            // Set background image via style, then add a hidden img for onerror
            slide.style.backgroundImage = `url('${posterUrl}')`;

            slide.innerHTML = `
                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
                <div class="absolute bottom-0 left-0 p-4 md:p-8 text-white w-full md:w-2/3 lg:w-1/2">
                    <h2 class="text-3xl md:text-5xl font-bold mb-2">${movie.title || 'No Title'}</h2>
                    <p class="text-sm md:text-base mb-4 line-clamp-3">${movie.plot || 'No description available.'}</p>
                    <div class="flex space-x-3">
                        <button class="bg-white text-black px-4 py-2 rounded-md font-semibold hover:bg-gray-300 transition-colors flex items-center">
                            <i class="fas fa-play mr-2"></i> Play
                        </button>
                        <button class="bg-gray-700 text-white px-4 py-2 rounded-md font-semibold hover:bg-gray-600 transition-colors flex items-center" data-imdb-id="${movie.imdbID}" data-type="${movie.type}">
                            <i class="fas fa-info-circle mr-2"></i> More Info
                        </button>
                    </div>
                </div>
                <img src="${posterUrl}" style="display:none;" onerror="this.onerror=null;this.parentNode.style.backgroundImage='url(https://placehold.co/1200x800/000000/FFFFFF?text=Featured+Content)';">
            `;
            heroSlidesContainer.appendChild(slide);

            // Only append dot if heroDotsContainer exists
            if (heroDotsContainer) {
                const dot = document.createElement('span');
                dot.className = `h-2 w-2 bg-gray-600 rounded-full cursor-pointer transition-colors duration-300 ${index === currentHeroSlide ? 'bg-white' : ''}`;
                dot.dataset.slideIndex = index;
                dot.addEventListener('click', () => goToHeroSlide(index));
                heroDotsContainer.appendChild(dot);
            }
        });

        // Attach event listeners to "More Info" buttons in hero slides
        heroSlidesContainer.querySelectorAll('button[data-imdb-id]').forEach(button => {
            button.addEventListener('click', (e) => {
                const imdbId = e.currentTarget.dataset.imdbId;
                const type = e.currentTarget.dataset.type;
                if (imdbId && type) {
                    showDetailOverlay(imdbId, type);
                }
            });
        });

        updateHeroSlidePosition();
        updateHeroDots();
    }

    /**
     * Updates the position of the hero carousel to show the current slide.
     */
    function updateHeroSlidePosition() {
        if (!heroSlidesContainer) return; // Defensive check
        const offset = -currentHeroSlide * 100;
        heroSlidesContainer.style.transform = `translateX(${offset}%)`;
    }

    /**
     * Updates the active dot indicator for the hero carousel.
     */
    function updateHeroDots() {
        if (!heroDotsContainer) { // Defensive check
            console.error("Error: heroDotsContainer is null. Cannot update hero dots.");
            return;
        }
        heroDotsContainer.querySelectorAll('span').forEach((dot, index) => {
            dot.classList.toggle('bg-white', index === currentHeroSlide);
            dot.classList.toggle('bg-gray-600', index !== currentHeroSlide);
        });
    }

    /**
     * Navigates to a specific hero slide.
     * @param {number} index - The index of the slide to go to.
     */
    function goToHeroSlide(index) {
        if (index >= 0 && index < heroMovies.length) {
            currentHeroSlide = index;
            updateHeroSlidePosition();
            updateHeroDots();
            resetHeroSlideShow(); // Reset timer on manual navigation
        }
    }

    /**
     * Navigates to the next hero slide.
     */
    function nextHeroSlide() {
        currentHeroSlide = (currentHeroSlide + 1) % heroMovies.length;
        updateHeroSlidePosition();
        updateHeroDots();
    }

    /**
     * Navigates to the previous hero slide.
     */
    function prevHeroSlide() {
        currentHeroSlide = (currentHeroSlide - 1 + heroMovies.length) % heroMovies.length;
        updateHeroSlidePosition();
        updateHeroDots();
    }

    /**
     * Starts the automatic hero slideshow.
     */
    function startHeroSlideShow() {
        clearInterval(heroSlideInterval); // Clear any existing interval
        heroSlideInterval = setInterval(nextHeroSlide, 5000); // Change slide every 5 seconds
    }

    /**
     * Resets the automatic hero slideshow timer.
     */
    function resetHeroSlideShow() {
        clearInterval(heroSlideInterval);
        startHeroSlideShow();
    }

    // Hero navigation button event listeners
    if (heroNextBtn) {
        heroNextBtn.addEventListener('click', () => {
            nextHeroSlide();
            resetHeroSlideShow();
        });
    } else {
        console.warn("heroNextBtn not found, cannot attach click listener.");
    }

    if (heroPrevBtn) {
        heroPrevBtn.addEventListener('click', () => {
            prevHeroSlide();
            resetHeroSlideShow();
        });
    } else {
        console.warn("heroPrevBtn not found, cannot attach click listener.");
    }


    // --- Main Content Loading Logic ---

    /**
     * Loads content (movies/series) into the main sections based on category.
     * @param {string} categoryType - 'home', 'movie', 'series', or 'mylist'.
     */
    async function loadMainContent(categoryType) {
        movieSectionsContainer.innerHTML = ''; // Clear previous content
        
        // Ensure heroSection exists before trying to manipulate its classList
        if (heroSection) {
            heroSection.classList.add('hidden'); // Hide hero section initially
        } else {
            console.warn("Hero section element not found.");
        }


        if (categoryType === 'home') {
            if (heroSection) { // Check again before removing hidden class
                heroSection.classList.remove('hidden'); // Show hero section on home
            }
            await fetchHeroMovies(); // Fetch and render hero movies
            // Note: The genre names here should match the actual genres in your database
            // which are now populated from OMDb and stored as an array of strings.
            await loadCategorySection('Trending Now (Movies)', `${API_BASE_URL}/api/movies`, 'movie'); // Adjusted endpoint
            await loadCategorySection('Popular Series', `${API_BASE_URL}/api/series`, 'series'); // Adjusted endpoint
            await loadCategorySection('Action Movies', `${API_BASE_URL}/api/movies/genre/Action`, 'movie'); // Adjusted endpoint
            await loadCategorySection('Comedy Films', `${API_BASE_URL}/api/movies/genre/Comedy`, 'movie'); // Adjusted endpoint
            await loadCategorySection('Drama Series', `${API_BASE_URL}/api/series/genre/Drama`, 'series'); // Adjusted endpoint
            await loadCategorySection('Sci-Fi Movies', `${API_BASE_URL}/api/movies/genre/Sci-Fi`, 'movie'); // Adjusted endpoint
            await loadCategorySection('Animation Series', `${API_BASE_URL}/api/series/genre/Animation`, 'series'); // Adjusted endpoint
            await loadCategorySection('Horror Films', `${API_BASE_URL}/api/movies/genre/Horror`, 'movie'); // Adjusted endpoint
            await loadCategorySection('Fantasy Movies', `${API_BASE_URL}/api/movies/genre/Fantasy`, 'movie'); // Adjusted endpoint
            await loadCategorySection('Crime Series', `${API_BASE_URL}/api/series/genre/Crime`, 'series'); // Adjusted endpoint
        } else if (categoryType === 'movie') {
            await loadCategorySection('All Movies', `${API_BASE_URL}/api/movies`, 'movie', true); // Full grid for all movies (Adjusted endpoint)
        } else if (categoryType === 'series') {
            await loadCategorySection('All Series', `${API_BASE_URL}/api/series`, 'series', true); // Full grid for all series (Adjusted endpoint)
        } else if (categoryType === 'mylist') {
            await loadCategorySection('My List', `${API_BASE_URL}/api/mylist`, 'movie', true); // My List can contain both, default to movie card type (Adjusted endpoint)
        }

        // hideLoading() is called by fetchData's finally block
    }

    /**
     * Loads a section of movies/series from the API and displays them.
     * @param {string} sectionTitle - The title of the section (e.g., "Trending Now").
     * @param {string} apiUrl - The API endpoint to fetch data from.
     * @param {string} itemType - 'movie' or 'series'.
     * @param {boolean} isGridCategory - If true, displays as a full grid instead of a scrollable carousel.
     */
    async function loadCategorySection(sectionTitle, apiUrl, itemType, isGridCategory = false) {
        try {
            const data = await fetchData(apiUrl); // fetchData already handles loading indicator
            let items = [];

            // Adjust based on API response structure (e.g., /api/search returns {movies, series})
            if (apiUrl.includes('/api/search')) {
                items = [...(data.movies || []), ...(data.series || [])];
            } else {
                items = data; // Direct array of items
            }

            if (items && items.length > 0) {
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'movie-section mb-8';

                // Section title
                const titleElement = document.createElement('h2');
                titleElement.className = 'text-xl md:text-2xl font-bold mb-4 text-white';
                titleElement.textContent = sectionTitle;
                sectionDiv.appendChild(titleElement);

                // Container for movie cards
                const cardsContainer = document.createElement('div');
                if (isGridCategory) {
                    // Use a grid layout for "All Movies" / "All Series" pages
                    cardsContainer.className = 'movie-grid-category grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4';
                } else {
                    // Use a horizontal scrollable carousel for home page sections
                    cardsContainer.className = 'flex overflow-x-scroll scrollbar-hide space-x-2 md:space-x-4 pb-4';
                }

                items.forEach(item => {
                    // Ensure item.title and item.imdbID exist before creating a card
                    if (item.title && item.imdbID) { 
                        cardsContainer.appendChild(createMovieCard(item, item.type)); // Pass item.type
                    }
                });

                sectionDiv.appendChild(cardsContainer);
                movieSectionsContainer.appendChild(sectionDiv);
            } else {
                // Display a message if no content is found for a section
                const noContentDiv = document.createElement('div');
                noContentDiv.className = 'movie-section p-4 md:p-8 text-center text-gray-400';
                noContentDiv.innerHTML = `<p>No content found for "${sectionTitle}".</p>`;
                movieSectionsContainer.appendChild(noContentDiv);
            }
        } catch (error) {
            // Display general error message if fetch fails
            const errorDiv = document.createElement('div');
            errorDiv.className = 'movie-section p-4 md:p-8 pt-20 text-center text-red-500';
            errorDiv.innerHTML = `<p>Failed to load content for "${sectionTitle}" from our servers. Please try again later.</p>`;
            movieSectionsContainer.appendChild(errorDiv);
            console.error(`Failed to load content for ${sectionTitle}:`, error);
        }
    }

    // --- Detail Overlay Logic ---

    /**
     * Shows a detailed overlay for a specific movie or series.
     * @param {string} imdbId - The IMDb ID of the item.
     * @param {string} type - 'movie' or 'series'.
     */
    async function showDetailOverlay(imdbId, type) {
        detailOverlayContainer.innerHTML = ''; // Clear previous overlay content
        detailOverlayContainer.classList.add('active'); // Activate overlay for fade-in

        try {
            // Fetch details from your backend using imdbID
            // Adjusted endpoint for detail fetching
            const detail = await fetchData(`${API_BASE_URL}/api/${type}s/${imdbId}`); // fetchData already handles loading indicator

            if (detail) {
                const overlay = document.createElement('div');
                overlay.className = 'detail-overlay-content relative bg-[#1a1a1a] rounded-lg shadow-xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden';

                // Fallback image if Poster is N/A
                const posterUrl = detail.poster && detail.poster !== 'N/A' ? detail.poster : `https://placehold.co/400x600/000000/FFFFFF?text=${encodeURIComponent(detail.title || 'No Title')}`;

                overlay.innerHTML = `
                    <button class="absolute top-3 right-3 text-white text-3xl font-bold z-10 close-overlay-btn">
                        &times;
                    </button>

                    <div class="md:w-1/3 flex-shrink-0">
                        <img src="${posterUrl}" alt="${detail.title || 'No Title'} Poster" class="w-full h-auto object-cover md:h-full rounded-t-lg md:rounded-l-lg md:rounded-t-none" onerror="this.onerror=null;this.src='https://placehold.co/400x600/000000/FFFFFF?text=No+Poster';">
                    </div>

                    <div class="md:w-2/3 p-6 text-white overflow-y-auto max-h-[80vh]">
                        <h2 class="text-3xl md:text-4xl font-bold mb-2">${detail.title || 'N/A'}</h2>
                        <p class="text-gray-400 text-sm mb-4">
                            ${detail.year || 'N/A'} | ${detail.rated || 'N/A'} | ${detail.runtime || 'N/A'} | ${detail.genre ? detail.genre.join(', ') : 'N/A'}
                        </p>
                        <p class="mb-4 text-base">${detail.plot || 'No plot available.'}</p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-6">
                            <p><strong>Director:</strong> ${detail.director || 'N/A'}</p>
                            <p><strong>Writer:</strong> ${detail.writer || 'N/A'}</p>
                            <p><strong>Actors:</strong> ${detail.actors || 'N/A'}</p>
                            <p><strong>Language:</strong> ${detail.language || 'N/A'}</p>
                            <p><strong>Country:</strong> ${detail.country || 'N/A'}</p>
                            <p><strong>Awards:</strong> ${detail.awards || 'N/A'}</p>
                            <p><strong>IMDb Rating:</strong> ${detail.imdbRating || 'N/A'}</p>
                            <p><strong>IMDb ID:</strong> ${detail.imdbID || 'N/A'}</p>
                            ${type === 'series' && detail.totalSeasons ? `<p><strong>Total Seasons:</strong> ${detail.totalSeasons}</p>` : ''}
                        </div>
                        <div class="flex space-x-4">
                            <button class="bg-red-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-red-700 transition-colors flex items-center">
                                <i class="fas fa-play mr-2"></i> Play
                            </button>
                            <button class="bg-gray-700 text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-600 transition-colors flex items-center add-to-list-btn">
                                <i class="fas fa-plus mr-2"></i> Add to My List
                            </button>
                        </div>
                    </div>
                `;
                detailOverlayContainer.appendChild(overlay);

                // Add event listener to close button
                detailOverlayContainer.querySelector('.close-overlay-btn').addEventListener('click', () => {
                    detailOverlayContainer.classList.remove('active'); // Deactivate overlay for fade-out
                    setTimeout(() => detailOverlayContainer.innerHTML = '', 300); // Clear content after transition
                });

                // Add event listener for clicking outside the content to close
                detailOverlayContainer.addEventListener('click', (e) => {
                    if (e.target === detailOverlayContainer) {
                        detailOverlayContainer.classList.remove('active');
                        setTimeout(() => detailOverlayContainer.innerHTML = '', 300);
                    }
                });

                // Add to My List button functionality (placeholder)
                detailOverlayContainer.querySelector('.add-to-list-btn').addEventListener('click', () => {
                    showMessageBox('Item added to My List (feature coming soon!)', 'success');
                });

            } else {
                showMessageBox('Failed to load details for this title.', 'error');
                detailOverlayContainer.classList.remove('active'); // Hide overlay if no detail
                setTimeout(() => detailOverlayContainer.innerHTML = '', 300);
            }
        } catch (error) {
            showMessageBox('Error fetching details. Please try again.', 'error');
            detailOverlayContainer.classList.remove('active'); // Hide overlay on error
            setTimeout(() => detailOverlayContainer.innerHTML = '', 300);
            console.error('Error in showDetailOverlay:', error);
        }
    }


    // --- Navigation Links Event Listeners ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            const categoryType = link.dataset.categoryType; // Get the category type from data-attribute

            // Remove 'active' class from all nav links and add to the clicked one
            navLinks.forEach(nav => nav.classList.remove('active'));
            link.classList.add('active');

            // Load content based on the selected category
            loadMainContent(categoryType);

            // Hide search input if it's open and a nav link is clicked
            if (!searchInputWrapper.classList.contains('hidden')) {
                searchInputWrapper.classList.add('hidden');
                searchInput.value = ''; // Clear search input
            }
        });
    });

    // --- Search Functionality ---

    // Toggle search input visibility
    searchToggleBtn.addEventListener('click', () => {
        searchInputWrapper.classList.toggle('hidden');
        if (!searchInputWrapper.classList.contains('hidden')) {
            searchInput.focus(); // Focus on input when it appears
        } else {
            searchInput.value = ''; // Clear input when hiding
            loadMainContent('home'); // Reload home content if search is cleared/hidden
        }
    });

    // Perform search on Enter key press
    searchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query.length > 2) { // Require at least 3 characters for search
                movieSectionsContainer.innerHTML = ''; // Clear existing content
                if (heroSection) { // Check before manipulating
                    heroSection.classList.add('hidden'); // Hide hero during search
                }

                try {
                    // Adjusted endpoint for search
                    const searchResults = await fetchData(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
                    // hideLoading() is called by fetchData's finally block

                    const allResults = [...(searchResults.movies || []), ...(searchResults.series || [])];

                    if (allResults.length > 0) {
                        const searchSection = document.createElement('div');
                        searchSection.className = 'movie-section mb-8';
                        const titleElement = document.createElement('h2');
                        titleElement.className = 'text-xl md:text-2xl font-bold mb-4 text-white';
                        titleElement.textContent = `Search Results for "${query}"`;
                        searchSection.appendChild(titleElement);

                        const cardsContainer = document.createElement('div');
                        cardsContainer.className = 'movie-grid-category grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4';

                        allResults.forEach(item => {
                            if (item.title && item.imdbID) { // Use item.title and item.imdbID
                                cardsContainer.appendChild(createMovieCard(item, item.type)); // Pass item.type
                            }
                        });
                        searchSection.appendChild(cardsContainer);
                        movieSectionsContainer.appendChild(searchSection); 
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
                }
            } else if (query.length > 0) {
                showMessageBox('Please enter at least 3 characters to search.', 'info');
            }
        }
    });


    // --- Sticky Header Scroll Effect ---
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 0) { // If scrolled down at all
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Hide/show header on scroll down/up
        if (window.scrollY > lastScrollY && window.scrollY > 100) {
            header.classList.add('hide-header');
        } else {
            header.classList.remove('hide-header');
        }
        lastScrollY = window.scrollY;
    });

    // --- Initial Load ---
    // Load 'home' content when the page first loads
    loadMainContent('home');

    // Placeholder for user details (you'd integrate authentication here)
    userDetailsSpan.textContent = 'Guest';
    userProfileImg.src = 'https://placehold.co/40x40/FF0000/FFFFFF?text=G'; // Default guest avatar
});
