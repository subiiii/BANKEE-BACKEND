const db = require('../db/mysql')
const logService = require('./logService')

/**
 * Handles account deposits.
 * Locks the target account, updates balance, commits transaction,
 * and logs the deposit activity.
 */

// Deposit controller

const deposit = async (req, res) => {
  let { id } = req.params
  const { amount } = req.body
  const user_id = req.user.id

  console.log("Deposit route params:", { id, user_id, body: req.body })

  // Sanitize and validate account ID
  id = parseInt(id.replace(":", ""), 10)
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid account ID" })
  }

  // Validate deposit amount
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid amount" })
  }

  const conn = await db.getConnection()
  try {
    // Begin transaction to ensure atomicity
    await conn.query("START TRANSACTION")

    console.log("Account query:", id, user_id)

    // Lock account row to prevent concurrent modifications
    const [[acc]] = await conn.query(
      "SELECT balance FROM account_info WHERE id = ? AND user_id = ? FOR UPDATE",
      [id, user_id]
    )

    console.log("Account found:", acc)

    // If account does not exist, rollback
    if (!acc) {
      await conn.query("ROLLBACK")
      return res.status(404).json({ message: "Account not found" })
    }

    // Calculate new balance
    const before = parseFloat(acc.balance)
    const after = before + parseFloat(amount)

    // Update balance
    await conn.query("UPDATE account_info SET balance = ? WHERE id = ?", [
      after,
      id,
    ])

    // Commit the transaction
    await conn.query("COMMIT")

    // Log transaction details in MongoDB
    await logService.create({
      userId: user_id,
      type: "DEPOSIT",
      amount,
      fromAccountId: id.toString(),
      balanceBefore: before,
      balanceAfter: after,
      status: "success",
    })

    // Return success response
    return res.status(200).json({
      message: "Deposit successful",
      data: { balanceBefore: before, balanceAfter: after },
    })
  } catch (error) {
    // Rollback in case of error
    await conn.query("ROLLBACK")
    console.error("Deposit error:", error)
    res.status(500).json({ message: "Deposit failed" })
  } finally {
    // Always release connection
    conn.release()
  }
}


/**
 * Handles withdrawals.
 * Ensures sufficient funds before debiting the account and logs the transaction.
 */

// Withdraw controller

const withdraw = async (req, res) => {
  let { id } = req.params
  const { amount } = req.body
  const userId = req.user.id

  // Sanitize and validate account ID
  id = parseInt(id.replace(":", ""), 10)
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid account ID" })
  }

  // Validate withdrawal amount
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount' })
  }

  const conn = await db.getConnection()
  try {
    // Begin transaction
    await conn.query('START TRANSACTION')

    // Lock the account row for update
    const [[acc]] = await conn.query(
      'SELECT balance FROM account_info WHERE id = ? AND user_id = ? FOR UPDATE', [id, userId]
    )

    // Account not found
    if (!acc) {
      await conn.query('ROLLBACK')
      return res.status(404).json({ message: 'Account not found' })
    }

    // Check for sufficient funds
    if (acc.balance < amount) {
      await conn.query('ROLLBACK')
      return res.status(400).json({ message: 'Insufficient funds' })
    }

    // Compute new balance
    const before = acc.balance
    const after = before - amount

    // Update balance
    await conn.query(
      'UPDATE account_info SET balance = ? WHERE id = ?', [after, id]
    )

    // Commit transaction
    await conn.query('COMMIT')

    // Log the withdrawal
    await logService.create({
      userId, type: 'WITHDRAW', amount, fromAccountId: id,
      balanceBefore: before, balanceAfter: after
    })

    // Return success response
    return res.status(200).json({
      message: 'Withdrawal successful',
      data: { balanceBefore: before, balanceAfter: after }
    })

  } catch {
    // Rollback on error
    await conn.query('ROLLBACK')
    res.status(500).json({ message: 'Withdrawal failed' })
  } finally {
    // Release database connection
    conn.release()
  }
}


/**
 * Handles fund transfers between two accounts.
 * Ensures both accounts exist, verifies balance,
 * and records the transfer in the log service.
 */

// Transfer controller

const transfer = async (req, res) => {
  const { fromAccountId, toAccountId, amount } = req.body
  const userId = req.user.id

  // Validate required fields
  if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
    return res.status(400).json({ message: 'All fields required' })
  }

  // Prevent transfer to the same account
  if (fromAccountId === toAccountId) {
    return res.status(400).json({ message: 'Cannot transfer to same account' })
  }

  const conn = await db.getConnection()
  try {
    // Begin transaction
    await conn.query('START TRANSACTION')

    // Lock both accounts for update
    const [[from]] = await conn.query(
      'SELECT balance FROM account_info WHERE id = ? AND user_id FOR UPDATE', [fromAccountId, userId]
    )
    const [[to]] = await conn.query(
      'SELECT balance FROM account_info WHERE id = ? FOR UPDATE', [toAccountId]
    )

    // Validate existence of both accounts
    if (!from || !to) {
      await conn.query('ROLLBACK')
      return res.status(404).json({ message: 'Account not found' })
    }

    // Ensure sender has sufficient funds
    if (from.balance < amount) {
      await conn.query('ROLLBACK')
      return res.status(400).json({ message: 'Insufficient funds' })
    }

    // Compute new balances
    const fromBefore = from.balance
    const toBefore = to.balance
    const fromAfter = fromBefore - amount
    const toAfter = toBefore + amount

    // Update both accounts
    await conn.query(
      'UPDATE account_info SET balance = ? WHERE id = ?', [fromAfter, fromAccountId]
    )
    await conn.query(
      'UPDATE account_info SET balance = ? WHERE id = ?', [toAfter, toAccountId]
    )

    // Commit the transaction
    await conn.query('COMMIT')

    // Log the transfer
    await logService.create({
      userId, type: 'TRANSFER', amount, fromAccountId, toAccountId,
      balanceBefore: fromBefore, balanceAfter: fromAfter
    })

    // Return success response
    return res.status(200).json({
      message: 'Transfer successful',
      data: { fromAfter, toAfter }
    })
  } catch {
    // Rollback in case of error
    await conn.query('ROLLBACK')
    res.status(500).json({ message: 'Transfer failed' })
  } finally {
    // Release connection
    conn.release()
  }
}


/**
 * Retrieves current balance of a user's specific account.
 * Ensures account belongs to the authenticated user.
 */

// Get balance controller

const get_balance = async (req, res) => {
  let { id } = req.params
  const userId = req.user.id

  // Validate account ID
  id = parseInt(id.replace(":", ""), 10)
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid account ID" })
  }

  try {
    // Query account balance
    const [[acc]] = await db.query(
      'SELECT balance FROM account_info WHERE id = ? AND user_id = ?', [id, userId]
    )

    // Return not found if account missing
    if (!acc) {
      return res.status(404).json({ message: 'Account not found' })
    }

    // Return account balance
    res.status(200).json({ balance: acc.balance })
  } catch (error) {
    // Handle query errors
    res.status(500).json({ message: 'Could not retrieve balance' })
  }
}

module.exports = { deposit, withdraw, transfer, get_balance }
