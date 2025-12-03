# Business Logic Test Scenarios

This document outlines complete test scenarios for the day-care rotation system's capacity management and waiting list functionality.

## Test Setup

### Prerequisites
- Staff account configured
- At least 4 test children created (one in each group A, B, C, D)
- Initial capacity set to 4 (full capacity)
- Database properly initialized

### Test Data Structure
```
Group A: Child A1, A2, A3, ... (up to 12 children)
Group B: Child B1, B2, B3, ... (up to 12 children)
Group C: Child C1, C2, C3, ... (up to 12 children)
Group D: Child D1, D2, D3, ... (up to 12 children)
```

---

## Scenario 1: Full Capacity - Normal Operation

### Test 1.1: Child Can Attend
**Initial State:**
- Capacity: 4 groups
- Attending groups: A, B, C, D
- Child A1: No status entry in database

**Action:** Parent views schedule

**Expected Result:**
- ✅ Status box shows "Child A1 can attend today"
- ✅ No entry in `daily_attendance_status` table
- ✅ Child appears in Group A list (not additionally attending, not waiting list)

**Verification Query:**
```sql
SELECT * FROM daily_attendance_status WHERE child_id = 1 AND attendance_date = 2025-11-27;
-- Should return 0 rows
```

---

## Scenario 2: Capacity Reduction - Slot Loss

### Test 2.1: Child Loses Slot When Capacity Reduced
**Initial State:**
- Capacity: 4 groups  
- Attending groups: A, B, C, D
- Group order: A, B, C, D
- Child D1: No status (attending by default)

**Action:** Staff reduces capacity to 3

**Expected Result:**
- ✅ Attending groups change to: A, B, C
- ✅ Group D is excluded
- ✅ Parents of Group D children see notification: "Child D1 lost their slot due to reduced capacity"
- ✅ Status box shows "Group D is not attending today"
- ✅ Button available: "Child D1 needs day care slot"

**Verification Query:**
```sql
SELECT attending_groups FROM daily_schedules WHERE schedule_date = "2025-11-27";
-- Should return: ["A","B","C"]
```

### Test 2.1.1: Child Requests Slot - With Free Capacity

#### Test 2.1.1.1: Immediate Assignment
**Initial State:**
- Capacity: 3 groups (A, B, C attending)
- Group A has only 5 children (capacity available)
- Child D1: Status shows "group not attending"

**Action:** Parent of D1 clicks "Child needs day care slot"

**Expected Result:**
- ✅ Child D1 immediately assigned to `attending` status
- ✅ Child D1 appears in "Additionally Attending" section
- ✅ Status changes from `NULL` → `'attending'`
- ✅ No modal delay - instant assignment

**Verification Query:**
```sql
SELECT status FROM daily_attendance_status 
WHERE child_id = ? AND attendance_date = ?;
-- Should return: 'attending'

-- Verify child appears in additionally attending via API
GET /api/schedules/date/:date/children
-- Check response.additionally_attending contains child D1
```

#### Test 2.1.1.2: No Capacity - Waiting List
**Initial State:**
- Capacity: 3 groups (A, B, C attending)
- All attending groups at 12/12 capacity
- Child D1: Status shows "group not attending"

**Action:** Parent of D1 clicks "Child needs day care slot"

**Expected Result:**
- ✅ Child D1 added to waiting list
- ✅ Status changes from `NULL` → `'waiting_list'`
- ✅ Child appears in "Waiting List" section
- ✅ `updated_at` timestamp recorded (for FIFO ordering)

**Verification Query:**
```sql
SELECT status, updated_at FROM daily_attendance_status 
WHERE child_id = ? AND attendance_date = ?;
-- Should return: status='waiting_list', updated_at=(current time)
```

### Test 2.1.1.2.1: Place Yielded by Other Parent
**Initial State:**
- Capacity: 3 groups (A, B, C attending)
- All attending groups at 12/12 capacity
- Child D1 on waiting list (timestamp: 10:00)
- Child D2 from Group D has status `'attending'` (additionally attending)

**Action:** Parent of D2 gives up slot

**Expected Result:**
- ✅ **Automatic Processing:** System immediately checks waiting list
- ✅ Child D1 (first in queue) automatically assigned to `'attending'`
- ✅ Status changes: `'waiting_list'` → `'attending'`
- ✅ Child D1 removed from waiting list
- ✅ Child D1 appears in "Additionally Attending" section

