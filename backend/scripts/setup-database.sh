#!/bin/bash
# Database setup script for Kitana
# Loads schema.sql into the database

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Day-Care Database Setup ===${NC}\n"

# Check if .env exists
if [ ! -f "../.env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create backend/.env with your database credentials"
    echo "See .env.example for template"
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

# Check if using SSH tunnel
if [ "$DB_HOST" = "127.0.0.1" ] && [ "$DB_PORT" != "3306" ]; then
    echo -e "${YELLOW}Note: Detected SSH tunnel configuration${NC}"
    echo "Make sure your SSH tunnel is running:"
    echo "  ssh -L ${DB_PORT}:localhost:3306 marcb@himalia.uberspace.de -N -f"
    echo ""
    read -p "Press Enter to continue or Ctrl+C to cancel..."
fi

# Import schema
echo -e "\n${GREEN}Importing schema.sql...${NC}"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < ../database/schema.sql

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ Database setup complete!${NC}"
    echo ""
    echo "Default staff login credentials:"
    echo "  Email: staff@daycare.local"
    echo "  Password: 048204"
    echo ""
    echo -e "${YELLOW}Important: Change the staff password after first login!${NC}"
else
    echo -e "\n${RED}✗ Database setup failed${NC}"
    echo "Check your credentials and try again"
    exit 1
fi
