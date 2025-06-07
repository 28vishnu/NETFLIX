// script.js - Complete Netflix Clone Logic

// --- Configuration ---
const BASE_BACKEND_URL = 'https://netflix-ydfu.onrender.com'; // Your Render backend URL
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/'; // Base URL for TMDB images

// --- DOM Elements ---
const appContainer = document.getElementById('app-container');
const mainHeader = document.getElementById('main-header');
const mainNav = document.getElementById('main-nav');
const menuToggle = document.getElementById('menu-toggle');
const toggleSearchBtn = document.getElementById('toggle-search');
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');
const mainContent = document.getElementById('main-content');

// Pages
const homePage = document.getElementById('home-page');
const moviesPage = document.getElementById('movies-page');
const seriesPage = document.getElementById('series-page');
const myListPage = document.getElementById('my-list-page');
const policiesPage = document.getElementById('policies-page');
const searchResultsPage = document.getElementById('search-results-page');

// Hero Section Elements
const heroSection = document.getElementById('hero-section');
const heroTitle = document.getElementById('hero-title');
const heroPlot = document.getElementById('hero-plot');
const heroPlayButton = document.getElementById('hero-play-button');
const heroInfoButton = document.getElementById('hero-info-button');

// Content Row Containers
const contentRowsContainer = document.getElementById('content-rows-container');
const popularMoviesRow = document.getElementById('popular-movies-row');
const bestSeriesRow = document.getElementById('best-series-row');

// Search Results Elements
const searchResultsGrid = document.getElementById('search-results-grid');
const searchQueryDisplay = document.getElementById('search-query-display');

// My List Elements
const myListGrid = document.getElementById('my-list-grid');
const currentUserIdSpan = document.getElementById('current-user-id');

// Description Overlay Elements
const descriptionOverlay = document.getElementById('description-overlay');
const modalCloseButton = document.getElementById('modal-close-button');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalTitle = document.getElementById('modal-title');
const modalMatchScore = document.getElementById('modal-match-score');
const modalReleaseYear = document.getElementById('modal-release-year');
const modalRuntimeOrSeasons = document.getElementById('modal-runtime-or-seasons');
const modalPlot = document.getElementById('modal-plot');
const modalGenres = document.getElementById('modal-genres');
const modalDirectorLine = document.getElementById('modal-director-line');
const modalDirector = document.getElementById('modal-director');
const modalActorsLine = document.getElementById('modal-actors-line');
const modalActors = document.getElementById('modal-actors');
const modalPlayButton = document.getElementById('modal-play-button');
const modalMyListButton = document.getElementById('modal-my-list-button');
const addIcon = modalMyListButton.querySelector('.add-icon');
const checkIcon = modalMyListButton.querySelector('.check-icon');

// Series Specific Modal Elements
const modalSeriesSection = document.getElementById('modal-series-section');
const seasonSelect = document.getElementById('season-select');
const episodeList = document.getElementById('episode-list');

// Loading Spinner
const spinnerOverlay = document.getElementById('spinner-overlay');

// --- Global State ---
let currentPage = 'home';
let currentUserId = localStorage.getItem('netflixCloneUserId') || generateUserId();
let myListArr = [];
let currentDetailedItem = null; // Stores the currently displayed item in the modal
let currentHeroContent = null; // Stores the currently displayed item in the hero banner

// --- Utility Functions ---

/**
 * Generates a unique user ID using Web Crypto API.
 * Stores it in localStorage for persistence.
 * @returns {string} The generated user ID.
 */
function generateUserId() {
    const id = 'user_' + crypto.randomUUID();
    localStorage.setItem('netflixCloneUserId', id);
    return id;
}

/**
 * Displays the loading spinner.
 */
function showSpinner() {
    spinnerOverlay.classList.add('active');
}

/**
 * Hides the loading spinner.
 */
function hideSpinner() {
    spinnerOverlay.classList.remove('active');
}

/**
 * Handles API requests to the backend.
 * @param {string} endpoint - The API endpoint (e.g., '/api/movies/trending').
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE).
 * @param {object} [body=null] - Request body for POST/PUT.
 * @returns {Promise<object>} JSON response from the API.
 * @throws {Error} If the API request fails.
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
    showSpinner();
    try {
        const options = { method };
        if (body) {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(body);
        }
        const response = await fetch(`${BASE_BACKEND_URL}${endpoint}`, options);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData.message || 'Server error'}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API Request Failed:', error);
        throw error; // Re-throw to allow calling functions to handle
    } finally {
        hideSpinner();
    }
}

/**
 * Hides all content pages.
 */