**Verification Query:**
```sql
SELECT status FROM daily_attendance_status 
WHERE child_id = ? AND attendance_date = ?;
-- D1 should return: 'attending'
-- D2 should return: 'slot_given_up'
```

### Test 2.1.1.2.2: Parent Removes Child from Waiting List
**Initial State:**
- Child D1 on waiting list (status: `'waiting_list'`)

**Action:** Parent clicks "Remove from waiting list"

**Expected Result:**
- ✅ Status entry **deleted** (no longer in any queue)
- ✅ Child D1 removed from waiting list display
- ✅ Status box shows "Group D is not attending today"
- ✅ Can request slot again later (will rejoin waiting list or get assigned)
- ✅ No slot freed (child didn't have a slot, just a queue position)

**Verification Query:**
```sql
SELECT * FROM daily_attendance_status 
WHERE child_id = ? AND attendance_date = ?;
-- Should return 0 rows (status deleted)
```

**Note:** Removing from waiting list is different from giving up a day care slot. The child was never attending, so there's no slot to free for others. The status should simply be cleared.

### Test 2.1.2: Child Doesn't Need Slot - No Action Taken
**Initial State:**
- Capacity: 3 groups (A, B, C attending)
- Group D excluded from attending
- Child D1: No status (group not attending)
- Parent is aware child lost slot

**Action:** Parent views schedule but does NOT click "Child needs day care slot"

**Expected Result:**
- ✅ No database changes occur
- ✅ Child D1 remains without a slot
- ✅ Status box continues to show "Group D is not attending today"
- ✅ No entry created in `daily_attendance_status` table
- ✅ Child is neither on waiting list nor additionally attending
- ✅ Parent can request slot at any later time if needed

**Verification Query:**
```sql
SELECT * FROM daily_attendance_status 
WHERE child_id = ? AND attendance_date = ?;
-- Should return 0 rows (no status entry - child not requesting slot)
```

**Note:** This test confirms that the system is passive - it only responds to explicit parent actions. If a parent accepts that their child cannot attend on a particular day, no action is required and no database state changes occur.

---

## Scenario 3: Capacity Increase - Automatic Reassignment

### Test 3.1: Child on Waiting List, Group Becomes Available

#### Test 3.1.1: Automatic Regular Slot Assignment
**Initial State:**
- Capacity: 3 groups (A, B, C attending)
- Child D1: Status `'waiting_list'`, timestamp 10:00
- Child D2: Status `'waiting_list'`, timestamp 10:05

**Action:** Staff increases capacity to 4

**Expected Result:**
- ✅ **Automatic Processing:** System detects Group D is now attending
- ✅ Child D1 status **deleted** (returns to default)
- ✅ Child D2 status **deleted** (returns to default)
- ✅ Both children receive regular slots in Group D
- ✅ Children removed from waiting list
- ✅ Children appear in Group D list (not additionally attending)

**Verification Query:**
```sql
SELECT * FROM daily_attendance_status 
WHERE child_id IN (?,?) AND attendance_date = ?;
-- Should return 0 rows (statuses deleted)

GET /api/schedules/date/:date/children
-- Verify D1 and D2 appear in Group D's children list
-- Verify attendance_status is null or 'attending' (default)
```

**Note:** This test demonstrates that when a group becomes available, ALL waiting list children from that group are automatically restored to regular slots, not just some of them.

### Test 3.1.2: Group Still Not Attending - General Capacity Available

#### Test 3.1.2.1: Own Group Becomes Available - Priority Restoration
**Initial State:**
- Capacity: 2 groups (A, B attending)
- Both groups at full capacity (12/12 children each)
- Child D1: Status `'waiting_list'`, timestamp 10:00
- Child C1: Status `'waiting_list'`, timestamp 10:05
- Child D2: Status `'waiting_list'`, timestamp 10:10

**Action:** Staff increases capacity to 3 (Groups A, B, C attending)

**Expected Result:**
- ✅ **Automatic Processing:** System processes waiting list
- ✅ Child C1's group (C) becomes available - C1 restored FIRST (own group priority)
- ✅ C1 status **deleted** (returns to Group C regular slot)
- ✅ Group C now at capacity (12/12)
- ✅ D1 and D2 remain on waiting list (Group D not attending, no general capacity)
- ✅ **Key principle:** Children restored to their own group before FIFO queue processed

**Verification Query:**
```sql
SELECT child_id, status FROM daily_attendance_status 
WHERE child_id IN (?, ?, ?) AND attendance_date = ?
ORDER BY child_id;
-- C1: should return 0 rows (restored to Group C)
-- D1: status='waiting_list' (still waiting)
-- D2: status='waiting_list' (still waiting)
```

#### Test 3.1.2.2: FIFO Queue Processing - One Slot Available
**Initial State:**
- Capacity: 2 groups (A, B attending)
- Group A at 12/12 capacity
- Group B at 12/12 capacity
- Group C at 11/12 → 1 slot available
- Child D1: Status `'waiting_list'`, timestamp 10:00
- Child D2: Status `'waiting_list'`, timestamp 10:05

**Action:** Staff increases capacity to 3 (Groups A, B, C attending)

**Expected Result:**
- ✅ Group C becomes available with capacity for 12 children
- ✅ Child D1 (first in queue by timestamp) gets the slot
- ✅ D1 status: `'waiting_list'` → `'attending'`
- ✅ D1 appears in "Additionally Attending" section
- ✅ Child D2 remains in waiting list (no more capacity)
- ✅ D2 status: unchanged (`'waiting_list'`)
- ✅ **FIFO queue order strictly preserved**

**Verification Query:**
```sql
SELECT child_id, status, updated_at FROM daily_attendance_status 
WHERE attendance_date = ? AND status = 'waiting_list'
ORDER BY updated_at;
-- Should show D2 still waiting, D1 no longer in list
```

### Test 3.2: Child on Additionally Attending List

#### Test 3.2.1: Group Becomes Available - Return to Regular Slot
**Initial State:**
- Capacity: 3 groups (A, B, C attending)
- Child D1: Status `'attending'` (in additionally attending list)
- Child D1 is from Group D

**Action:** Staff increases capacity to 4

**Expected Result:**
- ✅ **Automatic Processing:** System detects Group D now attending
- ✅ Child D1 status **deleted** (no longer needs special status)
- ✅ D1 removed from "Additionally Attending" section
- ✅ D1 appears in Group D list (regular attendance)

**Verification Query:**
```sql
SELECT * FROM daily_attendance_status 
WHERE child_id = ? AND attendance_date = ?;
-- Should return 0 rows

GET /api/schedules/date/:date/children
-- Verify D1 appears in Group D's children array
-- Verify D1 NOT in additionally_attending array
```

### Test 3.3: Unaffected Groups - No Change

#### Test 3.3.1: Group Not Affected by Capacity Reduction
**Initial State:**
- Capacity: 4 → reduced to 3
- Group A still in attending groups
- Child A1: No status

**Action:** Staff reduces capacity

**Expected Result:**
- ✅ Child A1 status unchanged (no entry in DB)
- ✅ No notification shown
- ✅ Child continues to attend normally

---

## API Endpoint Tests

### Test: GET /api/schedules/date/:date/children
**Verify correct categorization:**
```json
{
  "groups": [
    {
      "group": "A",
      "canAttend": true,
      "children": [
        {"id": 1, "name": "Child A1", "attendance_status": null}
      ]
    }
  ],
  "additionally_attending": [
    {"id": 5, "name": "Child D1", "assigned_group": "D"}
  ],
  "waiting_list": [
    {"id": 6, "name": "Child D2", "assigned_group": "D"}
  ]
}
```

### Test: PATCH /api/schedules/date/:date/capacity
**Verify processing results returned:**
```json
{
  "message": "Capacity updated successfully",
  "processing_results": {
    "reassignedToRegularSlots": [
      {"child_id": 5, "child_name": "Child D1", "group": "D"}
    ],
    "assignedFromWaitingList": [
      {"child_id": 6, "child_name": "Child C1", "group": "C"}
    ]
  }
}
```

---

## Scenario 4: Parent Gives Up "Additionally Attending" Slot

### Test 4.1: Give Up Additional Slot - Waiting List Processing
**Initial State:**
- Capacity: 3 groups (A, B, C attending)
- All attending groups at 12/12 capacity
- Child D1: Status `'attending'` (in additionally attending list)
- Child D2: Status `'waiting_list'`, timestamp 10:00
- Child D3: Status `'waiting_list'`, timestamp 10:05

**Action:** Parent of D1 clicks "Child D1 will not attend today"

**Expected Result:**
- ✅ D1 status changes: `'attending'` → `'slot_given_up'`
- ✅ **Automatic Processing:** System checks waiting list
- ✅ D2 (first in queue) automatically assigned to `'attending'`
- ✅ D2 removed from waiting list
- ✅ D2 appears in "Additionally Attending" section
- ✅ D3 remains on waiting list

**Verification Query:**
```sql
SELECT child_id, status, updated_at FROM daily_attendance_status 
WHERE attendance_date = ? AND child_id IN (?, ?, ?)
ORDER BY child_id;
-- D1: 'slot_given_up'
-- D2: 'attending' 
-- D3: 'waiting_list'
```

### Test 4.2: Give Up Regular Slot - NOT Auto-Restored (Bug Fix)
**Initial State:**
- Capacity: 3 groups (A, B, C attending)
- Group A: 12/12 capacity (including one child with 'attending' status)
- Group B: 12/12 capacity
- Group C: 12/12 capacity
- Child A1: Status `'slot_given_up'` (parent explicitly gave up slot earlier)
- Child D1: Status `'waiting_list'`, timestamp 10:00
- Child D2: Status `'attending'` (in additionally attending list)

**Action:** Parent of D2 clicks "Give up slot"

**Expected Result:**
- ✅ D2 status changes: `'attending'` → `'slot_given_up'`
- ✅ **Automatic Processing:** System checks waiting list
- ✅ D1 (first in queue) automatically assigned to `'attending'`
- ✅ D1 appears in "Additionally Attending" section
- ✅ **IMPORTANT:** A1 status remains `'slot_given_up'`
- ✅ A1 is NOT automatically restored (parent made explicit choice)
- ✅ Auto-restoration ONLY applies to 'waiting_list' status, NOT 'slot_given_up'

**Verification Query:**
```sql
SELECT child_id, status FROM daily_attendance_status 
WHERE attendance_date = ? AND child_id IN (?, ?, ?)
ORDER BY child_id;
-- A1: 'slot_given_up' (unchanged - explicit choice honored)
-- D1: 'attending' (newly assigned from waiting list)
-- D2: 'slot_given_up' (just gave up slot)
```

**Bug Note:** Previously, the system incorrectly restored 'slot_given_up' children when their group was attending. This violated the principle that giving up a slot is an explicit parental decision that should be honored. Only children with 'waiting_list' status should be automatically restored when their group becomes available.

---

## Scenario 5: Parent Re-Requests Slot After Giving Up

### Test 5.1: Rejoin from "Slot Given Up" Status
**Initial State:**
- Capacity: 3 groups (A, B, C attending)
- Child A1: Status `'slot_given_up'` (gave up slot yesterday)
- Group A has capacity (8/12 children)

**Action:** Parent clicks "Request slot again"

**Expected Result:**
- ✅ Group A is attending and has capacity
- ✅ Status **deleted** (returns to default attending in Group A)
- ✅ Child A1 appears in Group A list
- ✅ No "additionally attending" - regular slot

**Verification Query:**
```sql
SELECT * FROM daily_attendance_status 
WHERE child_id = ? AND attendance_date = ?;
-- Should return 0 rows (status deleted)

GET /api/schedules/date/:date/children
-- Verify A1 in Group A's children list with attendance_status null
```

### Test 5.2: Rejoin When Group at Capacity
**Initial State:**
- Capacity: 3 groups (A, B, C attending)
- Child A1: Status `'slot_given_up'` (parent gave up slot earlier)
- Group A at capacity (12/12 children, including Child D3 with 'attending' status)
- Child D3: Status `'attending'` (additionally attending - took the slot freed by A1)
- All other groups at 12/12 capacity

**Action:** Parent of A1 clicks "Request slot again"

**Expected Result:**
- ✅ Group A is attending but at full capacity (12/12)
- ✅ Check general capacity across all attending groups
- ✅ **No capacity available anywhere** → A1 added to waiting list
- ✅ A1 status changes: NULL → `'waiting_list'`
- ✅ **IMPORTANT:** D3 status remains `'attending'` (keeps their slot)
- ✅ D3 is NOT kicked out or moved to waiting list
- ✅ A1 must wait like any other child requesting a slot

**Verification Query:**
```sql
SELECT child_id, status FROM daily_attendance_status 
WHERE child_id IN (?, ?) AND attendance_date = ?;
-- A1: 'waiting_list' (newly added)
-- D3: 'attending' (unchanged - keeps slot)
```

**Bug Note:** There was a bug where the system incorrectly prioritized children returning to their own group by kicking out children with 'attending' status. This violated the principle that once a child has 'attending' status, they hold that slot. Giving up a slot is a permanent choice - you lose your priority and must wait like everyone else.

### Test 5.3: Rejoin with Immediate Auto-Assignment (Bug Fix)
**Initial State:**
- Capacity: 3 groups (A, B, C attending)
- Child A1: Status `'slot_given_up'`
- Group A has capacity (10/12 children)

**Action:** Parent of A1 clicks "Request slot again"

**Expected Result:**
- ✅ Status initially set to `'waiting_list'`
- ✅ **Automatic Processing:** System detects Group A has capacity
- ✅ Status **deleted** (child restored to regular Group A slot)
- ✅ API returns success with `status: 'attending'` and `auto_assigned: true`
- ✅ **CRITICAL:** No 500 error even though status entry was deleted
- ✅ Frontend receives proper response and updates UI

**Verification Query:**
```sql
SELECT * FROM daily_attendance_status 
WHERE child_id = ? AND attendance_date = ?;
-- Should return 0 rows (status deleted after auto-assignment)
```

**Bug Note:** Previously, when a child requested a slot and was immediately auto-assigned (status deleted), the backend tried to fetch the deleted status entry and returned a 500 error. The fix handles the case where `updated.length === 0`, recognizing it means the child was restored to regular attendance.

---

## Scenario 6: Staff Changes Rotation Order

### Test 6.1: Rotation Change Affects Attending Groups
**Initial State:**
- Order: A, B, C, D
- Capacity: 3 groups (A, B, C attending)
- All attending groups at 12/12 capacity
- Child D1: Status `'waiting_list'`
- Child D2: Status `'attending'` (additionally attending - from Group D which is not attending)

**Action:** Staff changes rotation to D, A, B, C (Group D now prioritized)

**Expected Result:**
- ✅ Attending groups change to: D, A, B
- ✅ **Automatic Processing:** System processes waiting list
- ✅ Child D1 restored to Group D regular slot (status **deleted**)
- ✅ Child D2 restored to Group D regular slot (status **deleted**)
- ✅ Group C excluded - children from Group C may be affected
- ✅ Children with 'attending' status from non-attending groups need to be re-evaluated

**Verification Query:**
```sql
SELECT attending_groups FROM daily_schedules WHERE schedule_date = ?;
-- Should return: ["D","A","B"]

SELECT * FROM daily_attendance_status 
WHERE child_id IN (?, ?) AND attendance_date = ?;
-- D1: should return 0 rows (restored to regular slot)
-- D2: should return 0 rows (restored to regular slot)
```

### Test 6.2: Rotation Change with Full Processing
**Initial State:**
- Order: A, B, C, D
- Capacity: 2 (A, B attending)
- Both groups at 12/12 capacity
- Child C1: Status `'waiting_list'`, timestamp 10:00
- Child D1: Status `'waiting_list'`, timestamp 10:05

**Action:** Staff changes rotation to C, D, A, B

**Expected Result:**
- ✅ Attending groups: C, D (first 2 in new order)
- ✅ **Automatic Processing:**
  - C1 restored to Group C regular slot (status deleted)
  - D1 restored to Group D regular slot (status deleted)
- ✅ Both removed from waiting list
- ✅ Children from Groups A, B may lose slots

**Verification Query:**
```sql
SELECT * FROM daily_attendance_status 
WHERE child_id IN (?, ?) AND attendance_date = ?;
-- Should return 0 rows for both (restored to regular slots)
```

---

## Scenario 7: Parent with Multiple Children

### Test 7.1: Multiple Children - Different States
**Initial State:**
- Capacity: 3 groups (A, B, C attending)
- All attending groups at 12/12 capacity
- Parent linked to 3 children:
  - Child A1: No status (attending normally in Group A)
  - Child B1: Status `'slot_given_up'`
  - Child D1: Status `'attending'` (additionally attending - Group D not attending)


**Action:** Parent views main schedule

**Expected Result:**
- ✅ Three separate status cards displayed
- ✅ A1: "Child A1 can attend today"
- ✅ B1: "Child D1 does not have a slot" + "Request slot" button
- ✅ D1: "Child B1 is additionally attending" (shows they have a slot despite group not attending)
- ✅ Each child actionable independently

**Verification Query:**
```sql
SELECT c.id, c.name, das.status 
FROM user_child_links ucl
JOIN children c ON ucl.child_id = c.id
LEFT JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = ?
WHERE ucl.user_id = ?;
-- Should show all 3 children with their respective statuses
```

### Test 7.2: Multiple Children - Simultaneous Actions
**Initial State:**
- Parent linked to Child B1 and C1
- Both have no status (attending normally)
- Capacity reduced: Group B excluded, Group C still attending

**Action:** Parent receives notifications for B1 losing slot

**Expected Result:**
- ✅ Only B1 shows "slot lost" notification
- ✅ C1 status unchanged
- ✅ Parent can request slot for B1
- ✅ C1 continues attending

**Verification Query:**
```sql
SELECT child_id, status FROM daily_attendance_status 
WHERE child_id IN (?, ?) AND attendance_date = ?;
-- B1: may have status entry
-- C1: should return 0 rows
```

### Test 7.3: Cascade Effect on Siblings
**Initial State:**
- Parent has Child D1 and D2 (same group)
- Both on `'waiting_list'`, D1 timestamp 10:00, D2 timestamp 10:10
- Only 1 slot becomes available

**Action:** Capacity increases to include 1 general slot

**Expected Result:**
- ✅ D1 (earlier timestamp) gets slot first
- ✅ D1 status: `'waiting_list'` → `'attending'`
- ✅ D2 remains on waiting list
- ✅ **FIFO strictly maintained** even within same family

**Verification Query:**
```sql
SELECT child_id, status, updated_at FROM daily_attendance_status 
WHERE child_id IN (?, ?) AND attendance_date = ?
ORDER BY updated_at;
-- D1: 'attending'
-- D2: 'waiting_list'
```

---

## Edge Cases to Test

### Edge Case 1: Multiple Children from Same Group on Waiting List
**Scenario:** Group D has 3 children on waiting list. Capacity increases to include Group D.

**Expected:** All 3 children should be restored to Group D (if capacity allows).

### Edge Case 2: Waiting List Exceeds Available Capacity
**Scenario:** 5 children on waiting list, only 2 slots available.

**Expected:** First 2 children (by timestamp) get slots, rest remain waiting.

### Edge Case 3: Group at Exact Capacity Limit
**Scenario:** Group A has exactly 12 children attending.

**Expected:** New requests go to waiting list or other groups.

### Edge Case 4: All Groups at Capacity
**Scenario:** All attending groups have 12/12 children.

**Expected:** All new requests go to waiting list, no auto-assignment.

### Edge Case 5: Rapid Status Changes
**Scenario:** Parent gives up slot, joins waiting list, gives up again within seconds.

**Expected:** System handles race conditions, maintains data integrity.

---

## Performance Tests

### Load Test 1: 100 Children on Waiting List
- Process capacity increase from 1 → 4 groups
- Measure time to process entire queue
- Target: < 5 seconds

### Load Test 2: Multiple Concurrent Status Changes
- 10 parents simultaneously give up slots
- 20 parents simultaneously join waiting list
- Verify correct queue ordering

---

## Regression Tests

After implementing automatic processing, verify these still work:

1. ✅ Parent can manually give up slot
2. ✅ Parent can manually join waiting list
3. ✅ Staff can change capacity via slider
4. ✅ Staff can change rotation order
5. ✅ Group lists display correctly
6. ✅ Capacity counters accurate
7. ✅ Notifications show correctly
8. ✅ Date navigation works
9. ✅ Real-time updates via polling work
10. ✅ Authentication and authorization enforced
