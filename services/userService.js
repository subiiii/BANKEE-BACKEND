const db = require('../db/mysql')
const bcrypt = require('bcrypt')
const {sign} = require('../middlewares/auth')

const hash = (pwd) => bcrypt.hashSync(pwd, 10)
const compare = (plain, hash) => bcrypt.compareSync(plain, hash)

const register = async (req, res) => {
    const { fullName, email, password } = req.body
    if (!fullName || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' })
    }

    console.log("ososooskoskos");
    const conn = await db.getConnection()
    
    try {
        await conn.query('START TRANSACTION')

        const [[user]] = await conn.query('SELECT * FROM user_info_new WHERE email = ?', [email])
        if (user) {
            await conn.query('ROLLBACK')
            return res.status(409).json({ message: 'Email already registered' })
        }

        const hashedPassword = hash(password)
        const [result] = await conn.query(
            'INSERT INTO user_info_new (fullName, email, password) VALUES (?, ?, ?)', [fullName, email, hashedPassword]
        )
        const userId = result.insertId

        const accNum = `ACC${Date.now()}`
        const walletRef = `WAL${Date.now()}`

        await conn.query(
            'INSERT INTO account_info (user_id, account_number, balance) VALUES (?, ?, 0.00)', [userId, accNum]
        )
        await conn.query(
            'INSERT INTO wallet_info (user_id, wallet_ref, balance) VALUES (?, ?, 0.00)', [userId, walletRef]
        )
        await conn.query('COMMIT')
        const token = sign({ id: userId, email })
        res.status(201).json({ token })
        return res.status(201).json({ message: 'Register successful', token })
    } catch (error){ await conn.query('ROLLBACK')
        console.log(error)
        res.status(500).json({ message: 'Registration failed' })
    } finally {
        conn.release()
    }
}

const login = async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' })
    }
    try {
        const [[user]] = await db.query('SELECT * FROM user_info_new WHERE email = ?', [email])
        if (!user || !compare(password, user.password)) {
            return res.status(401).json({ message: 'Invalid email or password' })
        }
        const token = sign({ id: user.id })
        res.status(200).json({message: 'Login successful', token })
    } catch (error) {
        res.status(500).json({ message: 'Login failed Internal Server Error' })
    }
}
module.exports = { register, login }