# Archived Diagnostic Scripts

These scripts were created during initial deployment troubleshooting to diagnose and fix specific issues. The issues have been resolved and these scripts are kept for historical reference only.

## Issue: Blank Screen on Production

**Problem**: After initial deployment, accessing https://marcb.uber.space/ showed a blank screen.

**Root Cause**: Multiple issues were discovered and resolved:
1. Static files were not being served correctly
2. Uberspace uses nginx (not Apache), so .htaccess files were ignored
3. Web backend needed to route `/` (not just `/api`) to Node.js
4. Frontend needed to be served from Node.js using express.static()

### Scripts Created for This Issue:

#### `fix-blank-screen.sh`
- **Purpose**: Changed homepage field in package.json from "." to "/"
- **Why**: Relative paths (./static/...) weren't working, needed absolute paths (/static/...)
- **Resolution**: Now permanently set to "/" in package.json

#### `fix-htaccess.sh`
- **Purpose**: Created .htaccess with static file serving rules
- **Why**: Thought Apache was serving files and rewriting all requests to index.html
- **Resolution**: Discovered Uberspace uses nginx, not Apache - .htaccess doesn't work

#### `fix-web-config.sh`
- **Purpose**: Created .htaccess with MIME type configuration for JavaScript files
- **Why**: JS files were being served as text/html instead of application/javascript
- **Resolution**: Switched to serving all files through Node.js instead

## Issue: Deployment Verification

**Problem**: Needed to verify files were deployed correctly and Node.js was serving them.

### Scripts Created for This Issue:

#### `check-deployed-files.sh`
- **Purpose**: List of commands to manually check deployed files
- **What it checked**: Frontend files, NODE_ENV, web backend config, localhost responses
- **Resolution**: Created comprehensive diagnostic, issue resolved

#### `check-server.sh`
- **Purpose**: Server-side diagnostics via SSH
- **What it checked**: File locations, process status, curl tests
- **Resolution**: Used once to verify deployment

#### `debug-deployment.sh`
- **Purpose**: Comprehensive deployment debugging script
- **What it checked**: Build contents, upload verification, server configuration, MIME types
- **Resolution**: Helped identify the nginx vs Apache issue

#### `diagnose-full.sh`
- **Purpose**: Complete diagnostic covering all aspects
- **What it checked**: Frontend build directory, static files, NODE_ENV, web backend, logs, server.js configuration
- **Resolution**: Most comprehensive diagnostic, helped verify final fix

#### `verify-node-serving.sh`
- **Purpose**: Verify Node.js can serve frontend files correctly
- **What it checked**: frontend-build directory existence, static files, server.js configuration, actual file serving
- **Resolution**: Confirmed Node.js was properly configured to serve static files

## Final Solution

The blank screen was resolved by:

1. **Modified `backend/server.js`** to serve frontend static files:
   ```javascript
   if (process.env.NODE_ENV === 'production') {
     const frontendPath = path.join(__dirname, '../frontend-build');
     app.use(express.static(frontendPath));
     app.get('*', (req, res) => {
       res.sendFile(path.join(frontendPath, 'index.html'));
     });
   }
   ```

2. **Updated deployment** to upload frontend to `~/daycare-app/frontend-build/`

3. **Configured web backend** to route everything to Node.js:
   ```bash
   uberspace web backend set / --http --port 5000
   ```

4. **Fixed `.env.production`** to have correct API URL: `https://marcb.uber.space/api`

## Lessons Learned

- Uberspace uses nginx, not Apache - .htaccess files don't work
- Serving frontend through Node.js (express.static) is more reliable than relying on web server configuration
- Always check what web server is actually being used before creating configuration files
- Browser cache can mask deployment issues - hard refresh required
- React Router requires accessing app at root path (`/`), not `/index.html`

## When to Use These Scripts

**You shouldn't need these scripts** unless you encounter similar deployment issues in the future. The current deployment process (using `scripts/deploy-uberspace.sh`) handles everything correctly.

If you do encounter issues, these archived scripts can serve as reference for:
- Diagnostic approaches
- Common deployment pitfalls
- Troubleshooting techniques
- SSH-based verification commands

## Date Archived

November 5, 2025
