// movie-streamer-backend/models/Series.js
const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema({
    imdbID: { type: String, required: true, unique: true }, // OMDb unique ID
    Title: { type: String, required: true },
    Year: String,
    Rated: String,
    Released: String,
    Runtime: String, // For Series, OMDb returns "N/A" or episode runtime. We'll store it.
    Genre: String,
    Director: String,
    Writer: String,
    Actors: String,
    Plot: String, // Full plot from OMDb
    Language: String,
    Country: String,
    Awards: String,
    Poster: String, // URL to poster image
    Metascore: String,
    imdbRating: String,
    imdbVotes: String,
    Type: { type: String, default: 'series' }, // Should be 'series'
    totalSeasons: String, // Specific to series
    isNetflixOriginal: { type: Boolean, default: false }, // Custom flag
    createdAt: { type: Date, default: Date.now } // For sorting 'latest' content
});

module.exports = mongoose.model('Series', seriesSchema, 'series'); // 'series' is your collection name
