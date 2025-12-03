#!/bin/bash
# Setup script for activity_log table

# Load database configuration
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    exit 1
fi

source .env

echo "Creating activity_log table..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < backend/database/add_activity_log_table.sql

if [ $? -eq 0 ]; then
    echo "✓ Activity log table created successfully"
    
    # Create a system user for automated actions if it doesn't exist
    echo "Checking for system user..."
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" <<EOF
INSERT IGNORE INTO users (id, email, password_hash, first_name, last_name, role, phone)
VALUES (1, 'system@daycare.local', '', 'System', 'Automated', 'staff', NULL)
ON DUPLICATE KEY UPDATE id=id;
EOF
    
    if [ $? -eq 0 ]; then
        echo "✓ System user verified"
    else
        echo "✗ Failed to create system user"
        exit 1
    fi
else
    echo "✗ Failed to create activity_log table"
    exit 1
fi

echo ""
echo "Activity log setup complete!"
