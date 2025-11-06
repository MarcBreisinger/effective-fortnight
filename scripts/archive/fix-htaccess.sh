#!/bin/bash

# Fix .htaccess to properly serve static files

UBERSPACE_USER="marcb"
UBERSPACE_HOST="himalia.uberspace.de"
UBERSPACE_SSH="${UBERSPACE_USER}@${UBERSPACE_HOST}"

echo "Fixing .htaccess configuration..."
echo ""

ssh $UBERSPACE_SSH << 'ENDSSH'
cat > ~/html/.htaccess << 'HTACCESS'
# Serve static files with correct MIME types FIRST
<FilesMatch "\.(js|map)$">
  Header set Content-Type "application/javascript"
</FilesMatch>

<FilesMatch "\.css$">
  Header set Content-Type "text/css"
</FilesMatch>

<FilesMatch "\.(png|jpg|jpeg|gif|svg)$">
  Header set Content-Type "image/*"
</FilesMatch>

# Enable rewrite engine for SPA routing
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Skip rewriting for actual files
  RewriteCond %{REQUEST_URI} \.(js|css|png|jpg|jpeg|gif|svg|map|json|txt)$ [OR]
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Rewrite everything else to index.html
  RewriteRule ^ /index.html [L]
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
</IfModule>
HTACCESS

echo "✓ New .htaccess created"
echo ""
echo "Testing static file serving:"
curl -I http://localhost/static/js/main.df1f17b2.js 2>&1 | grep "Content-Type"

echo ""
echo "Testing index.html:"
curl -I http://localhost/ 2>&1 | grep "Content-Type"

ENDSSH

echo ""
echo "==========================================="
echo "✓ Configuration Fixed"
echo "==========================================="
echo ""
echo "The .htaccess now:"
echo "  1. Serves static files (.js, .css, images) directly"
echo "  2. Routes all other requests to index.html (for React Router)"
echo ""
echo "Test now:"
echo "  1. Open: https://marcb.uber.space/"
echo "  2. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R)"
echo "  3. App should load!"
echo ""
