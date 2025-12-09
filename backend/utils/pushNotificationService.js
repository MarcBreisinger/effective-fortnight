const webpush = require('web-push');
const db = require('../config/database');

// Configure web-push with VAPID keys from environment variables
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@daycare.example.com';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('[Push Notifications] VAPID keys not configured. Push notifications will not work.');
  console.error('[Push Notifications] Generate keys with: npx web-push generate-vapid-keys');
  console.error('[Push Notifications] Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to .env file');
  console.error('[Push Notifications] Current VAPID_PUBLIC_KEY exists:', !!vapidPublicKey);
  console.error('[Push Notifications] Current VAPID_PRIVATE_KEY exists:', !!vapidPrivateKey);
} else {
  console.log('[Push Notifications] VAPID keys configured successfully');
  console.log('[Push Notifications] VAPID subject:', vapidSubject);
  console.log('[Push Notifications] VAPID public key length:', vapidPublicKey.length);
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

/**
 * Send push notification to a single subscription
 * @param {Object} subscription - Push subscription object
 * @param {Object} payload - Notification payload
 * @returns {Promise<boolean>} - Success status
 */
async function sendPushNotification(subscription, payload) {
  try {
    console.log('[Push] Sending notification to endpoint:', subscription.endpoint.substring(0, 50) + '...');
    console.log('[Push] Payload:', JSON.stringify(payload).substring(0, 100) + '...');
    
    const result = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    console.log('[Push] Notification sent successfully:', result.statusCode);
    return true;
  } catch (error) {
    console.error('[Push] Error sending notification:');
    console.error('[Push]   Status Code:', error.statusCode);
    console.error('[Push]   Error Body:', error.body);
    console.error('[Push]   Endpoint:', subscription.endpoint.substring(0, 50) + '...');
    
    // Handle 401 Unauthorized - VAPID configuration issue
    if (error.statusCode === 401) {
      console.error('[Push] 401 Unauthorized - Check VAPID keys configuration');
      console.error('[Push] VAPID keys set:', !!vapidPublicKey && !!vapidPrivateKey);
      console.error('[Push] This may be caused by:');
      console.error('[Push]   1. Missing or incorrect VAPID keys in .env');
      console.error('[Push]   2. VAPID keys not matching the subscription');
      console.error('[Push]   3. Browser/client using different VAPID key than server');
    }
    
    // Handle subscription expiration/invalidation
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('[Push] Subscription expired or invalid, removing from database');
      await removeExpiredSubscription(subscription.endpoint);
    }
    
    return false;
  }
}

/**
 * Send push notifications to multiple users
 * @param {Array<number>} userIds - Array of user IDs to notify
 * @param {Object} payload - Notification payload
 * @returns {Promise<Object>} - Results summary
 */
async function sendPushNotificationsToUsers(userIds, payload) {
  if (!userIds || userIds.length === 0) {
    return { success: 0, failed: 0, total: 0 };
  }

  // Fetch all subscriptions for these users
  const [subscriptions] = await db.query(
    `SELECT id, user_id, endpoint, p256dh_key, auth_key 
     FROM push_subscriptions 
     WHERE user_id IN (?)`,
    [userIds]
  );

  if (subscriptions.length === 0) {
    console.log('[Push] No subscriptions found for users:', userIds);
    return { success: 0, failed: 0, total: 0 };
  }

  console.log(`[Push] Sending notifications to ${subscriptions.length} subscription(s)`);

  // Send notifications to all subscriptions in parallel
  const results = await Promise.allSettled(
    subscriptions.map(sub => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh_key,
          auth: sub.auth_key
        }
      };
      return sendPushNotification(pushSubscription, payload);
    })
  );

  // Count successes and failures
  const summary = {
    success: results.filter(r => r.status === 'fulfilled' && r.value === true).length,
    failed: results.filter(r => r.status === 'rejected' || r.value === false).length,
    total: results.length
  };

  console.log('[Push] Notification results:', summary);
  return summary;
}

/**
 * Remove expired subscription from database
 * @param {string} endpoint - Subscription endpoint
 */
async function removeExpiredSubscription(endpoint) {
  try {
    await db.query(
      'DELETE FROM push_subscriptions WHERE endpoint = ?',
      [endpoint]
    );
    console.log('[Push] Removed expired subscription');
  } catch (error) {
    console.error('[Push] Error removing expired subscription:', error);
  }
}

/**
 * Save push subscription to database
 * @param {number} userId - User ID
 * @param {Object} subscription - Push subscription object
 * @returns {Promise<boolean>} - Success status
 */
async function saveSubscription(userId, subscription) {
  try {
    // Check if subscription already exists
    const [existing] = await db.query(
      'SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [userId, subscription.endpoint]
    );

    if (existing.length > 0) {
      // Update existing subscription
      await db.query(
        `UPDATE push_subscriptions 
         SET p256dh_key = ?, auth_key = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND endpoint = ?`,
        [subscription.keys.p256dh, subscription.keys.auth, userId, subscription.endpoint]
      );
      console.log('[Push] Updated existing subscription for user:', userId);
    } else {
      // Insert new subscription
      await db.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
         VALUES (?, ?, ?, ?)`,
        [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
      );
      console.log('[Push] Saved new subscription for user:', userId);
    }
    
    return true;
  } catch (error) {
    console.error('[Push] Error saving subscription:', error);
    return false;
  }
}

/**
 * Remove push subscription from database
 * @param {number} userId - User ID
 * @param {string} endpoint - Subscription endpoint
 * @returns {Promise<boolean>} - Success status
 */
async function removeSubscription(userId, endpoint) {
  try {
    await db.query(
      'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [userId, endpoint]
    );
    console.log('[Push] Removed subscription for user:', userId);
    return true;
  } catch (error) {
    console.error('[Push] Error removing subscription:', error);
    return false;
  }
}

/**
 * Get VAPID public key for client-side subscription
 * @returns {string} - VAPID public key
 */
function getVapidPublicKey() {
  return vapidPublicKey;
}

module.exports = {
  sendPushNotification,
  sendPushNotificationsToUsers,
  saveSubscription,
  removeSubscription,
  getVapidPublicKey
};
