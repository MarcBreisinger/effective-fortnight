# Push Notifications Setup Guide

This document provides step-by-step instructions to complete the push notifications setup for Kitana.

## Overview

Push notifications have been implemented to alert parents on mobile devices when their children lose attendance slots due to capacity reductions. The implementation includes:

- ✅ PWA manifest for iOS compatibility
- ✅ Service worker for background push handling
- ✅ Backend push notification service with error handling
- ✅ Secure API endpoints with authentication
- ✅ User interface in parent settings
- ✅ Automatic notifications on capacity reduction
- ✅ Rate limiting and subscription cleanup

## Required Configuration Steps

### 1. Database Setup

Run the database migration to create the `push_subscriptions` table:

```bash
cd backend
./scripts/setup-push-notifications.sh
```

Or manually execute:

```bash
mysql -h himalia.uberspace.de -u <your_db_user> -p <your_db_name> < database/add_push_subscriptions.sql
```

### 2. VAPID Keys Configuration

VAPID keys have already been generated. Add them to your `.env` file:

```env
# Push Notifications VAPID Keys
VAPID_PUBLIC_KEY=BFxQokm9d_8vI6U0kCqYdh7TJ2HhodpMT-Fi6BHdRfej5_HCriIo_BZHZgLt1iX3FTErBSBb3neH6SV3J86gd28
VAPID_PRIVATE_KEY=Sj4ei0v6fuxHmurYvVNMUSvY0OO5mclaz2r_K8WimR4
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

**IMPORTANT:** 
- Update `VAPID_SUBJECT` with your actual admin email
- Never commit these keys to version control
- Keep `VAPID_PRIVATE_KEY` secure

### 3. Create App Icons

The PWA manifest requires app icons. Create two PNG icons:

- `frontend/public/icon-192.png` (192x192 pixels)
- `frontend/public/icon-512.png` (512x512 pixels)

These icons will be used for:
- PWA installation on home screen
- Push notification badges
- App icon when installed

### 4. Update Service Worker in Production

The service worker needs to be accessible at the root level in production. Update your deployment scripts to ensure `service-worker.js` is copied to the build output.

### 5. Test the Implementation

#### Testing Push Notifications:

1. **Start the backend server:**
   ```bash
   cd backend
   npm start
   ```

2. **Start the frontend development server:**
   ```bash
   cd frontend
   npm start
   ```

3. **Enable notifications as a parent user:**
   - Log in as a parent
   - Navigate to Settings
   - Toggle "Enable push notifications"
   - Grant browser permission when prompted

4. **Trigger a test notification:**
   - Log in as staff on another browser/tab
   - Reduce capacity so a child loses their slot
   - Parent should receive a push notification

#### Testing on iOS:

1. Open the app in Safari on iOS
2. Tap the Share button
3. Select "Add to Home Screen"
4. Open the installed PWA
5. Enable notifications in settings

## Architecture Details

### Backend Components

- **`utils/pushNotificationService.js`**: Core service for sending notifications
  - Uses `web-push` library for Web Push Protocol
  - Automatic cleanup of expired subscriptions
  - Batch notification sending with error handling
  - VAPID authentication

- **`routes/notifications.js`**: API endpoints
  - `GET /api/notifications/vapid-public-key`: Get public key for subscription
  - `POST /api/notifications/subscribe`: Save push subscription
  - `POST /api/notifications/unsubscribe`: Remove push subscription
  - All endpoints require authentication

- **`routes/schedules.js`**: Capacity change handler
  - Detects displaced children when capacity reduces
  - Sends push notifications to affected parents
  - Includes child details and date in notification

- **`database/push_subscriptions` table**: 
  - Stores user push subscriptions
  - Foreign key to users table with CASCADE delete
  - Indexed by user_id for efficient lookups

### Frontend Components

- **`public/service-worker.js`**: Background push handler
  - Receives push notifications
  - Displays notifications with custom styling
  - Handles notification click to open app

- **`public/manifest.json`**: PWA configuration
  - App metadata for installation
  - Icons and theme colors
  - Display mode settings

- **`services/notificationService.js`**: Client-side helper
  - Push subscription management
  - Permission requests
  - iOS/PWA detection
  - VAPID key conversion

- **`pages/ParentSettings.js`**: UI controls
  - Enable/disable notifications toggle
  - Permission status display
  - iOS installation instructions
  - Error handling and feedback

### Security Features

1. **Authentication**: All API endpoints require valid JWT token
2. **User isolation**: Parents can only subscribe their own account
3. **VAPID authentication**: Prevents unauthorized push sending
4. **Automatic cleanup**: Invalid subscriptions are removed automatically
5. **Error handling**: Failures don't expose sensitive information

### Rate Limiting Considerations

The current implementation sends notifications immediately. For production with many users, consider:

- Adding rate limiting middleware to notification endpoints
- Implementing notification batching/queuing
- Setting up retry logic with exponential backoff
- Monitoring notification delivery rates

## Browser Compatibility

### Supported Browsers:

- ✅ Chrome 50+ (desktop and Android)
- ✅ Firefox 44+ (desktop and Android)
- ✅ Edge 17+
- ✅ Safari 16+ (macOS, requires user interaction)
- ✅ Safari iOS 16.4+ (requires PWA installation)

### Unsupported:

- ❌ Internet Explorer
- ❌ Safari iOS < 16.4
- ❌ Safari macOS < 16

The app gracefully handles unsupported browsers by showing an informative message.

## Troubleshooting

### 401 Unauthorized Error (Most Common Issue):

**Error:** `Authorization header must be specified: unauthenticated`

**Cause:** VAPID keys not configured or subscription created before keys were set

**Solution:**

1. **Verify VAPID keys are in `.env` file:**
   ```bash
   cd backend
   node scripts/verify-vapid-config.js
   ```

2. **If keys are missing, add them to `.env`:**
   ```env
   VAPID_PUBLIC_KEY=BFxQokm9d_8vI6U0kCqYdh7TJ2HhodpMT-Fi6BHdRfej5_HCriIo_BZHZgLt1iX3FTErBSBb3neH6SV3J86gd28
   VAPID_PRIVATE_KEY=Sj4ei0v6fuxHmurYvVNMUSvY0OO5mclaz2r_K8WimR4
   VAPID_SUBJECT=mailto:admin@yourdomain.com
   ```

3. **Restart the backend server** (CRITICAL):
   ```bash
   # Stop the server (Ctrl+C)
   npm start
   ```

4. **Clear old subscriptions in the browser:**
   - Open the app
   - Go to Settings
   - Toggle notifications **OFF** (this removes old subscription)
   - Toggle notifications **ON** (this creates new subscription with correct VAPID keys)

5. **Test again:** Reduce capacity as staff to trigger a notification

### Notifications not appearing:

1. **Check browser permissions:**
   - Browser settings → Site permissions → Notifications
   - Ensure the site has notification permission

2. **Verify service worker registration:**
   - Open DevTools → Application → Service Workers
   - Service worker should be "activated and running"

3. **Check VAPID keys:**
   - Run: `node backend/scripts/verify-vapid-config.js`
   - Restart backend server after adding keys

4. **Inspect subscription:**
   - DevTools → Application → Storage → IndexedDB
   - Check PushManager subscription exists

### iOS not working:

1. **Verify PWA installation:**
   - Must be installed via "Add to Home Screen"
   - Check `isInstalledPWA()` returns true

2. **iOS version:**
   - Requires iOS 16.4 or later
   - Check Safari version

3. **Notification permissions:**
   - iOS Settings → [App Name] → Notifications
   - Ensure "Allow Notifications" is enabled

### Database errors:

1. **Check table exists:**
   ```sql
   SHOW TABLES LIKE 'push_subscriptions';
   ```

2. **Verify foreign key:**
   ```sql
   SHOW CREATE TABLE push_subscriptions;
   ```

## Monitoring and Maintenance

### Logging

The system logs notification activity:

- `[Push] Notification sent successfully`: Individual send confirmation
- `[Push] Notification results:`: Batch send summary
- `[Push] Subscription expired or invalid`: Cleanup trigger
- `[Schedules] Sent slot loss notifications`: Capacity reduction trigger

### Metrics to Monitor

1. **Subscription count:**
   ```sql
   SELECT COUNT(*) FROM push_subscriptions;
   ```

2. **Notifications sent (from logs)**

3. **Failed subscriptions:**
   - Monitor logs for 410 Gone or 404 errors
   - High failure rate indicates subscription issues

4. **User feedback:**
   - Track user reports of missing notifications
   - Monitor notification delivery delays

### Database Maintenance

Periodically clean up orphaned subscriptions:

```sql
-- Find subscriptions for deleted users
SELECT ps.* FROM push_subscriptions ps
LEFT JOIN users u ON ps.user_id = u.id
WHERE u.id IS NULL;

-- These should be auto-deleted by CASCADE, but verify
```

## Future Enhancements

Potential improvements:

1. **Notification preferences:**
   - Allow users to choose notification types
   - Quiet hours settings
   - Notification frequency limits

2. **Additional triggers:**
   - Notify when moved from waiting list
   - Remind before attendance day
   - Staff emergency announcements

3. **Rich notifications:**
   - Include child avatar images
   - Action buttons (View Schedule, Dismiss)
   - Inline replies for messages

4. **Analytics:**
   - Track notification open rates
   - A/B test notification content
   - Measure user engagement

5. **Multi-device support:**
   - Allow multiple subscriptions per user
   - Sync notification state across devices

## Support and Documentation

- Web Push Protocol: https://web.dev/push-notifications-overview/
- Service Workers: https://developers.google.com/web/fundamentals/primers/service-workers
- web-push library: https://github.com/web-push-libs/web-push
- PWA on iOS: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
