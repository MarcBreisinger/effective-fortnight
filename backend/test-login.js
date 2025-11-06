// Test login functionality
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

async function testLogin() {
  console.log('=== Login Debug Test ===\n');

  // Check environment variables
  console.log('1. Environment Variables:');
  console.log('   JWT_SECRET:', process.env.JWT_SECRET ? 'SET ✓' : 'MISSING ✗');
  console.log('   DB_HOST:', process.env.DB_HOST || 'NOT SET');
  console.log('   DB_NAME:', process.env.DB_NAME || 'NOT SET');
  console.log('   DB_USER:', process.env.DB_USER ? 'SET ✓' : 'MISSING ✗');
  console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET ✓' : 'MISSING ✗');
  console.log('');

  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not set in .env file!');
    console.log('Add this to your .env file:');
    console.log('JWT_SECRET=your_secret_key_here\n');
    return;
  }

  try {
    // Connect to database
    console.log('2. Connecting to database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    console.log('   ✓ Database connected\n');

    // Check if users table exists
    console.log('3. Checking users table...');
    const [tables] = await connection.query("SHOW TABLES LIKE 'users'");
    if (tables.length === 0) {
      console.error('   ✗ Users table does not exist!');
      console.log('   Run: mysql < database/schema.sql\n');
      await connection.end();
      return;
    }
    console.log('   ✓ Users table exists\n');

    // Check for staff user
    console.log('4. Checking for staff user...');
    const [users] = await connection.query(
      "SELECT id, email, password, role FROM users WHERE email = 'staff@daycare.local'"
    );

    if (users.length === 0) {
      console.log('   ✗ No staff user found with email: staff@daycare.local');
      console.log('\n   Creating staff user...');
      
      // Generate hash for 048204
      const hash = await bcrypt.hash('048204', 10);
      await connection.query(
        "INSERT INTO users (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)",
        ['staff@daycare.local', hash, 'Admin', 'Staff', 'staff']
      );
      console.log('   ✓ Staff user created successfully!\n');
    } else {
      console.log('   ✓ Staff user exists');
      console.log('   Email:', users[0].email);
      console.log('   Role:', users[0].role);
      console.log('');

      // Test password
      console.log('5. Testing password verification...');
      const testPassword = '048204';
      const isValid = await bcrypt.compare(testPassword, users[0].password);
      
      if (isValid) {
        console.log('   ✓ Password "048204" matches! Login should work.\n');
      } else {
        console.log('   ✗ Password does not match!');
        console.log('   Updating password to "048204"...');
        const newHash = await bcrypt.hash('048204', 10);
        await connection.query(
          "UPDATE users SET password = ? WHERE email = ?",
          [newHash, 'staff@daycare.local']
        );
        console.log('   ✓ Password updated!\n');
      }

      // Test JWT generation
      console.log('6. Testing JWT generation...');
      try {
        const token = jwt.sign(
          { id: users[0].id, email: users[0].email, role: users[0].role },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
        console.log('   ✓ JWT token generated successfully');
        console.log('   Token preview:', token.substring(0, 50) + '...\n');
      } catch (err) {
        console.error('   ✗ JWT generation failed:', err.message);
      }
    }

    // Show login test credentials
    console.log('=== Login Test Credentials ===');
    console.log('Email: staff@daycare.local');
    console.log('Password: 048204');
    console.log('\nTest with:');
    console.log('curl -X POST http://localhost:5000/api/auth/login \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"email":"staff@daycare.local","password":"048204"}\'');
    console.log('');

    await connection.end();
    console.log('✓ All checks complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testLogin();
