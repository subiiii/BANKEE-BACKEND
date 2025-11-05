// routes/admin.route.js

/**
 * Admin Routes
 * Handles endpoints for admin account management.
 */

const express = require('express');
const router = express.Router();
const { seedAdmin, adminLogin, getAllUsers} = require('../controller/admin.controller');
const { verifyAdmin } = require('../middlewares/auth');
// Route to seed admin (should only be run once)
router.post('/seed', seedAdmin);

// Route to log in admin
router.post('/login', adminLogin);
router.get('/users', verifyAdmin, getAllUsers);
module.exports = router;
