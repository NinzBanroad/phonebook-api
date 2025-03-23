const mysql = require('mysql2/promise');
const config = require('config');
require('dotenv').config();

// const connection = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   database: process.env.DB_NAME,
// });

const db = `mysql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = mysql.createPool(db);

pool
  .getConnection()
  .then(() => console.log('Successfully Connected to MySQL Database'))
  .catch((err) => {
    console.error('Database Connection Failed:', err.message);
    process.exit(1);
  });

module.exports = pool;
