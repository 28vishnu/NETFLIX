// movie-streamer-backend/models/UserList.js
const mongoose = require('mongoose');

// This schema defines the structure of an item within a user's list.
// It should contain enough information to display the item on the frontend.
const userListItemSchema = new mongoose.Schema({
    imdbID: { type: String, required: true }, // OMDb IMDb ID
    Title: { type: String, required: true },
    Poster: String, // URL to poster image
    Type: { type: String, enum: ['movie', 'series'], required: true }, // 'movie' or 'series'
    Year: String,
    Plot: String,
    Genre: String,
    Director: String,
    Actors: String,
    imdbRating: String,
    // Add any other fields you want to store directly in the user's list item
    // that are essential for displaying the card and modal details without another lookup.
}, { _id: false }); // Do not create a default _id for subdocuments, imdbID will act as unique within the array

const userListSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // Unique ID for the user
    items: [userListItemSchema], // Array of items in the user's list
}, { timestamps: true }); // Add createdAt and updatedAt timestamps

module.exports = mongoose.model('UserList', userListSchema, 'userlists'); // 'userlists' is your collection name
