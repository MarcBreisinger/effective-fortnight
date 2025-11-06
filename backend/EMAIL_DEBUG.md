# Email Debugging Procedure - Password Reset

This guide helps you debug why password reset emails are not being sent in production.

## ⚡ Quick Fix - "SMTP not configured" Error

If you're seeing `SMTP not configured. Emails will be logged to console only.`, follow these steps:

### Step 1: Create a mailbox on Uberspace
```bash
ssh marcb@himalia.uberspace.de
uberspace mail user add noreply
# Enter a password when prompted - remember this password!
```

### Step 2: Add email configuration to .env
```bash
cd ~/daycare-app/backend
nano .env
```

Add these lines (replace `YOUR_PASSWORD` with the password from Step 1):
```env
SMTP_HOST=himalia.uberspace.de
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@marcb.uber.space
SMTP_PASS=YOUR_PASSWORD
SMTP_FROM=Day-Care System <noreply@marcb.uber.space>
```

**IMPORTANT**: 
- Use `SMTP_` prefix, not `EMAIL_`!
- Port 587 uses STARTTLS, so `SMTP_SECURE=false`
- For port 465 (direct SSL), use `SMTP_SECURE=true`

Save (Ctrl+O, Enter) and exit (Ctrl+X).

### Step 3: Restart the backend
```bash
supervisorctl restart daycare-backend
```

### Step 4: Test it
```bash
cd ~/daycare-app/backend
node test-email.js
```

Should now show: `✓ Email sent successfully!`

Check your inbox at `marcb@himalia.uberspace.de` or wherever you set up mail forwarding.

---

## Quick Diagnostic Steps

### 1. Check if Email Configuration is Set

SSH to your server and check the backend `.env` file:

```bash
ssh marcb@himalia.uberspace.de
cat ~/daycare-app/backend/.env | grep EMAIL
```

**Expected output** (with your actual values):
```
SMTP_HOST=himalia.uberspace.de
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@yourdomain.com
SMTP_PASS=your_email_password
SMTP_FROM=Day-Care System <noreply@yourdomain.com>
```

**Note**: 
- Use `SMTP_` prefix, not `EMAIL_`!
- Port 587 = `SMTP_SECURE=false` (STARTTLS)
- Port 465 = `SMTP_SECURE=true` (Direct SSL)

**If missing**: Email won't be sent. See "Setup Email Configuration" below.

### 2. Check Backend Logs for Email Errors

```bash
ssh marcb@himalia.uberspace.de
tail -50 ~/logs/daycare-backend-error.log | grep -i email
```

Look for errors like:
- `SMTP connection failed`
- `Invalid login`
- `Connection timeout`
- `Email sending failed`

### 3. Test Email Functionality Directly on Server

Create a test script on the server:

```bash
ssh marcb@himalia.uberspace.de
cd ~/daycare-app/backend
cat > test-email.js << 'EOF'
require('dotenv').config({ path: __dirname + '/.env' });
const { sendPasswordResetEmail } = require('./utils/emailService');

async function testEmail() {
  try {
    console.log('Email config:');
    console.log('HOST:', process.env.SMTP_HOST);
    console.log('PORT:', process.env.SMTP_PORT);
    console.log('USER:', process.env.SMTP_USER);
    console.log('FROM:', process.env.SMTP_FROM);
    console.log('PASSWORD:', process.env.SMTP_PASS ? '***set***' : 'NOT SET');
    
    console.log('\nAttempting to send test email...');
    await sendPasswordResetEmail(
      'post@marcb.uber.space',
      'test-token-12345',
      'Test User'
    );
    console.log('✓ Email sent successfully!');
  } catch (error) {
    console.error('✗ Email failed:', error.message);
    console.error('Full error:', error);
  }
}

testEmail();
EOF

node test-email.js
```

**Expected output**: `✓ Email sent successfully!`

**If you see**: `SMTP not configured. Emails will be logged to console only.`
- This means SMTP_HOST, SMTP_USER, or SMTP_PASS is missing from `.env`
- **IMPORTANT**: The variables must use `SMTP_` prefix (not `EMAIL_`)
- Jump to "Setup Email Configuration" section below

**If failed with other errors**: Check the error message for specific issues.

### 4. Verify SMTP Credentials with Uberspace

Check your Uberspace mailbox settings:

```bash
ssh marcb@himalia.uberspace.de
uberspace mail user list
```

Verify the email user exists and password is correct.

### 5. Test SMTP Connection Manually

```bash
ssh marcb@himalia.uberspace.de
telnet himalia.uberspace.de 587
# Type: EHLO test
# Should see: 250-himalia.uberspace.de
# Type: QUIT
```

If connection fails, SMTP might be blocked or misconfigured.

## Setup Email Configuration

If email environment variables are missing or incorrect:

### Option 1: Use Uberspace's Built-in Mail

Uberspace provides email hosting. Set up like this:

```bash
ssh marcb@himalia.uberspace.de

# Create a mailbox if needed
uberspace mail user add noreply

# Edit backend .env
cd ~/daycare-app/backend
nano .env
```

Add these lines (replace with your actual values):
```env
SMTP_HOST=himalia.uberspace.de
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@marcb.uber.space
SMTP_PASS=your_mailbox_password
SMTP_FROM=Day-Care System <noreply@marcb.uber.space>
```

