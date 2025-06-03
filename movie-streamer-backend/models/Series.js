// models/Series.js
const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema({
    title: { type: String, required: true },
    year: String,
    imdbID: { type: String, required: true, unique: true },
    type: String,
    poster: String,
    plot: String,
    genre: [String], // Stored as an array of strings
    director: String,
    actors: String,
    writer: String,
    language: String,
    country: String,
    awards: String,
    imdbRating: String,
    rated: String,
    totalSeasons: String, // Specific for series
    runtime: String,
    boxOffice: String,
    dvd: String,
    imdbVotes: String,
    metascore: String,
    production: String,
    ratings: Array, // Array of objects
    website: String,
    telegramPlayableUrl: { type: String, default: null } // <--- ADD THIS LINE
});

module.exports = mongoose.model('Series', seriesSchema);
