// movie-streamer-backend/importData.js

require('dotenv').config(); // Load environment variables from .env file
const mongoose = require('mongoose');
const axios = require('axios'); // Ensure axios is required for OMDb API calls

// --- MongoDB Models ---
// Ensure these paths are correct relative to where importData.js is run
const Movie = require('./models/Movie');
const Series = require('./models/Series');

// --- Configuration ---
// It's best practice to use process.env.MONGO_URI
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'NETFLIX'; // Your database name

// OMDb API Key - MUST be set in your .env file as OMDB_API_KEY
// The script will use the one you provide in your .env
const OMDB_API_KEY = process.env.OMDB_API_KEY;
const OMDB_BASE_URL = 'http://www.omdbapi.com/'; // OMDb API Base URL

if (!MONGO_URI) {
    console.error('Error: MONGO_URI is not set in your .env file. Please ensure it is present.');
    process.exit(1);
}

if (!OMDB_API_KEY) {
    console.error('Error: OMDB_API_KEY is not set in your .env file. Please ensure it is present to fetch data.');
    process.exit(1);
}

// List of movies and series to import
// This list is significantly expanded. Be mindful of OMDb's rate limits (usually 1000 requests/day for free tier).
// If you hit limits, run it again tomorrow or after a few hours.
// Set isNetflixOriginal: true for items you want to brand as "NETFLIX ORIGINAL"
// Prioritizing IMDb IDs for direct and accurate lookup.
const titlesToImport = [
    // --- Popular Movies ---
    { imdbID: 'tt0111161', type: 'movie', isNetflixOriginal: false, title: 'The Shawshank Redemption' },
    { imdbID: 'tt0068646', type: 'movie', isNetflixOriginal: false, title: 'The Godfather' },
    { imdbID: 'tt0468569', type: 'movie', isNetflixOriginal: false, title: 'The Dark Knight' },
    { imdbID: 'tt0071562', type: 'movie', isNetflixOriginal: false, title: 'The Godfather Part II' },
    { imdbID: 'tt0050083', type: 'movie', isNetflixOriginal: false, title: '12 Angry Men' },
    { imdbID: 'tt0108070', type: 'movie', isNetflixOriginal: false, title: 'Schindler\'s List' },
    { imdbID: 'tt0167260', type: 'movie', isNetflixOriginal: false, title: 'The Lord of the Rings: The Return of the King' },
    { imdbID: 'tt0110912', type: 'movie', isNetflixOriginal: false, title: 'Pulp Fiction' },
    { imdbID: 'tt0060196', type: 'movie', isNetflixOriginal: false, title: 'The Good, the Bad and the Ugly' },
    { imdbID: 'tt0109830', type: 'movie', isNetflixOriginal: false, title: 'Forrest Gump' },
    { imdbID: 'tt0137523', type: 'movie', isNetflixOriginal: false, title: 'Fight Club' },
    { imdbID: 'tt1375666', type: 'movie', isNetflixOriginal: false, title: 'Inception' },
    { imdbID: 'tt0120737', type: 'movie', isNetflixOriginal: false, title: 'The Lord of the Rings: The Fellowship of the Ring' },
    { imdbID: 'tt0167261', type: 'movie', isNetflixOriginal: false, title: 'The Lord of the Rings: The Two Towers' },
    { imdbID: 'tt0080684', type: 'movie', isNetflixOriginal: false, title: 'Star Wars: Episode V - The Empire Strikes Back' },
    { imdbID: 'tt0133093', type: 'movie', isNetflixOriginal: false, title: 'The Matrix' },
    { imdbID: 'tt0099685', type: 'movie', isNetflixOriginal: false, title: 'Goodfellas' },
    { imdbID: 'tt0073486', type: 'movie', isNetflixOriginal: false, title: 'One Flew Over the Cuckoo\'s Nest' },
    { imdbID: 'tt0047478', type: 'movie', isNetflixOriginal: false, title: 'Seven Samurai' },
    { imdbID: 'tt0114369', type: 'movie', isNetflixOriginal: false, title: 'Se7en' },

    // --- Popular Series ---
    { imdbID: 'tt0903747', type: 'series', isNetflixOriginal: true, title: 'Breaking Bad' }, // Example Netflix Original
    { imdbID: 'tt0944947', type: 'series', isNetflixOriginal: false, title: 'Game of Thrones' },
    { imdbID: 'tt4574334', type: 'series', isNetflixOriginal: true, title: 'Stranger Things' }, // Example Netflix Original
    { imdbID: 'tt0386676', type: 'series', isNetflixOriginal: false, title: 'The Office' },
    { imdbID: 'tt0108778', type: 'series', isNetflixOriginal: false, title: 'Friends' },
    { imdbID: 'tt2861424', type: 'series', isNetflixOriginal: false, title: 'Rick and Morty' },
    { imdbID: 'tt4786824', type: 'series', isNetflixOriginal: true, title: 'The Crown' }, // Example Netflix Original
    { imdbID: 'tt6468322', type: 'series', isNetflixOriginal: true, title: 'Money Heist' }, // Example Netflix Original
    { imdbID: 'tt13444458', type: 'series', isNetflixOriginal: true, title: 'Wednesday' }, // Example Netflix Original
    { imdbID: 'tt10919420', type: 'series', isNetflixOriginal: true, title: 'Squid Game' }, // Example Netflix Original
    { imdbID: 'tt5071412', type: 'series', isNetflixOriginal: true, title: 'Ozark' }, // Example Netflix Original
    { imdbID: 'tt2442560', type: 'series', isNetflixOriginal: false, title: 'Peaky Blinders' },
    { imdbID: 'tt5180504', type: 'series', isNetflixOriginal: true, title: 'The Witcher' }, // Example Netflix Original
    { imdbID: 'tt2707408', type: 'series', isNetflixOriginal: true, title: 'Narcos' }, // Example Netflix Original
    { imdbID: 'tt5290382', type: 'series', isNetflixOriginal: true, title: 'Mindhunter' }, // Example Netflix Original
    { imdbID: 'tt5753856', type: 'series', isNetflixOriginal: true, title: 'Dark' }, // Example Netflix Original
    { imdbID: 'tt10048370', type: 'series', isNetflixOriginal: true, title: 'Queen\'s Gambit' }, // Example Netflix Original
    { imdbID: 'tt4052886', type: 'series', isNetflixOriginal: true, title: 'Lucifer' }, // Example Netflix Original
    { imdbID: 'tt7221388', type: 'series', isNetflixOriginal: true, title: 'Cobra Kai' }, // Example Netflix Original
    { imdbID: 'tt11126994', type: 'series', isNetflixOriginal: true, title: 'Arcane' }, // Example Netflix Original
];

