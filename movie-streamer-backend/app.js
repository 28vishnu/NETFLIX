const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose'); // Import Mongoose
const Movie = require('./models/Movie'); // Assuming you have this model
const Series = require('./models/Series'); // Assuming you have this model

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());
// Enable CORS for all routes (important for frontend-backend communication)
app.use(cors());

// MongoDB Connection URI and Database Name
const MONGO_URI = 'mongodb+srv://vishnusaketh07:NETFLIX@cluster0.yo7hthy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'NETFLIX'; // Your database name

// Connect to MongoDB using Mongoose
mongoose.connect(MONGO_URI, { dbName: DB_NAME })
    .then(() => console.log('MongoDB connected successfully for app.js'))
    .catch(err => {
        console.error('MongoDB connection error for app.js:', err);
        process.exit(1); // Exit if database connection fails
    });

// --- STATIC FILE SERVING CONFIGURATION ---
// Serve static files from the current directory (where index.html is)
app.use(express.static(path.join(__dirname)));

// --- EXPLICIT ROUTE FOR THE ROOT PATH ('/') ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// --- API Endpoints ---

// Endpoint 1: Get all movies
app.get('/api/movies', async (req, res) => {
    try {
        const movies = await Movie.find({}); // Use Mongoose model
        res.json(movies);
    } catch (error) {
        console.error('Error fetching movies:', error);
        res.status(500).json({ error: 'Failed to fetch movies', details: error.message });
    }
});

// Endpoint 2: Get all series
app.get('/api/series', async (req, res) => {
    try {
        const series = await Series.find({}); // Use Mongoose model
        res.json(series);
    } catch (error) {
        console.error('Error fetching series:', error);
        res.status(500).json({ error: 'Failed to fetch series', details: error.message });
    }
});

// Endpoint 3: Search movies and series by title
app.get('/api/search', async (req, res) => {
    const searchTerm = req.query.q;

    if (!searchTerm) {
        return res.status(400).json({ message: 'Search term "q" is required' });
    }

    try {
        // Use a case-insensitive regex for searching titles in both collections
        const searchRegex = new RegExp(searchTerm, 'i');

        const movies = await Movie.find({ title: { $regex: searchRegex } }); // Use Mongoose model
        const series = await Series.find({ title: { $regex: searchRegex } }); // Use Mongoose model

        res.json({ movies, series });
    } catch (error) {
        console.error(`Error searching for "${searchTerm}":`, error);
        res.status(500).json({ error: 'Failed to perform search', details: error.message });
    }
});

// Endpoint 4.1: Get movies by genre (queries 'genre' array)
app.get('/api/movies/genre/:genreName', async (req, res) => {
    const genreName = req.params.genreName;

    try {
        // Query the 'genre' array for the specific genre name (case-insensitive, exact match)
        const genreRegex = new RegExp(`^${genreName}$`, 'i');
        const movies = await Movie.find({
            genre: { $in: [genreRegex] } // Use $in with the regex for array matching
        });
        res.json(movies);
    } catch (error) {
        console.error(`Error fetching movies for genre "${genreName}":`, error);
        res.status(500).json({ error: 'Failed to fetch movies by genre', details: error.message });
    }
});

// Endpoint 4.2: Get series by genre (queries 'genre' array)
app.get('/api/series/genre/:genreName', async (req, res) => {
    const genreName = req.params.genreName;

    try {
        // Query the 'genre' array for the specific genre name (case-insensitive, exact match)
        const genreRegex = new RegExp(`^${genreName}$`, 'i');
        const series = await Series.find({
            genre: { $in: [genreRegex] } // Use $in with the regex for array matching
        });
        res.json(series);
    } catch (error) {
        console.error(`Error fetching series for genre "${genreName}":`, error);
        res.status(500).json({ error: 'Failed to fetch series by genre', details: error.message });
    }
});

// Endpoint 5: Get movie details by IMDb ID
app.get('/api/movies/:id', async (req, res) => {
    const imdbID = req.params.id;
    try {
        const movie = await Movie.findOne({ imdbID: imdbID }); // Use Mongoose model
        if (movie) {
            res.json(movie);
        } else {
            res.status(404).json({ message: 'Movie not found' });
        }
    } catch (error) {
        console.error(`Error fetching movie with ID ${imdbID}:`, error);
        res.status(500).json({ error: 'Failed to fetch movie details', details: error.message });
    }
});

// Endpoint 6: Get series details by IMDb ID
app.get('/api/series/:id', async (req, res) => {
    const imdbID = req.params.id;
    try {
        const seriesItem = await Series.findOne({ imdbID: imdbID }); // Use Mongoose model
        if (seriesItem) {
            res.json(seriesItem);
        } else {
            res.status(404).json({ message: 'Series not found' });
        }
    } catch (error) {
        console.error(`Error fetching series with ID ${imdbID}:`, error);
        res.status(500).json({ error: 'Failed to fetch series details', details: error.message });
    }
});

// Endpoint for My List (Placeholder)
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


// --- Start the Server ---
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = app;
