# Migrating from daycare.marcb.uber.space to kitana.marcb.uber.space

This guide walks you through migrating your application from the `daycare` subdomain to the `kitana` subdomain.

## Prerequisites

- SSH access to your Uberspace server: `ssh marcb@himalia.uberspace.de`
- Current application running at `https://daycare.marcb.uber.space`

## Migration Steps

### Step 1: Add the New Subdomain

```bash
ssh marcb@himalia.uberspace.de
uberspace web domain add kitana.marcb.uber.space
```

Expected output:
```
The webserver's configuration has been adapted.
Now you can use the following records for your DNS:
  A    -> 185.26.156.126
  AAAA -> 2a00:d0c0:200:0:5cc8:8ff:fed6:b83b
```

### Step 2: Configure Web Backend for New Subdomain

Point the new subdomain to your Node.js backend (same port as current):

```bash
uberspace web backend set kitana.marcb.uber.space --http --port 5000
```

Expected output:
```
Set backend for kitana.marcb.uber.space to port 5000; please make sure something is listening!
```

### Step 3: Update Backend Environment Variables

```bash
cd ~/daycare-app/backend
nano .env
```

Update the following lines:
```bash
# Change from:
FRONTEND_URL=https://daycare.marcb.uber.space

# To:
FRONTEND_URL=https://kitana.marcb.uber.space
```

If you have email configuration, also update:
```bash
# Change from:
SMTP_FROM=Kitana <noreply@daycare.marcb.uber.space>

# To:
SMTP_FROM=Kitana <noreply@kitana.marcb.uber.space>
```

Save and exit (Ctrl+O, Enter, Ctrl+X).

### Step 4: Update Frontend Configuration Locally

On your **local machine**, update the frontend environment file:

```bash
cd /Users/Q247532/effective-fortnight/effective-fortnight/frontend
```

Edit `.env.production`:
```bash
# Change from:
REACT_APP_API_URL=https://daycare.marcb.uber.space/api

# To:
REACT_APP_API_URL=https://kitana.marcb.uber.space/api
```

### Step 5: Rebuild and Redeploy Frontend

```bash
cd /Users/Q247532/effective-fortnight/effective-fortnight/frontend
npm run build

# Upload the new build
rsync -avz --delete build/ marcb@himalia.uberspace.de:~/html/
```

### Step 6: Restart Backend Service

```bash
ssh marcb@himalia.uberspace.de
supervisorctl restart daycare-app
```

### Step 7: Verify Migration

Test the new subdomain:

```bash
# Test API health
curl https://kitana.marcb.uber.space/api/health

# Expected response:
{"status":"ok","message":"Kitana API is running"}
```

Visit in browser:
- https://kitana.marcb.uber.space

### Step 8: Update Email Domain (Optional)

If you want emails to come from `@kitana.marcb.uber.space`:

```bash
ssh marcb@himalia.uberspace.de

# Add mail domain
uberspace mail domain add kitana.marcb.uber.space

# Create mailbox
uberspace mail user add noreply@kitana.marcb.uber.space
# (Enter password when prompted)

# Update backend .env
cd ~/daycare-app/backend
nano .env
```

Update SMTP settings:
```bash
SMTP_USER=noreply@kitana.marcb.uber.space
SMTP_PASSWORD=your_mailbox_password
SMTP_FROM=Kitana <noreply@kitana.marcb.uber.space>
```

Restart backend:
```bash
supervisorctl restart daycare-app
```

### Step 9: Remove Old Subdomain (After Verification)

**⚠️ Only do this after confirming the new subdomain works!**

```bash
ssh marcb@himalia.uberspace.de

# Remove old web backend
uberspace web backend del daycare.marcb.uber.space

# Remove old subdomain
uberspace web domain del daycare.marcb.uber.space

# Optional: Remove old mail domain if configured
uberspace mail domain del daycare.marcb.uber.space
```

## Deployment Script Updates

Update your deployment scripts to use the new subdomain:

### deploy-to-subdomain.sh
Change all references from `daycare.marcb.uber.space` to `kitana.marcb.uber.space`

### safe-deploy.sh
Change all references from `daycare.marcb.uber.space` to `kitana.marcb.uber.space`

## DNS Records (Automatic)

Uberspace automatically configures DNS for your subdomain:
- **A Record**: `185.26.156.126` → `kitana.marcb.uber.space`
- **AAAA Record**: `2a00:d0c0:200:0:5cc8:8ff:fed6:b83b` → `kitana.marcb.uber.space`

No manual DNS configuration needed if using Uberspace DNS servers.

## Rollback Plan

If something goes wrong, you can quickly switch back:

```bash
# The old subdomain is still configured until you delete it
# Just rebuild frontend with old API URL and redeploy

cd /Users/Q247532/effective-fortnight/effective-fortnight/frontend
# Revert .env.production to: REACT_APP_API_URL=https://daycare.marcb.uber.space/api
npm run build
rsync -avz --delete build/ marcb@himalia.uberspace.de:~/html/

# Revert backend .env
ssh marcb@himalia.uberspace.de
cd ~/daycare-app/backend
# Change FRONTEND_URL back to https://daycare.marcb.uber.space
supervisorctl restart daycare-app
```

## Verification Checklist

- [ ] New subdomain added to Uberspace
- [ ] Web backend configured for new subdomain
- [ ] Backend .env updated with new FRONTEND_URL
- [ ] Frontend .env.production updated with new API URL
- [ ] Frontend rebuilt with new API URL
- [ ] Frontend deployed to server
- [ ] Backend restarted
- [ ] API health check returns success
- [ ] Can login to application
- [ ] Parent and staff views load correctly
- [ ] Email functionality works (if configured)
- [ ] Push notifications work (if enabled)
- [ ] Old subdomain removed (after confirmation)

## Troubleshooting

### "Cannot connect to API"
- Check that web backend is configured: `uberspace web backend list`
- Verify backend is running: `supervisorctl status daycare-app`
- Check backend logs: `supervisorctl tail -f daycare-app`

### "404 Not Found"
- Verify frontend files deployed: `ls -la ~/html/`
- Check that index.html exists: `cat ~/html/index.html`

### Emails not sending
- Verify mail domain added: `uberspace mail domain list`
- Check mailbox exists: `uberspace mail user list`
- Verify SMTP credentials in backend .env

## Summary

After migration, your application will be available at:
- **New URL**: https://kitana.marcb.uber.space
- **API Endpoint**: https://kitana.marcb.uber.space/api
- **Email From**: noreply@kitana.marcb.uber.space (if configured)

The old `daycare.marcb.uber.space` subdomain can be removed once you've verified everything works.
