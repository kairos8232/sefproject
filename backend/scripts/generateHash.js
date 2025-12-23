const bcrypt = require('bcryptjs');

// Generate password hash for testing
// Usage: node scripts/generateHash.js

const password = 'password123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }
  
  console.log('\n=================================');
  console.log('Password Hash Generator');
  console.log('=================================');
  console.log('Password:', password);
  console.log('Salt Rounds:', saltRounds);
  console.log('\nGenerated Hash:');
  console.log(hash);
  console.log('\nCopy this hash and use it in your SQL INSERT statements');
  console.log('=================================\n');
});
