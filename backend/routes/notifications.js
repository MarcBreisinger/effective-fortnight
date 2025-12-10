const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  saveSubscription, 
  removeSubscription, 
  getVapidPublicKey 
} = require('../utils/pushNotificationService');

/**
 * GET /api/notifications/vapid-public-key
 * Get VAPID public key for client-side subscription
 */
router.get('/vapid-public-key', authenticateToken, (req, res) => {
  const publicKey = getVapidPublicKey();
  
  if (!publicKey) {
    return res.status(503).json({ 
      error: 'Push notifications not configured on server' 
    });
  }
  
  res.json({ publicKey });
});

/**
 * POST /api/notifications/subscribe
 * Subscribe to push notifications
 * Body: { subscription: { endpoint, keys: { p256dh, auth } } }
 */
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription } = req.body;
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ 
        error: 'Invalid subscription object' 
      });
    }

    const success = await saveSubscription(req.user.id, subscription);
    
    if (success) {
      res.json({ 
        message: 'Subscription saved successfully',
        success: true 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to save subscription' 
      });
    }
  } catch (error) {
    console.error('[Notifications API] Error subscribing:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe from push notifications
 * Body: { endpoint: string }
 */
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ 
        error: 'Endpoint is required' 
      });
    }

    const success = await removeSubscription(req.user.id, endpoint);
    
    if (success) {
      res.json({ 
        message: 'Subscription removed successfully',
        success: true 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to remove subscription' 
      });
    }
  } catch (error) {
    console.error('[Notifications API] Error unsubscribing:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

/**
 * GET /api/notifications/preferences
 * Get notification preferences for current user
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const db = require('../config/database');
    const [subscriptions] = await db.query(
      'SELECT preferences FROM push_subscriptions WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (subscriptions.length === 0) {
      // Return default preferences if no subscription exists
      return res.json({
        slot_lost: true,
        slot_assigned: true
      });
    }

    let preferences = { slot_lost: true, slot_assigned: true };
    if (subscriptions[0].preferences) {
      try {
        preferences = typeof subscriptions[0].preferences === 'string'
          ? JSON.parse(subscriptions[0].preferences)
          : subscriptions[0].preferences;
      } catch (e) {
        console.error('[Notifications API] Error parsing preferences:', e);
      }
    }

    res.json(preferences);
  } catch (error) {
    console.error('[Notifications API] Error fetching preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences for current user
 * Body: { slot_lost: boolean, slot_assigned: boolean }
 */
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { slot_lost, slot_assigned } = req.body;

    // Validate preferences
    if (typeof slot_lost !== 'boolean' || typeof slot_assigned !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid preferences. Both slot_lost and slot_assigned must be boolean values.'
      });
    }

    const preferences = { slot_lost, slot_assigned };
    const db = require('../config/database');

    // Update all subscriptions for this user
    await db.query(
      'UPDATE push_subscriptions SET preferences = ? WHERE user_id = ?',
      [JSON.stringify(preferences), req.user.id]
    );

    res.json({
      message: 'Preferences updated successfully',
      preferences
    });
  } catch (error) {
    console.error('[Notifications API] Error updating preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
