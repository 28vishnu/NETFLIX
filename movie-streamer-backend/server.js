const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Movie = require('./models/Movie'); // Ensure this path is correct for your Movie model
const Series = require('./models/Series'); // Ensure this path is correct for your Series model
const UserList = require('./models/UserList'); // NEW: UserList model

const app = express();
const PORT = process.env.PORT || 5000; // Use port 5000 for the backend, or environment variable

// MongoDB Connection URI
const MONGO_URI = 'mongodb+srv://vishnusaketh07:NETFLIX@cluster0.yo7hthy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
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

// Connect to MongoDB
mongoose.connect(MONGO_URI, { dbName: DB_NAME })
    .then(() => console.log('MongoDB connected successfully for server.'))
    .catch(err => {
        console.error('MongoDB connection error for server:', err);
        process.exit(1); // Exit if database connection fails
    });

// --- API Routes ---
// IMPORTANT: Order of routes matters! More specific routes should come before general ones.

// ======================================================================================
// MOVIE ROUTES
// ======================================================================================

// Route to get trending movies (e.g., for hero section) - placed before :imdbID
app.get('/api/movies/trending', async (req, res) => {
    try {
        const trendingMovies = await Movie.aggregate([{ $sample: { size: 5 } }]);
        // Always return an array, even if empty, for trending/popular
        res.json(trendingMovies);
    } catch (error) {
        console.error('Error fetching trending movies:', error);
        res.status(500).json({ error: 'Failed to fetch trending movies', details: error.message });
    }
});

// Route to get popular movies - placed before :imdbID
app.get('/api/movies/popular', async (req, res) => {
    try {
        const popularMovies = await Movie.aggregate([{ $sample: { size: 10 } }]);
        // Always return an array, even if empty, for trending/popular
        res.json(popularMovies);
    } catch (error) {
        console.error('Error fetching popular movies:', error);
        res.status(500).json({ error: 'Failed to fetch popular movies', details: error.message });
    }
});

// Route to get movies by genre - placed before :imdbID
app.get('/api/movies/genre/:genreName', async (req, res) => {
    try {
        const genre = req.params.genreName;
        // Query for movies where the 'genre' field (which is an array) contains the specified genre string, case-insensitive
        const movies = await Movie.find({
            genre: { $in: [new RegExp(genre, 'i')] }
        });

        if (movies.length === 0) {
            // It's acceptable to return 404 for specific genre if no content
            return res.status(404).json({ message: `No movies found for genre: ${genre}` });
        }
        res.json(movies);
    } catch (err) {
        console.error(`Error fetching movies by genre ${req.params.genreName}:`, err);
        res.status(500).json({ message: 'Server error fetching movies by genre', error: err.message });
    }
});

// Route to get a single movie by IMDb ID - placed AFTER more specific movie routes
app.get('/api/movies/:imdbID', async (req, res) => {
    try {
        const movie = await Movie.findOne({ imdbID: req.params.imdbID });
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
        }
        res.json(movie);
    } catch (err) {
        console.error(`Error fetching movie with IMDb ID ${req.params.imdbID}:`, err);
        res.status(500).json({ message: 'Server error fetching movie', error: err.message });
    }
});

// Route to get all movies (should only return documents where type is 'movie')
app.get('/api/movies', async (req, res) => {
    try {
        const movies = await Movie.find({ type: 'movie' }); // Ensure only movies are returned
        res.json(movies);
    } catch (err) {
        console.error('Error fetching all movies:', err);
        res.status(500).json({ message: 'Server error fetching all movies', error: err.message });
    }
});


// ======================================================================================
// SERIES ROUTES
// ======================================================================================

// Route to get popular series - placed before :imdbID
app.get('/api/series/popular', async (req, res) => {
    try {
        const popularSeries = await Series.aggregate([{ $sample: { size: 10 } }]);
        // Always return an array, even if empty, for trending/popular
        res.json(popularSeries);
    } catch (error) {
        console.error('Error fetching popular series:', error);
        res.status(500).json({ error: 'Failed to fetch popular series', details: error.message });
    }
});

// NEW: Route to get specific "Best Series" titles - placed before :imdbID
app.get('/api/series/best', async (req, res) => {
    try {
        const bestSeriesTitles = [
            'Breaking Bad', 'Stranger Things', 'House of the Dragon',
            'Game of Thrones', 'Prison Break'
        ];
        // Use $in operator to find series by title, case-insensitive
        const bestSeries = await Series.find({
            Title: { $in: bestSeriesTitles.map(title => new RegExp(title, 'i')) }
        });
        res.json(bestSeries);
    } catch (error) {
        console.error('Error fetching best series:', error);
        res.status(500).json({ error: 'Failed to fetch best series', details: error.message });
    }
});


