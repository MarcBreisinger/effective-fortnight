#!/bin/bash

# Check and fix Uberspace web server configuration

UBERSPACE_USER="marcb"
UBERSPACE_HOST="himalia.uberspace.de"
UBERSPACE_SSH="${UBERSPACE_USER}@${UBERSPACE_HOST}"

echo "========================================="
echo "Diagnosing Web Server Configuration"
echo "========================================="
echo ""

ssh $UBERSPACE_SSH << 'ENDSSH'
echo "1. Current web configuration:"
uberspace web backend list

echo ""
echo "2. Checking document root:"
echo "Default document root should be: ~/html"
ls -la ~/html/index.html 2>/dev/null && echo "✓ index.html exists in ~/html" || echo "✗ index.html missing"

echo ""
echo "3. Checking static files:"
ls -la ~/html/static/js/*.js 2>/dev/null | head -3

echo ""
echo "4. Testing direct file access:"
echo "Testing index.html:"
curl -I http://localhost/index.html 2>&1 | grep -E "HTTP|Content-Type|404"

echo ""
echo "Testing static JS file:"
JSFILE=$(ls ~/html/static/js/*.js 2>/dev/null | head -1 | sed 's|.*/html/||')
if [ -n "$JSFILE" ]; then
    echo "Trying: http://localhost/$JSFILE"
    curl -I "http://localhost/$JSFILE" 2>&1 | grep -E "HTTP|Content-Type|404"
fi

echo ""
echo "5. Checking for .htaccess or rewrite rules:"
if [ -f ~/html/.htaccess ]; then
    echo "✓ .htaccess exists:"
    cat ~/html/.htaccess
else
    echo "✗ No .htaccess file"
fi

echo ""
echo "6. Web backend configuration details:"
uberspace web backend list | grep -A 5 "/"

echo ""
echo "7. Testing from external URL:"
curl -I https://marcb.uber.space/ 2>&1 | grep -E "HTTP|Server|X-"
curl -I https://marcb.uber.space/static/js/main.df1f17b2.js 2>&1 | grep -E "HTTP|404"

echo ""
echo "========================================="
echo "Creating .htaccess for SPA routing..."
echo "========================================="

cat > ~/html/.htaccess << 'HTACCESS'
# Enable rewrite engine
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d

  # Rewrite everything else to index.html
  RewriteRule . /index.html [L]
</IfModule>

# Serve static files with correct MIME types
<IfModule mod_mime.c>
  AddType application/javascript .js
  AddType text/css .css
  AddType image/png .png
  AddType image/jpeg .jpg .jpeg
  AddType application/json .json
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
</IfModule>
HTACCESS

echo "✓ .htaccess created"
cat ~/html/.htaccess

echo ""
echo "Testing after .htaccess:"
curl -I http://localhost/ 2>&1 | grep -E "HTTP|Content-Type"
curl -I http://localhost/static/js/main.df1f17b2.js 2>&1 | grep -E "HTTP|Content-Type|404"

ENDSSH

echo ""
echo "========================================="
echo "Configuration Complete"
echo "========================================="
echo ""
echo "Now test again:"
echo "  1. Open: https://marcb.uber.space/"
echo "  2. Hard refresh: Ctrl+Shift+R"
echo "  3. Check if static files load"
echo ""
