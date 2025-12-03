-- Add slot occupancy feature columns
-- This feature allows tracking which child is occupying whose slot
-- and provides user setting to toggle visibility

-- Add user preference column (default OFF)
ALTER TABLE users 
ADD COLUMN show_slot_occupancy BOOLEAN DEFAULT FALSE 
COMMENT 'User preference: show which child occupies whose slot';

-- Add slot tracking column to attendance status
ALTER TABLE daily_attendance_status 
ADD COLUMN occupied_slot_from_child_id INT DEFAULT NULL 
COMMENT 'If this child is using someone elses slot, reference to original slot owner',
ADD CONSTRAINT fk_occupied_slot_child 
FOREIGN KEY (occupied_slot_from_child_id) 
REFERENCES children(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_occupied_slot ON daily_attendance_status(occupied_slot_from_child_id);