function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active-page');
        page.classList.add('hidden');
    });
}

/**
 * Navigates to a specific page.
 * @param {string} pageId - The ID of the page to show (e.g., 'home-page', 'movies-page').
 * @param {boolean} [pushState=true] - Whether to add to browser history.
 */
async function navigateTo(pageId, pushState = true) {
    hideAllPages();
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('active-page');
        currentPage = pageId.replace('-page', ''); // Update current page state

        // Update URL for navigation and history
        if (pushState) {
            history.pushState({ page: pageId }, '', `#${currentPage}`);
        }

        // Load content specific to the page
        switch (pageId) {
            case 'home-page':
                await loadHeroContent();
                await loadHomeContentRows();
                break;
            case 'movies-page':
                await loadAllContent('movie', 'all-movies-grid');
                break;
            case 'series-page':
                await loadAllContent('series', 'all-series-grid');
                break;
            case 'my-list-page':
                await loadMyList();
                break;
            case 'search-results-page':
                // Content loaded via search logic
                break;
            case 'policies-page':
                // Static content, no loading needed
                break;
        }
        // Scroll to top when navigating to a new page
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        console.warn(`Page with ID ${pageId} not found.`);
        navigateTo('home-page'); // Fallback to home
    }
}

/**
 * Creates a content card HTML element.
 * @param {object} item - The movie or series data.
 * @returns {HTMLElement} The created card element.
 */
function createContentCard(item) {
    const card = document.createElement('div');
    card.classList.add('content-card');
    card.dataset.imdbId = item.imdbID;
    card.dataset.tmdbId = item.tmdbId; // Store TMDB ID as well
    card.dataset.type = item.type; // 'movie' or 'series'

    // Use poster_path if available, otherwise backdrop_path, or a placeholder
    const imageUrl = item.poster || item.backdrop || 'https://placehold.co/250x140/333333/FFFFFF?text=No+Image';
    card.innerHTML = `
        <img src="${imageUrl}" alt="${item.title || item.name}" onerror="this.onerror=null;this.src='https://placehold.co/250x140/333333/FFFFFF?text=No+Image';" loading="lazy">
        <div class="card-title">${item.title || item.name}</div>
    `;
    card.addEventListener('click', () => showDetailsOverlay(item.imdbID || item.tmdbId, item.type));
    return card;
}

/**
 * Populates a content row or grid with cards.
 * @param {HTMLElement} container - The HTML element to append cards to.
 * @param {Array<object>} items - An array of movie or series data.
 * @param {boolean} [isGrid=false] - If true, treats container as a grid, removes message.
 */
function populateContent(container, items, isGrid = false) {
    container.innerHTML = ''; // Clear previous content

    const noContentMessage = container.querySelector('.no-content-message');
    if (noContentMessage) {
        noContentMessage.classList.add('hidden');
    }

    if (items && items.length > 0) {
        items.forEach(item => {
            const card = createContentCard(item);
            container.appendChild(card);
        });
    } else {
        if (noContentMessage) {
             noContentMessage.classList.remove('hidden');
             noContentMessage.textContent = "No content available.";
        } else if (isGrid) {
            container.innerHTML = '<div class="no-content-message">No content available.</div>';
        }
    }
}

// --- Core Content Loading Functions ---

/**
 * Loads content for the hero banner.
 */
