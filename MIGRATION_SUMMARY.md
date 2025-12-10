# Quick Migration Summary: daycare → kitana

## What Changed

All references to `daycare.marcb.uber.space` have been updated to `kitana.marcb.uber.space` in:

### Configuration Files ✅
- `frontend/.env.production` → Now points to `https://kitana.marcb.uber.space/api`
- `frontend/.env.production.example` → Updated example

### Deployment Scripts ✅
- `deploy-to-subdomain.sh` → All subdomain references updated
- `safe-deploy.sh` → All subdomain references updated

### Documentation ✅
- `BUSINESS_LOGIC_TEST_SCENARIOS.md` → Test API URLs updated
- `SLOT_OCCUPANCY_DEPLOYMENT.md` → Documentation URLs updated
- `SUBDOMAIN_MIGRATION.md` → Historical record updated

### New Documentation ✅
- `KITANA_SUBDOMAIN_MIGRATION.md` → Complete step-by-step migration guide

## To Complete the Migration

Follow the steps in **KITANA_SUBDOMAIN_MIGRATION.md**:

### Quick Steps:
```bash
# 1. Add new subdomain
ssh marcb@himalia.uberspace.de
uberspace web domain add kitana.marcb.uber.space
uberspace web backend set kitana.marcb.uber.space --http --port 5000

# 2. Update backend .env on server
cd ~/daycare-app/backend
nano .env
# Change: FRONTEND_URL=https://kitana.marcb.uber.space

# 3. Rebuild and deploy frontend
cd /Users/Q247532/effective-fortnight/effective-fortnight
./deploy-to-subdomain.sh

# 4. Restart backend
ssh marcb@himalia.uberspace.de
supervisorctl restart daycare-app

# 5. Test
curl https://kitana.marcb.uber.space/api/health
# Should return: {"status":"ok","message":"Kitana API is running"}
```

## What to Update on Server

On `himalia.uberspace.de`:
1. **Backend `.env` file**: Change `FRONTEND_URL` to `https://kitana.marcb.uber.space`
2. **Email settings** (optional): Update `SMTP_FROM` to use `@kitana.marcb.uber.space`

Everything else is updated in the local repository and will be deployed automatically.

## Verification

After deployment, test:
- ✅ Frontend loads: https://kitana.marcb.uber.space
- ✅ API responds: https://kitana.marcb.uber.space/api/health
- ✅ Login works
- ✅ Parent and staff views function
- ✅ Push notifications work (if enabled)

## Rollback

If needed, you can keep both subdomains active temporarily. The old `daycare.marcb.uber.space` will continue to work until you remove it.

See **KITANA_SUBDOMAIN_MIGRATION.md** for detailed instructions.
