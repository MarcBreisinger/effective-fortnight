// Generate bcryptjs hash for initial staff password
const bcrypt = require('bcryptjs');

const password = '048204';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }
  
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nSQL Statement:');
  console.log(`INSERT INTO users (email, password, first_name, last_name, role)`);
  console.log(`VALUES ('staff@daycare.local', '${hash}', 'Admin', 'Staff', 'staff')`);
  console.log(`ON DUPLICATE KEY UPDATE email=email;`);
});
