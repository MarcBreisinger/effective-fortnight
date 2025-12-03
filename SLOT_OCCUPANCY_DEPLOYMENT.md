# Slot Occupancy Feature - Deployment Guide

## Quick Summary
Added a user-configurable feature to show which child is occupying whose slot when children from non-attending groups are assigned slots. **Default: OFF** (opt-in feature).

## What Changed

### Database (requires migration)
- `users` table: Added `show_slot_occupancy BOOLEAN DEFAULT FALSE`
- `daily_attendance_status` table: Added `occupied_slot_from_child_id INT DEFAULT NULL` with foreign key
- New index: `idx_occupied_slot` on `occupied_slot_from_child_id`

### Backend Files Modified
1. **`backend/routes/auth.js`**
   - Updated `/me` endpoint to return `showSlotOccupancy` preference
   - Updated `/profile` PUT endpoint to accept `showSlotOccupancy` in request body

2. **`backend/routes/schedules.js`**
   - Updated attendance details query to include `occupied_slot_from_child_id` and child name
   - Added LEFT JOIN to `children` table for occupied slot owner name

3. **`backend/utils/waitingListProcessor.js`**
   - Added logic to track whose slot is being occupied when auto-assigning from waiting list
   - Queries for earliest waiter in target group to establish relationship

### Frontend Files Modified
1. **`frontend/src/pages/ParentSettings.js`**
   - Added "Display Preferences" section
   - Added Switch toggle for "Show whose slot is being occupied"
   - Syncs preference with backend on save

2. **`frontend/src/pages/MainSchedule.js`**
   - Added conditional display of slot occupancy caption below child names
   - Only shows when user has enabled preference AND child has occupied slot reference

3. **`frontend/src/i18n/translations.js`**
   - Added English translations: `displayPreferences`, `showSlotOccupancyLabel`, `showSlotOccupancyHelp`, `usingSlotOf`
   - Added German translations: same keys with German text

### New Files Created
1. **`backend/database/add_slot_occupancy_feature.sql`**
   - SQL migration script for database changes

2. **`backend/scripts/setup-slot-occupancy.sh`**
   - Automated setup script for running migration

3. **`SLOT_OCCUPANCY_FEATURE.md`**
   - Comprehensive feature documentation

4. **`SLOT_OCCUPANCY_DEPLOYMENT.md`** (this file)
   - Deployment guide

## Deployment Steps

### Step 1: Deploy Backend
```bash
# On Uberspace server
cd ~/daycare-app

# Copy backend files (using your existing deployment script)
# Or manually:
rsync -avz backend/routes/auth.js marcb@himalia.uberspace.de:daycare-app/backend/routes/
rsync -avz backend/routes/schedules.js marcb@himalia.uberspace.de:daycare-app/backend/routes/
rsync -avz backend/utils/waitingListProcessor.js marcb@himalia.uberspace.de:daycare-app/backend/utils/
rsync -avz backend/database/add_slot_occupancy_feature.sql marcb@himalia.uberspace.de:daycare-app/backend/database/
rsync -avz backend/scripts/setup-slot-occupancy.sh marcb@himalia.uberspace.de:daycare-app/backend/scripts/
```

### Step 2: Run Database Migration
```bash
# On Uberspace server
cd ~/daycare-app/backend/scripts
chmod +x setup-slot-occupancy.sh
./setup-slot-occupancy.sh
```

**Note:** The script uses credentials from `backend/.env` file. Make sure your `.env` file is properly configured with `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and optionally `DB_PORT`.

**Expected Output:**
```
Setting up slot occupancy feature...

Database Configuration:
  Host: 127.0.0.1
  Port: 3307
  Database: marcb_notbetreuung
  User: marcb

Running database migration...
✓ Database migration completed successfully!

Slot occupancy feature setup complete:
  - Added show_slot_occupancy column to users table (default: FALSE)
  - Added occupied_slot_from_child_id column to daily_attendance_status table
  - Users can now enable this feature in their settings
```

### Step 3: Deploy Frontend
```bash
# On local machine
cd frontend
npm run build

