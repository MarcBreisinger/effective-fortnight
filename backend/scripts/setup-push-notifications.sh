#!/bin/bash

# Setup Push Notifications Table
# This script creates the push_subscriptions table for web push notifications

set -e

echo "Setting up push_subscriptions table..."

# Load database credentials from .env file if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Database credentials with fallbacks
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-daycare_rotation}"

# Run the SQL script
mysql -h "$DB_HOST" -u "$DB_USER" ${DB_PASSWORD:+-p"$DB_PASSWORD"} "$DB_NAME" < "$(dirname "$0")/../database/add_push_subscriptions.sql"

echo "✓ push_subscriptions table created successfully!"
echo ""
echo "Next steps:"
echo "1. Install web-push package: npm install web-push"
echo "2. Generate VAPID keys: npx web-push generate-vapid-keys"
echo "3. Add keys to .env file as VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY"
