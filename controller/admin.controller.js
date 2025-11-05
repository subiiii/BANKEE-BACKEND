// controllers/admin.controller.js

/**
 * Admin Controller
 * Handles seeding and authentication for admin users.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Admin = require('../models/admin.models');
dotenv.config();
const db = require('./../db/mysql')

/**
 * @desc    Seed a default admin account if it does not exist
 * @route   POST /api/admin/seed
 * @access  Public (for setup only)
 */
const seedAdmin = async (req, res) => {
  try {
    console.log('Initializing admin seeding...');

    // Default admin credentials (from .env or fallback)
    const adminData = {
      username: process.env.ADMIN_USERNAME || 'admin',
      email: (process.env.ADMIN_EMAIL || 'admin@bankee.com').toLowerCase().trim(),
      password: process.env.ADMIN_PASSWORD || 'admin1234',
      role: 'ROLE_ADMIN',
    };

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: adminData.email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin account already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);

    // Create and save new admin
    const newAdmin = new Admin({
      username: adminData.username,
      email: adminData.email,
      password: hashedPassword,
      role: adminData.role,
    });

    await newAdmin.save();

    res.status(201).json({
      message: 'Admin seeded successfully',
      admin: { username: newAdmin.username, email: newAdmin.email, role: newAdmin.role,  },
    });
  } catch (error) {
    console.error('Error seeding admin');
    res.status(500).json({ message: 'Server error during admin seeding' });
  }
};

/**
 * @desc    Admin login
 * @route   POST /api/admin/login
 * @access  Public
 */
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const payload = {
      user: {
        id: admin._id,
        role: admin.role,
        username: admin.username,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });

    // Send response
    res.status(200).json({
      message: 'Admin logged in successfully',
      token,
      user: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Admin login error');
    res.status(500).json({ message: 'Internal server error' });
  }
};


// --- Get All Users (MySQL) ---
const getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, fullName, email FROM user_info_new '
    );

    res.status(200).json({
      message: 'Users fetched successfully',
      total: users.length,
      users,
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

module.exports = { seedAdmin, adminLogin, getAllUsers };
