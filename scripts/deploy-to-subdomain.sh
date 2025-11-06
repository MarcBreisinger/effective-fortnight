#!/bin/bash

# Deploy to daycare.marcb.uber.space subdomain
# This script:
# 1. Adds the subdomain on Uberspace
# 2. Builds the frontend with updated API URL
# 3. Deploys backend and frontend
# 4. Configures web backend to route subdomain to port 5000
# 5. Restarts the service

set -e  # Exit on any error

SERVER="marcb@himalia.uberspace.de"
APP_DIR="daycare-app"

echo "=== Deploying to daycare.marcb.uber.space ==="

# Step 1: Add subdomain on Uberspace (if not already added)
echo ""
echo "Step 1: Adding subdomain to Uberspace..."
ssh $SERVER "uberspace web domain add daycare.marcb.uber.space || echo 'Subdomain already exists'"

# Step 2: Build frontend with production settings
echo ""
echo "Step 2: Building frontend..."
cd frontend
npm run build
cd ..

# Step 3: Upload backend files
echo ""
echo "Step 3: Uploading backend files..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude 'coverage' \
  --exclude '__tests__' \
  --exclude '*.test.js' \
  backend/ $SERVER:~/$APP_DIR/backend/

# Step 4: Upload frontend build
echo ""
echo "Step 4: Uploading frontend build..."
rsync -avz --delete frontend/build/ $SERVER:~/$APP_DIR/frontend-build/

# Step 5: Install backend dependencies and configure
echo ""
echo "Step 5: Configuring backend on server..."
ssh $SERVER << 'ENDSSH'
cd ~/daycare-app/backend

# Install production dependencies
npm install --production

# Update .env with new FRONTEND_URL
if [ -f .env ]; then
  # Update FRONTEND_URL if it exists
  if grep -q "^FRONTEND_URL=" .env; then
    sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=https://daycare.marcb.uber.space|' .env
  else
    # Add FRONTEND_URL if it doesn't exist
    echo "FRONTEND_URL=https://daycare.marcb.uber.space" >> .env
  fi
  
  # Update SMTP_FROM if using marcb.uber.space email
  if grep -q "^SMTP_FROM=.*@marcb.uber.space" .env; then
    echo ""
    echo "⚠️  WARNING: You're using @marcb.uber.space email address."
    echo "   Consider updating SMTP_FROM to match your subdomain:"
    echo "   SMTP_FROM=Day-Care System <noreply@daycare.marcb.uber.space>"
    echo ""
  fi
else
  echo "⚠️  WARNING: .env file not found on server!"
  echo "   Create one based on .env.example"
fi

echo "Backend configured."
ENDSSH

# Step 6: Configure web backend to route subdomain to Node.js
echo ""
echo "Step 6: Configuring web backend for subdomain..."
ssh $SERVER "uberspace web backend set daycare.marcb.uber.space --http --port 5000"

# Step 7: Restart supervisor service
echo ""
echo "Step 7: Restarting backend service..."
ssh $SERVER "supervisorctl restart daycare-backend"

# Step 8: Check service status
echo ""
echo "Step 8: Checking service status..."
ssh $SERVER "supervisorctl status daycare-backend"

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "🎉 Your app should now be accessible at:"
echo "   https://daycare.marcb.uber.space/"
echo ""
echo "📧 Email Configuration:"
echo "   If you want emails to come from @daycare.marcb.uber.space,"
echo "   you need to:"
echo "   1. SSH to server: ssh $SERVER"
echo "   2. Add mail domain: uberspace mail domain add daycare.marcb.uber.space"
echo "   3. Create mailbox: uberspace mail user add noreply@daycare.marcb.uber.space"
echo "   4. Update .env: SMTP_USER=noreply@daycare.marcb.uber.space"
echo "   5. Update .env: SMTP_FROM=Day-Care System <noreply@daycare.marcb.uber.space>"
echo "   6. Restart: supervisorctl restart daycare-backend"
echo ""
echo "🔍 Troubleshooting:"
echo "   - Check logs: ssh $SERVER 'tail -f ~/logs/daycare-backend-error.log'"
echo "   - Test API: curl https://daycare.marcb.uber.space/api/health"
echo "   - If blank screen: Hard refresh browser (Cmd+Shift+R)"
echo ""
