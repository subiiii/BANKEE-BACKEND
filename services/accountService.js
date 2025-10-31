const db = require('../db/mysql')
const logService = require('./logService')


// const deposit = async (req, res) => {
//   const { id } = req.params;
//   const { amount } = req.body;
//   const user_id = req.user.id;

//   console.log("Deposit route params:", { id, user_id, body: req.body });

// //   // Convert id safely
// //   id = parseInt(id);
// //   if (isNaN(id)) {
// //     return res.status(400).json({ message: "Invalid account ID" });
// //   }

//   if (!amount || amount <= 0) {
//     return res.status(400).json({ message: "Invalid amount" });
//   }

//   const conn = await db.getConnection();
//   try {
//     await conn.query("START TRANSACTION");

//     console.log("Account query:", id, user_id);

//     const [[acc]] = await conn.query(
//       "SELECT balance FROM account_info WHERE id = ? AND user_id = ? FOR UPDATE",
//       [id, user_id]
//     );

//     console.log("Account found:", acc);

//     if (!acc) {
//       await conn.query("ROLLBACK");
//       return res.status(404).json({ message: "Account not found" });
//     }

//     const before = acc.balance;
//     const after = before + amount;

//     await conn.query("UPDATE account_info SET balance = ? WHERE id = ?", [after, id]);
//     await conn.query("COMMIT");

//     await logService.create({
//       userId: user_id,
//       type: "DEPOSIT",
//       amount,
//       fromAccountId: id,
//       balanceBefore: before,
//       balanceAfter: after,
//     });

//     return res.status(200).json({
//       message: "Deposit successful",
//       data: { balanceBefore: before, balanceAfter: after },
//     });
//   } catch (error) {
//     await conn.query("ROLLBACK");
//     console.error(error);
//     res.status(500).json({ message: "Deposit failed" });
//   } finally {
//     conn.release();
//   }
// };

const deposit = async (req, res) => {
  let { id } = req.params;
  const { amount } = req.body;
  const user_id = req.user.id;

  console.log("Deposit route params:", { id, user_id, body: req.body });

  // ✅ FIX: Remove any accidental colon (e.g., ":4" → "4")
  id = parseInt(id.replace(":", ""), 10);
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid account ID" });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  const conn = await db.getConnection();
  try {
    await conn.query("START TRANSACTION");

    console.log("Account query:", id, user_id);

    const [[acc]] = await conn.query(
      "SELECT balance FROM account_info WHERE id = ? AND user_id = ? FOR UPDATE",
      [id, user_id]
    );

    console.log("Account found:", acc);

    if (!acc) {
      await conn.query("ROLLBACK");
      return res.status(404).json({ message: "Account not found" });
    }

    const before = parseFloat(acc.balance);
    const after = before + parseFloat(amount);

    await conn.query("UPDATE account_info SET balance = ? WHERE id = ?", [
      after,
      id,
    ]);
    await conn.query("COMMIT");

    // ✅ Save transaction in MongoDB
    await logService.create({
      userId: user_id,
      type: "DEPOSIT",
      amount,
      fromAccountId: id.toString(),
      balanceBefore: before,
      balanceAfter: after,
      status: "success",
    });

    return res.status(200).json({
      message: "Deposit successful",
      data: { balanceBefore: before, balanceAfter: after },
    });
  } catch (error) {
    await conn.query("ROLLBACK");
    console.error("Deposit error:", error);
    res.status(500).json({ message: "Deposit failed" });
  } finally {
    conn.release();
  }
};



const withdraw = async (req, res) => {
    let {id} = req.params
    const {amount} = req.body
    const userId = req.user.id
    id = parseInt(id.replace(":", ""), 10);
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid account ID" });
  }

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' })
    }

    const conn = await db.getConnection()
    try {
        await conn.query('START TRANSACTION')

        const [[acc]] = await conn.query(
            'SELECT balance FROM account_info WHERE id = ? AND user_id = ? FOR UPDATE', [id, userId]
        )
        if (!acc) {
            await conn.query('ROLLBACK')
            return res.status(404).json({ message: 'Account not found' })
        }

        if (acc.balance < amount) {
            await conn.query('ROLLBACK')
            return res.status(400).json({ message: 'Insufficient funds' })
        }

        const before = acc.balance
        const after = before - amount

        await conn.query(
            'UPDATE account_info SET balance = ? WHERE id = ?', [after, id]
        )
        await conn.query('COMMIT')
        await logService.create({
            userId, type: 'WITHDRAW', amount, fromAccountId: id, balanceBefore: before, balanceAfter: after
        })

        return res.status(200).json({ message: 'Withdrawal successful', data: { balanceBefore: before, balanceAfter: after }})

    } catch {
        await conn.query('ROLLBACK')
        res.status(500).json({ message: 'Withdrawal failed' })
    } finally {
        conn.release()
    }

}

const transfer = async (req, res) => {
    const { fromAccountId, toAccountId, amount } = req.body
    const userId = req.user.id

    if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
        return res.status(400).json({ message: 'All fields required' })
    }

    if (fromAccountId === toAccountId) {
        return res.status(400).json({ message: 'Cannot transfer to same account' })
    }

    const conn = await db.getConnection()
    try {
        await conn.query('START TRANSACTION')

        const [[from]] = await conn.query(
            'SELECT balance FROM account_info WHERE id = ? AND user_id FOR UPDATE', [fromAccountId, userId]
        )

        const [[to]] = await conn.query(
            'SELECT balance FROM account_info WHERE id = ? FOR UPDATE', [toAccountId]
        )
        if (!from || !to) {
            await conn.query('ROLLBACK')
            return res.status(404).json({ message: 'Account not found' })
        }
        if (from.balance < amount) {
            await conn.query('ROLLBACK')
            return res.status(400).json({ message: 'Insufficient funds' })
        }

        const fromBefore = from.balance
        const toBefore = to.balance
        const fromAfter = fromBefore - amount
        const toAfter = toBefore + amount

        await conn.query(
            'UPDATE account_info SET balance = ? WHERE id = ?', [fromAfter, fromAccountId]
        )
        await conn.query(
            'UPDATE account_info SET balance = ? WHERE id = ?', [toAfter, toAccountId]
        )
        await conn.query('COMMIT')

        await logService.create({
            userId, type: 'TRANSFER', amount, fromAccountId, toAccountId,
            balanceBefore: fromBefore, balanceAfter: fromAfter
        })

        return res.status(200).json({ message: 'Transfer successful', data: { fromAfter, toAfter } })
    } catch {
        await conn.query('ROLLBACK')
        res.status(500).json({ message: 'Transfer failed' })
    } finally {
        conn.release()
    }
}

const get_balance = async (req, res) => {
    let {id} = req.params
    const userId = req.user.id
    id = parseInt(id.replace(":", ""), 10);
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid account ID" });
  }

    try {
        const [[acc]] = await db.query(
            'SELECT balance FROM account_info WHERE id = ? AND user_id = ?', [id, userId]
        )
        if (!acc) {
            return res.status(404).json({ message: 'Account not found' })
        }
        res.status(200).json({ balance: acc.balance })
    } catch (error) {
        res.status(500).json({ message: 'Could not retrieve balance' })
    }
}

module.exports = { deposit, withdraw, transfer, get_balance }