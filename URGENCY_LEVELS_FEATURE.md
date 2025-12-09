# Two-Tier Waiting List Priority Feature

## Overview
The two-tier urgency system allows parents to indicate whether their daycare slot request is urgent or flexible. Urgent requests are prioritized in the waiting list queue while maintaining FIFO (First-In-First-Out) ordering within each priority tier.

## Business Rules

### Priority System
1. **Urgent Requests** (🔥): Processed before flexible requests, regardless of timestamp
2. **Flexible Requests** (⭐): Processed after all urgent requests, maintaining FIFO order
3. **Within Each Tier**: Maintains strict FIFO ordering based on `updated_at` timestamp
4. **Default Behavior**: If no urgency level specified, defaults to 'urgent' (preserves existing behavior)

### Queue Processing Order
```
Priority 1: Urgent requests (ordered by timestamp ASC)
  - Child A (urgent, 10:00)
  - Child B (urgent, 10:15)
Priority 2: Flexible requests (ordered by timestamp ASC)
  - Child C (flexible, 09:45)  ← requested earlier but processed after urgent
  - Child D (flexible, 10:30)
```

## User Experience

### Parent View - Two Button Options

When a child's group is not attending and they need a slot:

**Option 1: Urgent Request (Red Button with 🔥)**
- Button Text: "[Child Name] needs a day care spot today urgently"
- Tooltip: "Your request will be prioritized in the waiting list"
- Color: Red (error)
- Icon: 🔥 (fire emoji)

**Option 2: Flexible Request (Blue Button with ⭐)**
- Button Text: "[Child Name] would be happy about a day care spot today"
- Tooltip: "Your request will be processed after urgent requests"
- Color: Blue (primary)
- Icon: ⭐ (star emoji)

### Waiting List Display

Both parents and staff see urgency indicators:
- **Icon prefix**: 🔥 for urgent, ⭐ for flexible
- **Label in timestamp**: Shows "(urgent)" or "(flexible)" next to the added time
- **Sort order**: Urgent requests appear first, then flexible

Example display:
```
Waiting List - Children Waiting for Slots

🔥 Emma Schmidt (Group D)
   Added at 10:00:00 by Anna Schmidt (urgent)

🔥 Max Mueller (Group C)
   Added at 10:15:30 by Peter Mueller (urgent)

⭐ Sophie Klein (Group D)
   Added at 09:45:00 by Maria Klein (flexible)
```

## Database Schema

### Column Added to `daily_attendance_status`
```sql
urgency_level ENUM('urgent', 'flexible') DEFAULT 'urgent' NOT NULL
```

### Index Created
```sql
CREATE INDEX idx_urgency_timestamp 
ON daily_attendance_status(urgency_level DESC, updated_at ASC);
```

**Index Purpose**: Optimizes the common query pattern of sorting by urgency (descending, urgent=higher value) then timestamp (ascending, FIFO)

## Backend Implementation

### Modified Files

#### 1. `backend/utils/waitingListProcessor.js`
**Changes:**
- Added `urgency_level` to SELECT queries
- Updated ORDER BY: `urgency_level DESC, updated_at ASC`
- Included urgency_level in activity log metadata

**Key Query:**
```javascript
ORDER BY das.urgency_level DESC, das.updated_at ASC
```

#### 2. `backend/routes/attendance.js`
**Changes:**
- Added `urgencyLevel` parameter validation (optional, defaults to 'urgent')
- Stores `urgency_level` in INSERT and UPDATE queries
- Includes urgency_level in activity log metadata
- Updated `/waiting-list/date/:date` endpoint to return urgency_level

**API Changes:**
```javascript
// Request body now accepts:
{
  status: 'waiting_list',
  parentMessage: 'optional message',
  urgencyLevel: 'urgent' | 'flexible'  // new field
}
```

## Frontend Implementation

### Modified Files

#### 1. `frontend/src/components/AttendanceStatusCard.js`
**Changes:**
- Added `Tooltip` and `Stack` imports from Material-UI
- Added `urgencyLevel` state variable
- Updated `handleOpenDialog` to accept urgency parameter
- Replaced single button with two conditional buttons (urgent + flexible)
- Added startIcon prop with emoji icons (🔥 and ⭐)
- Each button wrapped in Tooltip component

**Button Rendering Logic:**
```jsx
{buttonAction === 'waiting_list' ? (
  <Stack spacing={1}>
    <Tooltip title={t('urgentRequestTooltip')}>
      <Button color="error" startIcon={🔥} onClick={() => handleOpenDialog('waiting_list', 'urgent')}>
        {needsDayCareSportUrgent}
      </Button>
    </Tooltip>
    <Tooltip title={t('flexibleRequestTooltip')}>
      <Button color="primary" startIcon={⭐} onClick={() => handleOpenDialog('waiting_list', 'flexible')}>
        {wouldLikeDayCareSport}
      </Button>
    </Tooltip>
  </Stack>
) : (
  // Single button for other actions (give up slot, remove from waiting list)
)}
```

