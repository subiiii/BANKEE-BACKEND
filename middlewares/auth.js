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

// Middleware to verify admin users
const verifyAdmin = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //Read role from decoded.user
    if (!decoded.user || decoded.user.role !== 'ROLE_ADMIN') {
      return res.status(403).json({ message: 'Access forbidden. Admin only.' });
    }

    req.admin = decoded.user;
    next();
  } catch (error) {
    console.error('Admin verification error');
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { sign, auth, verifyAdmin };