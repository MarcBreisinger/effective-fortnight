#!/bin/bash

# Debugging script for blank screen issues on Uberspace

echo "========================================="
echo "Day-Care App - Deployment Debugging"
echo "========================================="
echo ""

if [ -z "$UBERSPACE_USER" ]; then
    read -p "Enter your Uberspace username: " UBERSPACE_USER
fi

if [ -z "$UBERSPACE_HOST" ]; then
    UBERSPACE_HOST="himalia.uberspace.de"
fi

UBERSPACE_SSH="${UBERSPACE_USER}@${UBERSPACE_HOST}"

echo "Debugging deployment on: $UBERSPACE_SSH"
echo ""

echo "========================================="
echo "1. Checking Frontend Files"
echo "========================================="
ssh $UBERSPACE_SSH << 'ENDSSH'
echo "Frontend directory contents:"
ls -lah ~/html/ | head -20

echo ""
echo "Checking for index.html:"
if [ -f ~/html/index.html ]; then
    echo "✓ index.html exists"
    echo "File size: $(stat -f%z ~/html/index.html) bytes"
else
    echo "✗ index.html NOT FOUND"
fi

echo ""
echo "Checking for static assets:"
if [ -d ~/html/static ]; then
    echo "✓ static directory exists"
    ls -lh ~/html/static/
else
    echo "✗ static directory NOT FOUND"
fi
ENDSSH

echo ""
echo "========================================="
echo "2. Checking Backend Service"
echo "========================================="
ssh $UBERSPACE_SSH << 'ENDSSH'
echo "Backend service status:"
supervisorctl status daycare-backend

echo ""
echo "Checking if backend is responding:"
curl -s http://localhost:5000/api/auth/me || echo "Backend not responding"

echo ""
echo "Recent backend logs (last 20 lines):"
tail -n 20 ~/logs/daycare-backend.log

echo ""
echo "Recent backend errors (last 10 lines):"
tail -n 10 ~/logs/daycare-backend-error.log
ENDSSH

echo ""
echo "========================================="
echo "3. Checking Web Backend Configuration"
echo "========================================="
ssh $UBERSPACE_SSH << 'ENDSSH'
echo "Web backend configuration:"
uberspace web backend list
ENDSSH

echo ""
echo "========================================="
echo "4. Checking Environment Configuration"
echo "========================================="
ssh $UBERSPACE_SSH << 'ENDSSH'
if [ -f ~/daycare-app/backend/.env ]; then
    echo "✓ Backend .env file exists"
    echo "Environment variables (keys only):"
    grep "^[A-Z]" ~/daycare-app/backend/.env | cut -d= -f1
else
    echo "✗ Backend .env file NOT FOUND"
fi
ENDSSH

echo ""
echo "========================================="
echo "5. Browser Console Debugging Steps"
echo "========================================="
echo ""
echo "To debug the blank screen, open your browser's developer console:"
echo "1. Visit: https://${UBERSPACE_USER}.uber.space/"
echo "2. Press F12 or right-click and select 'Inspect'"
echo "3. Go to the 'Console' tab"
echo "4. Look for errors (they will be in red)"
echo ""
echo "Common issues and solutions:"
echo ""
echo "Issue: 'Failed to load resource' or 404 errors for JS/CSS files"
echo "Solution: Check if 'homepage' is set in frontend/package.json"
echo "          It should be: \"homepage\": \".\" or removed entirely"
echo ""
echo "Issue: 'CORS' or 'Cross-Origin' errors"
echo "Solution: Check REACT_APP_API_URL in .env.production matches your domain"
echo ""
echo "Issue: Console shows nothing (completely blank)"
echo "Solution: View page source (Ctrl+U) to check if HTML is loading"
echo ""
echo "Issue: 'Cannot GET /' or similar routing errors"
echo "Solution: Check .htaccess or web server configuration"
echo ""

echo "========================================="
echo "6. Quick Fixes to Try"
echo "========================================="
echo ""
echo "If static files (JS/CSS) return 404:"
echo "  1. Add '\"homepage\": \".\"' to frontend/package.json"
echo "  2. Rebuild: cd frontend && npm run build"
echo "  3. Redeploy: ./deploy-uberspace.sh"
echo ""
echo "If API calls fail:"
echo "  ssh $UBERSPACE_SSH"
echo "  Check: cat ~/daycare-app/backend/.env | grep FRONTEND_URL"
echo "  Should be: FRONTEND_URL=https://${UBERSPACE_USER}.uber.space"
echo ""
echo "If backend is not running:"
echo "  ssh $UBERSPACE_SSH"
echo "  supervisorctl restart daycare-backend"
echo "  supervisorctl status daycare-backend"
echo ""

echo "========================================="
echo "7. Advanced Debugging"
echo "========================================="
echo ""
echo "Test frontend directly:"
echo "  curl -I https://${UBERSPACE_USER}.uber.space/"
echo ""
echo "Test API directly:"
echo "  curl https://${UBERSPACE_USER}.uber.space/api/auth/me"
echo ""
echo "View live backend logs:"
echo "  ssh $UBERSPACE_SSH tail -f ~/logs/daycare-backend.log"
echo ""
echo "Check web server error log:"
echo "  ssh $UBERSPACE_SSH tail -f ~/logs/error_log"
echo ""
