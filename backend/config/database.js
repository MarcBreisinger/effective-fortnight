// Database configuration
const mysql = require('mysql2/promise');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease create a .env file based on .env.example');
  console.error('See DB_TROUBLESHOOTING.md for help\n');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'himalia.uberspace.de',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log('✓ Database connected successfully');
    console.log(`  Host: ${process.env.DB_HOST}`);
    console.log(`  Database: ${process.env.DB_NAME}`);
    console.log(`  User: ${process.env.DB_USER}\n`);
    connection.release();
  })
  .catch(err => {
    console.error('✗ Database connection failed:');
    console.error(`  Error: ${err.message}`);
    console.error(`  Code: ${err.code}\n`);
    
    // Provide helpful error messages
    if (err.code === 'ENOTFOUND') {
      console.error('  → DNS lookup failed. Check DB_HOST in .env file');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('  → Connection refused. Is MySQL running?');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('  → Access denied. Check DB_USER and DB_PASSWORD');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('  → Database does not exist. Check DB_NAME');
    } else if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
      console.error('  → Missing credentials. Check .env file');
    }
    
    console.error('\n  See DB_TROUBLESHOOTING.md for detailed help\n');
  });

module.exports = pool;
