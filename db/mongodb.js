const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Connect to MongoDB and surface errors to the caller (don't silently swallow)
const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('MongoDB connected')
    } catch (error) {
        console.error('MongoDB connection failed');
        // Rethrow so the caller can decide whether to exit or retry
        throw error;
    }
}

module.exports = connectDb