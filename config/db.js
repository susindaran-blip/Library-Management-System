const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

// Test connection on startup
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ MySQL connection failed:', err.message);
        console.error('   Check your .env file DB_PASSWORD and make sure MySQL is running.');
    } else {
        console.log('✅ MySQL connected successfully to database:', process.env.DB_NAME);
        connection.release();
    }
});

module.exports = promisePool;
