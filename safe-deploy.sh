#!/bin/bash

# Safe deployment script that NEVER touches .env files
# This script ensures .env files are ALWAYS excluded from deployment

set -e  # Exit on any error

SERVER="marcb@himalia.uberspace.de"
APP_DIR="daycare-app"

echo "=== Safe Deployment to kitana.marcb.uber.space ==="
echo ""

# Step 1: Build frontend
echo "Step 1: Building frontend..."
cd frontend
npm run build
cd ..
echo "✓ Frontend built"
echo ""

# Step 2: Deploy backend (EXCLUDING .env)
echo "Step 2: Deploying backend..."
rsync -avz \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '.env.example' \
  --exclude 'coverage' \
  --exclude '__tests__' \
  --exclude '*.test.js' \
  backend/ $SERVER:~/$APP_DIR/backend/
echo "✓ Backend deployed (with .env preserved)"
echo ""

# Step 3: Deploy frontend
echo "Step 3: Deploying frontend..."
rsync -avz --delete frontend/build/ $SERVER:~/$APP_DIR/frontend-build/
echo "✓ Frontend deployed"
echo ""

# Step 4: Restart backend on server
echo "Step 4: Restarting backend service..."
ssh $SERVER << 'ENDSSH'
cd ~/daycare-app/backend

# Install/update dependencies
npm install --production

# Verify .env exists
if [ ! -f .env ]; then
  echo "⚠️  ERROR: .env file missing on server!"
  echo "   Please create it manually before deploying."
  exit 1
fi

# Restart service
supervisorctl restart daycare-backend
sleep 2

# Check status
supervisorctl status daycare-backend
ENDSSH

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "✅ Your app is live at: https://kitana.marcb.uber.space/"
echo ""
echo "⚠️  IMPORTANT: .env file is NEVER synced for security!"
echo "   If you need to update server .env, do it manually via SSH."
echo ""
