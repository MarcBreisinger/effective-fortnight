const db = require('./config/database');
const crypto = require('crypto');

function generateRegistrationCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function addChildren() {
  try {
    // Get staff user ID (assuming first staff user)
    const [staff] = await db.query(
      "SELECT id FROM users WHERE role = 'staff' LIMIT 1"
    );
    
    if (staff.length === 0) {
      console.error('No staff user found');
      process.exit(1);
    }
    
    const staffId = staff[0].id;
    const assignedGroup = 'D';
    
    console.log(`Adding children to Group ${assignedGroup}...`);
    
    for (let i = 37; i <= 48; i++) {
      const childName = `Child${i}`;
      
      // Generate unique registration code
      let registrationCode;
      let isUnique = false;
      
      while (!isUnique) {
        registrationCode = generateRegistrationCode();
        const [existing] = await db.query(
          'SELECT id FROM children WHERE registration_code = ?',
          [registrationCode]
        );
        isUnique = existing.length === 0;
      }
      
      // Insert child
      await db.query(
        'INSERT INTO children (name, assigned_group, registration_code, created_by_staff) VALUES (?, ?, ?, ?)',
        [childName, assignedGroup, registrationCode, staffId]
      );
      
      console.log(`✓ Created ${childName} (Group ${assignedGroup}) - Code: ${registrationCode}`);
    }
    
    console.log('\nAll children created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding children:', error);
    process.exit(1);
  }
}

addChildren();