#### 2. `frontend/src/services/api.js`
**Changes:**
- Updated `updateStatus` function signature to accept `urgencyLevel` parameter
- Sends urgencyLevel in POST body

#### 3. `frontend/src/pages/MainSchedule.js`
**Changes:**
- Added urgency emoji prefix (🔥 or ⭐) to child names in waiting list
- Added urgency label in timestamp line: "(urgent)" or "(flexible)"

#### 4. `frontend/src/i18n/translations.js`
**Added Translations:**

**English:**
```javascript
needsDayCareSportUrgent: '# needs a day care spot today urgently',
wouldLikeDayCareSport: '# would be happy about a day care spot today',
urgentRequestTooltip: 'Your request will be prioritized in the waiting list',
flexibleRequestTooltip: 'Your request will be processed after urgent requests',
urgentRequest: 'urgent',
flexibleRequest: 'flexible',
```

**German:**
```javascript
needsDayCareSportUrgent: '# braucht heute dringend einen Kita-Platz',
wouldLikeDayCareSport: '# würde sich über einen Kita-Platz heute freuen',
urgentRequestTooltip: 'Ihre Anfrage wird auf der Warteliste priorisiert',
flexibleRequestTooltip: 'Ihre Anfrage wird nach dringenden Anfragen bearbeitet',
urgentRequest: 'dringend',
flexibleRequest: 'flexibel',
```

## Deployment

### Local Development
```bash
# 1. Run database migration
cd backend/scripts
mysql -h 127.0.0.1 -P 3307 -u marcb -p marcb_notbetreuung < ../database/add_urgency_levels.sql

# 2. Verify column added
mysql -h 127.0.0.1 -P 3307 -u marcb -p marcb_notbetreuung -e "SHOW COLUMNS FROM daily_attendance_status LIKE 'urgency%';"

# 3. Rebuild frontend
cd frontend
npm run build

# 4. Restart backend
cd backend
npm run dev
```

### Production (Uberspace)
```bash
# 1. Deploy code
./deploy-to-subdomain.sh

# 2. Run database migration on production
ssh [your-uberspace]
cd ~/effective-fortnight/backend
mysql marcb_notbetreuung < database/add_urgency_levels.sql

# 3. Restart service
supervisorctl restart daycare-app
```

## Testing Scenarios

### Scenario 1: Urgent vs Flexible Priority
**Setup:**
- Group A, B, C attending (capacity: 3 groups)
- All at capacity
- No slots available

**Test Steps:**
1. Parent A clicks flexible button for Child A at 10:00
2. Parent B clicks urgent button for Child B at 10:15
3. Staff increases capacity to 4 groups (opens one slot)

**Expected Result:**
- ✅ Child B (urgent, 10:15) gets assigned first
- ✅ Child A (flexible, 10:00) remains on waiting list
- ✅ Child A gets next available slot

**Verification Query:**
```sql
SELECT c.name, das.urgency_level, das.updated_at, das.status
FROM daily_attendance_status das
JOIN children c ON das.child_id = c.id
WHERE das.attendance_date = CURDATE()
ORDER BY das.urgency_level DESC, das.updated_at ASC;
```

### Scenario 2: FIFO Within Urgent Tier
**Setup:**
- All urgent requests
- Multiple children on waiting list

**Test Steps:**
1. Child A - urgent at 10:00
2. Child B - urgent at 10:15
3. Child C - urgent at 10:30
4. Slot becomes available

**Expected Result:**
- ✅ Child A gets slot (earliest urgent request)
- ✅ Child B and C remain in order

### Scenario 3: Mixed Priority Queue
**Setup:**
- Waiting list with mix of urgent and flexible

**Test Steps:**
1. Child A - flexible at 09:00
2. Child B - urgent at 10:00
3. Child C - flexible at 10:30
4. Child D - urgent at 11:00
5. Two slots become available

**Expected Result:**
- ✅ Slot 1: Child B (urgent, 10:00)
- ✅ Slot 2: Child D (urgent, 11:00)
- ✅ Remaining: Child A (flexible, 09:00), Child C (flexible, 10:30)

### Scenario 4: Button UI Display
**Test Steps:**
1. Parent logs in
2. Child's group not attending
3. View child status card

**Expected Result:**
- ✅ Two buttons displayed vertically
- ✅ Top button: Red with 🔥 icon "needs spot urgently"
- ✅ Bottom button: Blue with ⭐ icon "would be happy"
- ✅ Hovering shows appropriate tooltips
- ✅ Both buttons functional and create correct status

### Scenario 5: Waiting List Visual Indicators
**Test Steps:**
1. Create mix of urgent and flexible waiting list entries
2. View main schedule page

**Expected Result:**
- ✅ Urgent entries show 🔥 prefix
- ✅ Flexible entries show ⭐ prefix
- ✅ Timestamp shows "(urgent)" or "(flexible)" label
- ✅ List sorted by urgency then timestamp

## Testing Strategy