async function loadHeroContent() {
    try {
        heroTitle.textContent = 'Loading...';
        heroPlot.textContent = 'Fetching trending content. Please wait...';
        heroSection.style.backgroundImage = 'none'; // Clear previous background
        heroPlayButton.classList.add('hidden');
        heroInfoButton.classList.add('hidden');


        const trending = await apiRequest('/api/movies/trending');
        if (trending && trending.length > 0) {
            // Pick a random movie from the trending list for the hero banner
            const randomMovie = trending[Math.floor(Math.random() * trending.length)];
            currentHeroContent = randomMovie; // Store for info button click
            heroTitle.textContent = randomMovie.title;
            heroPlot.textContent = randomMovie.plot;
            heroSection.style.backgroundImage = `url(${randomMovie.backdrop || randomMovie.poster || 'https://placehold.co/1920x1080/000000/FFFFFF?text=No+Backdrop'})`;
            
            // Show buttons and update their functionality
            heroPlayButton.classList.remove('hidden');
            heroInfoButton.classList.remove('hidden');
            heroPlayButton.onclick = () => {
                if (randomMovie.telegramPlayableUrl) {
                    window.open(randomMovie.telegramPlayableUrl, '_blank');
                } else {
                    alert('No playable link available yet.');
                }
            };
            heroInfoButton.onclick = () => showDetailsOverlay(randomMovie.imdbID || randomMovie.tmdbId, randomMovie.type);
        } else {
            heroTitle.textContent = 'Content Not Available';
            heroPlot.textContent = 'We couldn\'t load trending content for the hero section. Please ensure your backend is running and returning valid data, or check network.';
            heroSection.style.backgroundImage = 'none';
            heroPlayButton.onclick = null;
            heroInfoButton.onclick = null;
            heroPlayButton.classList.add('hidden');
            heroInfoButton.classList.add('hidden');
            console.warn("No trending movies returned for hero banner.");
        }
    } catch (error) {
        console.error("Failed to load hero content:", error);
        heroTitle.textContent = 'Error Loading Content';
        heroPlot.textContent = 'Failed to load trending content. Please check your network connection or try again later.';
        heroSection.style.backgroundImage = 'none';
        heroPlayButton.onclick = null;
        heroInfoButton.onclick = null;
        heroPlayButton.classList.add('hidden');
        heroInfoButton.classList.add('hidden');
    }
}

/**
 * Loads and populates content rows for the home page.
 */
async function loadHomeContentRows() {
    // Display loading messages for rows initially
    popularMoviesRow.innerHTML = '<div class="no-content-message">Loading popular movies...</div>';
    bestSeriesRow.innerHTML = '<div class="no-content-message">Loading top rated series...</div>';

    try {
        const [popularMovies, bestSeries] = await Promise.all([
            apiRequest('/api/movies/popular'),
            apiRequest('/api/series/best')
        ]);

        populateContent(popularMoviesRow, popularMovies);
        populateContent(bestSeriesRow, bestSeries);

        // Dynamically add genre rows
        await addDynamicGenreRows();

    } catch (error) {
        console.error("Failed to load home page content rows:", error);
        popularMoviesRow.innerHTML = '<div class="no-content-message">Failed to load popular movies.</div>';
        bestSeriesRow.innerHTML = '<div class="no-content-message">Failed to load top rated series.</div>';
    }
}

/**
 * Adds dynamic genre rows to the home page.
 */
async function addDynamicGenreRows() {
    const commonGenres = ['Action', 'Comedy', 'Drama', 'Thriller', 'Animation', 'Science Fiction']; // Example genres

    for (const genre of commonGenres) {
        const genreMovieSectionId = `genre-movie-${genre.toLowerCase().replace(/\s/g, '-')}-row`;
        const genreSeriesSectionId = `genre-series-${genre.toLowerCase().replace(/\s/g, '-')}-row`;

        // Movies by Genre
        let movieSection = document.getElementById(genreMovieSectionId);
        if (!movieSection) {
            movieSection = document.createElement('section');
            movieSection.classList.add('content-section');
            movieSection.innerHTML = `
                <h2>${genre} Movies</h2>
                <div class="content-row" id="${genreMovieSectionId}">
                    <div class="no-content-message">Loading ${genre} movies...</div>
                </div>
                <button class="scroll-arrow left" data-target="${genreMovieSectionId}">&lt;</button>
                <button class="scroll-arrow right" data-target="${genreMovieSectionId}">&gt;</button>
            `;
            contentRowsContainer.appendChild(movieSection);
        }
        const movieRow = document.getElementById(genreMovieSectionId);
        try {
            const movies = await apiRequest(`/api/movies/genre/${genre}`);
            populateContent(movieRow, movies);
        } catch (error) {
            console.error(`Failed to load ${genre} movies:`, error);
            movieRow.innerHTML = `<div class="no-content-message">Failed to load ${genre} movies.</div>`;
        }

        // Series by Genre
        let seriesSection = document.getElementById(genreSeriesSectionId);
        if (!seriesSection) {
            seriesSection = document.createElement('section');
            seriesSection.classList.add('content-section');
            seriesSection.innerHTML = `
                <h2>${genre} Series</h2>
                <div class="content-row" id="${genreSeriesSectionId}">
                    <div class="no-content-message">Loading ${genre} series...</div>
                </div>
                <button class="scroll-arrow left" data-target="${genreSeriesSectionId}">&lt;</button>
                <button class="scroll-arrow right" data-target="${genreSeriesSectionId}">&gt;</button>
            `;
            contentRowsContainer.appendChild(seriesSection);
        }
        const seriesRow = document.getElementById(genreSeriesSectionId);
        try {
            const series = await apiRequest(`/api/series/genre/${genre}`);
            populateContent(seriesRow, series);
        } catch (error) {
            console.error(`Failed to load ${genre} series:`, error);
            seriesRow.innerHTML = `<div class="no-content-message">Failed to load ${genre} series.</div>`;
        }
    }
}

