#!/bin/bash

# Emergency rebuild and redeploy - bypasses deployment script

echo "========================================="
echo "Emergency Rebuild and Redeploy"
echo "========================================="
echo ""

echo "Step 1: Clean and rebuild frontend..."
cd frontend

# Remove old build
rm -rf build

# Build fresh
echo "Building..."
npm run build

if [ ! -f build/index.html ]; then
    echo "✗ Build failed!"
    exit 1
fi

echo "✓ Build successful"
echo ""

echo "Build contents:"
ls -lh build/ | head -10
echo ""

echo "Static assets:"
if [ -d build/static ]; then
    echo "JS files:"
    ls -lh build/static/js/*.js 2>/dev/null | head -3
    echo "CSS files:"
    ls -lh build/static/css/*.css 2>/dev/null | head -3
fi

echo ""
echo "Step 2: Upload directly to server..."
rsync -avz --delete build/ marcb@himalia.uberspace.de:~/html/

echo ""
echo "Step 3: Verify on server..."
ssh marcb@himalia.uberspace.de << 'ENDSSH'
echo "Uploaded files:"
ls -lah ~/html/ | head -20

echo ""
if [ -f ~/html/index.html ]; then
    echo "✓ index.html uploaded"
    SIZE=$(stat -f%z ~/html/index.html 2>/dev/null || stat -c%s ~/html/index.html 2>/dev/null)
    echo "  Size: $SIZE bytes"
else
    echo "✗ index.html missing!"
fi

echo ""
if [ -d ~/html/static ]; then
    echo "✓ static directory uploaded"
    echo "  JS files:"
    ls ~/html/static/js/*.js 2>/dev/null | wc -l | xargs echo "   Count:"
    echo "  CSS files:"
    ls ~/html/static/css/*.css 2>/dev/null | wc -l | xargs echo "   Count:"
else
    echo "✗ static directory missing!"
fi

echo ""
echo "Testing HTTP access:"
curl -sI http://localhost/index.html | head -5

echo ""
echo "Content of index.html (first script tag):"
grep -m1 '<script' ~/html/index.html
ENDSSH

echo ""
echo "========================================="
echo "✓ Deployment Complete"
echo "========================================="
echo ""
echo "Now test in browser:"
echo "  1. Open: https://marcb.uber.space/"
echo "  2. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
echo "  3. Check browser console (F12) for any remaining errors"
echo ""
