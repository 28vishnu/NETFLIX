// script.js - Complete Netflix Clone Logic (Frontend with Backend Integration)

// --- Configuration ---
// IMPORTANT: Update this BASE_BACKEND_URL to your backend's address
// If running locally, it's typically 'http://localhost:5000'
const BASE_BACKEND_URL = 'http://localhost:5000'; // <--- UPDATE THIS URL (e.g., if you deploy it) ---
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/'; // Base URL for TMDB images

// Constants for dynamic genre row filtering
const MIN_ITEMS_FOR_GENRE_ROW = 3; // Minimum number of items with valid images for a genre row to be displayed

// --- DOM Elements ---
const appContainer = document.getElementById('app-container');
const mainHeader = document.getElementById('main-header');
const mainNav = document.getElementById('main-nav'); // Desktop nav
const mobileNav = document.getElementById('mobile-nav'); // Mobile nav
const menuToggle = document.getElementById('menu-toggle');
const toggleSearchBtn = document.getElementById('toggle-search');
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn'); // New: Clear search button
const mainContent = document.getElementById('main-content');
const appMessageDiv = document.getElementById('app-message'); // New: App message container

// Pages
const homePage = document.getElementById('home-page');
const moviesPage = document.getElementById('movies-page');
const seriesPage = document.getElementById('series-page');
const myList_page = document.getElementById('my-list-page');
const policiesPage = document.getElementById('policies-page');

// Home page specific elements
const heroSection = document.getElementById('hero-section');
const heroCarouselContainer = document.getElementById('hero-carousel-container'); // New: Carousel container
const heroTitle = document.getElementById('hero-title');
// const heroPlot = document.getElementById('hero-plot'); // Removed as per user request
const heroPlayBtn = document.getElementById('hero-play-btn'); // New: Play button in hero
const heroMoreInfoBtn = document.getElementById('hero-more-info-btn'); // New: More Info button in hero
const heroDotsContainer = document.getElementById('hero-dots-container'); // New: Hero dots container

const featuredMoviesRow = document.getElementById('featured-movies-row');
const featuredSeriesRow = document.getElementById('featured-series-row');
const dynamicGenreRowsContainer = document.getElementById('dynamic-genre-rows');

// Grid containers for movies, series, and my-list
const moviesGrid = document.getElementById('movies-grid');
const seriesGrid = document.getElementById('series-grid');
const myListGrid = document.getElementById('my-list-grid');
const myListEmptyMessage = document.getElementById('my-list-empty-message');

// Modal elements
const contentDetailModal = document.getElementById('content-detail-modal');
const modalCloseBtn = contentDetailModal.querySelector('.modal-close-btn');
const modalBackdrop = contentDetailModal.querySelector('#modal-backdrop');
const modalTitle = contentDetailModal.querySelector('#modal-title');
const modalYear = contentDetailModal.querySelector('#modal-year');
const modalRuntime = contentDetailModal.querySelector('#modal-runtime');
const modalPlot = contentDetailModal.querySelector('#modal-plot');
const modalGenre = contentDetailModal.querySelector('#modal-genre');
const modalDirector = contentDetailModal.querySelector('#modal-director');
const modalActors = contentDetailModal.querySelector('#modal-actors');
const modalImdbRating = contentDetailModal.querySelector('#modal-imdb-rating');
const addToMyListBtn = contentDetailModal.querySelector('#add-to-list-btn');
const addToMyListText = contentDetailModal.querySelector('#add-to-list-text');
const addToMyListIcon = contentDetailModal.querySelector('#add-to-list-icon');
const playBtn = contentDetailModal.querySelector('.play-btn'); // Play button in modal

// Series Episodes section (OMDb does not provide episode lists in this manner, keep hidden)
const modalEpisodesSection = document.getElementById('modal-episodes-section');
const seasonSelect = document.getElementById('season-select'); // Added for season selection
const episodesList = document.getElementById('episodes-list'); // Added for episode list

// Loading spinner elements
const loadingOverlay = document.getElementById('loading-overlay');
const spinner = loadingOverlay.querySelector('.spinner');

// User ID display elements (purely for local persistence demo)
const currentUserIdSpan = document.getElementById('current-user-id');
const mobileUserIdDisplay = document.getElementById('mobile-user-id-display');
const policiesUserIdDisplay = document.getElementById('policies-user-id-display');

// --- Global Variables ---
let currentUserId = localStorage.getItem('netflixCloneUserId') || crypto.randomUUID(); // Unique ID for user persistence
localStorage.setItem('netflixCloneUserId', currentUserId); // Save user ID to localStorage
let myListArr = []; // Array to store user's My List items
let allFetchedContent = []; // To store all fetched content for searching and filtering
let heroCarouselItems = []; // Stores the movie data for the hero banner items
let currentHeroIndex = 0;
let heroCarouselInterval;

// For swipe functionality
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 50; // pixels to count as a swipe


