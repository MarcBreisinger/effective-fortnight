# Slot Occupancy Feature

## Overview
The slot occupancy feature provides visibility into which child is occupying whose slot when children from non-attending groups are given slots. This is an **informational feature only** - it does not change the business logic or enable automatic displacement of children.

## Business Rules (Unchanged)
1. Children with 'attending' status **CANNOT be displaced** - this rule remains in effect
2. Once a child has been assigned to attend, they keep that status regardless of whose slot they might be using
3. The slot tracking is purely for transparency and user understanding

## User Experience

### Parent View
- **Default**: Slot occupancy information is **hidden** (feature is OFF by default)
- **Settings Toggle**: Parents can enable "Show whose slot is being occupied" in their profile settings
- **When Enabled**: Under each child's name in the group lists, parents will see a small caption like:
  - "Using Emma's slot" (in English)
  - "Nutzt den Platz von Emma" (in German)

### Staff View
- Staff members always have access to all information
- The same occupancy information is visible to staff regardless of their personal preference setting

## Database Schema

### New Columns

#### `users` table
```sql
show_slot_occupancy BOOLEAN DEFAULT FALSE
```
- User preference for displaying slot occupancy information
- Default: FALSE (feature hidden by default)

#### `daily_attendance_status` table
```sql
occupied_slot_from_child_id INT DEFAULT NULL
```
- Foreign key reference to `children.id`
- Indicates which child's slot is being used
- NULL if the child is using their own slot or a free slot

### Indexes
```sql
CREATE INDEX idx_occupied_slot ON daily_attendance_status(occupied_slot_from_child_id);
```

## Backend Implementation

### Slot Tracking Logic (`waitingListProcessor.js`)

When assigning a child from waiting list to attend:
1. Query for children from the **target group** who are on waiting list
2. Order by `updated_at ASC` (earliest waiter = whose slot is being taken)
3. Store the first waiting child's ID as `occupied_slot_from_child_id`
4. This creates the relationship: "Child B is using Child A's slot"

**Example Scenario:**
- Group A: 12/12 capacity, Child A on waiting list
- Group B: 11/12 capacity  
- Child B (from Group C) assigned to attend in Group A
- Result: `child_B.occupied_slot_from_child_id = child_A.id`
- Display: "Child B - Using Child A's slot"

### API Updates

#### `GET /api/auth/me`
Returns user profile including:
```json
{
  "showSlotOccupancy": false
}
```

#### `PUT /api/auth/profile`
Accepts `showSlotOccupancy` boolean in request body

#### `GET /api/schedules/date/:date/attendance-details`
Returns children with slot occupancy data:
```json
{
  "id": 123,
  "name": "Child B",
  "occupied_slot_from_child_id": 456,
  "occupied_slot_from_child_name": "Child A"
}
```

## Frontend Implementation

### Settings UI (`ParentSettings.js`)
- Added FormControlLabel with Switch component
- Located in "Display Preferences" section (new section)
- Controlled by `profileForm.showSlotOccupancy` state
- Synced with user profile on load and save

### Main Schedule Display (`MainSchedule.js`)
```jsx
{user?.showSlotOccupancy && child.occupied_slot_from_child_name && (
  <Typography variant="caption" color="text.secondary">
    {t('usingSlotOf').replace('#', child.occupied_slot_from_child_name)}
  </Typography>
)}
```
- Only displays when both conditions are true:
  1. User has enabled the preference
  2. Child has an occupied slot reference

## Translations

### English (`en`)
```javascript
displayPreferences: 'Display Preferences',
showSlotOccupancyLabel: 'Show whose slot is being occupied',
showSlotOccupancyHelp: 'When enabled, you\'ll see which child is using whose yielded slot.',
usingSlotOf: 'Using #\'s slot',
```

### German (`de`)
```javascript
displayPreferences: 'Anzeigeeinstellungen',
showSlotOccupancyLabel: 'Anzeigen, wessen Platz belegt wird',
showSlotOccupancyHelp: 'Wenn aktiviert, sehen Sie, welches Kind wessen abgegebenen Platz nutzt',
usingSlotOf: 'Nutzt den Platz von #',
```

## Deployment

### Database Migration
Run the setup script:
```bash
cd backend/scripts
./setup-slot-occupancy.sh
```

This script:
1. Detects environment (Uberspace vs local)
2. Runs `database/add_slot_occupancy_feature.sql`
3. Adds columns and indexes
4. Reports success/failure

### Application Code
Deploy all files:
- Backend: `routes/auth.js`, `routes/schedules.js`, `utils/waitingListProcessor.js`
- Frontend: `pages/ParentSettings.js`, `pages/MainSchedule.js`, `i18n/translations.js`

## Testing Scenarios

### Scenario 1: Feature Disabled (Default)
1. New user registers
2. Check settings page - toggle is OFF
3. Check main schedule - no occupancy info shown
4. Expected: Clean interface, no additional captions

### Scenario 2: Enable Feature
1. Go to Settings → Display Preferences
2. Toggle "Show whose slot is being occupied" ON
3. Save profile
4. Return to main schedule
5. Expected: See "Using [Name]'s slot" under applicable children

### Scenario 3: Slot Assignment with Tracking
1. Setup: Group A at capacity, Child A on waiting list
2. Child B (Group C) joins waiting list
3. Child C (Group D) gives up slot in Group A
4. Automated assignment: Child B gets the slot
5. Database: `child_B.occupied_slot_from_child_id = child_A.id`
6. Display (if enabled): "Child B - Using Child A's slot"

### Scenario 4: Multiple Languages
1. Enable feature in English
2. Switch to German
3. Expected: "Nutzt den Platz von [Name]" instead of "Using [Name]'s slot"

## Maintenance Notes

### When to Clear `occupied_slot_from_child_id`
- When child returns to their own group
- When the original slot owner gets their slot back
- When status changes to 'slot_given_up' or 'waiting_list'

### Performance Considerations
- Index on `occupied_slot_from_child_id` ensures fast lookups
- LEFT JOIN in attendance query adds minimal overhead
- No impact on users who keep feature disabled

## Future Enhancements
Potential additions (not currently implemented):
1. Historical tracking of slot occupancy changes
2. Statistics on how often slots are shared
3. Notification when "your slot" is being used by someone else
4. Visual indicators on calendar view for occupied slots

## Support

### Common Questions

**Q: Why is the feature off by default?**  
A: To avoid overwhelming users with too much information. Parents can opt-in when they want more detail.

**Q: Does this feature affect who can attend?**  
A: No. It's purely informational. The business logic for slot assignment is unchanged.

**Q: Can staff force someone out of a slot?**  
A: Only by reducing overall capacity. Individual children with 'attending' status cannot be displaced.

**Q: What if I see "Using [Name]'s slot" but that person is attending?**  
A: This shouldn't happen - the tracking clears when children return to their own groups. Report as a bug.

### Troubleshooting

**Issue: Toggle doesn't save**
- Check browser console for API errors
- Verify `show_slot_occupancy` column exists in database
- Check backend logs for PUT /api/auth/profile errors

**Issue: Occupancy info not showing even when enabled**
- Verify user.showSlotOccupancy is true in React DevTools
- Check if child has `occupied_slot_from_child_id` set in database
- Ensure frontend is fetching latest user profile

**Issue: Wrong child name shown**
- Check LEFT JOIN in schedules.js query is correct
- Verify `occupied_slot_from_child_id` references valid child
- Check for orphaned references (deleted children)
