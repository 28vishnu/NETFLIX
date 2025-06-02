const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Movie = require('./models/Movie'); // Ensure this path is correct
const Series = require('./models/Series'); // Ensure this path is correct

const app = express();
const PORT = process.env.PORT || 5000; // Use port 5000 for the backend, or environment variable

// MongoDB Connection URI
const MONGO_URI = 'mongodb+srv://vishnusaketh07:NETFLIX@cluster0.yo7hthy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'NETFLIX'; // Your database name

// --- Middleware ---
// Configure CORS to explicitly allow requests from your Netlify frontend
app.use(cors({
    origin: 'https://netprooo.netlify.app', // IMPORTANT: This is your Netlify frontend URL
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

// Route to get all movies
app.get('/api/movies', async (req, res) => {
    try {
        const movies = await Movie.find({});
        res.json(movies);
    } catch (err) {
        console.error('Error fetching movies:', err);
        res.status(500).json({ message: 'Server error fetching movies', error: err.message });
    }
});

// Route to get all series
app.get('/api/series', async (req, res) => {
    try {
        const series = await Series.find({});
        res.json(series);
    } catch (err) {
        console.error('Error fetching series:', err);
        res.status(500).json({ message: 'Server error fetching series', error: err.message });
    }
});

// Route to get a single movie by IMDb ID
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

// Route to get a single series by IMDb ID
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

// Endpoint for My List
app.get('/api/mylist', async (req, res) => {
    try {
        // In a real application, you would fetch user-specific list items here.
        // For now, it returns some random movies/series for demonstration.
        const sampleMovies = await Movie.aggregate([{ $sample: { size: 5 } }]);
        const sampleSeries = await Series.aggregate([{ $sample: { size: 5 } }]);
        res.json([...sampleMovies, ...sampleSeries]);
    } catch (error) {
        console.error('Error fetching my list:', error);
        res.status(500).json({ error: 'Failed to fetch my list', details: error.message });
    }
});

// Search movies and series by title
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
    }
    const searchTerm = new RegExp(query, 'i'); // Case-insensitive search

    try {
        const movies = await Movie.find({ Title: searchTerm });
        const series = await Series.find({ Title: searchTerm });
        res.json({ movies, series });
    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).json({ error: 'Failed to perform search', details: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
