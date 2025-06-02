const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import cors
const Movie = require('./models/Movie');
const Series = require('./models/Series');

const app = express();
const PORT = process.env.PORT || 5000; // Use port 5000 for the backend

// MongoDB Connection URI (same as in importData.js)
const MONGO_URI = 'mongodb+srv://vishnusaketh07:NETFLIX@cluster0.yo7hthy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'NETFLIX';

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Enable parsing JSON request bodies

// Connect to MongoDB
mongoose.connect(MONGO_URI, { dbName: DB_NAME })
    .then(() => console.log('MongoDB connected successfully for server.'))
    .catch(err => console.error('MongoDB connection error for server:', err));

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

// Route to get all TV series
app.get('/api/series', async (req, res) => {
    try {
        const series = await Series.find({});
        res.json(series);
    } catch (err) {
        console.error('Error fetching series:', err);
        res.status(500).json({ message: 'Server error fetching series', error: err.message });
    }
});

// Optional: Route to get a single movie by IMDb ID
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

// Optional: Route to get a single series by IMDb ID
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

// Start the server
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
