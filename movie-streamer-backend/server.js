// movie-streamer-backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env file

// --- MongoDB Models ---
// Ensure these model files exist in movie-streamer-backend/models/
// You will need to create/ensure existence of:
// - Movie.js
// - Series.js
// - UserList.js
const Movie = require('./models/Movie');
const Series = require('./models/Series');
const UserList = require('./models/UserList');

const app = express();
const PORT = process.env.PORT || 5000;

// --- MongoDB Connection ---
// It's best practice to use process.env.MONGO_URI here
const MONGO_URI = process.env.MONGO_URI; 

if (!MONGO_URI) {
    console.error('Error: MONGO_URI is not set in your .env file.');
    process.exit(1);
}

mongoose.connect(MONGO_URI, {
    dbName: 'NETFLIX' // Your database name, ensure it matches
})
.then(() => console.log('MongoDB connected successfully.'))
.catch(err => console.error('MongoDB connection error:', err));

// --- Middleware ---
app.use(cors()); // Enables Cross-Origin Resource Sharing
app.use(express.json()); // Parses JSON bodies of incoming requests

// --- API Routes ---

app.get('/', (req, res) => {
    res.send('Netflix Clone Backend is running!');
});

// Get all Movies from MongoDB
app.get('/api/movies', async (req, res) => {
    try {
        // Fetch all movies, sort by creation date to simulate 'latest' or 'popular'
        const movies = await Movie.find({}).sort({ createdAt: -1 });
        res.json(movies);
    } catch (error) {
        console.error('Error fetching movies from DB:', error);
        res.status(500).json({ message: 'Failed to fetch movies from database.' });
    }
});

// Get all Series from MongoDB
app.get('/api/series', async (req, res) => {
    try {
        // Fetch all series, sort by creation date to simulate 'latest' or 'popular'
        const series = await Series.find({}).sort({ createdAt: -1 });
        res.json(series);
    } catch (error) {
        console.error('Error fetching series from DB:', error);
        res.status(500).json({ message: 'Failed to fetch series from database.' });
    }
});

// Get Latest 5 Movies for Hero Banner (from MongoDB)
app.get('/api/trending-movies', async (req, res) => {
    try {
        // Fetch the 5 most recently added movies
        const latestMovies = await Movie.find({}).sort({ createdAt: -1 }).limit(5);
        res.json(latestMovies);
    } catch (error) {
        console.error('Error fetching trending movies from DB:', error);
        res.status(500).json({ message: 'Failed to fetch trending movies from database.' });
    }
});

// Get content details by IMDb ID from MongoDB
app.get('/api/detail/:imdbID', async (req, res) => {
    const { imdbID } = req.params;
    try {
        // Attempt to find in Movies collection first
        let item = await Movie.findOne({ imdbID });
        if (!item) {
            // If not found in Movies, try Series collection
            item = await Series.findOne({ imdbID });
        }

        if (item) {
            res.json(item);
        } else {
            res.status(404).json({ message: 'Content not found in database.' });
        }
    } catch (error) {
        console.error(`Error fetching detail for IMDb ID ${imdbID} from DB:`, error);
        res.status(500).json({ message: 'Failed to fetch content details from database.' });
    }
});

// Simulate Genre Categories (by filtering existing movies/series in DB)
// This endpoint will return all movies/series, and frontend will categorize by 'Genre' field.
// For true dynamic genre lists, you'd need a separate endpoint to return unique genre names.
app.get('/api/genres', async (req, res) => {
    try {
        const movieGenres = await Movie.distinct('Genre'); // Get unique genres from movies
        const seriesGenres = await Series.distinct('Genre'); // Get unique genres from series

        const combinedGenres = [...movieGenres, ...seriesGenres];
        const uniqueGenres = Array.from(new Set(combinedGenres.flatMap(g => g.split(', ').map(s => s.trim()))))
                                  .filter(g => g); // Filter out empty strings
        
        // Return genres as an array of objects for consistency if needed, or just strings
        const formattedGenres = uniqueGenres.map(name => ({ id: name.toLowerCase().replace(/\s/g, '-'), name: name }));

        res.json(formattedGenres);
    } catch (error) {
        console.error('Error fetching genres from DB:', error);
        res.status(500).json({ message: 'Failed to fetch genres from database.' });
    }
});


// --- User List (My List) Endpoints (using MongoDB) ---

// Get User's My List
app.get('/api/mylist/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        let userList = await UserList.findOne({ userId });
        if (!userList) {
            // If user's list doesn't exist, create an empty one
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
app.post('/api/mylist/:userId/:imdbID', async (req, res) => {
    const { userId, imdbID } = req.params;
    // The req.body should contain the full item data for My List.
    // The frontend will send the OMDb data for the item.
    const itemToAdd = req.body;

    // Ensure itemToAdd has required fields (at least imdbID and Type)
    if (!itemToAdd || !itemToAdd.imdbID || !itemToAdd.Type) {
        return res.status(400).json({ message: 'Invalid item data provided for My List.' });
    }

    try {
        let userList = await UserList.findOne({ userId });
        if (!userList) {
            userList = new UserList({ userId, items: [] });
        }

        // Check if item already exists in the user's list
        const existingItemIndex = userList.items.findIndex(item => item.imdbID === imdbID);

        if (existingItemIndex === -1) {
            userList.items.push(itemToAdd);
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
app.delete('/api/mylist/:userId/:imdbID', async (req, res) => {
    const { userId, imdbID } = req.params;
    try {
        const userList = await UserList.findOne({ userId });
        if (!userList) {
            return res.status(404).json({ message: 'User list not found.' });
        }

        const initialLength = userList.items.length;
        userList.items = userList.items.filter(item => item.imdbID !== imdbID);

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
