const cron = require('node-cron');
const Transaction = require('../models/transaction.mongo');
const logService = require('../services/logService');
const db = require('../db/mysql');

const start = () => {   
  // Run this job every minute
  cron.schedule('* * * * *', async () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    console.log('Running webhookJob cron task at', new Date());
    
    // Get all wallet_fund transactions that are still pending and older than 1 minute
    const pendings = await Transaction.find({
      type: 'wallet_fund',
      status: 'pending',
      createdAt: { $lte: oneMinuteAgo }
    });

    for (let p of pendings) {
      let success = false;

      // Get a MySQL connection from the pool
      const conn = await db.getConnection();
      try {
        // Start a SQL transaction
        await conn.query('START TRANSACTION');

        // Lock the wallet row to prevent concurrent updates
        const [[wallet]] = await conn.query(
          'SELECT balance FROM wallet_info WHERE id = ? FOR UPDATE', 
          [p.toWalletId]
        );

        if (!wallet) {
          console.error(`Wallet ${p.toWalletId} not found for user ${p.userId}`);
          await conn.query('ROLLBACK');
          continue;
        }

        // Calculate new balance
        const after = wallet.balance + p.amount;

        // Update wallet balance
        await conn.query(
          'UPDATE wallet_info SET balance = ? WHERE id = ?', 
          [after, p.toWalletId]
        );

        // Save log record
        await logService.create({
          userId: p.userId,
          type: 'wallet_fund',
          amount: p.amount,
          toWalletId: p.toWalletId,
          balanceBefore: wallet.balance,
          balanceAfter: after
        });

        // Commit the transaction
        await conn.query('COMMIT');
        success = true;

      } catch (error) {
        // Rollback on any error
        console.error('CRON WALLET_FUND ERROR');
        await conn.query('ROLLBACK');
      } finally {
        // Release the connection back to the pool
        conn.release();
      }

      // Update the transaction status in MongoDB
      await Transaction.updateOne(
        { _id: p._id },
        { status: success ? 'completed' : 'failed' }
      );
    }
  });
};

module.exports = { start };
