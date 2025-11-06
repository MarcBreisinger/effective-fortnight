#!/bin/bash

# Check what's actually deployed on the server

UBERSPACE_USER="marcb"
UBERSPACE_HOST="himalia.uberspace.de"
UBERSPACE_SSH="${UBERSPACE_USER}@${UBERSPACE_HOST}"

echo "Checking deployed files on server..."
echo ""

ssh $UBERSPACE_SSH << 'ENDSSH'
echo "===== ~/html/ directory structure ====="
ls -laR ~/html/ | head -50

echo ""
echo "===== Checking for index.html ====="
if [ -f ~/html/index.html ]; then
    echo "✓ index.html exists"
    echo "First 30 lines of index.html:"
    head -n 30 ~/html/index.html
else
    echo "✗ index.html NOT FOUND in ~/html/"
fi

echo ""
echo "===== Checking for static directory ====="
if [ -d ~/html/static ]; then
    echo "✓ static directory exists"
    echo "Contents:"
    ls -lR ~/html/static/ | head -30
else
    echo "✗ static directory NOT FOUND"
fi

echo ""
echo "===== Checking actual file paths ====="
if [ -f ~/html/index.html ]; then
    echo "Script tags in index.html:"
    grep -E '<script.*src=' ~/html/index.html
    echo ""
    echo "Link tags in index.html:"
    grep -E '<link.*href=' ~/html/index.html
fi

echo ""
echo "===== Testing file access via curl ====="
echo "Testing index.html:"
curl -I http://localhost/index.html 2>&1 | head -10

echo ""
if [ -d ~/html/static ]; then
    FIRST_JS=$(find ~/html/static -name "*.js" -type f | head -1)
    if [ -n "$FIRST_JS" ]; then
        RELATIVE_PATH=${FIRST_JS#~/html/}
        echo "Testing first JS file found: $RELATIVE_PATH"
        curl -I http://localhost/$RELATIVE_PATH 2>&1 | head -10
    fi
fi
ENDSSH
