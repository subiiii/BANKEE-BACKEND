const mysql2 = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql2.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT,
    connectionLimit: 100,
});


console.log(process.env.MYSQL_HOST);


module.exports = {
    query: (sql, params) => pool.execute(sql, params),
    getConnection: () => pool.getConnection(),
    connect: () => 
        console.log('Connected to MySQL Database'),
};