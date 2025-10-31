const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction.mongo');

router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    const { type, status: transactionStatus, startDate, endDate, page = 1, limit = 10 } = req.query;

    const filters = { userId };
    if (type) filters.type = type;
    if (transactionStatus) filters.status = transactionStatus;
    if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.$gte = new Date(startDate);
        if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    try {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const total = await Transaction.countDocuments(filters);
        const transactions = await Transaction.find(filters)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);

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
        console.error(error);
        res.status(500).json({ message: 'Could not retrieve transactions' });
    }
});

module.exports = router;