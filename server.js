// Load environment variables early
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { auth } = require('./middlewares/auth');
const userRoutes = require('./routes/user.route');
const accountRoutes = require('./routes/account.route');
const walletRoutes = require('./routes/wallet.route');
const transactionRoutes = require('./routes/transaction.route');
const { start } = require('./jobs/webhookJob');

const app = express();

// ----------------------
// 🔒 SECURITY MIDDLEWARES
// ----------------------

// Helmet helps secure HTTP headers
app.use(helmet());

// Morgan logs all requests (dev mode = concise colorful output)
app.use(morgan('dev'));

// Express JSON parser
app.use(express.json());

// Rate limiter — limits repeated requests to APIs
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 5 requests per window
  message: {
    status: 429,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable deprecated headers
});

// Apply the rate limiter to all API routes
app.use('/api', apiLimiter);

// ----------------------
// 🧩 DATABASE CONNECTION
// ----------------------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

//routes
app.use('/api/users', userRoutes);
app.use('/api/accounts', auth, accountRoutes);
app.use('/api/wallets', auth, walletRoutes);
app.use('/api/transactions', auth, transactionRoutes);

// ----------------------
// 🕒 CRON JOB
// ----------------------
start();

// ----------------------
// ⚡ SERVER START
// ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running securely on port ${PORT}`);
});