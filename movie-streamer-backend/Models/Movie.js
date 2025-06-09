// movie-streamer-backend/models/Movie.js
const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
    imdbID: { type: String, required: true, unique: true }, // OMDb unique ID
    Title: { type: String, required: true },
    Year: String,
    Rated: String,
    Released: String,
    Runtime: String,
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
    Type: { type: String, default: 'movie' }, // Should be 'movie'
    isNetflixOriginal: { type: Boolean, default: false }, // Custom flag
    createdAt: { type: Date, default: Date.now } // For sorting 'latest' content
});

module.exports = mongoose.model('Movie', movieSchema, 'movies'); // 'movies' is your collection name
