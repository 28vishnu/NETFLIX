const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios'); // For making HTTP requests to TMDB

const Movie = require('./models/Movie'); // Your Movie model
const Series = require('./models/Series'); // Your Series model
const UserList = require('./models/UserList'); // Your UserList model

const app = express();
const PORT = process.env.PORT || 5000; // Use port 5000 for the backend, or environment variable

// TMDB API Configuration
const TMDB_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYmNkMzgwOTZlYzBiOWYyOGUzMDVjNmI1ZDQ3ZmY4MSIsIm5iZiI6MTc0ODc3MTYwNi4wMjU5OTk4LCJzdWIiOiI2ODNjMjMxNmY1YjM3ODE2OWJmMmFmZWMiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.4Eww2uuHE9QQaAf6hj3SIN1L-EmQ08j7PZKvlc2oMds';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/'; // Use w500 for posters, original for backdrops

// In-memory cache for TMDB genres
let movieGenres = {};
let tvGenres = {};

// MongoDB Connection URI
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
        throw new Error(`Failed to fetch from TMDB: ${error.response ? error.response.status : ''} ${error.message}`);
    }
};

// --- Helper function to get genre names from IDs ---
const getGenreNames = (genreIds, type) => {
    const genreMap = type === 'movie' ? movieGenres : tvGenres;
    if (!genreIds || !Array.isArray(genreIds)) return [];
    return genreIds.map(id => genreMap[id]).filter(Boolean); // Filter out undefined genres
};

