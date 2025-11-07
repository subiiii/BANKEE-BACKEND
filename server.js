// Load environment variables from .env file before anything else
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { auth } = require('./middlewares/auth');

// Import application routes
const userRoutes = require('./routes/user.route');
const accountRoutes = require('./routes/account.route');
const walletRoutes = require('./routes/wallet.route');
const transactionRoutes = require('./routes/transaction.route');
const { start } = require('./jobs/webhookJob');
const adminRoutes = require('./routes/admin.route');

const app = express();

// Security and Middleware Configuration

// Helmet secures HTTP headers to help protect against common vulnerabilities
app.use(helmet());

// Morgan logs all HTTP requests for debugging and monitoring
app.use(morgan('dev'));

// Built-in middleware for parsing JSON request bodies
app.use(express.json());

// Apply rate limiting to mitigate brute-force or denial-of-service attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Defines a 15-minute time window
  max: 100, // Limits each IP to 100 requests per window
  message: {
    status: 429,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true, // Sends rate limit information in headers
  legacyHeaders: false,  // Disables deprecated headers
});

// Apply the rate limiter to all API routes
app.use('/api', apiLimiter);

// Connect to MongoDB for logging and transaction records

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:'));

// Route configuration

app.use('/api/users', userRoutes);
app.use('/api/accounts', auth, accountRoutes);
app.use('/api/wallets', auth, walletRoutes);
app.use('/api/transactions', auth, transactionRoutes);
app.use('/api/admin', adminRoutes);




// Start scheduled background jobs such as webhook processing
start();

//Server setup

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running securely on port ${PORT}`);
});
