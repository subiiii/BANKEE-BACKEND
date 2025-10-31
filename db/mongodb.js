const mongoose = require('mongoose');

// Connect to MongoDB and surface errors to the caller (don't silently swallow)
const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('MongoDB connected')
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        // Rethrow so the caller can decide whether to exit or retry
        throw error;
    }
}

module.exports = connectDb