const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction.mongo');

// Get all transactions for a specific user (with filters and pagination)
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    const { type, status: transactionStatus, startDate, endDate, page = 1, limit = 10 } = req.query;

    // Build query filters based on provided parameters
    const filters = { userId };
    if (type) filters.type = type;
    if (transactionStatus) filters.status = transactionStatus;
    if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.$gte = new Date(startDate);
        if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    try {
        // Convert pagination values to numbers
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        // Count total matching documents
        const total = await Transaction.countDocuments(filters);

        // Fetch filtered transactions with pagination and sorting (newest first)
        const transactions = await Transaction.find(filters)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);

        // Send successful response with transaction data and pagination info
        res.status(200).json({
            total,
            data: {
                transactions,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum)
                }
            }
        });
    } catch (error) {
        // Handle and log any errors
        console.error(error);
        res.status(500).json({ message: 'Could not retrieve transactions' });
    }
});

// Export the router so it can be used in the main app
module.exports = router;
