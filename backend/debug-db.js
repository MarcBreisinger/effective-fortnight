// Debug database connection
require('dotenv').config();
const mysql = require('mysql2/promise');

console.log('=== Database Connection Debug ===');
console.log('Environment variables loaded:');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('DB_USER:', process.env.DB_USER ? '***SET***' : 'NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('');

async function testConnection() {
  console.log('Attempting to create connection pool...');
  
  const config = {
    host: process.env.DB_HOST || 'himalia.uberspace.de',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  console.log('Connection config (passwords hidden):');
  console.log({
    host: config.host,
    user: config.user ? '***' : 'MISSING',
    password: config.password ? '***' : 'MISSING',
    database: config.database || 'MISSING'
  });
  console.log('');

  try {
    const pool = mysql.createPool(config);
    console.log('Pool created, attempting connection...');
    
    const connection = await pool.getConnection();
    console.log('✓ Connection successful!');
    
    // Test a simple query
    const [rows] = await connection.query('SELECT 1 as test');
    console.log('✓ Query test successful:', rows);
    
    connection.release();
    await pool.end();
    console.log('✓ Connection closed properly');
    
  } catch (error) {
    console.error('✗ Connection failed!');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    // Common error codes and solutions
    console.log('\n=== Troubleshooting ===');
    if (error.code === 'ENOTFOUND') {
      console.log('- DNS lookup failed. Check if DB_HOST is correct.');
      console.log('- Verify you can reach:', config.host);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('- Connection refused. Check if MySQL is running on the host.');
      console.log('- Verify the port (default: 3306) is accessible.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('- Access denied. Check DB_USER and DB_PASSWORD.');
      console.log('- Verify the user has permissions for DB_NAME.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('- Database does not exist. Check DB_NAME.');
      console.log('- Create the database first or verify the name.');
    } else if (!config.user || !config.password || !config.database) {
      console.log('- Missing required environment variables.');
      console.log('- Make sure .env file exists and is properly formatted.');
      console.log('- Check that DB_USER, DB_PASSWORD, and DB_NAME are set.');
    }
  }
}

testConnection();
