const mysql2 = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

// Create a MySQL connection pool using environment variables
const pool = mysql2.createPool({
    host: process.env.MYSQL_HOST,         // Database host 
    user: process.env.MYSQL_USER,         // Database username
    password: process.env.MYSQL_PASSWORD, // Database password
    database: process.env.MYSQL_DATABASE, // Database name
    port: process.env.MYSQL_PORT,         // MySQL port 
    connectionLimit: 100,                 // Max number of connections in the pool
});

// Log the host to confirm that environment variables are loading correctly
console.log(process.env.MYSQL_HOST);

// Export helper methods to interact with the database
module.exports = {
    // Run a SQL query (returns a promise)
    query: (sql, params) => pool.execute(sql, params),

    // Get a single connection from the pool (useful for transactions)
    getConnection: () => pool.getConnection(),

    // Log a simple message when the DB connection is ready
    connect: () => console.log('Connected to MySQL Database'),
};
