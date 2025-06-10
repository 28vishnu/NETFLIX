// movie-streamer-backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const path = require('path'); // Added: Node.js path module for robust path resolution
require('dotenv').config(); // Load environment variables from .env file

// --- MongoDB Models ---
// Make sure you have these files in a 'models' directory:
// ./models/Movie.js
// ./models/Series.js
// ./models/UserList.js
// Updated: Using path.join for robust module imports
const Movie = require(path.join(__dirname, 'models', 'Movie'));
const Series = require(path.join(__dirname, 'models', 'Series'));
const UserList = require(path.join(__dirname, 'models', 'UserList'));

const app = express();
const PORT = process.env.PORT || 5000;

// --- TMDB API Configuration ---
// It's highly recommended to use an environment variable for your TMDB API Key
const TMDB_API_KEY = process.env.TMDB_API_KEY; // Set this in your .env file or hosting env
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.themoviedb.org/t/p/';

if (!TMDB_API_KEY) {
    console.error('SERVER ERROR: TMDB_API_KEY is not set in your environment variables. Please add it to your .env file or hosting configuration.');
    process.exit(1); // Exit if API key is not set
}

// --- MongoDB Connection ---
// Your MongoDB Atlas connection string
// Consider storing this in a .env file as well for security: process.env.MONGO_URI
const MONGO_URI = 'mongodb+srv://vishnusaketh07:NETPROOO@cluster0.yo7hthy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'NETFLIX' // Specify your database name
})
.then(() => console.log('MongoDB connected successfully.'))
.catch(err => console.error('MongoDB connection error:', err));

// --- Middleware ---
app.use(cors()); // Enable CORS for all routes (important for frontend communication)
app.use(express.json()); // Enable JSON body parsing for POST/PUT requests

