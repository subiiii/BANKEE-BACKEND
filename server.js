const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { auth } = require('./middlewares/auth');
const userRoutes = require('./routes/user.route');
const accountRoutes = require('./routes/account.route');
const walletRoutes = require('./routes/wallet.route');
const transactionRoutes = require('./routes/transaction.route');
const { start } = require('./jobs/webhookJob');

const app = express();

// ✅ Morgan for request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // logs concise output (method, URL, status)
} else {
  app.use(morgan('combined')); // standard Apache format for production logs
}

// ✅ Security Middleware
app.use(helmet()); // set secure headers
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(xssClean()); // prevent XSS attacks
app.use(hpp()); // prevent HTTP parameter pollution
app.use(compression()); // compress responses

// ✅ Rate Limiter — prevent brute-force & DoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});
app.use('/api', limiter);

// ✅ Body Parser
app.use(express.json({ limit: '10kb' }));

// ✅ Database Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ✅ Routes
app.use('/api/users', userRoutes);
app.use('/api/accounts', auth, accountRoutes);
app.use('/api/wallets', auth, walletRoutes);
app.use('/api/transactions', auth, transactionRoutes);

// ✅ Background Job
start();

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// ✅ Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
});
