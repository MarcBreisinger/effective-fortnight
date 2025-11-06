# Quick Start - Uberspace Deployment

## First-Time Setup

1. **Set your Uberspace username**:
   ```bash
   export UBERSPACE_USER=your_username
   ```

2. **Make deployment script executable**:
   ```bash
   chmod +x deploy-uberspace.sh
   ```

3. **Configure production environment**:
   ```bash
   # Frontend
   cp frontend/.env.production.example frontend/.env.production
   # Edit and replace your_username with actual username
   nano frontend/.env.production
   ```

4. **Deploy**:
   ```bash
   ./deploy-uberspace.sh
   ```

5. **Create backend .env on server**:
   ```bash
   ssh your_username@himalia.uberspace.de
   cd ~/daycare-app/backend
   cp .env.production.example .env
   nano .env
   # Fill in your actual values
   # Generate JWT_SECRET: openssl rand -base64 32
   ```

6. **Configure web backend** (one-time):
   ```bash
   uberspace web backend set /api --http --port 5000
   ```

7. **Restart service**:
   ```bash
   supervisorctl restart daycare-backend
   ```

8. **Access your app**:
   - Visit: `https://your_username.uber.space/daycare/`
   - Login with default staff credentials:
     - Email: `staff@daycare.local`
     - Password: `048204`
   - **IMPORTANT**: Change this password immediately!

## Subsequent Deployments

```bash
./deploy-uberspace.sh
```

That's it! The script handles everything else.

## Troubleshooting

**View logs**:
```bash
ssh your_username@himalia.uberspace.de
tail -f ~/logs/daycare-backend.log
```

**Check service status**:
```bash
ssh your_username@himalia.uberspace.de
supervisorctl status daycare-backend
```

**Restart backend**:
```bash
ssh your_username@himalia.uberspace.de
supervisorctl restart daycare-backend
```

For detailed instructions, see `UBERSPACE_DEPLOYMENT.md`
