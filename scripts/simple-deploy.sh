#!/bin/bash

# Simple deployment - just push files
# Use full paths to avoid PATH issues

UBERSPACE_USER="marcb"
UBERSPACE_HOST="himalia.uberspace.de"
UBERSPACE_SSH="${UBERSPACE_USER}@${UBERSPACE_HOST}"

echo "Deploying to Uberspace..."
echo ""

# Upload backend (exclude node_modules and .env)
echo "1. Uploading backend..."
/usr/bin/rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.env' \
  backend/ $UBERSPACE_SSH:~/daycare-app/backend/

# Upload frontend build
echo ""
echo "2. Uploading frontend build..."
/usr/bin/rsync -avz --delete \
  frontend/build/ $UBERSPACE_SSH:~/daycare-app/frontend-build/

echo ""
echo "========================================="
echo "Files uploaded successfully!"
echo "========================================="
echo ""
echo "Now SSH to server and run these commands:"
echo ""
echo "  /usr/bin/ssh $UBERSPACE_SSH"
echo ""
echo "Once on the server:"
echo "  cd ~/daycare-app/backend"
echo "  npm install --production"
echo "  supervisorctl restart daycare-backend"
echo "  uberspace web backend set / --http --port 5000"
echo ""
