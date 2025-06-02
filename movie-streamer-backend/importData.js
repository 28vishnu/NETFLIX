// Filename: importData.js
// This script connects to MongoDB, fetches movie and series data using *ONLY* OMDb API,
// and imports it into your database.

require('dotenv').config(); // Load environment variables from .env file
const mongoose = require('mongoose');
const axios = require('axios'); // For making HTTP requests

// --- Define Mongoose Schemas and Models ---
const Movie = require('./models/Movie');
const Series = require('./models/Series');

// --- MongoDB Connection URI and Database Name ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://vishnusaketh07:NETFLIX@cluster0.yo7hthy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'NETFLIX'; // Your database name

// OMDb API Configuration
const OMDB_API_KEY = process.env.OMDB_API_KEY || 'YOUR_OMDB_API_KEY'; // Ensure this is your actual OMDb API Key
const OMDB_BASE_URL = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}`;

// --- Search terms to fetch a diverse set of movies/series from OMDb ---
// OMDb doesn't have "most popular" lists directly, so we use search queries.
const movieSearchTerms = [
    'action movie', 'comedy film', 'drama movie', 'sci-fi movie', 'horror film',
    'fantasy movie', 'crime movie', 'thriller movie', 'animation movie', 'documentary'
];
const seriesSearchTerms = [
    'drama series', 'comedy series', 'action series', 'sci-fi series', 'animation series',
    'crime series', 'fantasy series', 'thriller series'
];

// --- Main Import Function ---
async function importData() {
    try {
        await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
        console.log('Connected to MongoDB');

        // Ensure unique indexes on imdbID for both collections
        await Movie.collection.createIndex({ imdbID: 1 }, { unique: true }).catch(() => {});
        await Series.collection.createIndex({ imdbID: 1 }, { unique: true }).catch(() => {});
        console.log('Unique indexes on imdbID ensured.');

        console.log('\n--- Starting Data Import with OMDb API Only ---');

        let totalProcessed = 0;
        const processedImdbIDs = new Set(); // To avoid processing the same item multiple times from different searches

        // --- Fetch and Save Movies ---
        for (const term of movieSearchTerms) {
            console.log(`\n  Searching OMDb for movies: "${term}"...`);
            try {
                const searchResponse = await axios.get(`${OMDB_BASE_URL}&s=${encodeURIComponent(term)}&type=movie`);
                const searchResults = searchResponse.data.Search;

                if (searchResponse.data.Response === 'True' && searchResults && searchResults.length > 0) {
                    console.log(`  Found ${searchResults.length} search results for "${term}". Fetching details...`);
                    for (const item of searchResults) {
                        if (processedImdbIDs.has(item.imdbID)) {
                            // console.log(`  Movie "${item.Title}" (IMDb ID: ${item.imdbID}) already processed. Skipping.`);
                            continue;
                        }

                        try {
                            const omdbDetailUrl = `${OMDB_BASE_URL}&i=${item.imdbID}&plot=full`;
                            const omdbResponse = await axios.get(omdbDetailUrl);
                            const rawData = omdbResponse.data;

                            if (rawData.Response === 'True' && rawData.Type === 'movie') {
                                const movieData = {
                                    imdbID: rawData.imdbID,
                                    title: rawData.Title,
                                    year: rawData.Year,
                                    rated: rawData.Rated,
                                    released: rawData.Released,
                                    runtime: rawData.Runtime,
                                    genre: rawData.Genre ? rawData.Genre.split(', ').map(g => g.trim()) : [],
                                    director: rawData.Director,
                                    writer: rawData.Writer,
                                    actors: rawData.Actors,
                                    plot: rawData.Plot,
                                    language: rawData.Language,
                                    country: rawData.Country,
                                    awards: rawData.Awards,
                                    poster: rawData.Poster,
                                    imdbRating: rawData.imdbRating,
                                    type: rawData.Type,
                                    boxOffice: rawData.BoxOffice,
                                    dvd: rawData.DVD,
                                    imdbVotes: rawData.imdbVotes,
                                    metascore: rawData.Metascore,
                                    production: rawData.Production,
                                    ratings: rawData.Ratings,
                                    website: rawData.Website,
                                };
                                await Movie.create(movieData);
                                totalProcessed++;
                                processedImdbIDs.add(item.imdbID);
                            } else if (rawData.Response === 'False') {
                                // console.warn(`  Could not fetch OMDb details for movie "${item.Title}" (IMDb ID: ${item.imdbID}): ${rawData.Error}`);
                            }
                        } catch (detailError) {
                            if (detailError.code === 11000) {
                                console.warn(`  Duplicate key error for movie "${item.Title}" (IMDb ID: ${item.imdbID}). Skipping.`);
                            } else {
                                console.error(`  Error processing movie "${item.Title}" (IMDb ID: ${item.imdbID}):`, detailError.message);
                            }
                        }
                    }
                } else if (searchResponse.data.Response === 'False') {
                    console.warn(`  OMDb search for "${term}" returned an error: ${searchResponse.data.Error}`);
                } else {
                    console.log(`  No search results found for "${term}".`);
                }
            } catch (apiError) {
                console.error(`  Error searching OMDb for "${term}":`, apiError.message);
            }
        }

        // --- Fetch and Save Series ---
        for (const term of seriesSearchTerms) {
            console.log(`\n  Searching OMDb for series: "${term}"...`);
            try {
                const searchResponse = await axios.get(`${OMDB_BASE_URL}&s=${encodeURIComponent(term)}&type=series`);
                const searchResults = searchResponse.data.Search;

                if (searchResponse.data.Response === 'True' && searchResults && searchResults.length > 0) {
                    console.log(`  Found ${searchResults.length} search results for "${term}". Fetching details...`);
                    for (const item of searchResults) {
                        if (processedImdbIDs.has(item.imdbID)) {
                            // console.log(`  Series "${item.Title}" (IMDb ID: ${item.imdbID}) already processed. Skipping.`);
                            continue;
                        }

                        try {
                            const omdbDetailUrl = `${OMDB_BASE_URL}&i=${item.imdbID}&plot=full`;
                            const omdbResponse = await axios.get(omdbDetailUrl);
                            const rawData = omdbResponse.data;

                            if (rawData.Response === 'True' && rawData.Type === 'series') {
                                const seriesData = {
                                    imdbID: rawData.imdbID,
                                    title: rawData.Title,
                                    year: rawData.Year,
                                    rated: rawData.Rated,
                                    released: rawData.Released,
                                    runtime: rawData.Runtime,
                                    genre: rawData.Genre ? rawData.Genre.split(', ').map(g => g.trim()) : [],
                                    director: rawData.Director,
                                    writer: rawData.Writer,
                                    actors: rawData.Actors,
                                    plot: rawData.Plot,
                                    language: rawData.Language,
                                    country: rawData.Country,
                                    awards: rawData.Awards,
                                    poster: rawData.Poster,
                                    imdbRating: rawData.imdbRating,
                                    type: rawData.Type,
                                    totalSeasons: rawData.totalSeasons,
                                    boxOffice: rawData.BoxOffice,
                                    dvd: rawData.DVD,
                                    imdbVotes: rawData.imdbVotes,
                                    metascore: rawData.Metascore,
                                    production: rawData.Production,
                                    ratings: rawData.Ratings,
                                    website: rawData.Website,
                                };
                                await Series.create(seriesData);
                                totalProcessed++;
                                processedImdbIDs.add(item.imdbID);
                            } else if (rawData.Response === 'False') {
                                // console.warn(`  Could not fetch OMDb details for series "${item.Title}" (IMDb ID: ${item.imdbID}): ${rawData.Error}`);
                            }
                        } catch (detailError) {
                            if (detailError.code === 11000) {
                                console.warn(`  Duplicate key error for series "${item.Title}" (IMDb ID: ${item.imdbID}). Skipping.`);
                            } else {
                                console.error(`  Error processing series "${item.Title}" (IMDb ID: ${item.imdbID}):`, detailError.message);
                            }
                        }
                    }
                } else if (searchResponse.data.Response === 'False') {
                    console.warn(`  OMDb search for "${term}" returned an error: ${searchResponse.data.Error}`);
                } else {
                    console.log(`  No search results found for "${term}".`);
                }
            } catch (apiError) {
                console.error(`  Error searching OMDb for "${term}":`, apiError.message);
            }
        }

        console.log(`\n--- Data Import Completed. Total unique items processed in this run: ${totalProcessed} ---`);

    } catch (dbError) {
        console.error('MongoDB connection or import process error:', dbError);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
}

// Execute the import function
importData();
