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
    // Fetch external IDs to get IMDb ID only if tmdbId exists and is not already fetched
    if (tmdbItem.id && !tmdbItem.imdb_id) { // Check if imdb_id is already present (e.g., from /find endpoint)
        try {
            const externalIds = await fetchTmdb(`/${type === 'movie' ? 'movie' : 'tv'}/${tmdbItem.id}/external_ids`);
            imdbId = externalIds.imdb_id || null;
        } catch (error) {
            console.warn(`Could not fetch external IDs for ${type} TMDB ID ${tmdbItem.id}:`, error.message);
        }
    } else if (tmdbItem.imdb_id) {
        imdbId = tmdbItem.imdb_id;
    }


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

// Get Trending Movies (for Hero Section) - Now fetches trending movies from the last week
app.get('/api/movies/trending', async (req, res) => {
    try {
        // Fetch trending movies over the last week - this is a good proxy for recent OTT releases
        const data = await fetchTmdb('/trending/movie/week');

        const trendingMovies = [];
        // Iterate through results, ensuring we get up to 5 valid movies
        for (const item of data.results) {
            if (trendingMovies.length >= 5) break; // Stop after 5 movies

            const mapped = await mapTmdbToSchema(item, 'movie');
            // Ensure essential fields are present for the hero banner
            if (mapped && mapped.imdbID && mapped.poster && mapped.backdrop) {
                // Check if movie already exists in DB to get playable URL
                const existingMovie = await Movie.findOne({ imdbID: mapped.imdbID });
                if (existingMovie) {
                    mapped.telegramPlayableUrl = existingMovie.telegramPlayableUrl;
                } else {
                    // If not in DB, save it so playable URL can be set later
                    const newMovie = new Movie(mapped);
                    await newMovie.save().catch(saveErr => console.error("Error saving new movie from TMDB:", saveErr.message));
                }
                trendingMovies.push(mapped);
            }
        }
        res.json(trendingMovies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trending movies for hero banner', details: error.message });
    }
});

// Get Popular Movies
app.get('/api/movies/popular', async (req, res) => {
    try {
        const allTmdbMovies = [];
        // Fetch more pages to get a larger pool of popular movies
        for (let i = 1; i <= 3; i++) { // Fetch first 3 pages
            const data = await fetchTmdb('/movie/popular', { page: i });
            allTmdbMovies.push(...data.results);
        }

        const popularMovies = [];
        for (const item of allTmdbMovies) {
            if (popularMovies.length >= 20) break; // Limit to 20 for section
            const mapped = await mapTmdbToSchema(item, 'movie');
            if (mapped && mapped.imdbID && mapped.poster) { // Ensure essential fields
                const existingMovie = await Movie.findOne({ imdbID: mapped.imdbID });
                if (existingMovie) {
                    mapped.telegramPlayableUrl = existingMovie.telegramPlayableUrl;
                } else {
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

// Get Best Series (using top_rated)
app.get('/api/series/best', async (req, res) => {
    try {
        const allTmdbSeries = [];
        // Fetch more pages to get a larger pool of top-rated series
        for (let i = 1; i <= 3; i++) { // Fetch first 3 pages
            const data = await fetchTmdb('/tv/top_rated', { page: i });
            allTmdbSeries.push(...data.results);
        }

        const bestSeries = [];
        for (const item of allTmdbSeries) {
            if (bestSeries.length >= 20) break; // Limit to 20 for section
            const mapped = await mapTmdbToSchema(item, 'series');
            if (mapped && mapped.imdbID && mapped.poster) { // Ensure essential fields
                const existingSeries = await Series.findOne({ imdbID: mapped.imdbID });
                if (existingSeries) {
                    mapped.telegramPlayableUrl = existingSeries.telegramPlayableUrl;
                } else {
                    const newSeries = new Series(mapped);
                    await newSeries.save().catch(saveErr => console.error("Error saving new series from TMDB:", saveErr.message));
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
        const allTmdbSeries = [];
        // Fetch more pages to get a larger pool of popular series
        for (let i = 1; i <= 3; i++) { // Fetch first 3 pages
            const data = await fetchTmdb('/tv/popular', { page: i });
            allTmdbSeries.push(...data.results);
        }

        const popularSeries = [];
        for (const item of allTmdbSeries) {
            if (popularSeries.length >= 20) break; // Limit to 20 for section
            const mapped = await mapTmdbToSchema(item, 'series');
            if (mapped && mapped.imdbID && mapped.poster) { // Ensure essential fields
                const existingSeries = await Series.findOne({ imdbID: mapped.imdbID });
                if (existingSeries) {
                    mapped.telegramPlayableUrl = existingSeries.telegramPlayableUrl;
                } else {
                    const newSeries = new Series(mapped);
                    await newSeries.save().catch(saveErr => console.error("Error saving new series from TMDB:", saveErr.message));
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
        const allTmdbMovies = [];
        for (let i = 1; i <= 3; i++) { // Fetch first 3 pages
            const data = await fetchTmdb('/discover/movie', { with_genres: genreId, page: i });
            allTmdbMovies.push(...data.results);
        }

        const genreMovies = [];
        for (const item of allTmdbMovies) {
            if (genreMovies.length >= 20) break; // Limit to 20 for section
            const mapped = await mapTmdbToSchema(item, 'movie');
            if (mapped && mapped.imdbID && mapped.poster) { // Ensure essential fields
                const existingMovie = await Movie.findOne({ imdbID: mapped.imdbID });
                if (existingMovie) {
                    mapped.telegramPlayableUrl = existingMovie.telegramPlayableUrl;
                } else {
                    const newMovie = new Movie(mapped);
                    await newMovie.save().catch(saveErr => console.error("Error saving new movie from TMDB:", saveErr.message));
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
        const allTmdbSeries = [];
        for (let i = 1; i <= 3; i++) { // Fetch first 3 pages
            const data = await fetchTmdb('/discover/tv', { with_genres: genreId, page: i });
            allTmdbSeries.push(...data.results);
        }

        const genreSeries = [];
        for (const item of allTmdbSeries) {
            if (genreSeries.length >= 20) break; // Limit to 20 for section
            const mapped = await mapTmdbToSchema(item, 'series');
            if (mapped && mapped.imdbID && mapped.poster) { // Ensure essential fields
                const existingSeries = await Series.findOne({ imdbID: mapped.imdbID });
                if (existingSeries) {
                    mapped.telegramPlayableUrl = existingSeries.telegramPlayableUrl;
                } else {
                    const newSeries = new Series(mapped);
                    await newSeries.save().catch(saveErr => console.error("Error saving new series from TMDB:", saveErr.message));
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
        const allTmdbMovies = [];
        for (let i = 1; i <= 5; i++) { // Fetch first 5 pages for a larger collection
            const data = await fetchTmdb('/movie/popular', { page: i });
            allTmdbMovies.push(...data.results);
        }

        const movies = [];
        for (const item of allTmdbMovies) {
            const mapped = await mapTmdbToSchema(item, 'movie');
            if (mapped && mapped.imdbID && mapped.poster) { // Ensure essential fields
                const existingMovie = await Movie.findOne({ imdbID: mapped.imdbID });
                if (existingMovie) {
                    mapped.telegramPlayableUrl = existingMovie.telegramPlayableUrl;
                } else {
                    const newMovie = new Movie(mapped);
                    await newMovie.save().catch(saveErr => console.error("Error saving new movie from TMDB:", saveErr.message));
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
        const allTmdbSeries = [];
        for (let i = 1; i <= 5; i++) { // Fetch first 5 pages for a larger collection
            const data = await fetchTmdb('/tv/popular', { page: i });
            allTmdbSeries.push(...data.results);
        }

        const series = [];
        for (const item of allTmdbSeries) {
            const mapped = await mapTmdbToSchema(item, 'series');
            if (mapped && mapped.imdbID && mapped.poster) { // Ensure essential fields
                const existingSeries = await Series.findOne({ imdbID: mapped.imdbID });
                if (existingSeries) {
                    mapped.telegramPlayableUrl = existingSeries.telegramPlayableUrl;
                } else {
                    const newSeries = new Series(mapped);
                    await newSeries.save().catch(saveErr => console.error("Error saving new series from TMDB:", saveErr.message));
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
            // If TMDB doesn't have a direct mapping for this IMDb ID, return a more specific error
            return res.status(404).json({ message: `Movie with IMDb ID ${imdbId} not found on TMDB.` });
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
        } else {
             // If not in DB, save it so playable URL can be set later
            const newMovie = new Movie(mappedMovie);
            await newMovie.save().catch(saveErr => console.error("Error saving new movie from TMDB:", saveErr.message));
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
            // If TMDB doesn't have a direct mapping for this IMDb ID, return a more specific error
            return res.status(404).json({ message: `Series with IMDb ID ${imdbId} not found on TMDB.` });
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
        } else {
             // If not in DB, save it so playable URL can be set later
            const newSeries = new Series(mappedSeries);
            await newSeries.save().catch(saveErr => console.error("Error saving new series from TMDB:", saveErr.message));
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
        let Model;
        if (type === 'movies') {
            Model = Movie;
        } else if (type === 'series') {
            Model = Series;
        } else {
            return res.status(400).json({ message: 'Invalid content type.' });
        }

        // Find the item by IMDb ID
        updatedItem = await Model.findOneAndUpdate(
            { imdbID: imdbId },
            { telegramPlayableUrl: url },
            { new: true } // Return the updated document
        );

        // If not found by IMDb ID, it means it was just fetched from TMDB and not yet saved with IMDb ID
        // In this case, we might need to find by TMDB ID if available, or create a new entry.
        // However, the mapTmdbToSchema now attempts to get IMDb ID and save, so this should be less common.
        if (!updatedItem) {
            // As a fallback, try to fetch details again to ensure it's in DB before updating
            // This scenario should be rare if mapTmdbToSchema is working correctly on initial fetch
            const findData = await fetchTmdb(`/find/${imdbId}`, { external_source: 'imdb_id' });
            let tmdbItem = null;
            if (type === 'movies' && findData.movie_results && findData.movie_results.length > 0) {
                tmdbItem = findData.movie_results[0];
            } else if (type === 'series' && findData.tv_results && findData.tv_results.length > 0) {
                tmdbItem = findData.tv_results[0];
            }

            if (tmdbItem) {
                const mapped = await mapTmdbToSchema(tmdbItem, type === 'movies' ? 'movie' : 'series');
                mapped.imdbID = imdbId; // Ensure IMDb ID is explicitly set
                updatedItem = await Model.findOneAndUpdate(
                    { imdbID: imdbId },
                    { $set: { ...mapped, telegramPlayableUrl: url } }, // Update all fields and set URL
                    { new: true, upsert: true } // Create if not exists, return updated doc
                );
            }
        }


        if (updatedItem) {
            res.json({ message: 'Playable URL updated successfully!', item: updatedItem });
        } else {
            res.status(404).json({ message: 'Item not found in database for update.' });
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
                    } else {
                        const newMovie = new Movie(mapped);
                        await newMovie.save().catch(saveErr => console.error("Error saving new movie from TMDB:", saveErr.message));
                    }
                    movies.push(mapped);
                }
            } else if (item.media_type === 'tv') {
                const mapped = await mapTmdbToSchema(item, 'series');
                if (mapped && mapped.imdbID) {
                    const existingSeries = await Series.findOne({ imdbID: mapped.imdbID });
                    if (existingSeries) {
                        mapped.telegramPlayableUrl = existingSeries.telegramPlayableUrl;
                    } else {
                        const newSeries = new Series(mapped);
                        await newSeries.save().catch(saveErr => console.error("Error saving new series from TMDB:", saveErr.message));
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
