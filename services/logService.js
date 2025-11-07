const Transaction = require('../models/transaction.mongo');

// Create a new transaction log in MongoDB
const create = async (data) => {
    try {
        // Log data to the console for debugging
        console.log('Creating log entry:', data);

        // Save the log entry to the database
        await Transaction.create(data);
    } catch (error) {
        // Catch and log any errors that occur
        console.error('Log creation failed:', error);
    }
};

// Export the function so it can be used in other parts of the app
module.exports = { create };
