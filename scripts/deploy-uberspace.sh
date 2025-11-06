#!/bin/bash

# Deployment script for Uberspace
# This script helps deploy the day-care rotation system to Uberspace

set -e  # Exit on any error

echo "========================================="
echo "Day-Care Rotation System - Uberspace Deployment"
echo "========================================="
echo ""

# Check if required variables are set
if [ -z "$UBERSPACE_USER" ]; then
    read -p "Enter your Uberspace username: " UBERSPACE_USER
fi

if [ -z "$UBERSPACE_HOST" ]; then
    UBERSPACE_HOST="himalia.uberspace.de"
fi

UBERSPACE_SSH="${UBERSPACE_USER}@${UBERSPACE_HOST}"

echo "Deploying to: $UBERSPACE_SSH"
echo ""

# Step 1: Build frontend
echo "Step 1/5: Building frontend..."
cd frontend

# Check if .env.production exists, if not create from template
if [ ! -f .env.production ]; then
    echo "Creating .env.production file..."
    read -p "Enter your production domain (e.g., https://daycare.uber.space): " PROD_DOMAIN
    cat > .env.production << EOF
REACT_APP_API_URL=${PROD_DOMAIN}/api
EOF
fi

npm run build
echo "✓ Frontend build complete"
echo ""

# Step 2: Prepare backend files
echo "Step 2/5: Preparing backend files..."
cd ../backend

# Create a temporary deployment package
DEPLOY_DIR="/tmp/daycare-deploy-$$"
mkdir -p $DEPLOY_DIR/backend
mkdir -p $DEPLOY_DIR/frontend

# Copy backend files (excluding node_modules and dev files)
rsync -av --exclude='node_modules' \
          --exclude='.env' \
          --exclude='coverage' \
          --exclude='*.log' \
          --exclude='__tests__' \
          ./ $DEPLOY_DIR/backend/

# Copy frontend build
cp -r ../frontend/build/* $DEPLOY_DIR/frontend/

echo "✓ Files prepared"
echo ""

# Step 3: Upload to Uberspace
echo "Step 3/5: Uploading to Uberspace..."
echo "Creating directories on server..."
ssh $UBERSPACE_SSH "mkdir -p ~/daycare-app/backend ~/daycare-app/frontend-build"

echo "Uploading backend..."
rsync -avz --delete --exclude='.env' --exclude='node_modules' $DEPLOY_DIR/backend/ $UBERSPACE_SSH:~/daycare-app/backend/

echo "Uploading frontend build..."
rsync -avz --delete $DEPLOY_DIR/frontend/ $UBERSPACE_SSH:~/daycare-app/frontend-build/

echo "✓ Files uploaded"
echo ""

# Step 4: Configure backend on server
echo "Step 4/5: Configuring backend on server..."
ssh $UBERSPACE_SSH << 'ENDSSH'
cd ~/daycare-app/backend

# Install production dependencies
echo "Installing Node.js dependencies..."
npm install --production

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "You need to create ~/daycare-app/backend/.env with your configuration"
    echo "See .env.example for required variables"
fi

# Create supervisord config if it doesn't exist
if [ ! -f ~/etc/services.d/daycare-backend.ini ]; then
    echo "Creating supervisor configuration..."
    cat > ~/etc/services.d/daycare-backend.ini << EOF
[program:daycare-backend]
directory=%(ENV_HOME)s/daycare-app/backend
command=/usr/bin/node server.js
autorestart=true
stdout_logfile=%(ENV_HOME)s/logs/daycare-backend.log
stderr_logfile=%(ENV_HOME)s/logs/daycare-backend-error.log
EOF
    
    # Create logs directory
    mkdir -p ~/logs
    
    echo "Reloading supervisor..."
    supervisorctl reread
    supervisorctl update
fi

echo "✓ Backend configured"
ENDSSH

echo ""

# Step 5: Start/Restart service
echo "Step 5/5: Starting service..."
ssh $UBERSPACE_SSH << 'ENDSSH'
# Restart the backend service
supervisorctl restart daycare-backend

# Wait a moment for service to start
sleep 2

# Check status
echo ""
echo "Service status:"
supervisorctl status daycare-backend
ENDSSH

echo ""
echo "========================================="
echo "✓ Deployment Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Create .env file on server if not exists:"
echo "   ssh $UBERSPACE_SSH"
echo "   nano ~/daycare-app/backend/.env"
echo ""
echo "2. Configure web backend to point EVERYTHING to Node.js:"
echo "   uberspace web backend set / --http --port 5000"
echo ""
echo "3. Set up domain (if needed):"
echo "   uberspace web domain add yourdomain.com"
echo ""
echo "4. Access your app at:"
echo "   https://${UBERSPACE_USER}.uber.space/"
echo ""
echo "To view logs:"
echo "   ssh $UBERSPACE_SSH tail -f ~/logs/daycare-backend.log"
echo ""

# Cleanup
rm -rf $DEPLOY_DIR
