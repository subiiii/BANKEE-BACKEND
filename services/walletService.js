const db = require('../db/mysql')
const Transaction = require('../models/transaction.mongo')
const logService = require('./logService');


// const fund = async (req, res) => {
//     let { id } = req.params
//     const { amount } = req.body
//     const userId = req.user.id
//     const walletRef = `WAL${Date.now()}`
//      id = parseInt(id.replace(":", ""), 10);
//   if (isNaN(id)) {
//     return res.status(400).json({ message: "Invalid account ID" });
//   }

//     if (!amount || amount <= 0) {
//         return res.status(400).json({ message: 'Invalid amount' })
//     }
    

//     try {
//         const [[wallet]] = await db.query(
//             'SELECT id FROM wallet_info WHERE id = ? AND user_id = ?', [id, userId]
//         )
//         if (!wallet) {
//             return res.status(404).json({ message: 'Wallet not found' })
//         }

//         await Transaction.create({
//             userId, type: 'wallet_fund', amount, status: 'pending', toWalletId: id, walletRef: ref
//         })
//         res.status(200).json({ message: 'Funding pending', walletRef })
//     } catch (error) {
//         res.status(500).json({ message: 'Funding failed' })
//     }
// }
const fund = async (req, res) => {
    let { id } = req.params;
    const { amount } = req.body;
    const userId = req.user.id;
    const walletRef = `WAL${Date.now()}`;  // ✅ unique wallet reference

    // ✅ Clean up id
    id = parseInt(id.replace(":", ""), 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid account ID" });
    }

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
    }

    try {
        // ✅ Check if wallet exists for user
        const [[wallet]] = await db.query(
            'SELECT id FROM wallet_info WHERE id = ? AND user_id = ?', [id, userId]
        );

        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        // ✅ Corrected: use walletRef, not ref
        await Transaction.create({
            userId,
            type: "wallet_fund",
            amount,
            status: "pending",
            toWalletId: id,
            walletRef: walletRef,
        });

        res.status(200).json({ message: "Funding pending", walletRef });
    } catch (error) {
        console.error("FUND ERROR:", error);
        res.status(500).json({ message: "Funding failed" });
    }
};


const getBalance = async (req, res) => {
    let { id } = req.params
    const userId = req.user.id
     // ✅ Clean up id
    id = parseInt(id.replace(":", ""), 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid account ID" });
    }


    try {
        const [[wallet]] = await db.query(
            'SELECT balance FROM wallet_info WHERE id = ? AND user_id = ?', [id, userId]
        )
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' })
        }
        res.status(200).json({ balance: wallet.balance })

    } catch (error) {
        res.status(500).json({ message: 'Could not retrieve balance' })
    }
}

// const transfer = async (req, res) => {
//     const { fromWalletId, toWalletId, amount } = req.body
//     const userId = req.user.id

//     if (!fromWalletId || !toWalletId || !amount || amount <= 0) {
//         return res.status(400).json({ message: 'Invalid transfer details' })
//     }

//     const conn = await db.getConnection()
//     try {
//         await conn.query('START TRANSACTION')

//         const [[from]] = await conn.query(
//             'SELECT balance FROM wallet_info WHERE id = ? AND user_id = ? FOR UPDATE', [fromWalletId, userId]
//         )
//         const [[to]] = await conn.query(
//             'SELECT balance FROM wallet_info WHERE id = ? FOR UPDATE', [toWalletId]
//         )
//         if (!from || !to) {
//             await conn.query('ROLLBACK')
//             return res.status(404).json({ message: 'One or both wallets not found' })
//         }

//         if (from.balance < amount) {
//             await conn.query('ROLLBACK')
//             return res.status(400).json({ message: 'Insufficient funds in source wallet' })
//         }

//         const fromBefore = from.balance
//         const toBefore = to.balance
//         const fromAfter = fromBefore - amount
//         const toAfter = toBefore + amount

//         await conn.query(
//             'UPDATE wallet_info SET balance = ? WHERE id = ?', [fromAfter, fromWalletId]
//         )
//         await conn.query(
//             'UPDATE wallet_info SET balance = ? WHERE id = ?', [toAfter, toWalletId]
//         )
//         await conn.query('COMMIT')

//         await logService.create({
//             userId, type: 'WALLET_TRANSFER', amount, fromWalletId, toWalletId,
//             balanceBefore: fromBefore, balanceAfter: fromAfter
//         })

//         res.status(200).json({ message: 'Transfer successful', data: { fromAfter, toAfter } })
//     } catch {
//         await conn.query('ROLLBACK')
//         res.status(500).json({ message: 'Transfer failed' })
//     } finally {
//         conn.release()
//     }
// }
const transfer = async (req, res) => {
  const { fromWalletId, toWalletId, amount } = req.body;
  const userId = req.user.id;

  if (!fromWalletId || !toWalletId || !amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid transfer details" });
  }

  const conn = await db.getConnection();
  try {
    await conn.query("START TRANSACTION");
    console.log("🔹 Transfer request:", { fromWalletId, toWalletId, userId, amount });

    // Fetch both wallets
    const [[from]] = await conn.query(
      "SELECT balance FROM wallet_info WHERE id = ? AND user_id = ? FOR UPDATE",
      [fromWalletId, userId]
    );
    const [[to]] = await conn.query(
      "SELECT balance FROM wallet_info WHERE id = ? FOR UPDATE",
      [toWalletId]
    );

    console.log("🔹 From wallet:", from);
    console.log("🔹 To wallet:", to);

    if (!from || !to) {
      await conn.query("ROLLBACK");
      return res
        .status(404)
        .json({ message: "One or both wallets not found" });
    }

    if (from.balance < amount) {
      await conn.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "Insufficient funds in source wallet" });
    }

    const fromBefore = from.balance;
    const toBefore = to.balance;
    const fromAfter = fromBefore - amount;
    const toAfter = toBefore + amount;

    await conn.query(
      "UPDATE wallet_info SET balance = ? WHERE id = ?",
      [fromAfter, fromWalletId]
    );
    await conn.query(
      "UPDATE wallet_info SET balance = ? WHERE id = ?",
      [toAfter, toWalletId]
    );

    await conn.query("COMMIT");

    await logService.create({
      userId,
      type: "WALLET_TRANSFER",
      amount,
      fromWalletId,
      toWalletId,
      balanceBefore: fromBefore,
      balanceAfter: fromAfter,
    });

    console.log("✅ Transfer completed successfully");

    res.status(200).json({
      message: "Transfer successful",
      data: { fromAfter, toAfter },
    });
  } catch (error) {
    await conn.query("ROLLBACK");
    console.error("❌ TRANSFER ERROR:", error); // <-- log actual error
    res
      .status(500)
      .json({ message: "Transfer failed", error: error.message });
  } finally {
    conn.release();
  }
};


module.exports = { fund, getBalance, transfer }