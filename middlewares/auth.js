const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const sign = (data) => jwt.sign(data, process.env.JWT_SECRET, { expiresIn: '7d' });
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token' });
    }
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}
module.exports = { sign, auth };