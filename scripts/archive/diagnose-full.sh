#!/bin/bash

# Complete diagnostic for Node.js serving frontend

UBERSPACE_USER="marcb"
UBERSPACE_HOST="himalia.uberspace.de"
UBERSPACE_SSH="${UBERSPACE_USER}@${UBERSPACE_HOST}"

echo "========================================="
echo "Complete Deployment Diagnostic"
echo "========================================="
echo ""

ssh $UBERSPACE_SSH << 'ENDSSH'
echo "1. Checking frontend-build directory:"
ls -lh ~/daycare-app/frontend-build/ 2>/dev/null | head -15
echo ""
if [ -f ~/daycare-app/frontend-build/index.html ]; then
    echo "✓ frontend-build/index.html exists"
else
    echo "✗ frontend-build/index.html MISSING"
fi

echo ""
echo "2. Checking if static files exist:"
if [ -d ~/daycare-app/frontend-build/static ]; then
    echo "✓ static directory exists"
    ls -lh ~/daycare-app/frontend-build/static/js/*.js 2>/dev/null | head -3
else
    echo "✗ static directory MISSING"
fi

echo ""
echo "3. Backend service status:"
supervisorctl status daycare-backend

echo ""
echo "4. Testing if Node.js serves frontend (localhost):"
echo "Root path:"
curl -I http://localhost:5000/ 2>&1 | grep -E "HTTP|Content-Type"
echo ""
echo "Static JS file:"
JSFILE=$(ls ~/daycare-app/frontend-build/static/js/*.js 2>/dev/null | head -1 | xargs basename)
if [ -n "$JSFILE" ]; then
    curl -I "http://localhost:5000/static/js/$JSFILE" 2>&1 | grep -E "HTTP|Content-Type"
fi

echo ""
echo "5. Web backend configuration:"
uberspace web backend list

echo ""
echo "6. Testing external URL:"
curl -I https://marcb.uber.space/ 2>&1 | grep -E "HTTP|Content-Type|X-Backend"

echo ""
echo "7. Checking backend logs for errors:"
tail -n 20 ~/logs/daycare-backend-error.log 2>/dev/null | tail -10

echo ""
echo "8. Checking if frontend path is correct in server.js:"
cd ~/daycare-app/backend
grep -A 2 "frontendPath" server.js || echo "frontendPath not found in server.js"

echo ""
echo "9. Testing what Node.js returns:"
echo "Getting actual content from localhost:5000:"
curl -s http://localhost:5000/ | head -10

ENDSSH

echo ""
echo "========================================="
echo "Diagnostic Complete"
echo "========================================="
