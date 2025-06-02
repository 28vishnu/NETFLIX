const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Movie = require('./models/Movie'); // Ensure this path is correct for your Movie model
const Series = require('./models/Series'); // Ensure this path is correct for your Series model

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

// Route to get all movies
app.get('/api/movies', async (req, res) => {
    try {
        const movies = await Movie.find({});
        // If no movies are found, return an empty array, not a 404
        res.json(movies);
    } catch (err) {
        console.error('Error fetching all movies:', err);
        res.status(500).json({ message: 'Server error fetching all movies', error: err.message });
    }
});

// Route to get all series
app.get('/api/series', async (req, res) => {
    try {
        const series = await Series.find({});
        // If no series are found, return an empty array, not a 404
        res.json(series);
    } catch (err) {
        console.error('Error fetching all series:', err);
        res.status(500).json({ message: 'Server error fetching all series', error: err.message });
    }
});

// Route to get a single movie by IMDb ID
app.get('/api/movies/:imdbID', async (req, res) => {
    try {
        const movie = await Movie.findOne({ imdbID: req.params.imdbID });
        if (!movie) {
            // Return 404 if a specific movie by ID is not found
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
            // Return 404 if a specific series by ID is not found
            return res.status(404).json({ message: 'Series not found' });
        }
        res.json(series);
    } catch (err) {
        console.error(`Error fetching series with IMDb ID ${req.params.imdbID}:`, err);
        res.status(500).json({ message: 'Server error fetching series', error: err.message });
    }
});

// Route to get movies by genre
app.get('/api/movies/genre/:genreName', async (req, res) => {
    try {
        const genre = req.params.genreName;
        // Find movies where the 'Genre' field contains the specified genre (case-insensitive)
        // This assumes 'Genre' field in your Movie model is a string (e.g., "Action, Sci-Fi")
        // or an array of strings. $regex with $options 'i' handles case-insensitive substring match.
        const movies = await Movie.find({ Genre: { $regex: genre, $options: 'i' } });
        if (movies.length === 0) {
            // Return 404 if no movies are found for the specific genre
            return res.status(404).json({ message: `No movies found for genre: ${genre}` });
        }
        res.json(movies);
    } catch (err) {
        console.error(`Error fetching movies by genre ${req.params.genreName}:`, err);
        res.status(500).json({ message: 'Server error fetching movies by genre', error: err.message });
    }
});

// Route to get series by genre
app.get('/api/series/genre/:genreName', async (req, res) => {
    try {
        const genre = req.params.genreName;
        // Find series where the 'Genre' field contains the specified genre (case-insensitive)
        const series = await Series.find({ Genre: { $regex: genre, $options: 'i' } });
        if (series.length === 0) {
            // Return 404 if no series are found for the specific genre
            return res.status(404).json({ message: `No series found for genre: ${genre}` });
        }
        res.json(series);
    } catch (err) {
        console.error(`Error fetching series by genre ${req.params.genreName}:`, err);
        res.status(500).json({ message: 'Server error fetching series by genre', error: err.message });
    }
});

// Route to get trending movies (e.g., for hero section)
// This currently returns 5 random movies for demonstration.
// If no movies are found in the collection, it will return an empty array [].
app.get('/api/movies/trending', async (req, res) => {
    try {
        const trendingMovies = await Movie.aggregate([{ $sample: { size: 5 } }]);
        // No explicit 404 here, as an empty array is a valid response for "no trending movies right now"
        res.json(trendingMovies);
    } catch (error) {
        console.error('Error fetching trending movies:', error);
        res.status(500).json({ error: 'Failed to fetch trending movies', details: error.message });
    }
});

// Route to get popular movies
// This currently returns 10 random movies for demonstration.
// If no movies are found in the collection, it will return an empty array [].
app.get('/api/movies/popular', async (req, res) => {
    try {
        const popularMovies = await Movie.aggregate([{ $sample: { size: 10 } }]);
        res.json(popularMovies);
    } catch (error) {
        console.error('Error fetching popular movies:', error);
        res.status(500).json({ error: 'Failed to fetch popular movies', details: error.message });
    }
});

// Route to get popular series
// This currently returns 10 random series for demonstration.
// If no series are found in the collection, it will return an empty array [].
app.get('/api/series/popular', async (req, res) => {
    try {
        const popularSeries = await Series.aggregate([{ $sample: { size: 10 } }]);
        res.json(popularSeries);
    } catch (error) {
        console.error('Error fetching popular series:', error);
        res.status(500).json({ error: 'Failed to fetch popular series', details: error.message });
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
