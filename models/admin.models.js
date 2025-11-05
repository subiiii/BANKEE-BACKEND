// models/admin.model.js

/**
 * Admin Model
 * Defines the structure of the admin user stored in MongoDB.
 */

const mongoose = require('mongoose');

// Define the admin schema
const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    default: 'ROLE_ADMIN',
  },
}, { timestamps: true });

// Export the model
const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;