// --- Utility Functions ---

/**
 * Displays a message to the user.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'info'} type - Type of message for styling.
 */
function displayMessage(message, type = 'info') {
    appMessageDiv.textContent = message;
    appMessageDiv.className = `fixed top-20 left-1/2 -translate-x-1/2 bg-opacity-90 text-center py-2 px-4 rounded shadow-lg text-sm z-50 transition-opacity duration-300 ${type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-netflix-red' : 'bg-blue-600'} opacity-100`;
    appMessageDiv.classList.remove('hidden');

    setTimeout(() => {
        appMessageDiv.classList.add('opacity-0');
        appMessageDiv.classList.add('hidden'); // Hide after fade out
    }, 3000);
}

/**
 * Shows the loading spinner overlay.
 */
function showSpinner() {
    loadingOverlay.classList.add('visible');
}

/**
 * Hides the loading spinner overlay.
 */
function hideSpinner() {
    loadingOverlay.classList.remove('visible');
}

/**
 * Makes an API request to the backend.
 * @param {string} path - The API endpoint path.
 * @param {object} [options={}] - Fetch options (method, headers, body).
 * @returns {Promise<any>} - The JSON response from the API.
 */
async function apiRequest(path, options = {}) {
    try {
        const response = await fetch(`${BASE_BACKEND_URL}${path}`, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        // Display a user-friendly error message if backend is unreachable
        if (error.message.includes('Failed to fetch')) {
            displayMessage('Backend is not running or unreachable. Please start the backend server.', 'error');
        } else {
            displayMessage(`An error occurred: ${error.message}`, 'error');
        }
        throw error; // Re-throw to be caught by the caller
    }
}


/**
 * Navigates to a specific page and updates active states.
 * @param {string} pageId - The ID of the page section to navigate to (e.g., 'home-page').
 * @param {boolean} [updateHash=true] - Whether to update the URL hash.
 */
async function navigateTo(pageId, updateHash = true) {
    showSpinner(); // Show spinner on navigation start

    // Clear search bar and input when navigating to a new page
    searchBar.classList.remove('active');
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');

    // Stop hero carousel when navigating away from home
    if (heroCarouselInterval) {
        clearInterval(heroCarouselInterval);
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none'; // Ensure it's truly hidden
    });

    // Deactivate all nav links
    document.querySelectorAll('#main-nav a, #mobile-nav a').forEach(link => {
        link.classList.remove('active');
    });

    // Show the target page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block'; // Make it block before transition
        void targetPage.offsetWidth; // Force reflow for transition to work
        targetPage.classList.add('active');

        // Activate corresponding nav link
        const activeLink = document.querySelector(`[data-page="${pageId.replace('-page', '')}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // Update URL hash
    if (updateHash) {
        window.location.hash = pageId.replace('-page', '');
    }

    // Special handling for content loading
    if (pageId === 'home-page') {
        await fetchAndDisplayHomeContent();
        startHeroCarousel(); // Start carousel only on home page
    } else if (pageId === 'movies-page') {
        const allMovies = await apiRequest('/api/movies');
        populateContent(moviesGrid, allMovies.filter(item => item.Type === 'movie'));
        moviesPage.querySelector('.section-title').textContent = 'All Movies';
    } else if (pageId === 'series-page') {
        const allSeries = await apiRequest('/api/series');
        populateContent(seriesGrid, allSeries.filter(item => item.Type === 'series'));
        seriesPage.querySelector('.section-title').textContent = 'All TV Shows';
    } else if (pageId === 'my-list-page') {
        await fetchUserMyList(); // Ensure My List is fetched from backend
        displayMyList(); // Display my list immediately after fetching
    }
    // No specific content loading for policies page needed

    hideSpinner(); // Hide spinner on navigation end
    // Scroll to top of the page after navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Creates an HTML content card element.
 * @param {object} item - The movie or series data (from MongoDB, OMDb format).
 * @returns {HTMLElement} The created card element.
 */
function createContentCard(item) {
    const card = document.createElement('div');
    card.classList.add('content-card', 'relative', 'rounded-sm', 'overflow-hidden', 'cursor-pointer', 'transition-transform', 'duration-300', 'ease-in-out');

    card.dataset.id = item.imdbID;
    card.dataset.type = item.Type || 'movie'; // Ensure type is always set (OMDb uses 'Type')

    const imageUrl = item.Poster && item.Poster !== 'N/A'
        ? item.Poster
        : 'https://placehold.co/500x750/222222/a0a0a0?text=No+Image'; // Fallback placeholder

    const title = item.Title || 'Untitled';

    // Read the isNetflixOriginal flag directly from the item data from MongoDB
    const isNetflixOriginal = item.isNetflixOriginal || false;

    // Check if item is in My List to set initial icon state
    const isInMyList = myListArr.some(listItem => listItem.imdbID === item.imdbID);
    const addRemoveIcon = isInMyList
        ? `<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16.5 4.478l.276-.276A1.5 1.5 0 0015.65 2H8.35A1.5 1.5 0 007.224 4.19L1.5 9.715V19.5A2.5 2.5 0 004 22h16a2.5 2.5 0 002.5-2.5V9.715L16.5 4.478zM15 8a1 1 0 00-1-1H10a1 1 0 100 2h4a1 1 0 001-1z" clip-rule="evenodd"></path></svg>` // Checkmark icon
        : `<svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>`; // Plus icon

    card.innerHTML = `
        <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='https://placehold.co/500x750/222222/a0a0a0?text=No+Image';">
        <div class="content-card-overlay absolute inset-0 bg-overlay-bg opacity-0 hover:opacity-100 flex flex-col justify-end items-start p-3 transition-opacity duration-300">
            <h3 class="text-white text-base font-semibold mb-1">${title}</h3>
            <div class="card-action-buttons flex space-x-1">
                <button class="content-card-add-btn w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 bg-opacity-70 border border-gray-600 text-white hover:bg-opacity-90 transition-all duration-200">
                    ${addRemoveIcon}
                </button>
                <button class="content-card-info-btn w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 bg-opacity-70 border border-gray-600 text-white hover:bg-opacity-90 transition-all duration-200">
                    <svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.77-1.168a.75.75 0 00-1.06-1.06L10.5 11.439l-1.155-1.154a.75.75 0 00-1.06 1.06L9.44 12.5l-1.154 1.155a.75.75 0 001.06 1.06L10.5 13.561l1.155 1.154a.75.75 0 001.06-1.06L11.56 12.5l1.155-1.154z" clip-rule="evenodd"></path></svg>
                </button>
            </div>
        </div>
        ${isNetflixOriginal ? `
        <div class="netflix-original-label">
            NETFLIX ORIGINAL
        </div>
        ` : ''}
    `;

    // Event listener for the "More Info" button on the card
    const infoButton = card.querySelector('.content-card-info-btn');
    if (infoButton) {
        infoButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent any other click handlers on the card
            openContentDetailModal(item);
        });
    }

    // Event listener for the "Add to My List" button on the card
    const addToListButton = card.querySelector('.content-card-add-btn');
    if (addToListButton) {
        addToListButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent any other click handlers on the card
            toggleMyListItem(item);
        });
    }

    // Remove the general card click that opened the modal, as requested
    // card.addEventListener('click', (event) => { ... }); // REMOVED

    return card;
}

