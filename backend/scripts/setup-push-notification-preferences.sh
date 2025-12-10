#!/bin/bash
# Setup script for push notification preferences feature
# This adds the preferences column to push_subscriptions table

set -e

echo "========================================="
echo "Push Notification Preferences Setup"
echo "========================================="
echo ""

# Check if we're on the server or local
if [ -f "/home/marcb/.my.cnf" ]; then
    echo "Running on Uberspace server..."
    DB_CONFIG=""
else
    echo "Running locally..."
    echo "Make sure your database credentials are set in .env"
    read -p "Enter database name [daycare_db]: " DB_NAME
    DB_NAME=${DB_NAME:-daycare_db}
    read -p "Enter database user [root]: " DB_USER
    DB_USER=${DB_USER:-root}
    read -sp "Enter database password: " DB_PASSWORD
    echo ""
    DB_CONFIG="-u${DB_USER} -p${DB_PASSWORD}"
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SQL_FILE="$SCRIPT_DIR/../database/add_push_notification_preferences.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Error: SQL file not found at $SQL_FILE"
    exit 1
fi

echo ""
echo "Applying database migration..."
mysql ${DB_CONFIG} ${DB_NAME} < "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database migration completed successfully!"
    echo ""
    echo "The push_subscriptions table now has a preferences column."
    echo "Users can now configure which notification types they want to receive:"
    echo "  - slot_lost: When their child loses an attendance slot"
    echo "  - slot_assigned: When their child is assigned a slot from the waiting list"
    echo ""
    echo "Next steps:"
    echo "1. Deploy the updated backend code"
    echo "2. Deploy the updated frontend code"
    echo "3. Test notification preferences in the parent settings page"
else
    echo ""
    echo "❌ Error applying database migration"
    exit 1
fi
