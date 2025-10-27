# Database Connection Troubleshooting Guide

## Quick Debug Steps

### 1. Check Environment Variables

Run the debug script:
```bash
cd backend
npm run dev
# Or directly:
node debug-db.js
```

### 2. Common Issues & Solutions

#### Issue: Missing .env file
**Solution:**
```bash
cd backend
cp .env.example .env
# Edit .env with your actual credentials
```

#### Issue: Wrong credentials
**Check your .env file has:**
```bash
DB_HOST=himalia.uberspace.de
DB_USER=your_actual_username
DB_PASSWORD=your_actual_password
DB_NAME=your_actual_database_name
JWT_SECRET=any_random_long_string
```

#### Issue: Database doesn't exist
**Solution:**
```bash
# First create the database on your MySQL server
mysql -h himalia.uberspace.de -u your_user -p
# Then in MySQL prompt:
CREATE DATABASE your_database_name;
exit;

# Then run the schema:
mysql -h himalia.uberspace.de -u your_user -p your_database_name < database/schema.sql
```

#### Issue: Connection timeout / firewall
**Check:**
- Can you connect to the host from your machine?
- Is your IP whitelisted on the MySQL server?
- Try connecting with mysql client first:
```bash
mysql -h himalia.uberspace.de -u your_user -p
```

#### Issue: MySQL version compatibility
**MariaDB 10.6 is MySQL compatible, but:**
- Ensure you're using mysql2 package (already in package.json)
- Check if JSON column type is supported (it is in MariaDB 10.6)

### 3. Manual Connection Test

Test with MySQL client first:
```bash
mysql -h himalia.uberspace.de -u your_username -p your_database
```

If this works, the issue is in the Node.js configuration.
If this fails, the issue is with your database credentials or access.

### 4. Verify Database Schema

After successful connection, check tables exist:
```sql
SHOW TABLES;
DESCRIBE users;
DESCRIBE children;
```

### 5. Check Node.js and Dependencies

```bash
cd backend
node --version  # Should be 16+
npm install     # Ensure all dependencies installed
```

### 6. Test Connection Directly

Create a simple test file:
```javascript
require('dotenv').config();
const mysql = require('mysql2/promise');

mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}).then(conn => {
  console.log('Connected!');
  return conn.end();
}).catch(err => {
  console.error('Error:', err.message);
});
```

## Error Code Reference

| Error Code | Meaning | Solution |
|------------|---------|----------|
| ENOTFOUND | DNS lookup failed | Check DB_HOST value |
| ECONNREFUSED | Connection refused | Check if MySQL is running, verify port |
| ER_ACCESS_DENIED_ERROR | Wrong credentials | Check DB_USER and DB_PASSWORD |
| ER_BAD_DB_ERROR | Database doesn't exist | Create database or check DB_NAME |
| ETIMEDOUT | Connection timeout | Check firewall, network access |

## Need More Help?

Run the debug script and share the output:
```bash
cd backend
node debug-db.js
```

This will show exactly what's missing or wrong with your configuration.