/**
 * Populates a content row or grid with cards.
 * Filters out items without valid posters to prevent broken images.
 * @param {HTMLElement} container - The HTML element to append cards to.
 * @param {Array<object>} items - An array of movie/series data objects (from MongoDB).
 */
function populateContent(container, items) {
    container.innerHTML = ''; // Clear existing content
    const validItems = items.filter(item => item.Poster && item.Poster !== 'N/A');
    validItems.forEach(item => {
        const card = createContentCard(item); // Call without isLargeRow, styling now handled by CSS
        container.appendChild(card);
    });
    // After populating, update all card buttons based on current myListArr state
    updateAllContentCardsMyListState();
}

/**
 * Updates the 'Add to My List' icons on all visible content cards.
 * This should be called after myListArr changes (add/remove from list, or initial fetch).
 */
function updateAllContentCardsMyListState() {
    document.querySelectorAll('.content-card').forEach(card => {
        const imdbID = card.dataset.id;
        const addToListButton = card.querySelector('.content-card-add-btn');
        if (addToListButton) {
            const isInMyList = myListArr.some(listItem => listItem.imdbID === imdbID);
            if (isInMyList) {
                addToListButton.innerHTML = `<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16.5 4.478l.276-.276A1.5 1.5 0 0015.65 2H8.35A1.5 1.5 0 007.224 4.19L1.5 9.715V19.5A2.5 2.5 0 004 22h16a2.5 2.5 0 002.5-2.5V9.715L16.5 4.478zM15 8a1 1 0 00-1-1H10a1 1 0 100 2h4a1 1 0 001-1z" clip-rule="evenodd"></path></svg>`; // Checkmark
            } else {
                addToListButton.innerHTML = `<svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>`; // Plus
            }
        }
    });
}


/**
 * Fetches and displays content for the home page (hero, featured rows, genre rows).
 */