/**
 * Loads all content of a specific type (movies or series) into a grid.
 * @param {'movie'|'series'} type - The type of content to load.
 * @param {string} containerId - The ID of the container element to populate.
 */
async function loadAllContent(type, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '<div class="no-content-message">Loading content...</div>'; // Initial loading message

    try {
        const endpoint = type === 'movie' ? '/api/movies' : '/api/series';
        const content = await apiRequest(endpoint);
        populateContent(container, content, true); // True for grid layout
    } catch (error) {
        console.error(`Failed to load all ${type} content:`, error);
        container.innerHTML = `<div class="no-content-message">Failed to load all ${type} content.</div>`;
    }
}

/**
 * Performs a search and displays results.
 * @param {string} query - The search query.
 */
async function performSearch(query) {
    if (!query) {
        navigateTo('home-page'); // Go back to home if query is empty
        return;
    }

    navigateTo('search-results-page', false); // Navigate without pushing new state repeatedly
    searchQueryDisplay.textContent = query;
    searchResultsGrid.innerHTML = '<div class="no-content-message">Searching...</div>';

    try {
        const data = await apiRequest(`/api/search?q=${encodeURIComponent(query)}`);
        const allResults = [...data.movies, ...data.series];
        if (allResults.length === 0) {
            searchResultsGrid.innerHTML = '<div class="no-content-message">No results found for your search.</div>';
        } else {
            populateContent(searchResultsGrid, allResults, true);
        }
    } catch (error) {
        console.error("Search failed:", error);
        searchResultsGrid.innerHTML = '<div class="no-content-message">Failed to perform search. Please try again.</div>';
    }
}

/**
 * Loads the user's "My List" content.
 */
async function loadMyList() {
    currentUserIdSpan.textContent = currentUserId; // Display user ID
    myListGrid.innerHTML = '<div class="no-content-message">Loading your list...</div>'; // Initial loading message

    try {
        const userList = await apiRequest(`/api/mylist/${currentUserId}`);
        if (userList && userList.items && userList.items.length > 0) {
            myListArr = userList.items; // Update local state
            populateContent(myListGrid, userList.items, true);
        } else {
            myListArr = [];
            myListGrid.innerHTML = '<div class="no-content-message">Your list is empty. Add some movies or series!</div>';
        }
    } catch (error) {
        console.error("Failed to load My List:", error);
        myListGrid.innerHTML = '<div class="no-content-message">Failed to load your list.</div>';
    }
}

/**
 * Adds an item to the user's "My List".
 * @param {object} item - The item to add.
 */
async function addItemToMyList(item) {
    try {
        await apiRequest('/api/mylist/add', 'POST', { userId: currentUserId, item });
        myListArr.push(item); // Update local state
        modalMyListButton.classList.add('added');
        addIcon.classList.add('hidden');
        checkIcon.classList.remove('hidden');
        console.log('Item added to My List successfully!');
    } catch (error) {
        console.error('Failed to add item to My List:', error);
        alert(`Failed to add item to My List: ${error.message}`);
    }
}

/**
 * Removes an item from the user's "My List".
 * @param {string} imdbId - The IMDb ID of the item to remove.
 * @param {string} tmdbId - The TMDB ID of the item to remove.
 */
