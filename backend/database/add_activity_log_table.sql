-- Create activity log table for persistent event history
CREATE TABLE IF NOT EXISTS activity_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_type VARCHAR(50) NOT NULL,
  event_date DATE NOT NULL,
  child_id INT NULL,
  user_id INT NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_date (event_date),
  INDEX idx_child_id (child_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Event types:
-- 'slot_given_up' - Parent gives up their child's slot
-- 'slot_reclaimed' - Parent reclaims slot (removes from waiting list or cancels give-up)
-- 'waiting_list_joined' - Parent joins waiting list
-- 'waiting_list_removed' - Parent removes child from waiting list
-- 'auto_assigned' - System automatically assigns slot from waiting list
-- 'capacity_changed' - Staff changes daily capacity
-- 'rotation_changed' - Staff changes group rotation order
-- 'displaced_to_waiting' - Child moved to waiting list due to capacity reduction
-- 'restored_from_waiting' - Child restored from waiting list due to capacity increase
