#!/bin/bash
# Setup script for urgency levels feature
# Adds urgency_level column to daily_attendance_status table

set -e  # Exit on error

echo "=================================="
echo "Urgency Levels Feature Setup"
echo "=================================="
echo ""

# Detect environment
if [ -f ~/.my.cnf ]; then
    echo "✓ Detected Uberspace environment"
    MYSQL_CMD="mysql"
    DB_NAME="marcb_notbetreuung"
elif [ -n "$DB_HOST" ] && [ "$DB_HOST" = "127.0.0.1" ]; then
    echo "✓ Detected local development environment"
    MYSQL_CMD="mysql -h 127.0.0.1 -u marcb -p"
    DB_NAME="marcb_notbetreuung"
else
    echo "⚠ Environment detection failed"
    echo "Please specify database connection manually"
    exit 1
fi

echo ""
echo "Running database migration..."
echo "Database: $DB_NAME"
echo ""

# Run the migration
if [ -f ~/.my.cnf ]; then
    # Uberspace - use .my.cnf credentials
    mysql $DB_NAME < ../database/add_urgency_levels.sql
else
    # Local - prompt for password
    mysql -h 127.0.0.1 -u marcb -p $DB_NAME < ../database/add_urgency_levels.sql
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Database migration completed successfully!"
    echo ""
    echo "Changes applied:"
    echo "  - Added urgency_level column (ENUM: 'urgent', 'flexible')"
    echo "  - Created index on urgency_level and updated_at"
    echo "  - Default value: 'urgent' (preserves existing behavior)"
    echo ""
    echo "Next steps:"
    echo "  1. Deploy updated backend code (waitingListProcessor.js, attendance.js)"
    echo "  2. Deploy updated frontend code (AttendanceStatusCard.js, translations.js)"
    echo "  3. Test with both urgent and flexible waiting list requests"
    echo ""
else
    echo ""
    echo "✗ Database migration failed!"
    echo "Please check the error messages above"
    exit 1
fi
