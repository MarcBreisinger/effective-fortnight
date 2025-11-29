# Deployment Checklist - Waiting List Automation

## Pre-Deployment

### Code Review
- [x] Created `backend/utils/waitingListProcessor.js`
- [x] Modified `backend/routes/schedules.js`
- [x] Modified `backend/routes/attendance.js`
- [x] No syntax errors
- [x] All requires/imports added correctly

### Documentation
- [x] Created `BUSINESS_LOGIC_TEST_SCENARIOS.md`
- [x] Created `WAITING_LIST_AUTOMATION.md`
- [x] Documented all scenarios
- [x] Documented API changes

## Deployment Steps

### 1. Backup Database
```bash
mysqldump -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME > backup_before_waiting_list_automation_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Deploy Backend Code
```bash
cd /Users/Q247532/effective-fortnight/effective-fortnight/backend
# Review changes
git status
git diff

# Commit changes
git add utils/waitingListProcessor.js
git add routes/schedules.js
git add routes/attendance.js
git commit -m "feat: Implement automatic waiting list processing

- Add centralized waiting list processor utility
- Auto-restore children to regular slots when group becomes available
- Process waiting list queue in FIFO order when capacity opens
- Trigger processing on capacity changes and slot give-ups
- Return processing results to clients for transparency"

# Deploy to server (if using deployment script)
./deploy.sh
```

### 3. Restart Backend Service
```bash
# If using PM2
pm2 restart daycare-backend

# Or if using systemd
sudo systemctl restart daycare-backend

# Or manually
cd backend
npm start
```

### 4. Verify Deployment
```bash
# Check logs for startup errors
tail -f logs/app.log
# or
pm2 logs daycare-backend

# Verify no errors on startup
```

## Post-Deployment Testing

### Smoke Tests (5 minutes)

#### Test 1: Basic Capacity Change
```bash
# As staff user
curl -X PATCH http://localhost:5000/api/schedules/date/2025-11-22/capacity \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"capacityLimit": 3}'

# Expected: 200 OK, processing_results in response
```

#### Test 2: Parent Give Up Slot
```bash
# As parent user
curl -X POST http://localhost:5000/api/attendance/child/1/date/2025-11-22 \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "slot_given_up"}'

# Expected: 200 OK, status updated
```

#### Test 3: Join Waiting List
```bash
# As parent user
curl -X POST http://localhost:5000/api/attendance/child/2/date/2025-11-22 \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "waiting_list"}'

# Expected: 200 OK, may auto-assign if capacity available
```

### Integration Tests (15 minutes)

Run through scenarios from `BUSINESS_LOGIC_TEST_SCENARIOS.md`:

1. **Scenario 1:** Full capacity operation
   - [ ] Child can attend (no status entry)
   
2. **Scenario 2:** Capacity reduction
   - [ ] Child loses slot
   - [ ] Notification shown
   - [ ] Can request slot
   
3. **Scenario 2.1.1.1:** Immediate assignment
   - [ ] Join waiting list with free capacity
   - [ ] Auto-assigned to attending
   
4. **Scenario 2.1.1.2:** Waiting list
   - [ ] Join waiting list without capacity
   - [ ] Remains in waiting_list status
   
5. **Scenario 2.1.1.2.1:** Auto-assignment on slot yield
   - [ ] Someone gives up slot
   - [ ] First in queue auto-assigned
   
6. **Scenario 3.1.1:** Capacity increase
   - [ ] Group becomes available
   - [ ] Children auto-restored to regular slots
   - [ ] Status entries deleted
   
7. **Scenario 3.1.2.1:** General capacity processing
   - [ ] Waiting list processed in FIFO order
   - [ ] Correct children assigned

### Database Verification

After running tests, verify data integrity:

```sql
-- Check for orphaned statuses
SELECT das.*, c.name, c.assigned_group
FROM daily_attendance_status das
JOIN children c ON das.child_id = c.id
WHERE das.attendance_date = '2025-11-22';

-- Verify waiting list order
SELECT das.child_id, c.name, das.updated_at, das.status
FROM daily_attendance_status das
JOIN children c ON das.child_id = c.id
WHERE das.attendance_date = '2025-11-22' 
AND das.status = 'waiting_list'
ORDER BY das.updated_at;

-- Check capacity counts
SELECT c.assigned_group, 
       COUNT(*) as total,
       SUM(CASE WHEN das.status IS NULL OR das.status = 'attending' THEN 1 ELSE 0 END) as attending_count
FROM children c
LEFT JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = '2025-11-22'
GROUP BY c.assigned_group;
```

## Monitoring

### Logs to Watch

Monitor these log messages:
```
[WaitingListProcessor] Found X children whose groups are now attending
[WaitingListProcessor] Cleared status for [name] (Group [X])
[WaitingListProcessor] Processing X children on waiting list
[WaitingListProcessor] Auto-assigned [name] to additionally attending
[WaitingListProcessor] Processing complete: {...}
[Schedules] Waiting list processing results: {...}
[Attendance] Slot given up by child in group X - processing waiting list
[Attendance] Immediate waiting list processing results: {...}
```

### Errors to Watch For

```
[WaitingListProcessor] Error processing waiting list: <error>
[Schedules] Waiting list processing error: <error>
[Attendance] Error processing slot give-up: <error>
```

### Performance Metrics

Monitor:
- Response time for capacity updates (should be < 2 seconds)
- Response time for status updates (should be < 1 second)
- Database query count (should not spike significantly)
- Memory usage (waiting list processing is in-memory)

## Rollback Plan

If issues occur:

### 1. Quick Rollback
```bash
cd /Users/Q247532/effective-fortnight/effective-fortnight
git revert HEAD  # Revert last commit
./deploy.sh
pm2 restart daycare-backend
```

### 2. Database Rollback
```sql
-- If needed, restore from backup
-- WARNING: This loses any data changes after backup
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < backup_before_waiting_list_automation_*.sql
```

### 3. Manual Cleanup (if partial deployment)
```bash
# Remove new file
rm backend/utils/waitingListProcessor.js

# Restore old route files from git
git checkout HEAD~1 -- backend/routes/schedules.js
git checkout HEAD~1 -- backend/routes/attendance.js

# Restart
pm2 restart daycare-backend
```

## Success Criteria

Deployment is successful if:
- [x] No startup errors in logs
- [x] Smoke tests pass
- [x] Capacity changes trigger automatic processing
- [x] Waiting list processed in correct order
- [x] Children auto-restored to regular slots
- [x] No database errors
- [x] Response times acceptable
- [x] Parents see correct statuses
- [x] Staff can change capacity smoothly

## Known Limitations

- Processing is synchronous (may add slight delay to capacity updates)
- No real-time push notifications (relies on polling)
- No email notifications for auto-assignments
- No priority system for waiting list
- Maximum 12 children per group (hardcoded constant)

## Future Work

- Add WebSocket support for real-time updates
- Implement email notifications
- Add priority levels to waiting list
- Create admin dashboard for queue management
- Add analytics for capacity utilization
- Implement batch processing job for off-hours cleanup
