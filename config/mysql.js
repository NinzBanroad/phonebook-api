const mysql = require('mysql2/promise');
require('dotenv').config();

// const connection = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   database: process.env.DB_NAME,
// });

const db = process.env.DATABASE_URL;

const pool = mysql.createPool(db);

pool
  .getConnection()
  .then(() => console.log('Successfully Connected to MySQL Database'))
  .catch((err) => {
    console.error('Database Connection Failed:', err.message);
    process.exit(1);
  });

module.exports = pool;