Save and restart:
```bash
supervisorctl restart daycare-backend
```

### Option 2: Use External SMTP (e.g., Gmail, SendGrid)

For Gmail:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_app_password  # Not regular password - use App Password
SMTP_FROM=Day-Care System <your.email@gmail.com>
```

**Note**: Gmail requires an "App Password", not your regular Gmail password. Generate one at: https://myaccount.google.com/apppasswords

For SendGrid:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
SMTP_FROM=Day-Care System <noreply@yourdomain.com>
```

## Common Issues and Solutions

### Issue 1: "Invalid login" or "Authentication failed"

**Cause**: Wrong username or password

**Fix**:
```bash
# Verify mailbox exists
uberspace mail user list

# Reset password
uberspace mail user password noreply

# Update .env with new password
nano ~/daycare-app/backend/.env

# Restart backend
supervisorctl restart daycare-backend
```

### Issue 2: "Connection timeout" or "ECONNREFUSED"

**Cause**: Wrong host or port

**Fix**:
- For Uberspace: Use `himalia.uberspace.de` and port `587`
- Check firewall/network isn't blocking SMTP
- Try port `465` with `SMTP_SECURE=true` or port `25`

### Issue 2b: "SSL routines:ssl3_get_record:wrong version number"

**Cause**: Wrong SSL/TLS settings for the port

**Fix**:
```bash
nano ~/daycare-app/backend/.env
```

**For port 587** (STARTTLS):
```env
SMTP_PORT=587
SMTP_SECURE=false  # Must be false!
```

**For port 465** (Direct SSL):
```env
SMTP_PORT=465
SMTP_SECURE=true  # Must be true!
```

Restart:
```bash
supervisorctl restart daycare-backend
```

**Port 587** uses STARTTLS (upgrade after connection), so `secure: false` is correct.
**Port 465** uses direct SSL/TLS, so `secure: true` is needed.

### Issue 3: Emails sent but not received

**Cause**: Spam filtering, wrong FROM address, or delivery issues

**Fix**:
1. Check spam/junk folder
2. Verify FROM email matches an existing mailbox
3. Check server logs: `tail -f ~/logs/daycare-backend.log`
4. Test with a different recipient email

### Issue 4: "Missing credentials" in logs

**Cause**: Environment variables not loaded

**Fix**:
```bash
# Verify .env file exists and is readable
ls -la ~/daycare-app/backend/.env
cat ~/daycare-app/backend/.env | grep SMTP

# Check NODE_ENV is set to production
cat ~/daycare-app/backend/.env | grep NODE_ENV

# Restart to reload environment
supervisorctl restart daycare-backend
```

### Issue 5: nodemailer module not installed

**Cause**: Dependencies not installed

**Fix**:
```bash
cd ~/daycare-app/backend
npm install nodemailer
supervisorctl restart daycare-backend
```

## Verify Email is Working End-to-End

### Test via API:

```bash
# On your local machine or server
curl -X POST https://marcb.uber.space/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your_test_email@example.com"}'
```

**Expected response**:
```json
{"message":"If an account exists with that email, a password reset link has been sent"}
```

**Check**:
1. Server logs: `tail -f ~/logs/daycare-backend.log`
2. Email inbox (including spam)
3. Error logs if no email: `tail -f ~/logs/daycare-backend-error.log`

## Production Email Setup Checklist

- [ ] Email environment variables set in `~/daycare-app/backend/.env`
- [ ] Mailbox created on Uberspace (or external SMTP configured)
- [ ] SMTP credentials tested with `test-email.js`
- [ ] Backend restarted after adding email config
- [ ] Test email sent successfully via forgot-password API
- [ ] Email received in inbox (check spam folder)
- [ ] Reset link works and redirects to correct frontend URL

## Advanced Debugging

### Enable SMTP Debug Mode

Edit `backend/utils/emailService.js` temporarily:

```javascript
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  debug: true,  // Add this
  logger: true  // Add this
});
```

Restart backend and check logs: `tail -f ~/logs/daycare-backend.log`

### Check Email Queue

Some email services have queues. Check if emails are queued/delayed:

```bash
# For Uberspace mail
ssh marcb@himalia.uberspace.de
mailq  # Shows mail queue
```

### Test with Multiple Recipients

Try sending to different email providers:
- Gmail
- Outlook/Hotmail
- Yahoo
- Your domain email

If some work and others don't, it's a spam/filtering issue.

## Get Help

If still not working after all these steps:

1. **Collect logs**:
   ```bash
   ssh marcb@himalia.uberspace.de
   cat ~/logs/daycare-backend-error.log > ~/email-debug.log
   cat ~/logs/daycare-backend.log >> ~/email-debug.log
   ```

2. **Run full diagnostic**:
   ```bash
   node test-email.js >> ~/email-debug.log 2>&1
   ```

3. **Check Uberspace mail documentation**:
   https://manual.uberspace.de/mail/

4. **Contact Uberspace support** if mail server issues:
   https://uberspace.de/en/support/

## Quick Fix for Development Testing

If you just need to test the flow without real emails, you can use a service like:

- **Mailtrap** (https://mailtrap.io) - Email testing service
- **Ethereal Email** (https://ethereal.email) - Temporary test accounts

Update `.env` with their SMTP settings for testing purposes.
