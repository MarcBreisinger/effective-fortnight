# Past Date Protection Feature

## Overview
The system prevents both staff and parents from modifying attendance data or schedules for past dates. This ensures data integrity and prevents retroactive changes to historical records.

## Implementation

### Backend Protection
**File**: `backend/utils/dateValidation.js`

- **`isPastDate(dateString)`**: Helper function that checks if a date is before today
- **`rejectPastDates` middleware**: Express middleware that returns HTTP 403 for past dates

**Protected Routes**:
1. `POST /api/attendance/child/:childId/date/:date` - Parent attendance changes (give up slot, join waiting list)
2. `POST /api/schedules/date/:date` - Staff schedule modifications (capacity changes, group order)

**Error Response**:
```json
{
  "error": "Cannot modify data for past dates",
  "detail": "Changes are only allowed for today and future dates"
}
```

### Frontend Protection
**File**: `frontend/src/utils/dateValidation.js`

- **`isPastDate(date)`**: Checks if Date object or string is in the past
- **`isTodayOrFuture(date)`**: Inverse check for enabled states

**UI Components Protected**:

1. **AttendanceStatusCard** (`frontend/src/components/AttendanceStatusCard.js`)
   - Disables "Give Up Slot" button for past dates
   - Disables "Join Waiting List" buttons (urgent/flexible) for past dates
   - Shows tooltip: "Cannot modify past dates" / "Vergangene Termine können nicht geändert werden"

2. **MainSchedule** (`frontend/src/pages/MainSchedule.js`)
   - Disables capacity slider for staff when viewing past dates
   - Displays info alert explaining restriction

## User Experience

### Parents
When viewing a past date:
- All action buttons are greyed out (disabled)
- Hovering shows tooltip explaining the restriction
- Can still view historical data (read-only)

### Staff
When viewing a past date:
- Capacity slider is disabled
- Info alert shows: "Cannot modify past dates"
- Can still view historical schedules (read-only)

## Testing

### Backend Tests
**File**: `backend/__tests__/utils/dateValidation.test.js`

- ✅ 3 tests for `isPastDate` helper (yesterday/today/tomorrow)
- ✅ 4 tests for `rejectPastDates` middleware:
  - Rejects past dates with HTTP 403
  - Allows today with HTTP 200
  - Allows future dates with HTTP 200
  - Validates required date parameter

**Run Tests**:
```bash
cd backend
npm test -- dateValidation
```

### Frontend Tests
**File**: `frontend/src/__tests__/utils/dateValidation.test.js`

- ✅ 4 tests for `isPastDate` (Date objects and strings)
- ✅ 3 tests for `isTodayOrFuture` helper

**Run Tests**:
```bash
cd frontend
npm test -- dateValidation
```

## Translation Keys Added

### English (`en`)
```javascript
cannotModifyPastDates: 'Cannot modify past dates'
```

### German (`de`)
```javascript
cannotModifyPastDates: 'Vergangene Termine können nicht geändert werden'
```

## Technical Details

### Date Comparison Logic
Both frontend and backend use identical logic:
```javascript
function isPastDate(dateString) {
  const inputDate = new Date(dateString);
  const today = new Date();
  
  // Set both to midnight for date-only comparison
  inputDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  return inputDate < today;
}
```

This ensures:
- Time components are ignored (only date matters)
- Today is always considered modifiable
- Timezone consistency across frontend/backend

### Middleware Order
The `rejectPastDates` middleware is applied **after** authentication but **before** validation:
```javascript
router.post('/date/:date',
  authenticateToken,      // Verify user is logged in
  requireStaff,           // Verify user has staff role
  rejectPastDates,        // Check date is not in past
  [validationRules],      // Validate request body
  async (req, res) => {}  // Handler
);
```

## Security Considerations

1. **Defense in Depth**: Both frontend (UI disabled) and backend (API rejection) protect against past date modifications
2. **User Feedback**: Clear error messages explain why actions are blocked
3. **Audit Trail**: Activity log still records all past events (read-only)
4. **No Data Loss**: Historical data remains accessible for reporting

## Future Enhancements

Potential improvements:
- Allow staff to override restriction with a special permission
- Add audit logging when past date modification attempts are blocked
- Configurable "grace period" (e.g., allow edits within 1 hour of date change)
- Bulk operations warning when date range includes past dates

## Deployment Notes

No database migrations required. Feature is purely code-based:
- Backend: New utility file + middleware additions
- Frontend: New utility file + UI updates
- No breaking changes to existing API contracts
