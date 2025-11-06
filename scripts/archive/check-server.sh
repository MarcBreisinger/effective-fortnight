#!/bin/bash

# Run this script ON THE UBERSPACE SERVER to debug issues
# Usage: ssh your_user@himalia.uberspace.de 'bash -s' < check-server.sh

echo "========================================="
echo "Server-Side Diagnostics"
echo "========================================="
echo ""

echo "1. Frontend Files Check"
echo "------------------------"
echo "HTML directory contents:"
ls -lh ~/html/ | head -20

echo ""
echo "Index.html exists:"
[ -f ~/html/index.html ] && echo "✓ YES" || echo "✗ NO"

echo ""
echo "Static directory exists:"
[ -d ~/html/static ] && echo "✓ YES" || echo "✗ NO"

if [ -f ~/html/index.html ]; then
    echo ""
    echo "Asset paths in index.html (first 10 references):"
    grep -oE '(src|href)="[^"]*"' ~/html/index.html | head -10
fi

echo ""
echo "2. Backend Service Check"
echo "------------------------"
supervisorctl status daycare-backend

echo ""
echo "Backend responding on port 5000:"
if curl -s http://localhost:5000/api/auth/me > /dev/null 2>&1; then
    echo "✓ Backend is responding"
else
    echo "✗ Backend NOT responding"
fi

echo ""
echo "3. Configuration Check"
echo "------------------------"
echo ".env file exists:"
[ -f ~/daycare-app/backend/.env ] && echo "✓ YES" || echo "✗ NO"

if [ -f ~/daycare-app/backend/.env ]; then
    echo ""
    echo "Environment variables (keys only):"
    grep "^[A-Z]" ~/daycare-app/backend/.env | cut -d= -f1 | sort
fi

echo ""
echo "4. Web Backend Configuration"
echo "-----------------------------"
uberspace web backend list

echo ""
echo "5. Recent Logs"
echo "--------------"
echo "Backend output (last 15 lines):"
tail -n 15 ~/logs/daycare-backend.log 2>/dev/null || echo "No log file"

echo ""
echo "Backend errors (last 10 lines):"
tail -n 10 ~/logs/daycare-backend-error.log 2>/dev/null || echo "No error log"

echo ""
echo "6. Port Check"
echo "-------------"
echo "Port 5000 listening:"
ss -tlnp | grep :5000 || echo "✗ Port 5000 not listening"

echo ""
echo "7. Quick Test"
echo "-------------"
echo "Testing backend API:"
curl -s http://localhost:5000/api/auth/me 2>&1 | head -5

echo ""
echo "Testing frontend access:"
curl -I http://localhost/index.html 2>&1 | head -10

echo ""
echo "========================================="
echo "Diagnostics Complete"
echo "========================================="
