const db = require('../db/mysql');
const bcrypt = require('bcrypt');
const { sign } = require('../middlewares/auth');



// Hash a plain text password using bcrypt with a salt round of 10
const hash = (pwd) => bcrypt.hashSync(pwd, 10);

// Compare a plain text password with a hashed password
const compare = (plain, hash) => bcrypt.compareSync(plain, hash);

// Email validation function
// Ensures the email has a valid format, contains '@' and '.',
// and does not allow consecutive dots (e.g., "user..mail@domain.com").
const isValidEmail = (email) => {
  const pattern = /^(?!.*\.\.)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return pattern.test(email);
};

// User Registration

const register = async (req, res) => {
  let { fullName, email, password } = req.body;

  // Ensure all required fields are provided
  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Normalize the email by trimming spaces and converting to lowercase
  email = email.trim().toLowerCase();

  // Validate the email format
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  // Ensure password meets minimum length requirement
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  // Establish a database connection
  const conn = await db.getConnection();

  try {
    // Start a transaction to ensure atomic operations
    await conn.query('START TRANSACTION');

    // Check if a user with the same email already exists
    const [[existingUser]] = await conn.query(
      'SELECT * FROM user_info_new WHERE email = ?',
      [email]
    );
    if (existingUser) {
      await conn.query('ROLLBACK');
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash the user’s password before storing it
    const hashedPassword = hash(password);

    // Insert the new user record
    const [result] = await conn.query(
      'INSERT INTO user_info_new (fullName, email, password) VALUES (?, ?, ?)',
      [fullName.trim(), email, hashedPassword]
    );

    // Retrieve the newly created user’s ID
    const userId = result.insertId;

    // Generate unique identifiers for account and wallet
    const accNum = `ACC${Date.now()}`;
    const walletRef = `WAL${Date.now()}`;

    // Create a corresponding account record for the user
    await conn.query(
      'INSERT INTO account_info (user_id, account_number, balance) VALUES (?, ?, 0.00)',
      [userId, accNum]
    );

    // Create a corresponding wallet record for the user
    await conn.query(
      'INSERT INTO wallet_info (user_id, wallet_ref, balance) VALUES (?, ?, 0.00)',
      [userId, walletRef]
    );

    // Commit the transaction to make all changes permanent
    await conn.query('COMMIT');

    // Generate an authentication token for the user
    const token = sign({ id: userId, email });

    // Send a success response with the token
    return res.status(201).json({ message: 'Register successful', token });
  } catch (error) {
    // Roll back changes if any error occurs during registration
    await conn.query('ROLLBACK');
    console.error('Registration error:');
    return res.status(500).json({ message: 'Registration failed' });
  } finally {
    // Release the database connection
    conn.release();
  }
};

// User Login

const login = async (req, res) => {
  let { email, password } = req.body;

  // Ensure both email and password are provided
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // Normalize email for case-insensitive matching
  email = email.trim().toLowerCase();

  // Validate email format before querying
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  try {
    // Fetch user record by email
    const [[user]] = await db.query(
      'SELECT * FROM user_info_new WHERE email = ?',
      [email]
    );

    // Verify that the user exists and the password matches
    if (!user || !compare(password, user.password)) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate a JWT token containing the user’s ID
    const token = sign({ id: user.id });

    // Respond with success and the authentication token
    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    // Handle unexpected errors gracefully
    console.error('Login error:');
    res.status(500).json({ message: 'Login failed - Internal Server Error' });
  }
};

module.exports = { register, login };
