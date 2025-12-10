-- Add notification preferences to push_subscriptions table
-- This allows users to configure which events trigger push notifications

ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS preferences JSON DEFAULT NULL 
COMMENT 'Notification preferences: {"slot_lost": true, "slot_assigned": true}';

-- Set default preferences for existing subscriptions
UPDATE push_subscriptions 
SET preferences = JSON_OBJECT('slot_lost', true, 'slot_assigned', true)
WHERE preferences IS NULL;
