#!/bin/bash

# Deploy to kitana.marcb.uber.space subdomain
# This script:
# 1. Adds the subdomain on Uberspace
# 2. Builds the frontend with updated API URL
# 3. Deploys backend and frontend
# 4. Configures web backend to route subdomain to port 5000
# 5. Restarts the service

set -e  # Exit on any error

SERVER="marcb@himalia.uberspace.de"
APP_DIR="daycare-app"

echo "=== Deploying to kitana.marcb.uber.space ==="

# Step 1: Build frontend with production settings
echo ""
echo "Step 1: Building frontend..."
cd frontend
npm run build
cd ..

# Step 2: Upload backend files
echo ""
echo "Step 2: Uploading backend files..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude 'coverage' \
  --exclude '__tests__' \
  --exclude '*.test.js' \
  backend/ $SERVER:~/$APP_DIR/backend/

# Step 3: Upload frontend build
echo ""
echo "Step 3: Uploading frontend build..."
rsync -avz --delete frontend/build/ $SERVER:~/$APP_DIR/frontend-build/

# Step 4: Configure and restart service on server (single SSH session)
echo ""
echo "Step 4: Configuring server (single SSH session)..."
ssh $SERVER << 'ENDSSH'
# Add subdomain on Uberspace (if not already added)
echo "Adding subdomain to Uberspace..."
uberspace web domain add kitana.marcb.uber.space || echo 'Subdomain already exists'

# Install backend dependencies and configure
echo "Configuring backend..."
cd ~/daycare-app/backend

# Install production dependencies
npm install --production

# Update .env with new FRONTEND_URL
if [ -f .env ]; then
  # Update FRONTEND_URL if it exists
  if grep -q "^FRONTEND_URL=" .env; then
    sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=https://kitana.marcb.uber.space|' .env
  else
    # Add FRONTEND_URL if it doesn't exist
    echo "FRONTEND_URL=https://kitana.marcb.uber.space" >> .env
  fi
  
  # Update SMTP_FROM if using marcb.uber.space email
  if grep -q "^SMTP_FROM=.*@marcb.uber.space" .env; then
    echo ""
    echo "⚠️  WARNING: You're using @marcb.uber.space email address."
    echo "   Consider updating SMTP_FROM to match your subdomain:"
    echo "   SMTP_FROM=Kitana <noreply@kitana.marcb.uber.space>"
    echo ""
  fi
else
  echo "⚠️  WARNING: .env file not found on server!"
  echo "   Create one based on .env.example"
fi

echo "Backend configured."

# Ensure supervisor config has NODE_ENV=production
echo "Ensuring supervisor configuration is correct..."
cat > ~/etc/services.d/daycare-backend.ini << 'EOF'
[program:daycare-backend]
directory=%(ENV_HOME)s/daycare-app/backend
command=node server.js
environment=NODE_ENV=production
autorestart=true
startsecs=30
EOF

# Reload supervisor configuration
supervisorctl reread
supervisorctl update

# Configure web backend to route subdomain to Node.js
echo "Configuring web backend for subdomain..."
uberspace web backend set kitana.marcb.uber.space --http --port 5000

# Restart supervisor service
echo "Restarting backend service..."
supervisorctl restart daycare-backend

# Check service status
echo "Checking service status..."
supervisorctl status daycare-backend
ENDSSH

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "🎉 Your app should now be accessible at:"
echo "   https://kitana.marcb.uber.space/"
echo ""
echo "📧 Email Configuration:"
echo "   If you want emails to come from @kitana.marcb.uber.space,"
echo "   you need to:"
echo "   1. SSH to server: ssh $SERVER"
echo "   2. Add mail domain: uberspace mail domain add kitana.marcb.uber.space"
echo "   3. Create mailbox: uberspace mail user add noreply@kitana.marcb.uber.space"
echo "   4. Update .env: SMTP_USER=noreply@kitana.marcb.uber.space"
echo "   5. Update .env: SMTP_FROM=Kitana <noreply@kitana.marcb.uber.space>"
echo "   6. Restart: supervisorctl restart daycare-backend"
echo ""
echo "🔍 Troubleshooting:"
echo "   - Check logs: ssh $SERVER 'tail -f ~/logs/daycare-backend-error.log'"
echo "   - Test API: curl https://kitana.marcb.uber.space/api/health"
echo "   - If blank screen: Hard refresh browser (Cmd+Shift+R)"
echo ""
