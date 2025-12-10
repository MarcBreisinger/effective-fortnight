# Deployment Scripts

This directory contains scripts for deploying and managing Kitana.

## Active Scripts

### `deploy-uberspace.sh`
**Purpose**: Main deployment script for Uberspace hosting  
**When to use**: Deploy the application to production or update existing deployment  
**What it does**:
- Builds the React frontend with production environment variables
- Uploads backend code to `~/daycare-app/backend/` (excludes node_modules and .env)
- Uploads frontend build to `~/daycare-app/frontend-build/`
- Installs production dependencies on server
- Creates/updates supervisor configuration for the backend service
- Restarts the backend service

**Usage**:
```bash
./deploy-uberspace.sh
# You'll be prompted for your Uberspace username if not set in environment
```

### `simple-deploy.sh`
**Purpose**: Quick deployment without rebuilding (uses existing build)  
**When to use**: When you've already built locally and just want to upload files  
**What it does**:
- Uploads backend files (excluding node_modules and .env)
- Uploads frontend build from `frontend/build/`
- Provides instructions for server-side steps

**Usage**:
```bash
./simple-deploy.sh
```

### `rebuild-and-deploy.sh`
**Purpose**: Emergency rebuild and deployment with full paths  
**When to use**: When your terminal PATH is broken but you need to deploy  
**What it does**:
- Searches for npm in common locations (Homebrew, nvm)
- Rebuilds frontend from scratch
- Deploys to Uberspace

**Usage**:
```bash
./rebuild-and-deploy.sh
```

### `push-no-proxy.sh`
**Purpose**: Git push without proxy settings  
**When to use**: When behind a corporate proxy that interferes with git operations  
**What it does**:
- Temporarily unsets proxy environment variables
- Configures git to not use proxy
- Pushes to remote repository
- Shows git status

**Usage**:
```bash
./push-no-proxy.sh
```

## Archived Scripts

Scripts in the `archive/` directory were used for one-time troubleshooting during initial deployment setup. They addressed specific issues that are now resolved:

- **fix-blank-screen.sh**: Fixed homepage field in package.json (resolved: now using "/")
- **fix-htaccess.sh**: Attempted .htaccess configuration (not needed: Uberspace uses nginx)
- **fix-web-config.sh**: Created .htaccess for static files (obsolete: now serving via Node.js)
- **check-deployed-files.sh**: Verified file deployment (one-time diagnostic)
- **check-server.sh**: Server-side diagnostics (one-time use)
- **debug-deployment.sh**: Comprehensive deployment debugging (resolved issues)
- **diagnose-full.sh**: Full deployment diagnostic (one-time troubleshooting)
- **verify-node-serving.sh**: Verified Node.js static file serving (issue resolved)

These are kept for reference but should not be needed for normal operations.

## Deployment Workflow

### First-Time Deployment
1. Set up database and .env file on server (see `../UBERSPACE_DEPLOYMENT.md`)
2. Run `./deploy-uberspace.sh`
3. SSH to server and configure web backend: `uberspace web backend set / --http --port 5000`
4. Access application at `https://your_username.uber.space/`

### Subsequent Updates
1. Make code changes locally
2. Test locally
3. Run `./deploy-uberspace.sh` to deploy
4. Deployment script automatically restarts the backend service

### Quick File-Only Updates
If you've already built the frontend and just need to upload files:
```bash
./simple-deploy.sh
```
Then SSH to server and restart: `supervisorctl restart daycare-backend`

## Troubleshooting

If deployment scripts fail due to PATH issues:
```bash
# Option 1: Reset your terminal
source ~/.zshrc

# Option 2: Use rebuild-and-deploy.sh which handles PATH issues
./rebuild-and-deploy.sh
```

For detailed deployment documentation, see:
- `../UBERSPACE_DEPLOYMENT.md` - Complete deployment guide
- `../QUICKSTART_UBERSPACE.md` - Quick reference