async function removeItemFromMyList(imdbId, tmdbId) {
    try {
        await apiRequest('/api/mylist/remove', 'POST', { userId: currentUserId, imdbID: imdbId, tmdbId: tmdbId });
        myListArr = myListArr.filter(item => item.imdbID !== imdbId && item.tmdbId !== tmdbId); // Update local state
        modalMyListButton.classList.remove('added');
        addIcon.classList.remove('hidden');
        checkIcon.classList.add('hidden');
        console.log('Item removed from My List successfully!');
    } catch (error) {
        console.error('Failed to remove item from My List:', error);
        alert(`Failed to remove item from My List: ${error.message}`);
    }
}

/**
 * Checks if an item is in the user's "My List".
 * @param {string} imdbId - The IMDb ID of the item.
 * @param {string} tmdbId - The TMDB ID of the item.
 * @returns {boolean} True if the item is in the list, false otherwise.
 */
function isItemInMyList(imdbId, tmdbId) {
    return myListArr.some(item => (imdbId && item.imdbID === imdbId) || (tmdbId && item.tmdbId === tmdbId));
}

// --- Description Overlay Logic ---

/**
 * Shows the description overlay with details for a movie or series.
 * @param {string} id - The IMDb ID or TMDB ID of the content.
 * @param {'movie'|'series'} type - The type of content ('movie' or 'series').
 */
async function showDetailsOverlay(id, type) {
    descriptionOverlay.classList.add('active');
    modalBackdrop.style.backgroundImage = 'none'; // Clear previous backdrop
    // Reset modal content
    modalTitle.textContent = 'Loading...';
    modalPlot.textContent = 'Fetching details...';
    modalMatchScore.textContent = '';
    modalReleaseYear.textContent = '';
    modalRuntimeOrSeasons.textContent = '';
    modalGenres.textContent = '';
    modalDirectorLine.classList.add('hidden');
    modalActorsLine.classList.add('hidden');
    modalSeriesSection.classList.add('hidden'); // Hide series section by default
    seasonSelect.innerHTML = '';
    episodeList.innerHTML = '<div class="no-content-message">Loading episodes...</div>';
    modalPlayButton.classList.remove('hidden'); // Ensure buttons are visible for details load
    modalMyListButton.classList.remove('hidden');

    try {
        const details = await apiRequest(`/api/${type}s/${id}`); // movies/id or series/id
        currentDetailedItem = details; // Store for My List button and other actions

        modalTitle.textContent = details.title;
        modalPlot.textContent = details.plot;
        modalMatchScore.textContent = `${Math.round(details.imdbRating * 10)}% Match`; // TMDB rating * 10 for Netflix-like percentage
        modalReleaseYear.textContent = details.year;

        // Set runtime for movies, seasons for series
        if (details.type === 'movie') {
            modalRuntimeOrSeasons.textContent = details.runtime;
            modalDirectorLine.classList.remove('hidden');
            modalDirector.textContent = details.director;
            modalActorsLine.classList.remove('hidden');
            modalActors.textContent = details.actors;
        } else { // Series
            modalRuntimeOrSeasons.textContent = `${details.totalSeasons} Season${parseInt(details.totalSeasons) === 1 ? '' : 's'}`;
            modalDirectorLine.classList.add('hidden'); // Series typically don't show single director like movies
            modalActorsLine.classList.remove('hidden');
            modalActors.textContent = details.actors;
            modalSeriesSection.classList.remove('hidden');
            await loadSeasonsForSeries(details.tmdbId); // Load seasons for series
        }

        modalGenres.textContent = details.genre.join(', ');
        modalBackdrop.style.backgroundImage = `url(${details.backdrop || details.poster || 'https://placehold.co/850x400/000000/FFFFFF?text=No+Backdrop'})`;

        // Set My List button state
        if (isItemInMyList(details.imdbID, details.tmdbId)) {
            modalMyListButton.classList.add('added');
            addIcon.classList.add('hidden');
            checkIcon.classList.remove('hidden');
        } else {
            modalMyListButton.classList.remove('added');
            addIcon.classList.remove('hidden');
            checkIcon.classList.add('hidden');
        }

        // Set Play button functionality
        modalPlayButton.onclick = () => {
            if (details.telegramPlayableUrl) {
                window.open(details.telegramPlayableUrl, '_blank');
            } else {
                alert('No playable link available yet.');
            }
        };

    } catch (error) {
        console.error("Failed to load details overlay:", error);
        modalTitle.textContent = 'Error Loading Details';
        modalPlot.textContent = 'Failed to fetch content details. Please try again.';
        modalBackdrop.style.backgroundImage = 'none';
        modalPlayButton.onclick = null;
        modalMyListButton.onclick = null;
        modalPlayButton.classList.add('hidden'); // Hide buttons on error
        modalMyListButton.classList.add('hidden');
        modalSeriesSection.classList.add('hidden'); // Hide series section on error
    }
}

