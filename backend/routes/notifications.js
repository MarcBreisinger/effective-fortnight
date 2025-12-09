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

module.exports = router;
