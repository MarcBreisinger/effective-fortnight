-- Migration: Add daily_attendance_status table
-- This adds support for parents to give up slots and join waiting lists

CREATE TABLE IF NOT EXISTS daily_attendance_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    child_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('attending', 'slot_given_up', 'waiting_list') NOT NULL DEFAULT 'attending',
    parent_message TEXT,
    updated_by_user INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by_user) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_child_date (child_id, attendance_date),
    INDEX idx_child_date (child_id, attendance_date),
    INDEX idx_status (status),
    INDEX idx_date (attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
