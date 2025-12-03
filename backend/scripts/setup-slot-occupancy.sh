#!/bin/bash

# Setup script for slot occupancy feature
# This script runs the database migration to add slot occupancy tracking

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up slot occupancy feature...${NC}\n"

# Check if .env exists
if [ ! -f "../.env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create backend/.env with your database credentials"
    exit 1
fi

# Load environment variables
source ../.env

# Validate required variables
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    echo -e "${RED}Error: Missing database credentials in .env${NC}"
    echo "Required variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
    exit 1
fi

# Determine port (default to 3306 if not set)
DB_PORT=${DB_PORT:-3306}

echo "Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SQL_FILE="$SCRIPT_DIR/../database/add_slot_occupancy_feature.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo -e "${RED}Error: SQL file not found at $SQL_FILE${NC}"
  exit 1
fi

echo -e "${YELLOW}Running database migration...${NC}"

# Run the migration
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SQL_FILE"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Database migration completed successfully!${NC}"
  echo ""
  echo -e "${GREEN}Slot occupancy feature setup complete:${NC}"
  echo "  - Added show_slot_occupancy column to users table (default: FALSE)"
  echo "  - Added occupied_slot_from_child_id column to daily_attendance_status table"
  echo "  - Users can now enable this feature in their settings"
else
  echo -e "${RED}✗ Database migration failed${NC}"
  exit 1
fi
