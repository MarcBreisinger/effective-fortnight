# Login Troubleshooting Checklist

## Run This First

```bash
cd backend
node test-login.js
```

This will check and fix:
- ✓ Environment variables (JWT_SECRET, database config)
- ✓ Database connection
- ✓ Staff user exists
- ✓ Password hash is correct
- ✓ JWT token generation works

## Common Issues & Solutions

### 1. JWT_SECRET Not Set

**Check:** Is `JWT_SECRET` in your `.env` file?

**Fix:**
```bash
echo "JWT_SECRET=$(openssl rand -base64 32)" >> backend/.env
```

Or manually add to `backend/.env`:
```
JWT_SECRET=any_long_random_string_here
```

### 2. Database Not Initialized

**Check:** Have you run the schema.sql?

**Fix:**
```bash
mysql -h himalia.uberspace.de -u your_user -p your_database < backend/database/schema.sql
```

### 3. Staff User Doesn't Exist

**Fix:** The test-login.js script will create it automatically, or run:
```sql
INSERT INTO users (email, password, first_name, last_name, role) 
VALUES ('staff@daycare.local', '$2a$10$HASH_HERE', 'Admin', 'Staff', 'staff');
```

### 4. Password Hash Mismatch

**Fix:** Run test-login.js - it will update the password hash automatically

### 5. CORS Issues (Frontend Can't Connect)

**Check:** Is the backend server running?
```bash
cd backend
npm run dev
```

**Check:** Is CORS configured? (Already done in server.js)

### 6. Wrong API URL in Frontend

**Check:** `frontend/.env` should have:
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Manual Login Test

After running test-login.js, test login with curl:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"staff@daycare.local","password":"048204"}'
```

Expected response:
```json
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "staff@daycare.local",
    "firstName": "Admin",
    "lastName": "Staff",
    "role": "staff"
  }
}
```

## Check Server Logs

The login route now has enhanced logging. When you try to login, check the backend terminal for:
```
Login attempt for: staff@daycare.local
User found: { id: 1, email: 'staff@daycare.local', role: 'staff' }
Password valid: true
Login successful for: staff@daycare.local
```

If you see "Password valid: false", run test-login.js to fix the password hash.

## Frontend Login Issues

### Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try to login
4. Look for errors

### Check Network Tab
1. Open DevTools → Network tab
2. Try to login
3. Look for the POST request to `/api/auth/login`
4. Check response status and body

### Common Frontend Issues

**Issue:** "Network Error" or "Failed to fetch"
- **Fix:** Backend server not running - start it with `npm run dev` in backend folder

**Issue:** 401 Unauthorized
- **Fix:** Wrong email/password - use `staff@daycare.local` / `048204`

**Issue:** 500 Server Error
- **Fix:** Check backend terminal for error logs

## Quick Debug Steps

1. **Start backend with logs:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Run test script:**
   ```bash
   node test-login.js
   ```

3. **Test with curl:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"staff@daycare.local","password":"048204"}'
   ```

4. **If curl works but frontend doesn't:**
   - Check `frontend/.env` has correct API URL
   - Check browser console for CORS errors
   - Verify frontend is running on http://localhost:3000

## Still Not Working?

Run the test script and share the output:
```bash
cd backend
node test-login.js
```

Also share:
- Backend server logs when you try to login
- Browser console errors (F12 → Console)
- Network tab response (F12 → Network)