async function fetchAndDisplayHomeContent() {
    showSpinner(); // Show spinner
    try {
        // Fetch all movies and series from backend to populate various sections and for search
        const allMovies = await apiRequest('/api/movies');
        const allSeries = await apiRequest('/api/series');

        // Aggregate all fetched content for search and genre simulation
        // Ensure Type is correctly mapped based on the backend model
        allFetchedContent = [
            ...allMovies.map(item => ({...item, Type: item.Type || 'movie'})),
            ...allSeries.map(item => ({...item, Type: item.Type || 'series'}))
        ].filter(item => item.Poster && item.Poster !== 'N/A'); // Filter out items without valid posters

        // Populate Featured Rows
        // For 'Featured Movies' and 'Featured Series', we'll take a subset of the data.
        populateContent(featuredMoviesRow, allMovies.slice(0, 20));
        populateContent(featuredSeriesRow, allSeries.slice(0, 20));

        // Create Dynamic Genre Rows
        dynamicGenreRowsContainer.innerHTML = ''; // Clear previous genre rows
        const uniqueGenres = new Set();
        allFetchedContent.forEach(item => {
            if (item.Genre && item.Genre !== 'N/A') {
                item.Genre.split(', ').map(g => g.trim()).forEach(genre => {
                    // Exclude 'N/A' as a genre if it was somehow parsed
                    if (g.trim().toLowerCase() !== 'n/a') {
                        uniqueGenres.add(g.trim());
                    }
                });
            }
        });

        for (const genreName of Array.from(uniqueGenres).sort()) { // Sort genres alphabetically
            const genreItems = allFetchedContent.filter(item =>
                item.Genre && item.Genre !== 'N/A' && item.Genre.includes(genreName)
            );

            const validGenreItems = genreItems.filter(item => item.Poster && item.Poster !== 'N/A');

            if (validGenreItems.length >= MIN_ITEMS_FOR_GENRE_ROW) {
                const genreRowWrapper = document.createElement('div');
                genreRowWrapper.classList.add('mt-8', 'pl-4', 'md:pl-16', 'lg:pl-24'); // Add consistent left padding

                const genreTitle = document.createElement('h2');
                genreTitle.classList.add('section-title', 'text-2xl', 'font-bold', 'mb-4');
                genreTitle.textContent = genreName;

                const genreRow = document.createElement('div');
                genreRow.classList.add('content-row'); // The .content-row class handles overflow-x and gap

                populateContent(genreRow, validGenreItems);

                genreRowWrapper.appendChild(genreTitle);
                genreRowWrapper.appendChild(genreRow);
                dynamicGenreRowsContainer.appendChild(genreRowWrapper);
            }
        }

    } catch (error) {
        console.error('Failed to fetch home page content:', error);
        displayMessage('Failed to load home page content. Please try again later.', 'error');
    } finally {
        hideSpinner(); // Hide spinner
    }
}


/**
 * Updates the hero section with details of a featured item.
 * @param {object} item - The featured movie data (from MongoDB).
 */
function updateHeroSection(item) {
    // Use the Poster image from MongoDB data for the hero banner.
    // If it's N/A, fall back to a generic placeholder.
    const imageUrl = item.Poster && item.Poster !== 'N/A'
        ? item.Poster
        : 'https://placehold.co/1920x1080/141414/a0a0a0?text=Netflix+Clone'; // Fallback placeholder

    // Update current hero slide content's background image
    const slides = heroCarouselContainer.querySelectorAll('.hero-slide');
    if (slides[currentHeroIndex]) {
        slides[currentHeroIndex].style.backgroundImage = `url('${imageUrl}')`;
    }

    heroTitle.textContent = item.Title || 'Featured Title';
    // heroPlot.textContent = item.Plot || 'A compelling plot summary goes here.'; // REMOVED as per user request
    heroSection.dataset.id = item.imdbID;
    heroSection.dataset.type = item.Type || 'movie'; // Ensure type is set

    // Update hero button event listeners
    heroPlayBtn.onclick = () => {
        displayMessage(`Playing "${item.Title}"... (Feature not implemented)`, 'info');
    };
    heroMoreInfoBtn.onclick = () => {
        openContentDetailModal(item);
    };
}


/**
 * Initializes and manages the hero carousel.
 * Fetches "trending" movies (latest 5) from the backend.
 */