// --- Helper function to map TMDB data to our Mongoose schema ---
const mapTmdbToSchema = async (tmdbItem, type) => {
    if (!tmdbItem) return null;

    let imdbId = null;
    let director = 'N/A';
    let actors = 'N/A';
    let runtime = 'N/A';
    let totalSeasons = 'N/A';

    // Fetch external IDs to get IMDb ID
    if (tmdbItem.id) {
        try {
            const externalIds = await fetchTmdb(`/${type === 'movie' ? 'movie' : 'tv'}/${tmdbItem.id}/external_ids`);
            imdbId = externalIds.imdb_id || null;
        } catch (error) {
            console.warn(`Could not fetch external IDs for ${type} TMDB ID ${tmdbItem.id}:`, error.message);
        }
    }

    // Fetch credits for director/actors (only for details, not for lists to save API calls)
    // This mapping function is used for both lists and details, so we'll only fetch credits
    // if full details are needed (which is handled in the specific detail routes).
    // For list items, director/actors will be N/A initially unless explicitly fetched.

    // Map common fields
    const mappedItem = {
        tmdbId: tmdbItem.id,
        imdbID: imdbId, // Will be null if not found or not fetched
        plot: tmdbItem.overview || 'No plot available.',
        poster: tmdbItem.poster_path ? `${TMDB_IMAGE_BASE_URL}w500${tmdbItem.poster_path}` : null,
        backdrop: tmdbItem.backdrop_path ? `${TMDB_IMAGE_BASE_URL}original${tmdbItem.backdrop_path}` : null,
        genre: getGenreNames(tmdbItem.genre_ids, type),
        imdbRating: tmdbItem.vote_average ? tmdbItem.vote_average.toFixed(1) : 'N/A', // TMDB's rating
        type: type,
        // telegramPlayableUrl will be loaded from DB or default to ''
    };

    if (type === 'movie') {
        mappedItem.title = tmdbItem.title;
        mappedItem.year = tmdbItem.release_date ? tmdbItem.release_date.substring(0, 4) : 'N/A';
        mappedItem.runtime = tmdbItem.runtime ? `${tmdbItem.runtime} min` : 'N/A';
    } else { // series
        mappedItem.title = tmdbItem.name;
        mappedItem.year = tmdbItem.first_air_date ? tmdbItem.first_air_date.substring(0, 4) : 'N/A';
        mappedItem.totalSeasons = tmdbItem.number_of_seasons ? String(tmdbItem.number_of_seasons) : 'N/A';
    }

    return mappedItem;
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
        // If genres fail to load, genre mapping will not work, but app can still run.
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

// Get Trending Movies (for Hero Section)
app.get('/api/movies/trending', async (req, res) => {
    try {
        const data = await fetchTmdb('/trending/movie/week');
        const trendingMovies = [];
        for (const item of data.results.slice(0, 10)) { // Take top 10 trending
            const mapped = await mapTmdbToSchema(item, 'movie');
            if (mapped && mapped.imdbID) { // Ensure it has an IMDb ID for frontend consistency
                 // Check if movie already exists in DB to get playable URL
                const existingMovie = await Movie.findOne({ imdbID: mapped.imdbID });
                if (existingMovie) {
                    mapped.telegramPlayableUrl = existingMovie.telegramPlayableUrl;
                }
                trendingMovies.push(mapped);
            }
        }
        res.json(trendingMovies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trending movies', details: error.message });
    }
});

// Get Popular Movies
app.get('/api/movies/popular', async (req, res) => {
    try {
        const data = await fetchTmdb('/movie/popular');
        const popularMovies = [];
        for (const item of data.results.slice(0, 20)) { // Limit to 20 for section
            const mapped = await mapTmdbToSchema(item, 'movie');
            if (mapped && mapped.imdbID) {
                const existingMovie = await Movie.findOne({ imdbID: mapped.imdbID });
                if (existingMovie) {
                    mapped.telegramPlayableUrl = existingMovie.telegramPlayableUrl;
                }
                popularMovies.push(mapped);
            }
        }
        res.json(popularMovies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch popular movies', details: error.message });
    }
});

// Get Best Series (using popular as a proxy for now)
app.get('/api/series/best', async (req, res) => {
    try {
        const data = await fetchTmdb('/tv/top_rated'); // Using top_rated for "best"
        const bestSeries = [];
        for (const item of data.results.slice(0, 20)) { // Limit to 20 for section
            const mapped = await mapTmdbToSchema(item, 'series');
            if (mapped && mapped.imdbID) {
                const existingSeries = await Series.findOne({ imdbID: mapped.imdbID });
                if (existingSeries) {
                    mapped.telegramPlayableUrl = existingSeries.telegramPlayableUrl;
                }
                bestSeries.push(mapped);
            }
        }
        res.json(bestSeries);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch best series', details: error.message });
    }
});

// Get Popular Series
app.get('/api/series/popular', async (req, res) => {
    try {
        const data = await fetchTmdb('/tv/popular');
        const popularSeries = [];
        for (const item of data.results.slice(0, 20)) { // Limit to 20 for section
            const mapped = await mapTmdbToSchema(item, 'series');
            if (mapped && mapped.imdbID) {
                const existingSeries = await Series.findOne({ imdbID: mapped.imdbID });
                if (existingSeries) {
                    mapped.telegramPlayableUrl = existingSeries.telegramPlayableUrl;
                }
                popularSeries.push(mapped);
            }
        }
        res.json(popularSeries);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch popular series', details: error.message });
    }
});

// Get Movies by Genre
app.get('/api/movies/genre/:genreName', async (req, res) => {
    const genreName = req.params.genreName.toLowerCase();
    const genreId = Object.keys(movieGenres).find(key => movieGenres[key].toLowerCase() === genreName);

    if (!genreId) {
        return res.status(404).json({ message: 'Genre not found' });
    }

    try {
        const data = await fetchTmdb('/discover/movie', { with_genres: genreId });
        const genreMovies = [];
        for (const item of data.results.slice(0, 20)) { // Limit to 20 for section
            const mapped = await mapTmdbToSchema(item, 'movie');
            if (mapped && mapped.imdbID) {
                const existingMovie = await Movie.findOne({ imdbID: mapped.imdbID });
                if (existingMovie) {
                    mapped.telegramPlayableUrl = existingMovie.telegramPlayableUrl;
                }
                genreMovies.push(mapped);
            }
        }
        res.json(genreMovies);
    } catch (error) {
        res.status(500).json({ error: `Failed to fetch ${genreName} movies`, details: error.message });
    }
});

// Get Series by Genre
app.get('/api/series/genre/:genreName', async (req, res) => {
    const genreName = req.params.genreName.toLowerCase();
    const genreId = Object.keys(tvGenres).find(key => tvGenres[key].toLowerCase() === genreName);

    if (!genreId) {
        return res.status(404).json({ message: 'Genre not found' });
    }

    try {
        const data = await fetchTmdb('/discover/tv', { with_genres: genreId });
        const genreSeries = [];
        for (const item of data.results.slice(0, 20)) { // Limit to 20 for section
            const mapped = await mapTmdbToSchema(item, 'series');
            if (mapped && mapped.imdbID) {
                const existingSeries = await Series.findOne({ imdbID: mapped.imdbID });
                if (existingSeries) {
                    mapped.telegramPlayableUrl = existingSeries.telegramPlayableUrl;
                }
                genreSeries.push(mapped);
            }
        }
        res.json(genreSeries);
    } catch (error) {
        res.status(500).json({ error: `Failed to fetch ${genreName} series`, details: error.message });
    }
});

// Get All Movies (for Movies page)
app.get('/api/movies', async (req, res) => {
    try {
        // Fetch multiple pages to get more results for the "All Movies" page
        const page1 = await fetchTmdb('/movie/popular', { page: 1 });
        const page2 = await fetchTmdb('/movie/popular', { page: 2 });
        const allTmdbMovies = [...page1.results, ...page2.results]; // Combine results

        const movies = [];
        for (const item of allTmdbMovies) {
            const mapped = await mapTmdbToSchema(item, 'movie');
            if (mapped && mapped.imdbID) {
                const existingMovie = await Movie.findOne({ imdbID: mapped.imdbID });
                if (existingMovie) {
                    mapped.telegramPlayableUrl = existingMovie.telegramPlayableUrl;
                }
                movies.push(mapped);
            }
        }
        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch all movies', details: error.message });
    }
});

// Get All Series (for Series page)
app.get('/api/series', async (req, res) => {
    try {
        const page1 = await fetchTmdb('/tv/popular', { page: 1 });
        const page2 = await fetchTmdb('/tv/popular', { page: 2 });
        const allTmdbSeries = [...page1.results, ...page2.results];

        const series = [];
        for (const item of allTmdbSeries) {
            const mapped = await mapTmdbToSchema(item, 'series');
            if (mapped && mapped.imdbID) {
                const existingSeries = await Series.findOne({ imdbID: mapped.imdbID });
                if (existingSeries) {
                    mapped.telegramPlayableUrl = existingSeries.telegramPlayableUrl;
                }
                series.push(mapped);
            }
        }
        res.json(series);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch all series', details: error.message });
    }
});

// Get Movie Details by IMDb ID
app.get('/api/movies/:imdbId', async (req, res) => {
    const imdbId = req.params.imdbId;
    try {
        // First, find the TMDB ID using the IMDb ID
        const findData = await fetchTmdb(`/find/${imdbId}`, { external_source: 'imdb_id' });
        let tmdbMovieId = null;

        if (findData.movie_results && findData.movie_results.length > 0) {
            tmdbMovieId = findData.movie_results[0].id;
        }

        if (!tmdbMovieId) {
            return res.status(404).json({ message: 'Movie not found on TMDB with this IMDb ID.' });
        }

        // Fetch full movie details
        const movieDetails = await fetchTmdb(`/movie/${tmdbMovieId}`);
        // Fetch credits for director/actors
        const movieCredits = await fetchTmdb(`/movie/${tmdbMovieId}/credits`);

        const director = movieCredits.crew.find(person => person.job === 'Director')?.name || 'N/A';
        const writers = movieCredits.crew.filter(person => ['Writer', 'Screenplay'].includes(person.job)).map(person => person.name).join(', ') || 'N/A';
        const actors = movieCredits.cast.slice(0, 5).map(person => person.name).join(', ') || 'N/A'; // Top 5 actors

        const mappedMovie = await mapTmdbToSchema(movieDetails, 'movie');
        mappedMovie.director = director;
        mappedMovie.writer = writers;
        mappedMovie.actors = actors;
        mappedMovie.imdbID = imdbId; // Ensure IMDb ID is set from the request

        // Load playable URL from DB if exists
        const existingMovie = await Movie.findOne({ imdbID: imdbId });
        if (existingMovie) {
            mappedMovie.telegramPlayableUrl = existingMovie.telegramPlayableUrl;
        }

        res.json(mappedMovie);

    } catch (error) {
        console.error(`Error fetching movie details for ${imdbId}:`, error);
        res.status(500).json({ error: 'Failed to fetch movie details', details: error.message });
    }
});

// Get Series Details by IMDb ID
app.get('/api/series/:imdbId', async (req, res) => {
    const imdbId = req.params.imdbId;
    try {
        // First, find the TMDB ID using the IMDb ID
        const findData = await fetchTmdb(`/find/${imdbId}`, { external_source: 'imdb_id' });
        let tmdbSeriesId = null;

        if (findData.tv_results && findData.tv_results.length > 0) {
            tmdbSeriesId = findData.tv_results[0].id;
        }

        if (!tmdbSeriesId) {
            return res.status(404).json({ message: 'Series not found on TMDB with this IMDb ID.' });
        }

        // Fetch full series details
        const seriesDetails = await fetchTmdb(`/tv/${tmdbSeriesId}`);
        // Fetch credits for actors
        const seriesCredits = await fetchTmdb(`/tv/${tmdbSeriesId}/credits`);

        const actors = seriesCredits.cast.slice(0, 5).map(person => person.name).join(', ') || 'N/A'; // Top 5 actors

        const mappedSeries = await mapTmdbToSchema(seriesDetails, 'series');
        mappedSeries.actors = actors;
        mappedSeries.imdbID = imdbId; // Ensure IMDb ID is set from the request

        // Load playable URL from DB if exists
        const existingSeries = await Series.findOne({ imdbID: imdbId });
        if (existingSeries) {
            mappedSeries.telegramPlayableUrl = existingSeries.telegramPlayableUrl;
        }

        res.json(mappedSeries);

    } catch (error) {
        console.error(`Error fetching series details for ${imdbId}:`, error);
        res.status(500).json({ error: 'Failed to fetch series details', details: error.message });
    }
});

// Set Playable URL (Admin Functionality)
app.put('/api/:type/:imdbId/set-playable-url', async (req, res) => {
    const { type, imdbId } = req.params;
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ message: 'Playable URL is required.' });
    }

    try {
        let updatedItem;
        if (type === 'movies') {
            updatedItem = await Movie.findOneAndUpdate(
                { imdbID: imdbId },
                { telegramPlayableUrl: url },
                { new: true, upsert: true } // Create if not exists, return updated doc
            );
        } else if (type === 'series') {
            updatedItem = await Series.findOneAndUpdate(
                { imdbID: imdbId },
                { telegramPlayableUrl: url },
                { new: true, upsert: true }
            );
        } else {
            return res.status(400).json({ message: 'Invalid content type.' });
        }

        if (updatedItem) {
            res.json({ message: 'Playable URL updated successfully!', item: updatedItem });
        } else {
            res.status(404).json({ message: 'Item not found in database.' });
        }
    } catch (error) {
        console.error(`Error setting playable URL for ${type} ${imdbId}:`, error);
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
            // Filter out items without a valid poster or title/name
            if (!item.poster_path && !item.backdrop_path) continue;
            if (!item.title && !item.name) continue;

            if (item.media_type === 'movie') {
                const mapped = await mapTmdbToSchema(item, 'movie');
                if (mapped && mapped.imdbID) {
                    const existingMovie = await Movie.findOne({ imdbID: mapped.imdbID });
                    if (existingMovie) {
                        mapped.telegramPlayableUrl = existingMovie.telegramPlayableUrl;
                    }
                    movies.push(mapped);
                }
            } else if (item.media_type === 'tv') {
                const mapped = await mapTmdbToSchema(item, 'series');
                if (mapped && mapped.imdbID) {
                    const existingSeries = await Series.findOne({ imdbID: mapped.imdbID });
                    if (existingSeries) {
                        mapped.telegramPlayableUrl = existingSeries.telegramPlayableUrl;
                    }
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
    if (!userId || !item || !item.imdbID || !item.title || !item.type) {
        return res.status(400).json({ message: 'User ID, item IMDb ID, title, and type are required.' });
    }

    try {
        let userList = await UserList.findOne({ userId });
        if (!userList) {
            userList = new UserList({ userId, items: [] });
        }

        // Check if item already exists in the list
        const itemExists = userList.items.some(existingItem => existingItem.imdbID === item.imdbID);
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
    const { userId, imdbID } = req.body;
    if (!userId || !imdbID) {
        return res.status(400).json({ message: 'User ID and IMDb ID are required.' });
    }

    try {
        const userList = await UserList.findOne({ userId });
        if (!userList) {
            return res.status(404).json({ message: 'User list not found.' });
        }

        const initialLength = userList.items.length;
        userList.items = userList.items.filter(item => item.imdbID !== imdbID);

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