/**
 * Fetches movie/series data from OMDb API.
 * @param {string} imdbID - The IMDb ID of the movie/series.
 * @returns {Promise<object|null>} The OMDb data or null if not found/error.
 */
async function fetchOmdbData(imdbID) {
    try {
        const response = await axios.get(OMDB_BASE_URL, {
            params: {
                i: imdbID,
                apikey: OMDB_API_KEY,
                plot: 'full' // Request full plot
            }
        });
        if (response.data && response.data.Response === 'True') {
            return response.data;
        } else {
            console.warn(`  OMDb API Error for IMDb ID ${imdbID}: ${response.data.Error || 'Unknown error'}`);
            return null;
        }
    } catch (error) {
        console.error(`  Error fetching from OMDb for IMDb ID ${imdbID}:`, error.message);
        return null;
    }
}

/**
 * Formats OMDb data into a structure suitable for our MongoDB models.
 * @param {object} omdbData - Data returned from OMDb API.
 * @param {boolean} isNetflixOriginal - Flag from titlesToImport.
 * @returns {object} Formatted data.
 */
function formatOmdbData(omdbData, isNetflixOriginal) {
    return {
        imdbID: omdbData.imdbID,
        Title: omdbData.Title,
        Year: omdbData.Year,
        Rated: omdbData.Rated,
        Released: omdbData.Released,
        Runtime: omdbData.Runtime,
        Genre: omdbData.Genre,
        Director: omdbData.Director,
        Writer: omdbData.Writer,
        Actors: omdbData.Actors,
        Plot: omdbData.Plot, // Full plot
        Language: omdbData.Language,
        Country: omdbData.Country,
        Awards: omdbData.Awards,
        Poster: omdbData.Poster,
        Metascore: omdbData.Metascore,
        imdbRating: omdbData.imdbRating,
        imdbVotes: omdbData.imdbVotes,
        Type: omdbData.Type, // 'movie', 'series', 'episode', 'game'
        totalSeasons: omdbData.totalSeasons, // Only for series
        isNetflixOriginal: isNetflixOriginal // Custom flag
    };
}


/**
 * Main function to connect to MongoDB and import data.
 */
async function importData() {
    try {
        await mongoose.connect(MONGO_URI, {
            dbName: DB_NAME
        });
        console.log('MongoDB connected for data import.');

        for (const itemConfig of titlesToImport) {
            console.log(`Processing: ${itemConfig.title || itemConfig.imdbID} (${itemConfig.type}) - IMDb ID: ${itemConfig.imdbID}`);
            try {
                const omdbData = await fetchOmdbData(itemConfig.imdbID);

                if (omdbData) {
                    const formattedData = formatOmdbData(omdbData, itemConfig.isNetflixOriginal);

                    let Model;
                    if (formattedData.Type === 'movie') { // Use Type from OMDb data
                        Model = Movie;
                    } else if (formattedData.Type === 'series') { // Use Type from OMDb data
                        Model = Series;
                    } else {
                        console.warn(`Skipping unexpected OMDb type: ${formattedData.Type} for IMDb ID ${itemConfig.imdbID}. Expected 'movie' or 'series'.`);
                        continue;
                    }

                    // Check if item already exists to avoid duplicates.
                    const existingItem = await Model.findOne({ imdbID: formattedData.imdbID });

                    if (existingItem) {
                        console.log(`  Skipping: ${formattedData.Title} (IMDb: ${formattedData.imdbID}) already exists.`);
                    } else {
                        const newItem = new Model(formattedData); // Save the formatted OMDb data directly
                        await newItem.save();
                        console.log(`  Successfully imported: ${formattedData.Title} (IMDb: ${formattedData.imdbID})`);
                    }
                } else {
                    console.warn(`  Failed to get valid OMDb data for IMDb ID ${itemConfig.imdbID}. Skipping.`);
                }
            } catch (importError) {
                console.error(`  Error importing IMDb ID ${itemConfig.imdbID}:`, importError.message);
            }
            // Add a small delay to avoid hitting OMDb API rate limits
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay per request
        }
        console.log('Data import process completed.');
    } catch (dbError) {
        console.error('MongoDB connection or operation error:', dbError);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
    }
}

// Run the import function
importData();