async function setupHeroCarousel() {
    try {
        // Fetch latest/trending movies for the hero banner from backend
        // Filter to ensure only items with valid posters are considered for the hero
        heroCarouselItems = (await apiRequest('/api/trending-movies'))
                              .filter(item => item.Poster && item.Poster !== 'N/A')
                              .slice(0, 5); // Ensure max 5 items for hero

        if (heroCarouselItems.length === 0) {
            // Fallback if no hero items loaded from backend or no valid posters
            heroTitle.textContent = 'Welcome to Netflix Clone';
            // heroPlot.textContent = 'Discover great movies and series.'; // REMOVED
            heroSection.style.backgroundImage = 'url("https://placehold.co/1920x1080/141414/a0a0a0?text=Netflix+Clone")';
            heroCarouselContainer.innerHTML = ''; // Ensure container is empty
            heroDotsContainer.innerHTML = ''; // Ensure dots is empty
            return;
        }

        heroCarouselContainer.innerHTML = ''; // Clear previous slides
        heroDotsContainer.innerHTML = ''; // Clear previous dots

        heroCarouselItems.forEach((item, index) => {
            const slide = document.createElement('div');
            slide.classList.add('hero-slide');
            const imageUrl = item.Poster && item.Poster !== 'N/A'
                ? item.Poster
                : 'https://placehold.co/1920x1080/141414/a0a0a0?text=No+Image'; // Fallback for slide
            slide.style.backgroundImage = `url('${imageUrl}')`;
            heroCarouselContainer.appendChild(slide);

            const dot = document.createElement('span');
            dot.classList.add('hero-dot');
            dot.dataset.index = index;
            dot.addEventListener('click', () => {
                currentHeroIndex = index;
                showHeroSlide(currentHeroIndex);
                resetHeroCarouselInterval();
            });
            heroDotsContainer.appendChild(dot);
        });

        currentHeroIndex = 0; // Reset to first slide
        showHeroSlide(currentHeroIndex); // Display initial slide
        startHeroCarousel(); // Start automatic scrolling

    } catch (error) {
        console.error('Error setting up hero carousel:', error);
        heroTitle.textContent = 'Welcome to Netflix Clone';
        // heroPlot.textContent = 'Failed to load featured content. Please try again later.'; // REMOVED
        heroSection.style.backgroundImage = 'url("https://placehold.co/1920x1080/141414/a0a0a0?text=Error+Loading")'; // Error fallback image
        heroCarouselContainer.innerHTML = '';
        heroDotsContainer.innerHTML = '';
    }
}

/**
 * Displays a specific slide in the hero carousel.
 * @param {number} index - The index of the slide to show.
 */
