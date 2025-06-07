// Filename: models/Movie.js
const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
    // IMDb ID remains for consistency with frontend and user list
    imdbID: { type: String, required: true, unique: true },
    // New: TMDB ID for direct lookups on TMDB
    tmdbId: { type: Number, unique: true, sparse: true }, // sparse allows nulls if some items don't have TMDB ID

    title: { type: String, required: true },
    plot: { type: String },
    poster: { type: String }, // URL to poster image
    backdrop: { type: String }, // URL to backdrop image (for hero section)
    year: { type: String }, // Release year
    genre: { type: [String] }, // Array of genre names
    runtime: { type: String }, // e.g., "142 min"
    director: { type: String },
    actors: { type: String },
    // Using TMDB's vote_average as a substitute for IMDb Rating
    imdbRating: { type: String },
    telegramPlayableUrl: { type: String, default: '' }, // Link to playable video
    type: { type: String, default: 'movie' }
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps

module.exports = mongoose.model('Movie', movieSchema);
