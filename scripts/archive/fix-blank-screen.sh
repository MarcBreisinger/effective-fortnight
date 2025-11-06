#!/bin/bash

# Quick fix script for common blank screen issues

echo "========================================="
echo "Quick Fix for Blank Screen"
echo "========================================="
echo ""

# Most common issue: React needs homepage set to "." for root deployment
echo "Step 1: Checking package.json for homepage field..."
cd frontend

if grep -q '"homepage"' package.json; then
    echo "Homepage field found in package.json"
    grep "homepage" package.json
else
    echo "Adding homepage field to package.json..."
    # Add homepage field after version
    sed -i.bak '/"private": true,/a\
  "homepage": ".",
' package.json
    echo "✓ Added \"homepage\": \".\" to package.json"
fi

echo ""
echo "Step 2: Rebuilding frontend with correct paths..."
npm run build

echo ""
echo "Step 3: Checking build output..."
if [ -f build/index.html ]; then
    echo "✓ Build successful"
    echo ""
    echo "Checking asset paths in index.html:"
    grep -E 'src=|href=' build/index.html | head -5
else
    echo "✗ Build failed - check for errors above"
    exit 1
fi

echo ""
echo "Step 4: Ready to redeploy"
echo ""
echo "Run the deployment script:"
echo "  ./deploy-uberspace.sh"
echo ""
