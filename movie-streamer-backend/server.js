const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios'); // For making HTTP requests to TMDB

// Load environment variables from .env file (if running locally)
// In production environments like Render, these are automatically provided.
require('dotenv').config(); 

const Movie = require('./models/Movie'); // Your Movie model
const Series = require('./models/Series'); // Your Series model
const UserList = require('./models/UserList'); // Your UserList model

const app = express();
const PORT = process.env.PORT || 5000; // Use port 5000 for the backend, or environment variable

// TMDB API Configuration - IMPORTANT: Now using your provided key
const TMDB_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYmNkMzgwOTZlYzBiOWYyOGUzMDVjNmI1ZDQ3ZmY4MSIsIm5iZiI6MTc0ODc3MTYwNi4wMjU5OTk4LCJzdWIiOiI2ODNjMjMxNmY1YjM3ODE2OWJmMmFmZWMiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI%3D.4Eww2uuHE9QQaAf6hj3SIN1L-EmQ08j7PZKvlc2oMds'; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/'; // Use w500 for posters, original for backdrops

// The check for TMDB_API_KEY being loaded is removed as it's now hardcoded.
// If you revert to using process.env.TMDB_API_KEY, uncomment this check.
/*
if (!TMDB_API_KEY) {
    console.error('Error: TMDB_API_KEY is not set in environment variables. Please set it in Render or a .env file.');
    process.exit(1); // Exit if API key is missing
}
*/

// In-memory cache for TMDB genres
let movieGenres = {};
let tvGenres = {};

// MongoDB Connection URI - IMPORTANT: Use environment variables in production
const MONGO_URI = 'mongodb+srv://vishnusaketh07:NETFLIXCLONE@cluster0.yo7hthy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'NETFLIX'; // Your database name

// --- Middleware ---
// Configure CORS to explicitly allow requests from your Netlify frontend
app.use(cors({
    origin: 'https://netprooo.netlify.app', // IMPORTANT: This must be your exact Netlify frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed HTTP methods
    credentials: true // Allow sending of cookies/authorization headers if needed
}));

// Enable parsing JSON request bodies
app.use(express.json());

