document.addEventListener('DOMContentLoaded', () => {
    // Get references to various DOM elements
    const movieSectionsContainer = document.getElementById('movie-sections');
    const loadingIndicator = document.getElementById('loading-indicator');
    const userDetailsSpan = document.querySelector('#user-details span');
    const userProfileImg = document.querySelector('#user-details img');
    const header = document.getElementById('main-header');
    const navLinks = document.querySelectorAll('.nav-link'); // All navigation links
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const searchInputWrapper = document.getElementById('search-input-wrapper');
    const searchInput = document.getElementById('search-input');
    const heroSection = document.getElementById('hero-section');

    // Hero carousel specific elements
    const heroSlidesContainer = document.getElementById('hero-slides-container');
    const heroPrevBtn = document.getElementById('hero-prev-btn');
    const heroNextBtn = document.getElementById('hero-next-btn');
    const heroDotsContainer = document.getElementById('hero-dots-container');

    // Video player overlay elements
    const videoPlayerOverlay = document.getElementById('video-player-overlay');
    const closePlayerBtn = document.getElementById('close-player-btn');
    const bufferingSpinner = document.getElementById('buffering-spinner');
    const playerStatusText = document.getElementById('player-status-text');
    const videoPlayer = document.getElementById('video-player'); // Your video element

    // Detail overlay elements
    const detailOverlay = document.getElementById('detail-overlay');
    const detailTitle = document.getElementById('detail-title');
    const detailDescription = document.getElementById('detail-description');
    const detailImage = document.getElementById('detail-image');
    const detailGenres = document.getElementById('detail-genres');
    const detailReleaseYear = document.getElementById('detail-release-year');
    const detailDuration = document.getElementById('detail-duration');
    const detailRating = document.getElementById('detail-rating');
    const closeDetailBtn = document.getElementById('close-detail-btn');
    const moreLikeThisSection = document.getElementById('more-like-this-section');
    const moreLikeThisCarousel = document.getElementById('more-like-this-carousel');
    const playDetailBtn = document.getElementById('play-detail-btn'); // Play button in detail overlay
    const addToListBtn = document.getElementById('add-to-list-btn'); // New: Add to My List button

    // --- OMDb API Configuration ---
    const OMDB_API_KEY = 'd3f8fc1e'; // Your OMDb API Key
    const OMDB_BASE_URL = 'https://www.omdbapi.com/';

    // Store fetched content globally or in a map for easy lookup
    let allContent = new Map();
    // New: Store My List items (IMDb IDs) in local storage
    let myList = JSON.parse(localStorage.getItem('myList')) || [];

    // --- Helper function to fetch data from OMDb ---
    async function fetchOmdbData(params) {
        const queryString = new URLSearchParams(params).toString();
        const url = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&${queryString}`;
        console.log('Fetching OMDb data from:', url); // Log the URL being fetched
        try {
            const response = await fetch(url);
            if (!response.ok) {
                // If response is not OK (e.g., 404, 500), throw an error
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('OMDb response:', data); // Log the raw OMDb response
            // OMDb indicates an error with "Response": "False" and an "Error" message
            if (data.Response === "False") {
                throw new Error(data.Error);
            }
            return data;
        } catch (error) {
            console.error('Error fetching data from OMDb:', error);
            // Only update main content area if the error is during initial load
            if (movieSectionsContainer.innerHTML === '') { // Check if it's blank
                movieSectionsContainer.innerHTML = '<p class="text-center text-red-500 text-lg p-8">Failed to load content. Please check your internet connection or API key, and try again later.</p>';
            }
            return null;
        }
    }

    // --- Function to create a movie card ---
    function createMovieCard(content) {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card relative rounded-lg overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 group';
        movieCard.dataset.id = content.imdbID;
        movieCard.dataset.type = content.Type;

        const imageUrl = content.Poster && content.Poster !== 'N/A' ? content.Poster : 'https://placehold.co/500x750/000000/FFFFFF?text=No+Image';

        movieCard.innerHTML = `
            <img src="${imageUrl}" alt="${content.Title}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='https://placehold.co/500x750/000000/FFFFFF?text=No+Image';">
            <div class="movie-details absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                <h4 class="text-white text-lg font-semibold mb-1">${content.Title}</h4>
                <p class="text-gray-300 text-sm">${content.Year || 'N/A'}</p>
                <button class="play-movie-card-btn absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <i class="fas fa-play text-xl"></i>
                </button>
            </div>
        `;

        movieCard.addEventListener('click', (event) => {
            if (!event.target.closest('.play-movie-card-btn')) {
                showDetailOverlay(content.imdbID, content.Type);
            }
        });

        const playButton = movieCard.querySelector('.play-movie-card-btn');
        playButton.addEventListener('click', (event) => {
            event.stopPropagation();
            console.warn('OMDb does not provide direct video links. Playing placeholder.');
            showVideoPlayer('https://www.w3schools.com/html/mov_bbb.mp4');
        });

        return movieCard;
    }

    // --- Function to populate a movie section ---
    async function populateMovieSection(title, searchParams, containerId) {
        const sectionDiv = document.getElementById(containerId);
        if (!sectionDiv) {
            console.error(`Section Div with ID "${containerId}" not found.`);
            return;
        }
        const container = sectionDiv.querySelector('.movie-grid-carousel');
        if (!container) {
            console.error(`Container with ID "${containerId}" or its .movie-grid-carousel child not found.`);
            return;
        }

        const data = await fetchOmdbData(searchParams);
        if (data && data.Search) {
            const contentList = data.Search.filter(item => item.Poster && item.Poster !== 'N/A' && (item.Type === 'movie' || item.Type === 'series'));

            container.innerHTML = '';

            if (contentList.length > 0) {
                contentList.forEach(content => {
                    allContent.set(content.imdbID, content);
                    const movieCard = createMovieCard(content);
                    container.appendChild(movieCard);
                });
            } else {
                container.innerHTML = `<p class="text-center text-gray-400 col-span-full">No content found for "${title}".</p>`;
            }

            // Removed "View All" button logic from here
            const existingViewAllBtn = sectionDiv.querySelector('.view-all-btn');
            if (existingViewAllBtn) {
                existingViewAllBtn.remove();
            }

        } else {
            container.innerHTML = `<p class="text-center text-gray-400 col-span-full">Failed to load content for "${title}".</p>`;
        }
    }

    // --- Function to populate the hero section ---
    async function populateHeroSection() {
        // Defensive checks for hero elements
        if (!heroSlidesContainer) {
            console.error('Error: heroSlidesContainer element not found. Hero section cannot be populated.');
            heroSection.innerHTML = '<p class="text-center text-red-500 pt-20">Hero slides container not found. Please ensure index.html is correct.</p>';
            return;
        }
        if (!heroDotsContainer) {
            console.error('Error: heroDotsContainer element not found. Hero section dots cannot be populated.');
            // We can still try to populate slides if dots are missing, but log the error.
            // If the error persists, this indicates a fundamental issue with the HTML or script loading.
        }

        const heroMovieTitles = [
            'Dune: Part Two',
            'Oppenheimer',
            'Barbie',
            'Spider-Man: Across the Spider-Verse',
            'Guardians of the Galaxy Vol. 3'
        ];

        heroSlidesContainer.innerHTML = '';
        if (heroDotsContainer) { // Only manipulate if it exists
            heroDotsContainer.innerHTML = '';
        }
        heroSlidesContainer.style.transform = 'translateX(0)';

        const heroMoviesPromises = heroMovieTitles.map(title => fetchOmdbData({ t: title, plot: 'full' }));
        const heroMovies = await Promise.all(heroMoviesPromises);

        let validHeroSlides = [];
        heroMovies.forEach(heroMovie => {
            if (heroMovie && heroMovie.Response === "True" && heroMovie.Poster && heroMovie.Poster !== 'N/A') {
                validHeroSlides.push(heroMovie);
                allContent.set(heroMovie.imdbID, heroMovie);
            }
        });

        if (validHeroSlides.length > 0) {
            validHeroSlides.forEach((heroMovie, index) => {
                const slide = document.createElement('div');
                slide.className = `hero-slide w-full flex-shrink-0 relative rounded-lg overflow-hidden`;
                slide.dataset.id = heroMovie.imdbID;
                slide.dataset.type = heroMovie.Type;

                // Updated placeholder to a higher resolution for hero banner
                const posterUrl = heroMovie.Poster && heroMovie.Poster !== 'N/A' ? heroMovie.Poster : 'https://placehold.co/1920x1080/000000/FFFFFF?text=No+Image';

                slide.innerHTML = `
                    <img src="${posterUrl}" alt="${heroMovie.Title}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='https://placehold.co/1920x1080/000000/FFFFFF?text=No+Image';">
                    <div class="hero-overlay absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-4 md:p-8">
                        <h2 class="text-3xl md:text-5xl font-bold text-white mb-2 md:mb-4">${heroMovie.Title}</h2>
                        <p class="text-sm md:text-lg text-gray-300 mb-4 md:mb-6 max-w-2xl line-clamp-3">${heroMovie.Plot}</p>
                        <div class="flex space-x-3">
                            <button class="bg-white text-black px-4 py-2 rounded-md font-semibold hover:bg-gray-300 transition-colors duration-200 flex items-center play-hero-btn" data-content-id="${heroMovie.imdbID}" data-content-type="${heroMovie.Type}">
                                <i class="fas fa-play mr-2"></i> Play
                            </button>
                            <button class="bg-gray-700 text-white px-4 py-2 rounded-md font-semibold hover:bg-gray-600 transition-colors duration-200 flex items-center info-hero-btn" data-content-id="${heroMovie.imdbID}" data-content-type="${heroMovie.Type}">
                                <i class="fas fa-info-circle mr-2"></i> More Info
                            </button>
                        </div>
                    </div>
                `;
                heroSlidesContainer.appendChild(slide);

                if (heroDotsContainer) { // Only create dot if container exists
                    const dot = document.createElement('div');
                    dot.className = `hero-dot w-3 h-3 rounded-full bg-gray-500 cursor-pointer ${index === 0 ? 'bg-white' : ''}`;
                    dot.addEventListener('click', () => {
                        clearInterval(heroInterval);
                        currentHeroSlide = index;
                        updateHeroCarousel();
                        startHeroCarousel();
                    });
                    heroDotsContainer.appendChild(dot);
                }
            });

            heroSlidesContainer.querySelectorAll('.play-hero-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    console.warn('OMDb does not provide direct video links. Playing placeholder.');
                    showVideoPlayer('https://www.w3schools.com/html/mov_bbb.mp4');
                });
            });

            heroSlidesContainer.querySelectorAll('.info-hero-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const contentId = event.currentTarget.dataset.contentId;
                    const contentType = event.currentTarget.dataset.contentType;
                    showDetailOverlay(contentId, contentType);
                });
            });

            startHeroCarousel();
        } else {
            heroSection.innerHTML = '<p class="text-center text-gray-400 pt-20">Failed to load hero content.</p>';
        }
    }

    // --- Hero Carousel Logic ---
    let currentHeroSlide = 0;
    let heroInterval;

    function updateHeroCarousel() {
        const slides = heroSlidesContainer.children;
        // Ensure dots container exists before accessing its children
        const dots = heroDotsContainer ? heroDotsContainer.children : [];

        if (slides.length === 0) return;

        heroSlidesContainer.style.transform = `translateX(-${currentHeroSlide * 100}%)`;

        Array.from(dots).forEach((dot, index) => {
            if (index === currentHeroSlide) {
                dot.classList.add('bg-white');
                dot.classList.remove('bg-gray-500');
            } else {
                dot.classList.remove('bg-white');
                dot.classList.add('bg-gray-500');
            }
        });
    }

    function startHeroCarousel() {
        if (heroInterval) clearInterval(heroInterval);
        if (heroSlidesContainer.children.length > 1) {
            heroInterval = setInterval(() => {
                currentHeroSlide = (currentHeroSlide + 1) % heroSlidesContainer.children.length;
                updateHeroCarousel();
            }, 5000);
        } else {
            updateHeroCarousel();
        }
    }

    heroPrevBtn.addEventListener('click', () => {
        if (heroSlidesContainer.children.length <= 1) return;
        clearInterval(heroInterval);
        currentHeroSlide = (currentHeroSlide - 1 + heroSlidesContainer.children.length) % heroSlidesContainer.children.length;
        updateHeroCarousel();
        startHeroCarousel();
    });

    heroNextBtn.addEventListener('click', () => {
        if (heroSlidesContainer.children.length <= 1) return;
        clearInterval(heroInterval);
        currentHeroSlide = (currentHeroSlide + 1) % heroSlidesContainer.children.length;
        updateHeroCarousel();
        startHeroCarousel();
    });


    // --- Function to show detail overlay ---
    async function showDetailOverlay(contentId, contentType) {
        loadingIndicator.classList.remove('hidden');
        detailOverlay.classList.add('hidden');

        let content = allContent.get(contentId);

        if (!content || !content.Plot || content.Plot === 'N/A') {
            content = await fetchOmdbData({ i: contentId, plot: 'full' });
            if (!content || content.Response === "False") {
                loadingIndicator.classList.add('hidden');
                console.error('Failed to fetch detailed content for ID:', contentId);
                return;
            }
            allContent.set(content.imdbID, content);
        }

        detailTitle.textContent = content.Title || 'N/A';
        detailDescription.textContent = content.Plot || 'No description available.';
        // Updated placeholder to a higher resolution for detail overlay image
        detailImage.src = content.Poster && content.Poster !== 'N/A' ? content.Poster : 'https://placehold.co/1920x1080/000000/FFFFFF?text=No+Image';
        detailImage.alt = content.Title || 'N/A';
        detailImage.onerror = function() {
            this.onerror = null;
            this.src = 'https://placehold.co/1920x1080/000000/FFFFFF?text=No+Image';
        };


        detailGenres.textContent = content.Genre || 'N/A';
        detailReleaseYear.textContent = content.Year || 'N/A';
        detailDuration.textContent = content.Runtime || 'N/A';
        detailRating.textContent = content.imdbRating && content.imdbRating !== 'N/A' ? parseFloat(content.imdbRating).toFixed(1) : 'N/A';

        detailOverlay.dataset.contentId = content.imdbID;
        detailOverlay.dataset.contentType = content.Type;

        // New: Update "My List" button state
        updateMyListButton(content.imdbID);

        loadingIndicator.classList.add('hidden');
        detailOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        moreLikeThisSection.classList.add('hidden');
    }

    // --- Function to show the video player overlay ---
    const showVideoPlayer = (videoUrl) => {
        if (!videoUrl) {
            console.error('No video URL provided for playback.');
            return;
        }

        videoPlayer.src = videoUrl;
        videoPlayerOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        bufferingSpinner.classList.remove('hidden');
        playerStatusText.textContent = 'Buffering...';

        videoPlayer.load();
        videoPlayer.play().catch(error => {
            console.error('Error playing video:', error);
            playerStatusText.textContent = 'Error playing video. User interaction required.';
            bufferingSpinner.classList.add('hidden');
        });

        videoPlayer.onplaying = () => {
            bufferingSpinner.classList.add('hidden');
            playerStatusText.textContent = '';
        };
        videoPlayer.onwaiting = () => {
            bufferingSpinner.classList.remove('hidden');
            playerStatusText.textContent = 'Buffering...';
        };
        videoPlayer.onerror = () => {
            playerStatusText.textContent = 'Failed to load video.';
            bufferingSpinner.classList.add('hidden');
        };
        videoPlayer.onended = () => {
            closePlayerBtn.click();
        };
    };


    // --- Event listener for the "Play" button within the detail overlay ---
    if (playDetailBtn) {
        playDetailBtn.addEventListener('click', () => {
            const currentContentId = detailOverlay.dataset.contentId;
            const content = allContent.get(currentContentId);

            console.warn('OMDb does not provide direct video links. Playing placeholder.');
            showVideoPlayer('https://www.w3schools.com/html/mov_bbb.mp4');
        });
    }

    // New: Event listener for "Add to My List" button
    if (addToListBtn) {
        addToListBtn.addEventListener('click', () => {
            const currentContentId = detailOverlay.dataset.contentId;
            toggleMyListItem(currentContentId);
        });
    }

    // Close detail overlay button
    closeDetailBtn.addEventListener('click', () => {
        detailOverlay.classList.add('hidden');
        document.body.style.overflow = '';
    });

    // Close video player button
    closePlayerBtn.addEventListener('click', () => {
        videoPlayer.pause();
        videoPlayer.currentTime = 0;
        videoPlayer.src = '';
        videoPlayerOverlay.classList.add('hidden');
        document.body.style.overflow = '';
        playerStatusText.textContent = '';
        bufferingSpinner.classList.add('hidden');
    });

    // Removed all View All overlay elements and related event listeners
    // as this functionality is no longer desired.

    // --- Search Functionality ---
    // Toggles the visibility and 'active' class of the search input field.
    searchToggleBtn.addEventListener('click', () => {
        searchInputWrapper.classList.toggle('active'); // Toggle 'active' class for styling
        if (searchInputWrapper.classList.contains('active')) {
            searchInput.focus(); // Focus on the input field when it appears
        } else {
            searchInput.value = ''; // Clear search input when closing
            loadMainContent(); // Reload main content if search is closed
        }
    });

    // Handles search when the Enter key is pressed in the search input.
    searchInput.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                loadingIndicator.classList.remove('hidden');
                movieSectionsContainer.innerHTML = '';
                heroSection.classList.add('hidden');

                const searchResultsMovies = await fetchOmdbData({ s: query, type: 'movie' });
                const searchResultsTV = await fetchOmdbData({ s: query, type: 'series' });

                let combinedResults = [];
                if (searchResultsMovies && searchResultsMovies.Search) {
                    combinedResults = combinedResults.concat(searchResultsMovies.Search);
                }
                if (searchResultsTV && searchResultsTV.Search) {
                    combinedResults = combinedResults.concat(searchResultsTV.Search);
                }

                const filteredResults = combinedResults.filter(item => item.Poster && item.Poster !== 'N/A' && (item.Type === 'movie' || item.Type === 'series'));

                if (filteredResults.length > 0) {
                    const searchSection = document.createElement('div');
                    searchSection.className = 'movie-section p-4 md:p-8 pt-20';
                    searchSection.id = 'search-results-section';
                    searchSection.innerHTML = `
                        <h3 class="text-xl md:text-2xl font-bold mb-4 text-white">Search Results for "${query}"</h3>
                        <div class="movie-grid-carousel scroll-snap-x scrollbar-hide flex space-x-4 md:space-x-6 overflow-x-auto pb-4">
                        </div>
                    `;
                    movieSectionsContainer.appendChild(searchSection);

                    const searchResultsCarousel = searchSection.querySelector('.movie-grid-carousel');
                    filteredResults.forEach(content => {
                        allContent.set(content.imdbID, content);
                        const movieCard = createMovieCard(content);
                        searchResultsCarousel.appendChild(movieCard);
                    });
                } else {
                    movieSectionsContainer.innerHTML = '<p class="text-center text-gray-400 pt-20">No results found for your search.</p>';
                }
                loadingIndicator.classList.add('hidden');
            } else {
                loadMainContent();
            }
        }
    });


    // --- Initial Content Loading ---
    async function loadMainContent() {
        loadingIndicator.classList.remove('hidden');
        movieSectionsContainer.innerHTML = '';
        heroSection.classList.remove('hidden');

        await populateHeroSection();

        const sectionsConfig = [
            { id: 'trending-movies-section', title: 'Popular Movies (Simulated)', searchParams: { s: 'movie', plot: 'short' } },
            { id: 'popular-tv-section', title: 'Popular TV Shows (Simulated)', searchParams: { s: 'series', plot: 'short' } },
            { id: 'action-movies-section', title: 'Action Movies', searchParams: { s: 'action', type: 'movie', plot: 'short' } },
            { id: 'comedy-films-section', title: 'Comedy Films', searchParams: { s: 'comedy', type: 'movie', plot: 'short' } }
        ];

        for (const config of sectionsConfig) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'movie-section mb-8';
            sectionDiv.id = config.id;
            sectionDiv.innerHTML = `
                <h3 class="text-xl md:text-2xl font-bold mb-4 text-white">${config.title}</h3>
                <div class="movie-grid-carousel scroll-snap-x scrollbar-hide flex space-x-4 md:space-x-6 overflow-x-auto pb-4">
                </div>
            `;
            movieSectionsContainer.appendChild(sectionDiv);
            await populateMovieSection(config.title, config.searchParams, config.id);
        }

        loadingIndicator.classList.add('hidden');
    }

    // --- My List Functions ---
    function saveMyList() {
        localStorage.setItem('myList', JSON.stringify(myList));
    }

    async function toggleMyListItem(imdbID) {
        const index = myList.indexOf(imdbID);
        const iconElement = addToListBtn.querySelector('i');
        const textElement = addToListBtn.querySelector('span'); // Assuming span for text

        if (index > -1) {
            // Item is in list, remove it
            myList.splice(index, 1);
            iconElement.className = 'fas fa-plus mr-2';
            addToListBtn.classList.remove('added-to-list');
            if (textElement) textElement.textContent = 'My List';
            else addToListBtn.childNodes[1].nodeValue = ' My List'; // Fallback for text node
        } else {
            // Item is not in list, add it
            myList.push(imdbID);
            iconElement.className = 'fas fa-check mr-2';
            addToListBtn.classList.add('added-to-list');
            if (textElement) textElement.textContent = 'Added';
            else addToListBtn.childNodes[1].nodeValue = ' Added'; // Fallback for text node
        }
        saveMyList();
        console.log('My List:', myList);
    }

    function updateMyListButton(imdbID) {
        const iconElement = addToListBtn.querySelector('i');
        // Check if there is a text node or a span for the text
        let textElement = addToListBtn.querySelector('span');
        if (!textElement && addToListBtn.childNodes.length > 1) {
             // If no span, assume the text is directly after the icon
             textElement = { textContent: addToListBtn.childNodes[1].nodeValue };
        }

        if (myList.includes(imdbID)) {
            iconElement.className = 'fas fa-check mr-2';
            addToListBtn.classList.add('added-to-list');
            if (textElement) textElement.textContent = 'Added';
        } else {
            iconElement.className = 'fas fa-plus mr-2';
            addToListBtn.classList.remove('added-to-list');
            if (textElement) textElement.textContent = 'My List';
        }
    }


    async function displayMyList() {
        loadingIndicator.classList.remove('hidden');
        movieSectionsContainer.innerHTML = '';
        heroSection.classList.add('hidden');

        const myListSectionDiv = document.createElement('div');
        myListSectionDiv.className = 'movie-section p-4 md:p-8 pt-20';
        myListSectionDiv.id = 'my-list-section';
        myListSectionDiv.innerHTML = `
            <h3 class="text-xl md:text-2xl font-bold mb-4 text-white">My List</h3>
            <div class="movie-grid-category grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            </div>
        `;
        movieSectionsContainer.appendChild(myListSectionDiv);

        const myListContentGrid = myListSectionDiv.querySelector('.movie-grid-category');

        if (myList.length > 0) {
            const myListPromises = myList.map(id => fetchOmdbData({ i: id, plot: 'short' }));
            const myListContent = await Promise.all(myListPromises);

            const validMyListContent = myListContent.filter(item => item && item.Response === "True" && item.Poster && item.Poster !== 'N/A');

            if (validMyListContent.length > 0) {
                validMyListContent.forEach(content => {
                    allContent.set(content.imdbID, content); // Ensure detailed content is stored
                    const movieCard = createMovieCard(content);
                    myListContentGrid.appendChild(movieCard);
                });
            } else {
                myListContentGrid.innerHTML = '<p class="text-center text-gray-400 col-span-full">No valid content found in your list.</p>';
            }
        } else {
            myListContentGrid.innerHTML = '<p class="text-center text-gray-400 col-span-full">Your list is empty. Add some movies or TV shows!</p>';
        }
        loadingIndicator.classList.add('hidden');
    }


    // --- Navigation Link Handling ---
    navLinks.forEach(link => {
        link.addEventListener('click', async (event) => {
            event.preventDefault();

            navLinks.forEach(l => l.classList.remove('active'));
            event.currentTarget.classList.add('active');

            const categoryType = event.currentTarget.dataset.categoryType;
            loadingIndicator.classList.remove('hidden');
            movieSectionsContainer.innerHTML = '';
            heroSection.classList.add('hidden');

            let title = '';
            let searchType = '';
            let numPagesToFetch = 5; // Fetch up to 5 pages (50 results) for categories

            switch (categoryType) {
                case 'home':
                    loadMainContent();
                    return;
                case 'series': // Changed from 'tv-show' to 'series'
                    title = 'Top Series & More';
                    searchType = 'series';

                    const topSeriesTitles = [
                        'Breaking Bad',
                        'Game of Thrones',
                        'House of the Dragon',
                        'Stranger Things',
                        'The Crown',
                        'Chernobyl',
                        'The Mandalorian',
                        'Queen\'s Gambit',
                        'Narcos',
                        'Peaky Blinders'
                    ];

                    let topSeriesResults = [];
                    const topSeriesPromises = topSeriesTitles.map(title => fetchOmdbData({ t: title, type: 'series', plot: 'short' }));
                    const fetchedTopSeries = await Promise.all(topSeriesPromises);

                    fetchedTopSeries.forEach(series => {
                        if (series && series.Response === "True" && series.Poster && series.Poster !== 'N/A') {
                            topSeriesResults.push(series);
                        }
                    });

                    // Fetch additional generic series to fill up the page
                    let genericSeriesResults = [];
                    for (let i = 1; i <= numPagesToFetch; i++) {
                        const data = await fetchOmdbData({ s: 'series', plot: 'short', page: i });
                        if (data && data.Search) {
                            const filtered = data.Search.filter(item => item.Poster && item.Poster !== 'N/A' && item.Type === 'series');
                            genericSeriesResults = genericSeriesResults.concat(filtered);
                        } else {
                            console.warn(`No generic series results on page ${i}. Stopping further fetches.`);
                            break;
                        }
                    }

                    // Combine and deduplicate results, prioritizing topSeriesResults
                    let combinedSeriesResults = [...topSeriesResults];
                    const existingIds = new Set(topSeriesResults.map(s => s.imdbID));

                    genericSeriesResults.forEach(series => {
                        if (!existingIds.has(series.imdbID)) {
                            combinedSeriesResults.push(series);
                            existingIds.add(series.imdbID);
                        }
                    });

                    // Create the section for the consolidated series view
                    const seriesSectionDiv = document.createElement('div');
                    seriesSectionDiv.className = 'movie-section p-4 md:p-8 pt-20';
                    seriesSectionDiv.id = 'consolidated-series-section';
                    seriesSectionDiv.innerHTML = `
                        <h3 class="text-xl md:text-2xl font-bold mb-4 text-white">${title}</h3>
                        <div class="movie-grid-category grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                        </div>
                    `;
                    movieSectionsContainer.appendChild(seriesSectionDiv);

                    const seriesContentGrid = seriesSectionDiv.querySelector('.movie-grid-category');

                    if (combinedSeriesResults.length > 0) {
                        combinedSeriesResults.forEach(content => {
                            allContent.set(content.imdbID, content);
                            const movieCard = createMovieCard(content);
                            seriesContentGrid.appendChild(movieCard);
                        });
                    } else {
                        seriesContentGrid.innerHTML = `<p class="text-center text-gray-400 col-span-full">No series content found.</p>`;
                    }

                    loadingIndicator.classList.add('hidden');
                    return; // Important: return after handling 'series' case
                case 'movie':
                    title = 'All Movies';
                    searchType = 'movie';
                    break;
                case 'my-list':
                    displayMyList(); // Call the new function to display My List
                    return;
                default:
                    title = 'General Content (Simulated)';
                    searchType = 'film';
            }

            // This block will now only run for 'movie' and 'default' (if any other category is added)
            // Create a new section for the consolidated category view
            const categorySectionDiv = document.createElement('div');
            categorySectionDiv.className = 'movie-section p-4 md:p-8 pt-20';
            categorySectionDiv.id = 'consolidated-category-section';
            categorySectionDiv.innerHTML = `
                <h3 class="text-xl md:text-2xl font-bold mb-4 text-white">${title}</h3>
                <div class="movie-grid-category grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    </div>
            `;
            movieSectionsContainer.appendChild(categorySectionDiv);

            const categoryContentGrid = categorySectionDiv.querySelector('.movie-grid-category');
            let allCategoryResults = [];

            // Fetch multiple pages to populate the single view
            for (let i = 1; i <= numPagesToFetch; i++) {
                let params = { s: searchType, plot: 'short', page: i };
                const data = await fetchOmdbData(params);
                if (data && data.Search) {
                    const filtered = data.Search.filter(item => item.Poster && item.Poster !== 'N/A' && (item.Type === 'movie' || item.Type === 'series'));
                    allCategoryResults = allCategoryResults.concat(filtered);
                } else {
                    console.warn(`No results for ${title} on page ${i}. Stopping further fetches for this category.`);
                    break; // Stop if a page returns no results
                }
            }

            if (allCategoryResults.length > 0) {
                allCategoryResults.forEach(content => {
                    allContent.set(content.imdbID, content);
                    const movieCard = createMovieCard(content);
                    categoryContentGrid.appendChild(movieCard);
                });
            } else {
                categoryContentGrid.innerHTML = `<p class="text-center text-gray-400 col-span-full">No content found for "${title}".</p>`;
            }

            loadingIndicator.classList.add('hidden');
        });
    });

    // --- Header scroll effect ---
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('bg-black', 'bg-opacity-95');
        } else {
            header.classList.remove('bg-black', 'bg-opacity-95');
        }
    });

    // --- Initial load of content when the DOM is ready ---
    loadMainContent();

    // --- User details (placeholder) ---
    userDetailsSpan.textContent = 'Guest';
    userProfileImg.src = 'https://placehold.co/40x40/FF0000/FFFFFF?text=U';
});

// --- Helper for user details (can be expanded later for login functionality) ---
function updateUserDetails(username, imageUrl) {
    const userDetailsSpan = document.querySelector('#user-details span');
    const userProfileImg = document.querySelector('#user-details img');
    userDetailsSpan.textContent = username;
    userProfileImg.src = imageUrl;
}

// --- Function to simulate user login (for future expansion) ---
function loginUser(username, password) {
    console.log(`Attempting to log in ${username}...`);
}
