const db = require('../db/mysql');
const Transaction = require('../models/transaction.mongo');
const logService = require('./logService');

// Wallet funding controller

const fund = async (req, res) => {
  let { id } = req.params;
  const { amount } = req.body;
  const userId = req.user.id;
  const walletRef = `WAL${Date.now()}`; // Generate a unique wallet reference for the transaction

  // Normalize and validate the wallet ID parameter
  id = parseInt(id.replace(":", ""), 10);
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid account ID" });
  }

  // Validate the funding amount
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  try {
    // Verify that the specified wallet exists for the authenticated user
    const [[wallet]] = await db.query(
      'SELECT id FROM wallet_info WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    // Create a pending transaction record in MongoDB for tracking
    await Transaction.create({
      userId,
      type: "wallet_fund",
      amount,
      status: "pending",
      toWalletId: id,
      walletRef: walletRef,
    });

    // Respond to the client with the wallet reference and pending status
    res.status(200).json({ message: "Funding pending", walletRef });
  } catch (error) {
    // Log and return any server-side errors
    console.error("FUND ERROR:");
    res.status(500).json({ message: "Funding failed" });
  }
};

// Wallet balance retrieval controller

const getBalance = async (req, res) => {
  let { id } = req.params;
  const userId = req.user.id;

  // Normalize and validate the wallet ID parameter
  id = parseInt(id.replace(":", ""), 10);
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid account ID" });
  }

  try {
    // Fetch the balance of the requested wallet for the authenticated user
    const [[wallet]] = await db.query(
      'SELECT balance FROM wallet_info WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Return the current wallet balance
    res.status(200).json({ balance: wallet.balance });
  } catch (error) {
    // Handle unexpected database or server errors
    console.error("GET BALANCE ERROR:");
    res.status(500).json({ message: 'Could not retrieve balance' });
  }
};

// Wallet transfer controller

const transfer = async (req, res) => {
  const { fromWalletId, toWalletId, amount } = req.body;
  const userId = req.user.id;

  // Validate required fields and amount value
  if (!fromWalletId || !toWalletId || !amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid transfer details" });
  }

  // Acquire a database connection for the transaction
  const conn = await db.getConnection();
  try {
    // Begin a new database transaction
    await conn.query("START TRANSACTION");

    // Log the initial transfer request for debugging and auditing
    console.log("Transfer request:", { fromWalletId, toWalletId, userId, amount });

    // Fetch both wallets 
    const [[from]] = await conn.query(
      "SELECT balance FROM wallet_info WHERE id = ? AND user_id = ? FOR UPDATE",
      [fromWalletId, userId]
    );
    const [[to]] = await conn.query(
      "SELECT balance FROM wallet_info WHERE id = ? FOR UPDATE",
      [toWalletId]
    );

    // Log the wallet balances before proceeding
    console.log("From wallet:", from);
    console.log("To wallet:", to);

    // Validate that both wallets exist
    if (!from || !to) {
      await conn.query("ROLLBACK");
      return res.status(404).json({ message: "One or both wallets not found" });
    }

    // Check if the source wallet has sufficient balance
    if (from.balance < amount) {
      await conn.query("ROLLBACK");
      return res.status(400).json({ message: "Insufficient funds in source wallet" });
    }

    // Compute new balances for both wallets
    const fromBefore = from.balance;
    const toBefore = to.balance;
    const fromAfter = fromBefore - amount;
    const toAfter = toBefore + amount;

    // Update balances in the database
    await conn.query(
      "UPDATE wallet_info SET balance = ? WHERE id = ?",
      [fromAfter, fromWalletId]
    );
    await conn.query(
      "UPDATE wallet_info SET balance = ? WHERE id = ?",
      [toAfter, toWalletId]
    );

    // Commit the transaction to finalize the transfer
    await conn.query("COMMIT");

    // Record the transaction details in the log service (MongoDB)
    await logService.create({
      userId,
      type: "WALLET_TRANSFER",
      amount,
      fromWalletId,
      toWalletId,
      balanceBefore: fromBefore,
      balanceAfter: fromAfter,
    });

    // Respond with success and updated wallet balances
    console.log("Transfer completed successfully");
    res.status(200).json({message: "Transfer successful", data: { fromAfter, toAfter }});
  } catch (error) {
    // Roll back all changes in case of error
    await conn.query("ROLLBACK");

    // Log and return the error
    console.error("TRANSFER ERROR:");
    res.status(500).json({ message: "Transfer failed"});
  } finally {
    // Ensure database connection is released back to the pool
    conn.release();
  }
};

// Export the wallet service functions

module.exports = { fund, getBalance, transfer };