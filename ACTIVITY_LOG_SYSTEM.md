# Activity Log System

## Overview
The activity log system provides a persistent, immutable record of all actions taken in the day-care system. Unlike the previous implementation that queried current database state, this system logs every action to a dedicated `activity_log` table, ensuring a complete historical record.

## Database Schema

### activity_log Table
```sql
CREATE TABLE activity_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_type VARCHAR(50) NOT NULL,
  event_date DATE NOT NULL,
  child_id INT NULL,
  user_id INT NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_date (event_date),
  INDEX idx_child_id (child_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
```

## Event Types

### Parent Actions
- **`slot_given_up`** - Parent gives up their child's slot for the day
- **`slot_reclaimed`** - Parent reclaims slot (changes status back to attending)
- **`waiting_list_joined`** - Parent joins waiting list
- **`waiting_list_removed`** - Parent removes child from waiting list

### Automated System Actions
- **`auto_assigned`** - System automatically assigns slot from waiting list
- **`restored_from_waiting`** - Child restored from waiting list when their group becomes available again
- **`displaced_to_waiting`** - Child moved to waiting list due to capacity reduction

### Staff Actions
- **`capacity_changed`** - Staff changes daily capacity limit
- **`rotation_changed`** - Staff changes group rotation order

## Metadata Structure

Each event type stores relevant context in the `metadata` JSON field:

### Parent/System Actions (with child)
```json
{
  "child_name": "Emma Schmidt",
  "group": "A",
  "parent_message": "Optional message from parent",
  "status": "slot_given_up|waiting_list|attending"
}
```

### Auto-assignment
```json
{
  "child_name": "Tom Jones",
  "group": "C",
  "assigned_to_group": "B",
  "reason": "slot_freed_up"
}
```

### Capacity Change
```json
{
  "old_capacity": 4,
  "new_capacity": 3,
  "attending_groups": ["A", "B", "C"]
}
```

### Rotation Change
```json
{
  "old_order": ["A", "B", "C", "D"],
  "new_order": ["B", "C", "D", "A"],
  "attending_groups": ["B", "C", "D"]
}
```

## User Attribution

### Regular Users
- Parent actions: `user_id` = parent's ID
- Staff actions: `user_id` = staff member's ID

### System User (ID = 1)
Automated actions performed by the waiting list processor use a special system user:
```sql
INSERT INTO users (id, email, first_name, last_name, role)
VALUES (1, 'system@daycare.local', 'System', 'Automated', 'staff');
```

## API Endpoints

### GET /api/activity/date/:date
Retrieves all activity log entries for a specific date.

**Response:**
```json
{
  "date": "2025-12-01",
  "events": [
    {
      "id": "activity_42",
      "event_type": "slot_given_up",
      "child_id": 5,
      "child_name": "Emma Schmidt",
      "user_name": "Sarah Johnson",
      "created_at": "2025-12-01T14:32:15.000Z",
      "metadata": {
        "child_name": "Emma Schmidt",
        "group": "A",
        "parent_message": "Sick today"
      }
    },
    {
      "id": "activity_43",
      "event_type": "auto_assigned",
      "child_id": 12,
      "child_name": "Tom Jones",
      "user_name": "System Automated",
      "created_at": "2025-12-01T14:32:20.000Z",
      "metadata": {
        "child_name": "Tom Jones",
        "group": "C",
        "assigned_to_group": "A"
      }
    }
  ],
  "count": 2
}
```

## Logging Points

### 1. Attendance Route (`backend/routes/attendance.js`)
Logs when parents:
- Give up slots
- Reclaim slots (change to attending)
- Join waiting list
- Remove from waiting list

### 2. Waiting List Processor (`backend/utils/waitingListProcessor.js`)
Logs automated actions:
- Auto-assignment from waiting list
- Restoration when group becomes available

### 3. Schedules Route (`backend/routes/schedules.js`)
Logs when staff:
- Changes capacity limit
- Changes rotation order

## Setup Instructions

### 1. Create Database Table
```bash
cd backend
./scripts/setup-activity-log.sh
```

This script:
- Creates the `activity_log` table
- Creates the system user (ID = 1) for automated actions

### 2. Deploy Changes
```bash
./deploy-to-subdomain.sh
```

## Benefits Over Previous Implementation

### Problem with Old System
The old activity log queried `daily_attendance_status` and `daily_schedules` tables, showing only the **current state**. When a parent gave up a slot and then reclaimed it, the database entry was deleted, **losing the history** of both actions.

### Solution with New System
- **Immutable Log**: Every action is permanently recorded
- **Complete History**: See all state changes, even if later reversed
- **Better Auditing**: Track who did what and when
- **System Attribution**: Distinguish between user actions and automated system behavior

### Example Scenario
**Old System:**
1. Parent gives up slot → entry in `daily_attendance_status`
2. Parent reclaims slot → entry deleted
3. Activity log shows: *nothing* (history lost)

**New System:**
1. Parent gives up slot → entry logged to `activity_log`
2. Parent reclaims slot → new entry logged to `activity_log`
3. Activity log shows:
   - `14:32:15 - Sarah Johnson gave up slot for Emma`
   - `15:45:30 - Sarah Johnson reclaimed slot for Emma`

## Frontend Integration

The ActivityLog component automatically displays entries from the persistent log:

```javascript
// Polls every 10 seconds for updates
const fetchActivities = useCallback(async () => {
  const response = await activityAPI.getByDate(dateStr);
  setActivities(response.data.events || []);
}, [selectedDate]);
```

Entries are formatted as: `HH:mm:ss - user performed action`

## Maintenance

### Archiving Old Logs
Consider periodically archiving logs older than 1 year:

```sql
-- Create archive table
CREATE TABLE activity_log_archive LIKE activity_log;

-- Move old records
INSERT INTO activity_log_archive 
SELECT * FROM activity_log 
WHERE event_date < DATE_SUB(CURDATE(), INTERVAL 1 YEAR);

DELETE FROM activity_log 
WHERE event_date < DATE_SUB(CURDATE(), INTERVAL 1 YEAR);
```

### Monitoring Log Growth
Check table size:
```sql
SELECT 
  COUNT(*) as total_entries,
  COUNT(DISTINCT event_date) as days_covered,
  MIN(event_date) as oldest_entry,
  MAX(event_date) as newest_entry
FROM activity_log;
```
