// Filename: models/Series.js
const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema({
    // IMDb ID remains for consistency with frontend and user list
    imdbID: { type: String, required: true, unique: true },
    // New: TMDB ID for direct lookups on TMDB
    tmdbId: { type: Number, unique: true, sparse: true },

    title: { type: String, required: true }, // TMDB uses 'name' for series
    plot: { type: String },
    poster: { type: String }, // URL to poster image
    backdrop: { type: String }, // URL to backdrop image (for hero section)
    year: { type: String }, // First air year
    genre: { type: [String] }, // Array of genre names
    totalSeasons: { type: String }, // e.g., "5"
    actors: { type: String },
    // Using TMDB's vote_average as a substitute for IMDb Rating
    imdbRating: { type: String },
    telegramPlayableUrl: { type: String, default: '' }, // Link to playable video
    type: { type: String, default: 'series' }
}, { timestamps: true });

module.exports = mongoose.model('Series', seriesSchema);
