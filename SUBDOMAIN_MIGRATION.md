# Subdomain Migration History

The application was moved from `https://marcb.uber.space/` to `https://daycare.marcb.uber.space/`, and then to `https://kitana.marcb.uber.space/`.

## What Changed

### Current Configuration (as of December 2025)

**Frontend Configuration:**
- `frontend/.env.production`: `https://kitana.marcb.uber.space/api`

**Backend Configuration:**
- Web backend routes `kitana.marcb.uber.space` to Node.js port 5000
- FRONTEND_URL in production `.env`: `https://kitana.marcb.uber.space`

### Deployment
- Created `scripts/deploy-to-subdomain.sh` for automated deployment
- This script handles:
  - Adding subdomain to Uberspace
  - Building frontend with updated API URL
  - Uploading backend and frontend
  - Configuring web backend routing
  - Restarting the service

## DNS Configuration

The subdomain uses Uberspace's automatic DNS:
- **A Record**: `185.26.156.126` → `daycare.marcb.uber.space`
- **AAAA Record**: `2a00:d0c0:200:0:5cc8:8ff:fed6:b83b` → `daycare.marcb.uber.space`

No manual DNS configuration needed if using Uberspace DNS servers.

## Email Configuration (Optional)

To have emails sent from `@daycare.marcb.uber.space` instead of `@marcb.uber.space`:

### Step 1: Add Mail Domain
```bash
ssh marcb@himalia.uberspace.de
uberspace mail domain add daycare.marcb.uber.space
```

### Step 2: Create Mailbox
```bash
uberspace mail user add noreply@daycare.marcb.uber.space
# Enter password when prompted
```

### Step 3: Update Backend .env
```bash
cd ~/daycare-app/backend
nano .env
```

Update these lines:
```env
SMTP_USER=noreply@daycare.marcb.uber.space
SMTP_FROM=Day-Care System <noreply@daycare.marcb.uber.space>
```

### Step 4: Restart Service
```bash
supervisorctl restart daycare-backend
```

### Step 5: Test Email
```bash
cd ~/daycare-app/backend
cat > test-email-subdomain.js << 'EOF'
require('dotenv').config({ path: __dirname + '/.env' });
const { sendPasswordResetEmail } = require('./utils/emailService');

async function test() {
  const testEmail = process.argv[2] || 'your.email@gmail.com';
  
  console.log('Testing email from subdomain:');
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_FROM:', process.env.SMTP_FROM);
  console.log('Sending to:', testEmail);
  
  try {
    await sendPasswordResetEmail(testEmail, 'test-token-123', 'Test User');
    console.log('✓ Email sent successfully!');
  } catch (error) {
    console.error('✗ Failed:', error.message);
  }
}

test();
EOF

node test-email-subdomain.js your.email@gmail.com
```

## Accessing the Application

- **Frontend**: https://daycare.marcb.uber.space/
- **API**: https://daycare.marcb.uber.space/api
- **Health Check**: https://daycare.marcb.uber.space/api/health

## Troubleshooting

### Blank Screen After Deployment
Clear your browser cache or do a hard refresh:
- **Chrome/Edge**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- **Firefox**: `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows)
- **Safari**: `Cmd+Option+E` to clear cache, then `Cmd+R`

### API Not Responding
Check backend logs:
```bash
ssh marcb@himalia.uberspace.de
tail -f ~/logs/daycare-backend-error.log
```

Check service status:
```bash
ssh marcb@himalia.uberspace.de
supervisorctl status daycare-backend
```

### Email Issues
See [EMAIL_DEBUG.md](backend/EMAIL_DEBUG.md) and [EMAIL_DELIVERABILITY.md](backend/EMAIL_DELIVERABILITY.md) for comprehensive email troubleshooting.

## Deployment Script

For future deployments, use:
```bash
./scripts/deploy-to-subdomain.sh
```

This will:
1. Build the frontend with production settings
2. Upload all files to the server
3. Configure the web backend
4. Restart the service

## Reverting to Main Domain

If you need to go back to `marcb.uber.space`:

1. Update `frontend/.env.production`:
   ```env
   REACT_APP_API_URL=https://marcb.uber.space/api
   ```

2. Rebuild and deploy:
   ```bash
   ./scripts/deploy-uberspace.sh
   ```

3. Configure web backend:
   ```bash
   ssh marcb@himalia.uberspace.de "uberspace web backend set marcb.uber.space --http --port 5000"
   ```

4. Restart service:
   ```bash
   ssh marcb@himalia.uberspace.de "supervisorctl restart daycare-backend"
   ```