// Route to get series by genre - placed before :imdbID
app.get('/api/series/genre/:genreName', async (req, res) => {
    try {
        const genre = req.params.genreName;
        const series = await Series.find({
            genre: { $in: [new RegExp(genre, 'i')] }
        });

        if (series.length === 0) {
            return res.status(404).json({ message: `No series found for genre: ${genre}` });
        }
        res.json(series);
    } catch (err) {
        console.error(`Error fetching series by genre ${req.params.genreName}:`, err);
        res.status(500).json({ message: 'Server error fetching series by genre', error: err.message });
    }
});

// Route to get a single series by IMDb ID - placed AFTER more specific series routes
app.get('/api/series/:imdbID', async (req, res) => {
    try {
        const series = await Series.findOne({ imdbID: req.params.imdbID });
        if (!series) {
            return res.status(404).json({ message: 'Series not found' });
        }
        res.json(series);
    } catch (err) {
        console.error(`Error fetching series with IMDb ID ${req.params.imdbID}:`, err);
        res.status(500).json({ message: 'Server error fetching series', error: err.message });
    }
});

// Route to get all series (should only return documents where type is 'series')
app.get('/api/series', async (req, res) => {
    try {
        const series = await Series.find({ type: 'series' }); // Ensure only series are returned
        res.json(series);
    } catch (err) {
        console.error('Error fetching all series:', err);
        res.status(500).json({ message: 'Server error fetching all series', error: err.message });
    }
});


// ======================================================================================
// MY LIST ROUTES (NEW)
// ======================================================================================

// Get user's list
app.get('/api/mylist/:userId', async (req, res) => {
    try {
        const userList = await UserList.findOne({ userId: req.params.userId });
        if (!userList) {
            // If no list found for user, return an empty list with 200 OK
            return res.json({ userId: req.params.userId, items: [] });
        }
        res.json(userList);
    } catch (error) {
        console.error('Error fetching user list:', error);
        res.status(500).json({ error: 'Failed to fetch user list', details: error.message });
    }
});

// Add item to user's list
app.post('/api/mylist/add', async (req, res) => {
    const { userId, item } = req.body; // item should contain imdbID, title, poster, type, year

    if (!userId || !item || !item.imdbID || !item.title || !item.type) {
        return res.status(400).json({ message: 'Missing required fields for adding to list.' });
    }

    try {
        let userList = await UserList.findOne({ userId });

        if (!userList) {
            // Create new list if it doesn't exist
            userList = new UserList({ userId, items: [] });
        }

        // Check if item already exists in the list
        const itemExists = userList.items.some(existingItem => existingItem.imdbID === item.imdbID);
        if (itemExists) {
            return res.status(409).json({ message: 'Item already in list.' });
        }

        userList.items.push(item);
        await userList.save();
        res.status(200).json({ message: 'Item added to list successfully.', userList });
    } catch (error) {
        console.error('Error adding item to list:', error);
        res.status(500).json({ error: 'Failed to add item to list', details: error.message });
    }
});

// Remove item from user's list
app.post('/api/mylist/remove', async (req, res) => {
    const { userId, imdbID } = req.body;

    if (!userId || !imdbID) {
        return res.status(400).json({ message: 'Missing required fields for removing from list.' });
    }

    try {
        let userList = await UserList.findOne({ userId });

        if (!userList) {
            return res.status(404).json({ message: 'User list not found.' });
        }

        const initialLength = userList.items.length;
        userList.items = userList.items.filter(item => item.imdbID !== imdbID);

        if (userList.items.length === initialLength) {
            return res.status(404).json({ message: 'Item not found in list.' });
        }

        await userList.save();
        res.status(200).json({ message: 'Item removed from list successfully.', userList });
    } catch (error) {
        console.error('Error removing item from list:', error);
        res.status(500).json({ error: 'Failed to remove item from list', details: error.message });
    }
});

// ======================================================================================
// GENERAL ROUTES
// ======================================================================================

// Search movies and series by title, genre, actors, plot
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
    }
    const searchTerm = new RegExp(query, 'i'); // Case-insensitive search

    try {
        // Search across multiple fields using $or
        const movies = await Movie.find({
            $or: [
                { Title: searchTerm },
                { Plot: searchTerm },
                { Actors: searchTerm },
                { Genre: searchTerm } // Will search within genre array/string
            ]
        });
        const series = await Series.find({
            $or: [
                { Title: searchTerm },
                { Plot: searchTerm },
                { Actors: searchTerm },
                { Genre: searchTerm } // Will search within genre array/string
            ]
        });
        res.json({ movies, series }); // Return an object with movies and series arrays
    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).json({ error: 'Failed to perform search', details: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