/**
 * Loads seasons for a given series TMDB ID and populates the season dropdown.
 * @param {string} tmdbId - The TMDB ID of the series.
 */
async function loadSeasonsForSeries(tmdbId) {
    seasonSelect.innerHTML = '<option disabled selected>Loading seasons...</option>';
    episodeList.innerHTML = '<div class="no-content-message">Loading seasons...</div>';
    try {
        const seasons = await apiRequest(`/api/series/${tmdbId}/seasons`);
        seasonSelect.innerHTML = ''; // Clear existing options
        if (seasons && seasons.length > 0) {
            // Filter out season 0 (specials) if it exists and isn't the only season
            const playableSeasons = seasons.filter(s => s.season_number > 0);
            // Add "Specials" season if it exists
            const specialSeason = seasons.find(s => s.season_number === 0);
            if (specialSeason) {
                const option = document.createElement('option');
                option.value = specialSeason.season_number;
                option.textContent = `Season ${specialSeason.season_number} (Specials)`;
                seasonSelect.appendChild(option);
            }

            playableSeasons.sort((a, b) => a.season_number - b.season_number); // Sort by season number
            playableSeasons.forEach(season => {
                const option = document.createElement('option');
                option.value = season.season_number;
                option.textContent = `Season ${season.season_number}`;
                seasonSelect.appendChild(option);
            });
            
            // Automatically load episodes for the first season (or specials if only one)
            if (seasonSelect.options.length > 0) {
                seasonSelect.value = seasonSelect.options[0].value;
                await loadEpisodesForSeason(tmdbId, seasonSelect.value);
            } else {
                 episodeList.innerHTML = '<div class="no-content-message">No seasons found.</div>';
            }

        } else {
            seasonSelect.innerHTML = '<option disabled selected>No seasons available</option>';
            episodeList.innerHTML = '<div class="no-content-message">No seasons found.</div>';
        }
    } catch (error) {
        console.error(`Failed to load seasons for series ${tmdbId}:`, error);
        seasonSelect.innerHTML = '<option disabled selected>Error loading seasons</option>';
        episodeList.innerHTML = '<div class="no-content-message">Error loading seasons.</div>';
    }
}

/**
 * Loads episodes for a given series TMDB ID and season number.
 * @param {string} tmdbId - The TMDB ID of the series.
 * @param {number} seasonNumber - The season number.
 */
async function loadEpisodesForSeason(tmdbId, seasonNumber) {
    episodeList.innerHTML = '<div class="no-content-message">Loading episodes...</div>'; // Loading message
    try {
        const episodes = await apiRequest(`/api/series/${tmdbId}/season/${seasonNumber}/episodes`);
        episodeList.innerHTML = ''; // Clear previous episodes
        if (episodes && episodes.length > 0) {
            episodes.forEach(episode => {
                const episodeItem = document.createElement('div');
                episodeItem.classList.add('episode-item');
                // No direct play link for episodes in this clone, just display info
                episodeItem.innerHTML = `
                    <div class="episode-thumbnail">
                        <span class="episode-number">${episode.episode_number}</span>
                        <img src="${episode.still_path ? `${TMDB_IMAGE_BASE_URL}w500${episode.still_path}` : 'https://placehold.co/160x90/444444/FFFFFF?text=No+Image'}" alt="${episode.name}" onerror="this.onerror=null;this.src='https://placehold.co/160x90/444444/FFFFFF?text=No+Image';">
                    </div>
                    <div class="episode-info">
                        <h4>${episode.episode_number}. ${episode.name}</h4>
                        <p>${episode.overview}</p>
                        <div class="episode-meta">
                            ${episode.air_date ? `Aired: ${new Date(episode.air_date).getFullYear()}` : ''}
                            ${episode.runtime !== 'N/A' && episode.runtime !== null ? ` | Runtime: ${episode.runtime} min` : ''}
                            ${episode.vote_average !== 'N/A' && episode.vote_average !== null ? ` | Rating: ${episode.vote_average}/10` : ''}
                        </div>
                    </div>
                `;
                episodeList.appendChild(episodeItem);
            });
        } else {
            episodeList.innerHTML = '<div class="no-content-message">No episodes found for this season.</div>';
        }
    } catch (error) {
        console.error(`Failed to load episodes for series ${tmdbId}, season ${seasonNumber}:`, error);
        episodeList.innerHTML = '<div class="no-content-message">Error loading episodes.</div>';
    }
}

