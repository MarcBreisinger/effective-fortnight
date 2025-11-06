#!/bin/bash

# Verify Node.js can serve frontend files

UBERSPACE_USER="marcb"
UBERSPACE_HOST="himalia.uberspace.de"
UBERSPACE_SSH="${UBERSPACE_USER}@${UBERSPACE_HOST}"

echo "Checking Node.js static file serving..."
echo ""

/usr/bin/ssh $UBERSPACE_SSH << 'ENDSSH'

echo "1. Does frontend-build directory exist?"
if [ -d ~/daycare-app/frontend-build ]; then
    echo "✓ ~/daycare-app/frontend-build exists"
    ls -lh ~/daycare-app/frontend-build/ | head -10
else
    echo "✗ ~/daycare-app/frontend-build DOES NOT EXIST"
    echo ""
    echo "Checking if files are in old location:"
    ls -lh ~/html/ | head -10
fi

echo ""
echo "2. Check static directory:"
if [ -d ~/daycare-app/frontend-build/static/js ]; then
    echo "✓ Static files exist:"
    ls ~/daycare-app/frontend-build/static/js/*.js
else
    echo "✗ Static directory missing"
fi

echo ""
echo "3. What does server.js expect?"
grep -A 2 "frontendPath" ~/daycare-app/backend/server.js

echo ""
echo "4. Test with actual filename:"
JSFILE=$(ls ~/daycare-app/frontend-build/static/js/main.*.js 2>/dev/null | head -1)
if [ -n "$JSFILE" ]; then
    BASENAME=$(basename "$JSFILE")
    echo "Testing: http://localhost:5000/static/js/$BASENAME"
    curl -I "http://localhost:5000/static/js/$BASENAME" 2>&1 | grep -E "HTTP|Content-Type"
else
    echo "No JS file found to test"
fi

echo ""
echo "5. Check NODE_ENV:"
grep NODE_ENV ~/daycare-app/backend/.env

echo ""
echo "6. Backend logs:"
tail -10 ~/logs/daycare-backend-error.log 2>/dev/null

ENDSSH
