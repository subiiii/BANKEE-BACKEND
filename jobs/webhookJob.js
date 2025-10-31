const cron = require('node-cron');
const Transaction = require('../models/transaction.mongo');
const logService = require('../services/logService');
const db = require('../db/mysql');

const start = () => {   
  cron.schedule('* * * * *', async () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const pendings = await Transaction.find({
      type: 'wallet_fund',
      status: 'pending',
      createdAt: { $lte: oneMinuteAgo }
    });

    for (let p of pendings) {
      let success = false; // default false

      const conn = await db.getConnection();
      try {
        await conn.query('START TRANSACTION');

        const [[wallet]] = await conn.query(
          'SELECT balance FROM wallet_info WHERE id = ? FOR UPDATE', 
          [p.toWalletId]
        );

        if (!wallet) {
          console.error(`Wallet ${p.toWalletId} not found for user ${p.userId}`);
          await conn.query('ROLLBACK');
          continue; // skip to next transaction
        }

        const after = wallet.balance + p.amount;

        await conn.query(
          'UPDATE wallet_info SET balance = ? WHERE id = ?', 
          [after, p.toWalletId]
        );

        await logService.create({
          userId: p.userId,
          type: 'WALLET_FUND',
          amount: p.amount,
          toWalletId: p.toWalletId,
          balanceBefore: wallet.balance,
          balanceAfter: after
        });

        await conn.query('COMMIT');
        success = true; // only mark success after commit

      } catch (error) {
        console.error('CRON WALLET_FUND ERROR:', error);
        await conn.query('ROLLBACK');
        success = false;
      } finally {
        conn.release();
      }

      await Transaction.updateOne(
        { _id: p._id },
        { status: success ? 'completed' : 'failed' }
      );
    }
  });
};

module.exports = { start };