function showHeroSlide(index) {
    if (heroCarouselItems.length === 0) return;

    // Ensure index is within bounds
    currentHeroIndex = (index + heroCarouselItems.length) % heroCarouselItems.length;

    // Update slides
    const slides = heroCarouselContainer.querySelectorAll('.hero-slide');
    slides.forEach((slide, i) => {
        if (i === currentHeroIndex) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });

    // Update dots
    const dots = heroDotsContainer.querySelectorAll('.hero-dot');
    dots.forEach((dot, i) => {
        if (i === currentHeroIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    // Update hero content (title, plot, buttons)
    const currentItem = heroCarouselItems[currentHeroIndex];
    updateHeroSection(currentItem);
}

/**
 * Advances the hero carousel to the next slide.
 */
function nextHeroSlide() {
    currentHeroIndex++;
    showHeroSlide(currentHeroIndex);
}

/**
 * Goes to the previous slide in the hero carousel.
 */
function prevHeroSlide() {
    currentHeroIndex--;
    showHeroSlide(currentHeroIndex);
}

/**
 * Starts the automatic hero carousel interval.
 */
function startHeroCarousel() {
    // Clear any existing interval to prevent duplicates
    if (heroCarouselInterval) {
        clearInterval(heroCarouselInterval);
    }
    heroCarouselInterval = setInterval(nextHeroSlide, HERO_CAROUSEL_INTERVAL_MS);
}

/**
 * Resets the hero carousel interval. Call this on manual navigation.
 */
function resetHeroCarouselInterval() {
    clearInterval(heroCarouselInterval);
    startHeroCarousel();
}


/**
 * Opens the content detail modal and populates it with data.
 * @param {object} item - The movie or series data (from MongoDB).
 */
async function openContentDetailModal(item) {
    showSpinner(); // Show spinner when modal opens
    // Hide episodes section by default; it will be shown only for series if data is available
    modalEpisodesSection.classList.add('hidden');
    seasonSelect.innerHTML = ''; // Clear seasons dropdown
    episodesList.innerHTML = ''; // Clear episodes list


    let detailedItem = item;
    try {
        // Fetch full details from backend by IMDb ID (will query MongoDB)
        // This ensures the modal has the most complete data, even if the card data was brief
        const fetchedDetail = await apiRequest(`/api/detail/${item.imdbID}`);
        if (fetchedDetail) {
            detailedItem = fetchedDetail;
        } else {
            console.warn('Backend detail fetch failed for modal, using initial item data.');
        }
    } catch (error) {
        console.warn('Failed to fetch detailed data from backend for modal, using initial item data:', error);
    }

    const title = detailedItem.Title || detailedItem.name || 'N/A'; // Use 'name' for series if 'Title' is missing
    const year = (detailedItem.Year && detailedItem.Year !== 'N/A') ? detailedItem.Year : 'N/A';
    const runtime = (detailedItem.Runtime && detailedItem.Runtime !== 'N/A') ? detailedItem.Runtime : 'N/A';
    const plot = detailedItem.Plot && detailedItem.Plot !== 'N/A' ? detailedItem.Plot : 'Plot summary not available.';
    const genre = detailedItem.Genre && detailedItem.Genre !== 'N/A' ? detailedItem.Genre : 'N/A';
    const director = detailedItem.Director && detailedItem.Director !== 'N/A' ? detailedItem.Director : 'N/A';
    const actors = detailedItem.Actors && detailedItem.Actors !== 'N/A' ? detailedItem.Actors : 'N/A';
    const imdbRating = detailedItem.imdbRating && detailedItem.imdbRating !== 'N/A' ? `${detailedItem.imdbRating}/10` : 'N/A';

    modalTitle.textContent = title;
    modalYear.textContent = year !== 'N/A' ? `(${year})` : ''; // Display year in parentheses if available
    modalRuntime.textContent = runtime !== 'N/A' ? runtime : ''; // Hide if N/A
    modalPlot.textContent = plot;
    modalGenre.textContent = genre;
    modalDirector.textContent = director;
    modalActors.textContent = actors;
    modalImdbRating.textContent = imdbRating;

    // Set modal backdrop image (using Poster from DB, or placeholder)
    const backdropUrl = detailedItem.Poster && detailedItem.Poster !== 'N/A'
        ? detailedItem.Poster
        : `https://placehold.co/1280x720/222222/a0a0a0?text=${encodeURIComponent(title)}`;
    modalBackdrop.src = backdropUrl;
    // Add onerror to modal backdrop in case image fails to load
    modalBackdrop.onerror = function() {
        this.onerror=null; // Prevent infinite loop
        this.src='https://placehold.co/1280x720/222222/a0a0a0?text=Image+Not+Available';
    };


    // Update My List button state
    updateMyListButton(detailedItem);

    // Event listeners for modal buttons
    addToMyListBtn.onclick = () => toggleMyListItem(detailedItem);
    playBtn.onclick = () => {
        displayMessage(`Playing "${title}"... (Feature not implemented)`, 'info');
    };

    // Handle episodes for series (This part is still limited by OMDb data)
    if (detailedItem.Type === 'series' && detailedItem.totalSeasons && parseInt(detailedItem.totalSeasons) > 0) {
        modalEpisodesSection.classList.remove('hidden');
        seasonSelect.innerHTML = ''; // Clear previous options

        // Populate season dropdown
        for (let i = 1; i <= parseInt(detailedItem.totalSeasons); i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Season ${i}`;
            seasonSelect.appendChild(option);
        }

        // Fetch and display episodes for the first season by default
        if (parseInt(detailedItem.totalSeasons) > 0) {
            // OMDb's /?i=ttXXXXX&Season=1 endpoint doesn't give full episode data.
            // Keeping this section for UI placeholder, but actual episode data fetch from backend (which would use TMDB)
            // is where more robust episode listing would come from. For now, this just shows the seasons.
            // Example: We can't fetch episode details directly from OMDb by season without a specific API endpoint.
            // The backend's /api/episodes/:tmdbId/:seasonNumber endpoint is set up for TMDB.
            // If the backend `detailedItem` has `id` for TMDB, we could use that.
            // The current `item.imdbID` from OMDb is usually not the same as TMDB's `id`.
            // For now, I'll update to show a "Coming Soon" or "Not Available" message for episodes.
            episodesList.innerHTML = '<p class="text-light-grey text-center">Episode details from TMDB are not yet integrated into the frontend for OMDb items. <br>This section is for future enhancement using TMDB.</p>';
        }

        seasonSelect.onchange = async (event) => {
            // This part would typically call a backend endpoint to fetch episodes for the selected season.
            // Since OMDb doesn't directly provide detailed episode lists via the main lookup,
            // and our backend's episode endpoint is designed for TMDB IDs, this will remain a placeholder.
            episodesList.innerHTML = `<p class="text-light-grey text-center">Episodes for Season ${event.target.value} are not available via OMDb.<br>This functionality is for future enhancement.</p>`;
        };
    }


    contentDetailModal.classList.add('active'); // Show modal with transition
    hideSpinner(); // Hide spinner after modal content is loaded
}


/**
 * Closes the content detail modal.
 */
function closeContentDetailModal() {
    contentDetailModal.classList.remove('active'); // Hide modal with transition
    // Reset modal content for next open
    modalBackdrop.src = '';
    modalTitle.textContent = '';
    modalYear.textContent = '';
    modalRuntime.textContent = '';
    modalPlot.textContent = '';
    modalGenre.textContent = '';
    modalDirector.textContent = '';
    modalActors.textContent = '';
    modalImdbRating.textContent = '';
    episodesList.innerHTML = ''; // Clear episode list
    seasonSelect.innerHTML = ''; // Clear season dropdown
}

/**
 * Updates the 'Add to My List' button's text and icon based on whether the item is in the user's list.
 * This is for the modal's button.
 * @param {object} item - The movie or series data (from MongoDB).
 */
function updateMyListButton(item) {
    const isInMyList = myListArr.some(listItem => listItem.imdbID === item.imdbID);
    if (isInMyList) {
        addToMyListText.textContent = 'Remove from My List';
        addToMyListIcon.innerHTML = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16.5 4.478l.276-.276A1.5 1.5 0 0015.65 2H8.35A1.5 1.5 0 007.224 4.19L1.5 9.715V19.5A2.5 2.5 0 004 22h16a2.5 2.5 0 002.5-2.5V9.715L16.5 4.478zM15 8a1 1 0 00-1-1H10a1 1 0 100 2h4a1 1 0 001-1z" clip-rule="evenodd"></path></svg>`;
    } else {
        addToMyListText.textContent = 'Add to My List';
        addToMyListIcon.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>`;
    }
}

/**
 * Toggles an item in the user's My List via backend API.
 * @param {object} item - The movie or series data to add/remove (from MongoDB).
 */
async function toggleMyListItem(item) {
    showSpinner();
    try {
        const isInMyList = myListArr.some(listItem => listItem.imdbID === item.imdbID);
        const endpoint = `/api/mylist/${currentUserId}/${item.imdbID}`;
        let response;

        // Prepare the item data to send to the backend for My List
        // Only include fields defined in userListItemSchema for efficiency
        const itemToSend = {
            imdbID: item.imdbID,
            Title: item.Title,
            Poster: item.Poster,
            Type: item.Type,
            Year: item.Year,
            Plot: item.Plot,
            Genre: item.Genre,
            Director: item.Director, // Ensure this field exists for DB
            Actors: item.Actors,     // Ensure this field exists for DB
            imdbRating: item.imdbRating,
            isNetflixOriginal: item.isNetflixOriginal // Include this flag for consistent display
        };

        if (isInMyList) {
            response = await apiRequest(endpoint, { method: 'DELETE' });
        } else {
            response = await apiRequest(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemToSend)
            });
        }

        myListArr = response.items || []; // Update local list with response from backend
        updateMyListButton(item); // Update modal button state
        updateAllContentCardsMyListState(); // Update all visible cards' icons
        displayMyList(); // Re-render My List page if visible
        displayMessage(isInMyList ? 'Removed from My List!' : 'Added to My List!', 'success');

    } catch (error) {
        console.error('Error toggling My List item:', error);
        displayMessage(`Error: ${error.message}`, 'error');
    } finally {
        hideSpinner();
    }
}

/**
 * Fetches the user's My List from the backend.
 */
async function fetchUserMyList() {
    showSpinner();
    try {
        const userList = await apiRequest(`/api/mylist/${currentUserId}`);
        myListArr = userList.items || [];
        console.log("My List fetched:", myListArr.length, "items.");
    } catch (error) {
        console.error("Failed to fetch user's My List:", error);
        myListArr = []; // Ensure it's empty on error
        displayMessage('Failed to load your My List. It might be empty or a backend error.', 'info');
    } finally {
        hideSpinner();
    }
}

/**
 * Displays the user's My List on the My List page.
 */
function displayMyList() {
    if (myListArr.length === 0) {
        myListEmptyMessage.classList.remove('hidden');
        myListGrid.innerHTML = '';
    } else {
        myListEmptyMessage.classList.add('hidden');
        populateContent(myListGrid, myListArr);
    }
}

/**
 * Performs a search against all fetched content (from MongoDB via backend).
 * This performs a client-side filter on already loaded data.
 * For very large datasets, a backend search API would be more efficient.
 * @param {string} query - The search query.
 */
async function searchContent(query) {
    showSpinner();
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery === '') {
        navigateTo('home-page'); // Return to home if search is cleared
        hideSpinner();
        return;
    }

    try {
        // Ensure all content is fetched if not already for client-side search
        if (allFetchedContent.length === 0) {
            const allMovies = await apiRequest('/api/movies');
            const allSeries = await apiRequest('/api/series');
            allFetchedContent = [
                ...allMovies.map(item => ({...item, Type: item.Type || 'movie'})),
                ...allSeries.map(item => ({...item, Type: item.Type || 'series'}))
            ].filter(item => item.Poster && item.Poster !== 'N/A');
        }

        const searchResults = allFetchedContent.filter(item => {
            const title = (item.Title || '').toLowerCase();
            const plot = (item.Plot || '').toLowerCase();
            const genre = (item.Genre || '').toLowerCase();
            const year = (item.Year || '').toLowerCase();
            const actors = (item.Actors || '').toLowerCase();
            const director = (item.Director || '').toLowerCase();

            return title.includes(normalizedQuery) ||
                   plot.includes(normalizedQuery) ||
                   genre.includes(normalizedQuery) ||
                   year.includes(normalizedQuery) ||
                   actors.includes(normalizedQuery) ||
                   director.includes(normalizedQuery);
        });

        // Navigate to movies page to display search results in a grid
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
            page.style.display = 'none';
        });

        moviesPage.style.display = 'block'; // Activate the movies page to show results
        void moviesPage.offsetWidth; // Force reflow
        moviesPage.classList.add('active');

        moviesGrid.innerHTML = ''; // Clear existing content
        if (searchResults.length > 0) {
             moviesPage.querySelector('.section-title').textContent = `Search Results for "${query}" (${searchResults.length} items)`;
             populateContent(moviesGrid, searchResults);
        } else {
             moviesPage.querySelector('.section-title').textContent = `No Results for "${query}"`;
             moviesGrid.innerHTML = '<p class="text-light-grey text-center mt-8">No movies or series found matching your search.</p>';
        }

        window.location.hash = `search=${encodeURIComponent(query)}`;

    } catch (error) {
        console.error('Failed to perform search:', error);
        displayMessage('Failed to perform search. Please try again later.', 'error');
    } finally {
        hideSpinner();
    }
}

// --- Event Listeners ---

// Header scroll effect
window.addEventListener('scroll', () => {
    if (window.scrollY > 0) {
        mainHeader.classList.add('scrolled');
    } else {
        mainHeader.classList.remove('scrolled');
    }
});

// Mobile menu toggle
menuToggle.addEventListener('click', () => {
    mobileNav.classList.toggle('active');
});

// Navigation clicks (for desktop and mobile)
document.querySelectorAll('#main-nav a, #mobile-nav a, .footer-links a').forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default link behavior
        const page = event.target.dataset.page;
        if (page) {
            navigateTo(`${page}-page`);
        }
        if (mobileNav.classList.contains('active')) {
            mobileNav.classList.remove('active'); // Close mobile menu after selection
        }
    });
});

// Toggle search bar visibility
toggleSearchBtn.addEventListener('click', () => {
    searchBar.classList.toggle('active');
    if (searchBar.classList.contains('active')) {
        searchInput.focus();
    } else {
        searchInput.value = ''; // Clear search input when hiding
        clearSearchBtn.classList.add('hidden');
        navigateTo('home-page'); // Return to home if search is closed
    }
});

// Clear search input button
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    navigateTo('home-page'); // Return to home when cleared
});

// Search input changes (with debounce)
searchInput.addEventListener('input', () => {
    clearTimeout(searchInput.debounceTimeout);
    searchInput.debounceTimeout = setTimeout(() => {
        searchContent(searchInput.value);
    }, 500); // 500ms debounce
});


// --- Hero Carousel Swipe Events ---
heroCarouselContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY; // Track Y to distinguish horizontal swipe from scroll
});

heroCarouselContainer.addEventListener('touchmove', (e) => {
    // Prevent default scroll only if it's a horizontal swipe
    const touchMoveX = e.touches[0].clientX;
    const touchMoveY = e.touches[0].clientY;
    const deltaX = touchStartX - touchMoveX;
    const deltaY = touchStartY - touchMoveY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) { // If primarily horizontal and moved enough
        e.preventDefault(); // Prevent vertical scrolling while swiping horizontally
    }
});

heroCarouselContainer.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchStartX - touchEndX;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (deltaX > 0) { // Swiped left
            nextHeroSlide();
        } else { // Swiped right
            prevHeroSlide();
        }
        resetHeroCarouselInterval(); // Reset interval after manual swipe
    }
});


// Close modal when close button is clicked
modalCloseBtn.addEventListener('click', closeContentDetailModal);

// Close modal when clicking outside the modal content
contentDetailModal.addEventListener('click', (event) => {
    // Check if the click occurred directly on the modal backdrop, not its content
    if (event.target === contentDetailModal) {
        closeContentDetailModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && contentDetailModal.classList.contains('active')) {
        closeContentDetailModal();
    }
});

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded. Initializing app...');
    showSpinner(); // Show spinner immediately on DOMContentLoaded

    // User ID display
    if (currentUserIdSpan) currentUserIdSpan.textContent = currentUserId;
    if (mobileUserIdDisplay) mobileUserIdDisplay.textContent = currentUserId;
    if (policiesUserIdDisplay) policiesUserIdDisplay.textContent = currentUserId;

    // Load My List data from backend first
    await fetchUserMyList();

    // Setup the hero carousel first, it will fetch its own content from backend
    await setupHeroCarousel();

    // Handle initial page load based on URL hash or default to home
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && document.getElementById(`${initialHash}-page`)) {
        console.log(`Navigating to initial hash page: ${initialHash}-page`);
        await navigateTo(`${initialHash}-page`, false);
    } else if (initialHash.startsWith('search=')) {
        const query = decodeURIComponent(initialHash.substring(7));
        searchInput.value = query;
        searchBar.classList.add('active');
        clearSearchBtn.classList.remove('hidden');
        await searchContent(query);
    } else {
        console.log("No initial hash, navigating to home-page.");
        await navigateTo('home-page');
    }

    hideSpinner(); // Ensure spinner is hidden after all initial loading
});
