const mongoose = require('mongoose');

module.exports = mongoose.model('Transaction', new mongoose.Schema({
    userId: String,
    type: String,
    amount: Number,
    status: { type: String, default: 'successful'},
    fromAccountId: String,
    toAccountId: String,
    fromWalletId: String,
    toWalletId: String,
    walletRef: String,
    balanceBefore: Number,
    balanceAfter: Number
}, { timestamps: true }));