// --- Helper function to fetch data from TMDB ---
const fetchTmdb = async (url, params = {}) => {
    try {
        const response = await axios.get(`${TMDB_BASE_URL}${url}`, {
            headers: {
                'Authorization': `Bearer ${TMDB_API_KEY}`,
                'Content-Type': 'application/json'
            },
            params: {
                language: 'en-US', // Default language
                ...params
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching from TMDB ${url}:`, error.response ? error.response.data : error.message);
        // Re-throw to be caught by the route handler
        throw new Error(`Failed to fetch from TMDB: ${error.response ? error.response.status : ''} ${error.message}`);
    }
};

// --- Helper function to get genre names from IDs ---
const getGenreNames = (genreIds, type) => {
    const genreMap = type === 'movie' ? movieGenres : tvGenres;
    if (!genreIds || !Array.isArray(genreIds)) return [];
    return genreIds.map(id => genreMap[id]).filter(Boolean); // Filter out undefined genres
};

/**
 * Helper function to map TMDB item data to our simplified schema.
 * Attempts to find IMDb ID if not already present.
 * @param {object} tmdbItem - The raw item object from TMDB.
 * @param {'movie'|'series'} type - The type of content ('movie' or 'series').
 * @returns {Promise<object|null>} Mapped item object or null if invalid.
 */
const mapTmdbToSchema = async (tmdbItem, type) => {
    if (!tmdbItem || !tmdbItem.id) return null; // Ensure TMDB ID exists

    let imdbId = null;
    // Attempt to fetch external IDs only if we don't already have an imdb_id (e.g., from /find endpoint)
    if (!tmdbItem.imdb_id) {
        try {
            const externalIds = await fetchTmdb(`/${type === 'movie' ? 'movie' : 'tv'}/${tmdbItem.id}/external_ids`);
            imdbId = externalIds.imdb_id || null;
        } catch (error) {
            console.warn(`Could not fetch external IDs for ${type} TMDB ID ${tmdbItem.id}:`, error.message);
        }
    } else {
        imdbId = tmdbItem.imdb_id;
    }

    const mappedItem = {
        tmdbId: tmdbItem.id,
        imdbID: imdbId,
        plot: tmdbItem.overview || 'No plot available.',
        poster: tmdbItem.poster_path ? `${TMDB_IMAGE_BASE_URL}w500${tmdbItem.poster_path}` : null,
        backdrop: tmdbItem.backdrop_path ? `${TMDB_IMAGE_BASE_URL}original${tmdbItem.backdrop_path}` : null,
        genre: getGenreNames(tmdbItem.genre_ids, type),
        imdbRating: tmdbItem.vote_average ? tmdbItem.vote_average.toFixed(1) : 'N/A', // TMDB's rating
        type: type,
        telegramPlayableUrl: null, // Default to null, will be loaded from DB if exists
    };

    if (type === 'movie') {
        mappedItem.title = tmdbItem.title;
        mappedItem.year = tmdbItem.release_date ? tmdbItem.release_date.substring(0, 4) : 'N/A';
        mappedItem.runtime = tmdbItem.runtime ? `${tmdbItem.runtime} min` : 'N/A';
    } else { // series
        mappedItem.title = tmdbItem.name;
        mappedItem.year = tmdbItem.first_air_date ? tmdbItem.first_air_date.substring(0, 4) : 'N/A';
        // Ensure totalSeasons is a number for easier handling, or default to N/A
        mappedItem.totalSeasons = tmdbItem.number_of_seasons ? String(tmdbItem.number_of_seasons) : 'N/A';
        mappedItem.numberOfEpisodes = tmdbItem.number_of_episodes ? String(tmdbItem.number_of_episodes) : 'N/A';
    }

    // Attempt to load playable URL from DB if item already exists
    try {
        const Model = type === 'movie' ? Movie : Series;
        if (mappedItem.imdbID) { // Only query DB if we have an IMDb ID
            const existingItem = await Model.findOne({ imdbID: mappedItem.imdbID });
            if (existingItem && existingItem.telegramPlayableUrl) {
                mappedItem.telegramPlayableUrl = existingItem.telegramPlayableUrl;
            }
        }
    } catch (dbError) {
        console.error(`Error checking DB for playable URL for ${type} ${mappedItem.imdbID}:`, dbError.message);
    }

    return mappedItem;
};

/**
 * Helper to fetch TMDB ID from IMDb ID.
 * @param {string} imdbId - The IMDb ID (e.g., 'tt0903747').
 * @param {'movie'|'tv'} tmdbMediaType - The TMDB media type ('movie' or 'tv').
 * @returns {Promise<number|null>} The TMDB ID or null if not found.
 */
const getTmdbIdFromImdbId = async (imdbId, tmdbMediaType) => {
    try {
        const findData = await fetchTmdb(`/find/${imdbId}`, { external_source: 'imdb_id' });
        if (tmdbMediaType === 'movie' && findData.movie_results && findData.movie_results.length > 0) {
            return findData.movie_results[0].id;
        }
        if (tmdbMediaType === 'tv' && findData.tv_results && findData.tv_results.length > 0) {
            return findData.tv_results[0].id;
        }
        return null;
    } catch (error) {
        console.error(`Error finding TMDB ID for IMDb ID ${imdbId} (${tmdbMediaType}):`, error.message);
        return null;
    }
};

// --- Initial Genre Fetch (on server start) ---
const fetchGenres = async () => {
    try {
        const movieGenreData = await fetchTmdb('/genre/movie/list');
        movieGenreData.genres.forEach(genre => {
            movieGenres[genre.id] = genre.name;
        });
        console.log('TMDB Movie Genres Loaded.');

        const tvGenreData = await fetchTmdb('/genre/tv/list');
        tvGenreData.genres.forEach(genre => {
            tvGenres[genre.id] = genre.name;
        });
        console.log('TMDB TV Genres Loaded.');
    } catch (error) {
        console.error('Failed to load TMDB genres:', error.message);
        process.exit(1); // Exit if genres fail to load, as it's critical for mapping
    }
};

// Connect to MongoDB
mongoose.connect(MONGO_URI, { dbName: DB_NAME })
    .then(async () => {
        console.log('MongoDB connected successfully for server.');
        await fetchGenres(); // Fetch genres after DB connection
        // Start the server only after DB and genres are ready
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error for server:', err);
        process.exit(1); // Exit if DB connection fails
    });

// --- API Routes ---

// Get Trending Movies (for Hero Section) - Now fetches trending movies from the last week
app.get('/api/movies/trending', async (req, res) => {
    try {
        const data = await fetchTmdb('/trending/movie/week');
        const trendingMovies = [];

        for (const item of data.results) {
            // Ensure we have enough data for the hero banner display (poster, backdrop, title/name, overview)
            if (trendingMovies.length >= 5) break; 
            if (!item.poster_path && !item.backdrop_path) continue; // Must have at least one image
            if (!item.title && !item.name) continue; // Must have a title/name
            if (!item.overview) continue; // Must have an overview

            const mapped = await mapTmdbToSchema(item, 'movie');
            if (mapped && (mapped.imdbID || mapped.tmdbId)) { // Ensure mapped object is valid and has an ID
                // If not in DB, save it so playable URL can be set later
                const existingMovie = await Movie.findOne({ imdbID: mapped.imdbID }); // Prefer IMDb ID for lookup
                if (!existingMovie) {
                    const newMovie = new Movie(mapped);
                    await newMovie.save().catch(saveErr => console.error("Error saving new movie from TMDB:", saveErr.message));
                }
                trendingMovies.push(mapped);
            }
        }
        res.json(trendingMovies);
    } catch (error) {
        console.error('Error fetching trending movies for hero banner:', error);
        res.status(500).json({ error: 'Failed to fetch trending movies for hero banner', details: error.message });
    }
});

// Get Popular Movies (more pages for more content)
app.get('/api/movies/popular', async (req, res) => {
    try {
        const allTmdbMovies = [];
        for (let i = 1; i <= 5; i++) { // Fetch first 5 pages for more content
            const data = await fetchTmdb('/movie/popular', { page: i });
            allTmdbMovies.push(...data.results);
        }

        const popularMovies = [];
        for (const item of allTmdbMovies) {
            const mapped = await mapTmdbToSchema(item, 'movie');
            if (mapped && (mapped.imdbID || mapped.tmdbId) && mapped.poster) { // Ensure essential fields
                const existingMovie = await Movie.findOne({ imdbID: mapped.imdbID });
                if (!existingMovie) { // Only save if not already in DB
                    const newMovie = new Movie(mapped);
                    await newMovie.save().catch(saveErr => console.error("Error saving new movie from TMDB:", saveErr.message));
                }
                popularMovies.push(mapped);
            }
        }
        res.json(popularMovies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch popular movies', details: error.message });
    }
});

// Get Best Series (using top_rated, more pages for more content)
app.get('/api/series/best', async (req, res) => {
    try {
        const allTmdbSeries = [];
        for (let i = 1; i <= 5; i++) { // Fetch first 5 pages for more content
            const data = await fetchTmdb('/tv/top_rated', { page: i });
            allTmdbSeries.push(...data.results);
        }

        const bestSeries = [];
        for (const item of allTmdbSeries) {
            const mapped = await mapTmdbToSchema(item, 'series');
            if (mapped && (mapped.imdbID || mapped.tmdbId) && mapped.poster) { // Ensure essential fields
                const existingSeries = await Series.findOne({ imdbID: mapped.imdbID });
                if (!existingSeries) {
                    const newSeries = new Series(mapped);
                    await newSeries.save().catch(saveErr => console.error("Error saving new series from TMDB:", saveErr.message));
                }
                bestSeries.push(mapped);
            }
        }
        res.json(bestSeries);
    } catch (error) {
        console.error('Error fetching best series:', error);
        res.status(500).json({ error: 'Failed to fetch best series', details: error.message });
    }
});

// Get Popular Series (more pages for more content)
app.get('/api/series/popular', async (req, res) => {
    try {
        const allTmdbSeries = [];
        for (let i = 1; i <= 5; i++) { // Fetch first 5 pages for more content
            const data = await fetchTmdb('/tv/popular', { page: i });
            allTmdbSeries.push(...data.results);
        }

        const popularSeries = [];
        for (const item of allTmdbSeries) {
            const mapped = await mapTmdbToSchema(item, 'series');
            if (mapped && (mapped.imdbID || mapped.tmdbId) && mapped.poster) { // Ensure essential fields
                const existingSeries = await Series.findOne({ imdbID: mapped.imdbID });
                if (!existingSeries) {
                    const newSeries = new Series(mapped);
                    await newSeries.save().catch(saveErr => console.error("Error saving new series from TMDB:", saveErr.message));
                }
                popularSeries.push(mapped);
            }
        }
        res.json(popularSeries);
    } catch (error) {
        console.error('Error fetching popular series:', error);
        res.status(500).json({ error: 'Failed to fetch popular series', details: error.message });
    }
});

// Get Movies by Genre (more pages for more content)
app.get('/api/movies/genre/:genreName', async (req, res) => {
    const genreName = req.params.genreName.toLowerCase();
    const genreId = Object.keys(movieGenres).find(key => movieGenres[key].toLowerCase() === genreName);

    if (!genreId) {
        return res.status(404).json({ message: 'Genre not found' });
    }

    try {
        const allTmdbMovies = [];
        for (let i = 1; i <= 5; i++) { // Fetch first 5 pages
            const data = await fetchTmdb('/discover/movie', { with_genres: genreId, page: i });
            allTmdbMovies.push(...data.results);
        }

        const genreMovies = [];
        for (const item of allTmdbMovies) {
            const mapped = await mapTmdbToSchema(item, 'movie');
            if (mapped && (mapped.imdbID || mapped.tmdbId) && mapped.poster) { // Ensure essential fields
                const existingMovie = await Movie.findOne({ imdbID: mapped.imdbID });
                if (!existingMovie) {
                    const newMovie = new Movie(mapped);
                    await newMovie.save().catch(saveErr => console.error("Error saving new movie from TMDB:", saveErr.message));
                }
                genreMovies.push(mapped);
            }
        }
        res.json(genreMovies);
    } catch (error) {
        console.error(`Error fetching ${genreName} movies:`, error);
        res.status(500).json({ error: `Failed to fetch ${genreName} movies`, details: error.message });
    }
});

// Get Series by Genre (more pages for more content)
app.get('/api/series/genre/:genreName', async (req, res) => {
    const genreName = req.params.genreName.toLowerCase();
    const genreId = Object.keys(tvGenres).find(key => tvGenres[key].toLowerCase() === genreName);

    if (!genreId) {
        return res.status(404).json({ message: 'Genre not found' });
    }

    try {
        const allTmdbSeries = [];
        for (let i = 1; i <= 5; i++) { // Fetch first 5 pages
            const data = await fetchTmdb('/discover/tv', { with_genres: genreId, page: i });
            allTmdbSeries.push(...data.results);
        }

        const genreSeries = [];
        for (const item of allTmdbSeries) {
            const mapped = await mapTmdbToSchema(item, 'series');
            if (mapped && (mapped.imdbID || mapped.tmdbId) && mapped.poster) { // Ensure essential fields
                const existingSeries = await Series.findOne({ imdbID: mapped.imdbID });
                if (!existingSeries) {
                    const newSeries = new Series(mapped);
                    await newSeries.save().catch(saveErr => console.error("Error saving new series from TMDB:", saveErr.message));
                }
                genreSeries.push(mapped);
            }
        }
        res.json(genreSeries);
    } catch (error) {
        console.error(`Error fetching ${genreName} series:`, error);
        res.status(500).json({ error: `Failed to fetch ${genreName} series`, details: error.message });
    }
});

// Get All Movies (for Movies page)
app.get('/api/movies', async (req, res) => {
    try {
        const allTmdbMovies = [];
        for (let i = 1; i <= 10; i++) { // Fetch more pages for a larger collection
            const data = await fetchTmdb('/movie/popular', { page: i });
            allTmdbMovies.push(...data.results);
        }

        const movies = [];
        for (const item of allTmdbMovies) {
            const mapped = await mapTmdbToSchema(item, 'movie');
            if (mapped && (mapped.imdbID || mapped.tmdbId) && mapped.poster) {
                const existingMovie = await Movie.findOne({ imdbID: mapped.imdbID });
                if (!existingMovie) {
                    const newMovie = new Movie(mapped);
                    await newMovie.save().catch(saveErr => console.error("Error saving new movie from TMDB:", saveErr.message));
                }
                movies.push(mapped);
            }
        }
        res.json(movies);
    } catch (error) {
        console.error('Error fetching all movies:', error);
        res.status(500).json({ error: 'Failed to fetch all movies', details: error.message });
    }
});

// Get All Series (for Series page)
app.get('/api/series', async (req, res) => {
    try {
        const allTmdbSeries = [];
        for (let i = 1; i <= 10; i++) { // Fetch more pages for a larger collection
            const data = await fetchTmdb('/tv/popular', { page: i });
            allTmdbSeries.push(...data.results);
        }

        const series = [];
        for (const item of allTmdbSeries) {
            const mapped = await mapTmdbToSchema(item, 'series');
            if (mapped && (mapped.imdbID || mapped.tmdbId) && mapped.poster) {
                const existingSeries = await Series.findOne({ imdbID: mapped.imdbID });
                if (!existingSeries) {
                    const newSeries = new Series(mapped);
                    await newSeries.save().catch(saveErr => console.error("Error saving new series from TMDB:", saveErr.message));
                }
                series.push(mapped);
            }
        }
        res.json(series);
    } catch (error) {
        console.error('Error fetching all series:', error);
        res.status(500).json({ error: 'Failed to fetch all series', details: error.message });
    }
});

/**
 * Common function to fetch details for movie or series.
 * Handles both IMDb ID and TMDB ID as input.
 * @param {string} id - IMDb ID (e.g., 'tt0903747') or TMDB ID (e.g., '1396').
 * @param {'movie'|'series'} type - 'movie' or 'series'.
 * @returns {Promise<object|null>} Mapped item object or null.
 */
const fetchContentDetails = async (id, type) => {
    let tmdbId = null;
    let imdbId = null;

    // Check if the ID looks like an IMDb ID (starts with 'tt')
    if (id.startsWith('tt')) {
        imdbId = id;
        tmdbId = await getTmdbIdFromImdbId(imdbId, type === 'movie' ? 'movie' : 'tv');
    } else {
        // Assume it's a TMDB ID
        tmdbId = parseInt(id, 10);
        // Try to get the IMDb ID from TMDB for this item
        try {
            const externalIds = await fetchTmdb(`/${type === 'movie' ? 'movie' : 'tv'}/${tmdbId}/external_ids`);
            imdbId = externalIds.imdb_id || null;
        } catch (error) {
            console.warn(`Could not fetch external IMDb ID for TMDB ${type} ID ${tmdbId}:`, error.message);
        }
    }

    if (!tmdbId) {
        throw new Error(`${type} with ID ${id} not found on TMDB.`);
    }

    const detailsEndpoint = `/${type === 'movie' ? 'movie' : 'tv'}/${tmdbId}`;
    const creditsEndpoint = `/${type === 'movie' ? 'movie' : 'tv'}/${tmdbId}/credits`;

    const [details, credits] = await Promise.all([
        fetchTmdb(detailsEndpoint),
        fetchTmdb(creditsEndpoint)
    ]);

    const director = type === 'movie' ? (credits.crew.find(person => person.job === 'Director')?.name || 'N/A') : 'N/A';
    const writers = type === 'movie' ? (credits.crew.filter(person => ['Writer', 'Screenplay'].includes(person.job)).map(person => person.name).join(', ') || 'N/A') : 'N/A';
    const actors = credits.cast.slice(0, 5).map(person => person.name).join(', ') || 'N/A'; // Top 5 actors

    const mappedItem = await mapTmdbToSchema(details, type);
    mappedItem.director = director;
    mappedItem.writer = writers;
    mappedItem.actors = actors;
    mappedItem.imdbID = imdbId; // Ensure correct IMDb ID is set
    mappedItem.tmdbId = tmdbId; // Ensure correct TMDB ID is set

    // For series, add seasons data
    if (type === 'series' && details.seasons) {
        mappedItem.seasons = details.seasons.map(s => ({
            id: s.id,
            season_number: s.season_number,
            name: s.name,
            overview: s.overview,
            air_date: s.air_date,
            episode_count: s.episode_count,
            poster_path: s.poster_path ? `${TMDB_IMAGE_BASE_URL}w500${s.poster_path}` : null,
        }));
    }

    // Save/Update in DB
    const Model = type === 'movie' ? Movie : Series;
    // Prefer lookup by IMDb ID, fall back to TMDB ID if IMDb ID is not available for this item
    if (imdbId) {
        await Model.findOneAndUpdate(
            { imdbID: imdbId },
            { $set: { ...mappedItem } },
            { upsert: true, new: true } // Create if not exists, return updated doc
        ).catch(saveErr => console.error(`Error saving/updating ${type} in DB with IMDb ID ${imdbId}:`, saveErr.message));
    } else if (tmdbId) {
        await Model.findOneAndUpdate(
            { tmdbId: tmdbId },
            { $set: { ...mappedItem } },
            { upsert: true, new: true }
        ).catch(saveErr => console.error(`Error saving/updating ${type} in DB with TMDB ID ${tmdbId}:`, saveErr.message));
    }


    return mappedItem;
};

// Get Movie Details by IMDb ID or TMDB ID
app.get('/api/movies/:id', async (req, res) => {
    const id = req.params.id; // Can be IMDb ID (tt...) or TMDB ID (number)
    try {
        const movieDetails = await fetchContentDetails(id, 'movie');
        res.json(movieDetails);
    } catch (error) {
        console.error(`Error fetching movie details for ${id}:`, error);
        res.status(500).json({ error: 'Failed to fetch movie details', details: error.message });
    }
});

// Get Series Details by IMDb ID or TMDB ID
app.get('/api/series/:id', async (req, res) => {
    const id = req.params.id; // Can be IMDb ID (tt...) or TMDB ID (number)
    try {
        const seriesDetails = await fetchContentDetails(id, 'series');
        res.json(seriesDetails);
    } catch (error) {
        console.error(`Error fetching series details for ${id}:`, error);
        res.status(500).json({ error: 'Failed to fetch series details', details: error.message });
    }
});

// NEW ROUTE: Get Seasons for a Series by TMDB ID
app.get('/api/series/:tmdbId/seasons', async (req, res) => {
    const tmdbId = req.params.tmdbId;
    try {
        const seriesDetails = await fetchTmdb(`/tv/${tmdbId}`);
        if (!seriesDetails || !seriesDetails.seasons) {
            return res.status(404).json({ message: 'Seasons not found for this series.' });
        }
        // Map season data to include essential fields
        const seasons = seriesDetails.seasons.map(s => ({
            id: s.id,
            season_number: s.season_number,
            name: s.name,
            overview: s.overview,
            air_date: s.air_date,
            episode_count: s.episode_count,
            poster_path: s.poster_path ? `${TMDB_IMAGE_BASE_URL}w500${s.poster_path}` : null,
        }));
        res.json(seasons);
    } catch (error) {
        console.error(`Error fetching seasons for series TMDB ID ${tmdbId}:`, error);
        res.status(500).json({ error: 'Failed to fetch series seasons', details: error.message });
    }
});

// NEW ROUTE: Get Episodes for a Specific Season of a Series by TMDB ID and Season Number
app.get('/api/series/:tmdbId/season/:seasonNumber/episodes', async (req, res) => {
    const { tmdbId, seasonNumber } = req.params;
    try {
        const seasonDetails = await fetchTmdb(`/tv/${tmdbId}/season/${seasonNumber}`);
        if (!seasonDetails || !seasonDetails.episodes) {
            return res.status(404).json({ message: 'Episodes not found for this season.' });
        }
        // Map episode data to include essential fields
        const episodes = seasonDetails.episodes.map(e => ({
            id: e.id,
            episode_number: e.episode_number,
            name: e.name,
            overview: e.overview,
            air_date: e.air_date,
            still_path: e.still_path ? `${TMDB_IMAGE_BASE_URL}w500${e.still_path}` : null,
            vote_average: e.vote_average ? e.vote_average.toFixed(1) : 'N/A',
            runtime: e.runtime ? `${e.runtime} min` : 'N/A' // assuming 'runtime' is available
        }));
        res.json(episodes);
    } catch (error) {
        console.error(`Error fetching episodes for series TMDB ID ${tmdbId}, Season ${seasonNumber}:`, error);
        res.status(500).json({ error: 'Failed to fetch season episodes', details: error.message });
    }
});

// Set Playable URL (Admin Functionality)
app.put('/api/:type/:id/set-playable-url', async (req, res) => {
    const { type, id } = req.params; // Can be IMDb ID (tt...) or TMDB ID (number)
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ message: 'Playable URL is required.' });
    }

    try {
        let updatedItem;
        let Model;
        if (type === 'movies') {
            Model = Movie;
        } else if (type === 'series') {
            Model = Series;
        } else {
            return res.status(400).json({ message: 'Invalid content type.' });
        }

        // Determine if ID is IMDb or TMDB and find the item
        let query = {};
        if (id.startsWith('tt')) {
            query.imdbID = id;
        } else {
            query.tmdbId = parseInt(id, 10);
        }

        updatedItem = await Model.findOneAndUpdate(
            query,
            { telegramPlayableUrl: url },
            { new: true, upsert: false } // Do not upsert here, item must exist
        );

        if (updatedItem) {
            res.json({ message: 'Playable URL updated successfully!', item: updatedItem });
        } else {
            // If not found by provided ID, try to fetch details and then update/create
            console.warn(`Item not found by ${Object.keys(query)[0]}: ${Object.values(query)[0]}. Attempting to fetch details and update.`);
            const contentDetails = await fetchContentDetails(id, type.slice(0, -1)); // Remove 's' from type
            if (contentDetails && (contentDetails.imdbID || contentDetails.tmdbId)) { // Ensure we got a mapped item with an ID
                updatedItem = await Model.findOneAndUpdate(
                    { $or: [{ imdbID: contentDetails.imdbID }, { tmdbId: contentDetails.tmdbId }] }, // Search by either
                    { $set: { ...contentDetails, telegramPlayableUrl: url } }, // Update all fields and set URL
                    { new: true, upsert: true } // Create if not exists, return updated doc
                );
            }
            if (updatedItem) {
                 res.json({ message: 'Playable URL updated successfully (and content synced)!', item: updatedItem });
            } else {
                res.status(404).json({ message: 'Item not found in database and could not be synced from TMDB for update.' });
            }
        }
    } catch (error) {
        console.error(`Error setting playable URL for ${type} ${id}:`, error);
        res.status(500).json({ error: 'Failed to set playable URL', details: error.message });
    }
});


// Search Movies and Series
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
    }

    try {
        const data = await fetchTmdb('/search/multi', { query: query });
        const movies = [];
        const series = [];

        for (const item of data.results) {
            // Filter out items without a valid poster or title/name, and unknown media types
            if (!item.poster_path && !item.backdrop_path) continue;
            if (!item.title && !item.name) continue;
            if (!['movie', 'tv'].includes(item.media_type)) continue; // Only process movies and TV shows

            const type = item.media_type === 'movie' ? 'movie' : 'series';
            const mapped = await mapTmdbToSchema(item, type);

            if (mapped && (mapped.imdbID || mapped.tmdbId)) { // Ensure we have at least one valid ID
                // Attempt to retrieve or save the item to ensure playable URL is synced
                const Model = type === 'movie' ? Movie : Series;
                let existingItem;
                if (mapped.imdbID) {
                    existingItem = await Model.findOne({ imdbID: mapped.imdbID });
                } else if (mapped.tmdbId) { // Fallback to TMDB ID if no IMDb ID
                    existingItem = await Model.findOne({ tmdbId: mapped.tmdbId });
                }

                if (existingItem) {
                    mapped.telegramPlayableUrl = existingItem.telegramPlayableUrl;
                } else {
                    const newItem = new Model(mapped);
                    await newItem.save().catch(saveErr => console.error(`Error saving new ${type} from TMDB search:`, saveErr.message));
                }

                if (type === 'movie') {
                    movies.push(mapped);
                } else {
                    series.push(mapped);
                }
            }
        }
        res.json({ movies, series });
    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).json({ error: 'Failed to perform search', details: error.message });
    }
});


// User List (My List) routes
// Get user's list
app.get('/api/mylist/:userId', async (req, res) => {
    try {
        const userList = await UserList.findOne({ userId: req.params.userId });
        if (userList) {
            res.json(userList);
        } else {
            // If no list found, return an empty list for the user
            res.json({ userId: req.params.userId, items: [] });
        }
    } catch (error) {
        console.error('Error fetching user list:', error);
        res.status(500).json({ error: 'Failed to fetch user list' });
    }
});

// Add item to user's list
app.post('/api/mylist/add', async (req, res) => {
    const { userId, item } = req.body;
    // Ensure essential item properties are present for storage
    if (!userId || !item || (!item.imdbID && !item.tmdbId) || !item.title || !item.type) {
        return res.status(400).json({ message: 'User ID, item ID (IMDb or TMDB), title, and type are required.' });
    }

    try {
        let userList = await UserList.findOne({ userId });
        if (!userList) {
            userList = new UserList({ userId, items: [] });
        }

        // Check if item already exists in the list by either imdbID or tmdbId
        const itemExists = userList.items.some(existingItem =>
            (item.imdbID && existingItem.imdbID === item.imdbID) ||
            (item.tmdbId && existingItem.tmdbId === item.tmdbId)
        );

        if (itemExists) {
            return res.status(409).json({ message: 'Item already in your list.' });
        }

        userList.items.push(item);
        await userList.save();
        res.status(201).json({ message: 'Item added to list successfully!', userList });
    } catch (error) {
        console.error('Error adding item to list:', error);
        res.status(500).json({ error: 'Failed to add item to list' });
    }
});

// Remove item from user's list
app.post('/api/mylist/remove', async (req, res) => {
    const { userId, imdbID, tmdbId } = req.body;
    // Require at least one ID for removal
    if (!userId || (!imdbID && !tmdbId)) {
        return res.status(400).json({ message: 'User ID and either IMDb ID or TMDB ID are required.' });
    }

    try {
        const userList = await UserList.findOne({ userId });
        if (!userList) {
            return res.status(404).json({ message: 'User list not found.' });
        }

        const initialLength = userList.items.length;
        userList.items = userList.items.filter(item => {
            // Filter by imdbID if provided, else by tmdbId
            if (imdbID) return item.imdbID !== imdbID;
            if (tmdbId) return item.tmdbId !== tmdbId;
            return true; // Should not happen if validation works
        });

        if (userList.items.length < initialLength) {
            await userList.save();
            res.json({ message: 'Item removed from list successfully!', userList });
        } else {
            res.status(404).json({ message: 'Item not found in your list.' });
        }
    } catch (error) {
        console.error('Error removing item from list:', error);
        res.status(500).json({ error: 'Failed to remove item from list' });
    }
});

// Catch-all for undefined routes
app.use((req, res) => {
    res.status(404).json({ message: 'API route not found' });
});

