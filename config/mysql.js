const mysql = require('mysql2/promise');
const config = require('config');
const db = config.has('DATABASE_URL')
  ? config.get('DATABASE_URL')
  : process.env.DATABASE_URL;

const pool = mysql.createPool(db);

pool
  .getConnection()
  .then(() => console.log('Successfully Connected to MySQL Database'))
  .catch((err) => {
    console.error('Database Connection Failed:', err.message);
    process.exit(1);
  });

module.exports = pool;
