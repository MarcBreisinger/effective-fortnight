const webpush = require('web-push');
require('dotenv').config();

console.log('='.repeat(60));
console.log('VAPID Configuration Check');
console.log('='.repeat(60));

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

console.log('\n✓ Checking environment variables:');
console.log('  VAPID_PUBLIC_KEY:', vapidPublicKey ? `${vapidPublicKey.substring(0, 20)}...` : '❌ NOT SET');
console.log('  VAPID_PRIVATE_KEY:', vapidPrivateKey ? `${vapidPrivateKey.substring(0, 20)}...` : '❌ NOT SET');
console.log('  VAPID_SUBJECT:', vapidSubject || '❌ NOT SET (will use default)');

if (!vapidPublicKey || !vapidPrivateKey) {
  console.log('\n❌ VAPID keys are not configured!');
  console.log('\nTo fix this:');
  console.log('1. Generate new VAPID keys:');
  console.log('   npx web-push generate-vapid-keys');
  console.log('\n2. Add them to your .env file:');
  console.log('   VAPID_PUBLIC_KEY=<your-public-key>');
  console.log('   VAPID_PRIVATE_KEY=<your-private-key>');
  console.log('   VAPID_SUBJECT=mailto:your-email@example.com');
  console.log('\n3. Restart the server');
  console.log('\n4. Clear browser subscriptions and re-subscribe');
  process.exit(1);
}

try {
  webpush.setVapidDetails(
    vapidSubject || 'mailto:admin@daycare.example.com',
    vapidPublicKey,
    vapidPrivateKey
  );
  console.log('\n✓ VAPID configuration is valid!');
  console.log('\nNext steps:');
  console.log('1. Restart the backend server to apply these settings');
  console.log('2. In the app, go to Settings and toggle notifications OFF then ON');
  console.log('3. This will create a new subscription with the correct VAPID keys');
  console.log('='.repeat(60));
} catch (error) {
  console.log('\n❌ VAPID configuration error:', error.message);
  console.log('\nThe keys may be invalid. Generate new ones with:');
  console.log('   npx web-push generate-vapid-keys');
  process.exit(1);
}
