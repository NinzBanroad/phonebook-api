const mysql = require('mysql2/promise');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('Error: DATABASE_URL is not set.');
  process.exit(1);
}

try {
  const { hostname, port, pathname, username, password } = new URL(dbUrl);

  const pool = mysql.createPool({
    host: hostname,
    port: port || 3306,
    user: username,
    password: password,
    database: pathname.substring(1),
  });

  // Test connection
  async function testConnection() {
    try {
      const connection = await pool.getConnection();
      console.log('Successfully connected to MySQL Database');
      connection.release();
    } catch (err) {
      console.error('Database Connection Failed:', err.message);
      process.exit(1);
    }
  }

  testConnection();

  module.exports = pool;
} catch (error) {
  console.error('Invalid DATABASE_URL format:', error.message);
  process.exit(1);
}