// --- TMDB API Helper Function ---
async function fetchFromTmdb(endpoint, params = {}) {
    try {
        const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
            params: {
                api_key: TMDB_API_KEY,
                ...params,
            },
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching from TMDB endpoint ${endpoint}:`, error.message);
        if (error.response) {
            console.error('TMDB API Response Error:', error.response.status, error.response.data);
        }
        throw new Error('Failed to fetch data from TMDB.');
    }
}

// --- API Routes ---

// Root endpoint for testing server status
app.get('/', (req, res) => {
    res.send('Netflix Clone Backend is running!');
});

// Get Trending Movies and TV Shows
app.get('/api/trending', async (req, res) => {
    try {
        const trendingMovies = await fetchFromTmdb('/trending/movie/week');
        const trendingSeries = await fetchFromTmdb('/trending/tv/week');
        // Combine and sort by popularity, ensuring media_type is added
        const combinedTrending = [
            ...(trendingMovies.results || []).map(item => ({ ...item, media_type: 'movie' })),
            ...(trendingSeries.results || []).map(item => ({ ...item, media_type: 'tv' }))
        ].sort((a, b) => b.popularity - a.popularity);
        res.json(combinedTrending);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Popular Movies (Discovery)
app.get('/api/movies', async (req, res) => {
    try {
        const movies = await fetchFromTmdb('/discover/movie', { sort_by: 'popularity.desc', 'vote_count.gte': 50 });
        // Add media_type to each item for consistency
        const mappedMovies = (movies.results || []).map(item => ({ ...item, media_type: 'movie' }));
        res.json(mappedMovies);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Top Rated Movies (for home page row)
app.get('/api/movies/top-rated', async (req, res) => {
    try {
        const movies = await fetchFromTmdb('/movie/top_rated');
        const mappedMovies = (movies.results || []).map(item => ({ ...item, media_type: 'movie' }));
        res.json(mappedMovies);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Popular Series (Discovery)
app.get('/api/series', async (req, res) => {
    try {
        const series = await fetchFromTmdb('/discover/tv', { sort_by: 'popularity.desc', 'vote_count.gte': 50 });
        const mappedSeries = (series.results || []).map(item => ({ ...item, media_type: 'tv' }));
        res.json(mappedSeries);
    } catch (error) { // Fixed typo: 'funal' changed to 'catch'
        res.status(500).json({ message: error.message });
    }
});

// Get Popular Series (for home page row)
app.get('/api/series/popular', async (req, res) => {
    try {
        const series = await fetchFromTmdb('/tv/popular');
        const mappedSeries = (series.results || []).map(item => ({ ...item, media_type: 'tv' }));
        res.json(mappedSeries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all genres (combined movie and TV genres)
app.get('/api/genres', async (req, res) => {
    try {
        const movieGenres = await fetchFromTmdb('/genre/movie/list');
        const tvGenres = await fetchFromTmdb('/genre/tv/list');
        const combinedGenres = [...(movieGenres.genres || []), ...(tvGenres.genres || [])];
        // Filter unique genres by ID
        const uniqueGenres = Array.from(new Map(combinedGenres.map(genre => [genre.id, genre])).values());
        res.json(uniqueGenres);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Get Detailed Movie/Series Information (from TMDB, enhanced with MongoDB if available)
app.get('/api/detail/:mediaType/:tmdbId', async (req, res) => {
    const { mediaType, tmdbId } = req.params;
    let tmdbData;
    let mongoData = null;

    try {
        if (mediaType === 'movie') {
            tmdbData = await fetchFromTmdb(`/movie/${tmdbId}`, { append_to_response: 'credits,videos' });
            mongoData = await Movie.findOne({ tmdb_id: tmdbId }); // Look for custom movie data in MongoDB
        } else if (mediaType === 'series') {
            tmdbData = await fetchFromTmdb(`/tv/${tmdbId}`, { append_to_response: 'credits,videos' });
            mongoData = await Series.findOne({ tmdb_id: tmdbId }); // Look for custom series data in MongoDB
        } else {
            return res.status(400).json({ message: 'Invalid media type. Must be "movie" or "series".' });
        }

        // Combine data: TMDB data is primary, MongoDB data overrides/adds specific fields
        const combinedData = { ...tmdbData, media_type: mediaType }; // Ensure media_type is present

        if (mongoData) {
            // Examples of fields you might override or add from MongoDB:
            if (mongoData.plot) combinedData.overview = mongoData.plot; // Override TMDB overview if custom plot exists
            if (mongoData.director) combinedData.director_custom = mongoData.director; // Add a custom director field
            if (mongoData.isNetflixOriginal !== undefined) {
                combinedData.isNetflixOriginal = mongoData.isNetflixOriginal; // Add or override Netflix Original flag
            }
            // You can add more fields here based on your MongoDB schema and needs
        }

        res.json(combinedData);

    } catch (error) {
        console.error(`Error fetching details for ${mediaType} ${tmdbId}:`, error.message);
        res.status(500).json({ message: 'Failed to fetch detailed content. ' + error.message });
    }
});

// Get Episodes for a TV series season
app.get('/api/episodes/:tmdbId/:seasonNumber', async (req, res) => {
    const { tmdbId, seasonNumber } = req.params;
    try {
        const seasonDetails = await fetchFromTmdb(`/tv/${tmdbId}/season/${seasonNumber}`);
        res.json(seasonDetails.episodes || []);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch episodes. ' + error.message });
    }
});


// --- User List (My List) Endpoints (using MongoDB) ---

// Get User's My List
app.get('/api/mylist/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        let userList = await UserList.findOne({ userId });
        if (!userList) {
            userList = new UserList({ userId, items: [] });
            await userList.save();
        }
        res.json({ items: userList.items });
    } catch (error) {
        console.error('Error fetching My List:', error);
        res.status(500).json({ message: 'Failed to fetch My List.' });
    }
});

// Add Item to My List
app.post('/api/mylist/:userId/:mediaType/:tmdbId', async (req, res) => {
    const { userId, mediaType, tmdbId } = req.params;
    const { title, poster_path, backdrop_path, overview, release_date, first_air_date, vote_average, genre_ids } = req.body;

    try {
        let userList = await UserList.findOne({ userId });
        if (!userList) {
            userList = new UserList({ userId, items: [] });
        }

        const existingItemIndex = userList.items.findIndex(item => item.tmdb_id === tmdbId && item.media_type === mediaType);

        if (existingItemIndex === -1) {
            userList.items.push({
                tmdb_id: tmdbId,
                media_type: mediaType,
                title: title,
                poster_path: poster_path,
                backdrop_path: backdrop_path,
                overview: overview,
                release_date: release_date,
                first_air_date: first_air_date,
                vote_average: vote_average,
                genre_ids: genre_ids,
            });
            await userList.save();
            res.status(201).json({ message: 'Item added to My List.', items: userList.items });
        } else {
            res.status(409).json({ message: 'Item already in My List.' });
        }
    } catch (error) {
        console.error('Error adding item to My List:', error);
        res.status(500).json({ message: 'Failed to add item to My List.' });
    }
});

// Remove Item from My List
app.delete('/api/mylist/:userId/:mediaType/:tmdbId', async (req, res) => {
    const { userId, mediaType, tmdbId } = req.params;
    try {
        const userList = await UserList.findOne({ userId });
        if (!userList) {
            return res.status(404).json({ message: 'User list not found.' });
        }

        const initialLength = userList.items.length;
        userList.items = userList.items.filter(item => !(item.tmdb_id === tmdbId && item.media_type === mediaType));

        if (userList.items.length < initialLength) {
            await userList.save();
            res.json({ message: 'Item removed from My List.', items: userList.items });
        } else {
            res.status(404).json({ message: 'Item not found in My List.' });
        }
    } catch (error) {
        console.error('Error removing item from My List:', error);
        res.status(500).json({ message: 'Failed to remove item from My List.' });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend should access backend at: http://localhost:${PORT}`);
});
