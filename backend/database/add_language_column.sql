-- Migration: Add language column to users table
-- Run this script on existing databases to add language support

-- Add language column (defaults to 'de' for existing users)
ALTER TABLE users 
ADD COLUMN language ENUM('en', 'de') DEFAULT 'de' NOT NULL 
AFTER role;

-- Verify the column was added
DESCRIBE users;
