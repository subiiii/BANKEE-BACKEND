const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const {auth} = require('./middlewares/auth');
const userRoutes = require('./routes/user.route');
const accountRoutes = require('./routes/account.route');
const walletRoutes = require('./routes/wallet.route');
const transactionRoutes = require('./routes/transaction.route');
const {start} = require('./jobs/webhookJob')

const app = express();
app.use(express.json());


const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

app.use('/api/users', userRoutes);
app.use('/api/accounts', auth, accountRoutes);
app.use('/api/wallets', auth, walletRoutes);
app.use('/api/transactions', auth, transactionRoutes);

start();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});