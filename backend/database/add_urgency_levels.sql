-- Add urgency_level column to daily_attendance_status table
-- This enables two-tier waiting list priority: urgent vs flexible requests

-- Add the urgency_level column
ALTER TABLE daily_attendance_status 
ADD COLUMN urgency_level ENUM('urgent', 'flexible') DEFAULT 'urgent' NOT NULL
AFTER status;

-- Add index for efficient sorting by urgency and timestamp
CREATE INDEX idx_urgency_timestamp ON daily_attendance_status(urgency_level DESC, updated_at ASC);

-- Update existing waiting_list entries to 'urgent' (default behavior preserved)
-- Note: DEFAULT 'urgent' handles this automatically, but making it explicit for clarity
UPDATE daily_attendance_status 
SET urgency_level = 'urgent' 
WHERE status = 'waiting_list' AND urgency_level IS NULL;
