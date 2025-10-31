const Transaction = require('../models/transaction.mongo')

const create = async (data) => {
    try {
        console.log('Creating log entry:', data)
        await Transaction.create(data)
    } catch (error) {
        console.error('Log creation failed')
    }
}

module.exports = { create }