# Deploy to Uberspace
rsync -avz --delete build/ marcb@himalia.uberspace.de:daycare-app/frontend-build/
```

### Step 4: Restart Backend
```bash
# On Uberspace server
supervisorctl restart daycare-backend
```

### Step 5: Verify Deployment
1. **Check Database:**
   ```sql
   SHOW COLUMNS FROM users LIKE 'show_slot_occupancy';
   SHOW COLUMNS FROM daily_attendance_status LIKE 'occupied_slot_from_child_id';
   ```

2. **Test API:**
   ```bash
   # Get user profile (should include showSlotOccupancy: false for existing users)
   curl -H "Authorization: Bearer YOUR_TOKEN" https://daycare.marcb.uber.space/api/auth/me
   ```

3. **Test Frontend:**
   - Login as parent
   - Go to Settings
   - Verify "Display Preferences" section exists
   - Toggle "Show whose slot is being occupied" switch
   - Save profile
   - Return to main schedule
   - Feature should now be enabled (if any children are using occupied slots)

## Rollback Plan

If issues occur, rollback steps:

### Rollback Database (if needed)
```sql
-- Remove columns (data will be lost)
ALTER TABLE users DROP COLUMN show_slot_occupancy;
ALTER TABLE daily_attendance_status DROP COLUMN occupied_slot_from_child_id;
DROP INDEX idx_occupied_slot ON daily_attendance_status;
```

### Rollback Code
```bash
# Revert to previous commit
git checkout HEAD~1 backend/routes/auth.js
git checkout HEAD~1 backend/routes/schedules.js
git checkout HEAD~1 backend/utils/waitingListProcessor.js
git checkout HEAD~1 frontend/src/pages/ParentSettings.js
git checkout HEAD~1 frontend/src/pages/MainSchedule.js
git checkout HEAD~1 frontend/src/i18n/translations.js

# Rebuild and redeploy
npm run build
rsync...
```

## Testing Checklist

### Pre-Deployment Testing (Local)
- [x] Frontend builds without errors
- [x] Database migration script runs successfully
- [x] Backend code has no syntax errors
- [x] Translations are complete for both EN and DE

### Post-Deployment Testing (Production)
- [ ] Database migration completed successfully
- [ ] Backend restart successful (no crashes)
- [ ] User can login without issues
- [ ] Settings page displays new toggle
- [ ] Toggle can be enabled and saved
- [ ] Main schedule shows occupancy info when enabled
- [ ] Main schedule hides occupancy info when disabled
- [ ] Language toggle works (EN/DE) for new text
- [ ] No console errors in browser
- [ ] No errors in backend logs

### Feature Testing
- [ ] Create scenario: Child A on waiting list, Child B assigned to Group A
- [ ] Verify database: `occupied_slot_from_child_id` is set correctly
- [ ] Enable feature in settings
- [ ] Verify display shows "Using [Name]'s slot"
- [ ] Disable feature in settings
- [ ] Verify display hides occupancy info
- [ ] Test in German language

## Monitoring

After deployment, monitor:
1. **Backend logs** for any errors related to new queries
2. **Database performance** - new LEFT JOIN shouldn't impact performance significantly
3. **User feedback** - are parents finding the feature useful?

## Expected Behavior

### For Existing Users
- Preference defaults to FALSE (feature hidden)
- No visual changes until they explicitly enable it
- Can enable in Settings → Display Preferences

### For New Users
- Same as existing: defaults to FALSE
- Opt-in feature

### When Feature is Enabled
- See additional caption under child names in group lists
- Caption format: "Using [Child Name]'s slot"
- Only shows when child is actually occupying another's slot

### When Feature is Disabled
- No slot occupancy information shown
- Interface looks exactly as before

## Business Logic Guarantee

**IMPORTANT:** This feature is **informational only**. It does NOT change:
- Who can be assigned to attend
- Who can be displaced
- The protection rule for children with 'attending' status
- Any automated processing logic

The core business rule remains: **Children with 'attending' status CANNOT be displaced**.

## Support Contact

For issues during deployment:
- Check backend logs: `supervisorctl tail -f daycare-backend`
- Check database: `mysql -e "USE [database]; SHOW COLUMNS FROM users;"`
- Check browser console for frontend errors
- Review SLOT_OCCUPANCY_FEATURE.md for detailed troubleshooting

## Success Criteria

Deployment is successful when:
1. ✅ Database migration completes without errors
2. ✅ Backend restarts successfully
3. ✅ Frontend loads without errors
4. ✅ Users can login and access settings
5. ✅ Toggle switch is visible and functional
6. ✅ Saving preference updates database
7. ✅ Main schedule displays/hides info based on preference
8. ✅ No performance degradation
9. ✅ No errors in logs

---

**Date:** 2025-12-03  
**Version:** 1.0.0  
**Status:** Ready for deployment
