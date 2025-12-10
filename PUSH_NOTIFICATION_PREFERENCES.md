# Push Notification Preferences Feature

## Overview

Parents can now configure which types of push notifications they want to receive. This gives users more control over their notification experience.

## Notification Types

### 1. Slot Lost (`slot_lost`)
- **When triggered**: When a child loses their attendance slot due to capacity reduction
- **Default**: Enabled
- **Example**: "Emma has lost their attendance slot for Dec 12, 2025 due to reduced capacity."

### 2. Slot Assigned (`slot_assigned`)
- **When triggered**: When a child is assigned a slot from the waiting list
- **Default**: Enabled
- **Example**: "Emma has been assigned a slot for Dec 12, 2025."

## Database Changes

### Migration Required

Run the migration script to add the preferences column:

```bash
# On server
ssh marcb@himalia.uberspace.de
cd ~/daycare-app/backend
./scripts/setup-push-notification-preferences.sh

# Or manually
mysql < database/add_push_notification_preferences.sql
```

### Schema Changes

The `push_subscriptions` table now has:
```sql
preferences JSON DEFAULT NULL COMMENT 'Notification preferences: {"slot_lost": true, "slot_assigned": true}'
```

## Backend Changes

### 1. Push Notification Service (`utils/pushNotificationService.js`)

**Enhanced `sendPushNotificationsToUsers()`**:
- Reads `preferences` column from `push_subscriptions`
- Filters subscriptions based on `event` type in payload
- Respects user preferences before sending notifications

**Example**:
```javascript
const payload = {
  title: 'Slot Assigned',
  body: 'Emma has been assigned a slot',
  event: 'slot_assigned'  // This key determines filtering
};

await sendPushNotificationsToUsers([parentId], payload);
```

### 2. Waiting List Processor (`utils/waitingListProcessor.js`)

**New functionality**:
- Sends notifications when children are assigned from waiting list
- Sends notifications when children are restored to their group
- Groups multiple children per parent into one notification
- Supports multi-language notifications (English/German)

### 3. Notifications API (`routes/notifications.js`)

**New endpoints**:

#### `GET /api/notifications/preferences`
Returns current user's notification preferences.

**Response**:
```json
{
  "slot_lost": true,
  "slot_assigned": true
}
```

#### `PUT /api/notifications/preferences`
Updates user's notification preferences.

**Request**:
```json
{
  "slot_lost": true,
  "slot_assigned": false
}
```

**Response**:
```json
{
  "message": "Preferences updated successfully",
  "preferences": {
    "slot_lost": true,
    "slot_assigned": false
  }
}
```

## Frontend Changes

### Parent Settings Page (`pages/ParentSettings.js`)

**New state**:
```javascript
const [notificationPreferences, setNotificationPreferences] = useState({
  slot_lost: true,
  slot_assigned: true,
  loading: false
});
```

**New UI elements**:
- Toggle switches for each notification type
- Displayed only when push notifications are enabled
- Real-time preference updates with optimistic UI

**Functions added**:
- `fetchNotificationPreferences()` - Fetches current preferences
- `handlePreferenceChange(preferenceKey)` - Updates a specific preference

### Translations

**English**:
- `notificationPreferences`: "Notification Types"
- `notifySlotLost`: "Notify when child loses slot"
- `notifySlotAssigned`: "Notify when child is assigned slot"
- `preferencesUpdated`: "Notification preferences updated"
- `failedToUpdatePreferences`: "Failed to update preferences"

**German**:
- `notificationPreferences`: "Benachrichtigungsarten"
- `notifySlotLost`: "Benachrichtigen bei Platzverlust"
- `notifySlotAssigned`: "Benachrichtigen bei Platzzuweisung"
- `preferencesUpdated`: "Benachrichtigungseinstellungen aktualisiert"
- `failedToUpdatePreferences`: "Fehler beim Aktualisieren der Einstellungen"

## User Experience

### Flow

1. **Parent enables push notifications** → Default preferences are set (all enabled)
2. **Parent visits Settings page** → Preferences UI appears below the main toggle
3. **Parent toggles a preference** → Immediate API call with optimistic update
4. **Notification triggers** → Backend checks preferences before sending

### Example Scenarios

#### Scenario 1: Only want slot loss notifications
```
1. Parent enables push notifications
2. Parent disables "Notify when child is assigned slot"
3. Child gets assigned from waiting list → No notification
4. Child loses slot → Notification sent
```

#### Scenario 2: Only want slot assignment notifications
```
1. Parent enables push notifications
2. Parent disables "Notify when child loses slot"
3. Capacity reduced, child loses slot → No notification
4. Child gets assigned from waiting list → Notification sent
```

## Testing

### Manual Testing Steps

1. **Setup**:
   ```bash
   # Apply migration
   ./backend/scripts/setup-push-notification-preferences.sh
   
   # Rebuild and deploy
   ./deploy-to-subdomain.sh
   ```

2. **Test slot assignment notifications**:
   - Create a child in a non-attending group
   - Have parent request slot (child goes to waiting list)
   - Increase capacity or have another child give up slot
   - Verify parent receives notification

3. **Test preference filtering**:
   - Go to parent settings
   - Disable "Notify when child is assigned slot"
   - Trigger slot assignment
   - Verify NO notification is received
   - Enable the preference again
   - Trigger another assignment
   - Verify notification IS received

4. **Test multi-language**:
   - Switch language to German
   - Trigger slot assignment
   - Verify notification is in German

### Database Verification

```sql
-- Check preferences structure
SELECT id, user_id, preferences 
FROM push_subscriptions 
WHERE user_id = YOUR_USER_ID;

-- Should return something like:
-- {"slot_lost": true, "slot_assigned": true}
```

### API Testing

```bash
# Get preferences
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://kitana.marcb.uber.space/api/notifications/preferences

# Update preferences
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slot_lost": true, "slot_assigned": false}' \
  https://kitana.marcb.uber.space/api/notifications/preferences
```

## Deployment

### Steps

1. **Apply database migration**:
   ```bash
   ssh marcb@himalia.uberspace.de
   cd ~/daycare-app/backend
   ./scripts/setup-push-notification-preferences.sh
   ```

2. **Deploy code**:
   ```bash
   ./deploy-to-subdomain.sh
   ```

3. **Verify**:
   - Check that existing subscriptions have default preferences
   - Test new subscription creation
   - Test preference updates
   - Test notification filtering

## Backward Compatibility

- **Existing subscriptions**: Migration sets default preferences (all enabled)
- **Old payload format**: Notifications without `event` field are sent to all users
- **Frontend graceful degradation**: If preferences API fails, toggles are hidden

## Future Enhancements

Potential additional notification types:
- `rotation_changed`: When daily group rotation changes
- `waiting_list_position`: Updates on waiting list position
- `urgency_change`: When urgency level is updated
- `general_announcement`: Staff announcements to all parents