/**
 * Hides the description overlay.
 */
function hideDetailsOverlay() {
    descriptionOverlay.classList.remove('active');
    currentDetailedItem = null; // Clear detailed item
    // Clear season/episode info
    seasonSelect.innerHTML = '';
    episodeList.innerHTML = '';
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

// Navigation clicks
document.querySelectorAll('nav a, .logo, .footer-links a[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = e.target.dataset.page;
        if (page) {
            navigateTo(`${page}-page`);
            // Close mobile menu if open
            if (mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
            }
        }
    });
});

// Mobile menu toggle
menuToggle.addEventListener('click', () => {
    mainNav.classList.toggle('active');
});

// Toggle search bar visibility
toggleSearchBtn.addEventListener('click', () => {
    searchBar.classList.toggle('hidden');
    if (!searchBar.classList.contains('hidden')) {
        searchInput.focus();
    }
});

// Search input keypress
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch(searchInput.value.trim());
        searchBar.classList.add('hidden'); // Hide search bar after search
        searchInput.value = ''; // Clear search input
    }
});

// Description overlay close button
modalCloseButton.addEventListener('click', hideDetailsOverlay);
// Close overlay if clicked outside modal content
descriptionOverlay.addEventListener('click', (e) => {
    if (e.target === descriptionOverlay) {
        hideDetailsOverlay();
    }
});

// My List button in modal
modalMyListButton.addEventListener('click', () => {
    if (!currentDetailedItem) return;

    // Use both IMDb and TMDB ID for robustness
    const isAdded = isItemInMyList(currentDetailedItem.imdbID, currentDetailedItem.tmdbId);
    if (isAdded) {
        removeItemFromMyList(currentDetailedItem.imdbID, currentDetailedItem.tmdbId);
    } else {
        addItemToMyList(currentDetailedItem);
    }
});

// Season selection in modal
seasonSelect.addEventListener('change', (e) => {
    if (currentDetailedItem && currentDetailedItem.tmdbId) {
        loadEpisodesForSeason(currentDetailedItem.tmdbId, e.target.value);
    }
});

// Scroll arrow functionality for content rows
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('scroll-arrow')) {
        const rowId = e.target.dataset.target;
        const row = document.getElementById(rowId);
        if (row) {
            const scrollAmount = row.clientWidth * 0.8; // Scroll 80% of row width
            if (e.target.classList.contains('right')) {
                row.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            } else {
                row.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            }
        }
    }
});

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.page) {
        navigateTo(event.state.page, false); // Don't push state again
    } else {
        // Default to home if no specific state, e.g., on initial load or if directly visiting root URL
        navigateTo('home-page', false);
    }
});

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded. Initializing app...');
    currentUserIdSpan.textContent = currentUserId; // Set user ID on load

    // Load My List data first to ensure isItemInMyList works correctly
    try {
        const userList = await apiRequest(`/api/mylist/${currentUserId}`);
        myListArr = userList.items || [];
    } catch (error) {
        console.error("Failed to pre-load My List on DOMContentLoaded:", error);
        myListArr = []; // Ensure it's an empty array on error
    }

    // Check URL hash for initial page load
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && document.getElementById(`${initialHash}-page`)) {
        navigateTo(`${initialHash}-page`, false); // Don't push state if already in hash
    } else {
        navigateTo('home-page');
    }
});