### Automated Tests
- ✅ Backend API: 10 tests validating urgencyLevel parameter handling
- ✅ Waiting List Processor: 1 test validating query structure and sorting
- ✅ Activity Log Display: 14 tests validating urgency indicators (🔥/⭐)

### Manual/E2E Testing (see Testing Scenarios section)
- UI button rendering and styling
- Tooltip display and content
- Two-button interaction flow
- Visual indicators in waiting list

**Rationale**: Complex React component tests with multiple context mocks provide minimal value over integration tests + manual verification. Future consideration: Add Cypress E2E tests for critical user flows.

## Activity Log Integration

All waiting list actions now include urgency_level in metadata:

```javascript
{
  event_type: 'waiting_list_joined',
  metadata: {
    child_name: 'Emma',
    group: 'D',
    urgency_level: 'urgent',  // or 'flexible'
    parent_message: '...'
  }
}
```

This allows staff to:
- Review historical urgency patterns
- Analyze how often urgent vs flexible requests are made
- Audit automated assignment decisions

## Backward Compatibility

### Existing Data
- All existing `waiting_list` entries automatically get `urgency_level = 'urgent'` (database default)
- No data migration needed for historical records

### API Compatibility
- `urgencyLevel` parameter is **optional** in API requests
- Defaults to 'urgent' if not provided
- Old frontend code (if any) continues to work

### Single Button Fallback
- If frontend update fails, old single button still works
- Sends no urgencyLevel → defaults to 'urgent'
- Queue processing still works correctly

## Performance Considerations

### Database Impact
- **Index Added**: `idx_urgency_timestamp` optimizes sorting queries
- **Column Size**: ENUM(2 values) = 1 byte overhead per row
- **Query Performance**: No measurable impact (indexed sorting)

### Expected Load
- Typical waiting list: 0-10 children
- Query complexity: O(n log n) with index
- Response time: <10ms for typical datasets

## Maintenance Notes

### Monitoring Points
1. Check if urgent requests are being abused (all parents always choose urgent)
2. Monitor average wait times for urgent vs flexible
3. Track conversion rate: flexible → urgent (if parents re-request)

### Future Enhancements
Potential additions (not currently implemented):
1. **Rate limiting**: Prevent switching urgent/flexible repeatedly
2. **Urgency expiration**: Auto-downgrade urgent to flexible after X hours
3. **Staff override**: Allow staff to manually adjust urgency levels
4. **Statistics dashboard**: Show distribution of urgent vs flexible requests
5. **Email notifications**: Different messaging for urgent vs flexible assignments

## Support

### Common Questions

**Q: Can parents change from flexible to urgent?**
A: Yes, by removing from waiting list and re-joining with urgent. This updates the timestamp, so they might lose queue position.

**Q: Will everyone just use urgent?**
A: Possible. Monitor usage patterns. Consider adding tooltips explaining that urgent should be for genuine needs. Future enhancement: rate limiting or staff review of urgent requests.

**Q: Does this affect children whose groups ARE attending?**
A: No. This only applies to waiting list functionality (children whose groups are excluded).

**Q: Can staff see which requests are urgent vs flexible?**
A: Yes, the waiting list display shows urgency indicators for all users (🔥 vs ⭐).

**Q: What if the database migration fails?**
A: The app won't break - the column has a DEFAULT value. But new requests will fail validation until migration succeeds.

### Troubleshooting

**Issue: Buttons not showing tooltips**
- Check Material-UI Tooltip import
- Verify tooltip text exists in translations
- Test with browser dev tools hover event

**Issue: Wrong priority order in queue**
- Verify index exists: `SHOW INDEX FROM daily_attendance_status WHERE Key_name = 'idx_urgency_timestamp';`
- Check ORDER BY clause includes `urgency_level DESC`
- Verify data: `SELECT urgency_level, updated_at FROM daily_attendance_status WHERE status='waiting_list' ORDER BY urgency_level DESC, updated_at ASC;`

**Issue: All requests defaulting to urgent**
- Check frontend is sending urgencyLevel parameter
- Verify api.js updateStatus function signature
- Check browser network tab for POST body content

**Issue: Old waiting list entries not working**
- Run: `UPDATE daily_attendance_status SET urgency_level = 'urgent' WHERE urgency_level IS NULL;`
- Verify DEFAULT is set on column

## Files Modified Summary

### Backend (3 files)
1. `backend/database/add_urgency_levels.sql` - New migration file
2. `backend/utils/waitingListProcessor.js` - Updated sorting logic
3. `backend/routes/attendance.js` - Added urgencyLevel parameter handling

### Frontend (4 files)
1. `frontend/src/components/AttendanceStatusCard.js` - Two-button UI with tooltips
2. `frontend/src/services/api.js` - Updated API function signature
3. `frontend/src/pages/MainSchedule.js` - Urgency indicators in waiting list
4. `frontend/src/i18n/translations.js` - New translation keys (EN + DE)

### Scripts (1 file)
1. `backend/scripts/setup-urgency-levels.sh` - Deployment script

**Total Lines Changed:** ~150 lines across 8 files
