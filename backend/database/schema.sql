-- Day-Care Rotation System Database Schema
-- MariaDB 10.6 MySQL

-- Users table (parents and staff)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('parent', 'staff') NOT NULL,
    language ENUM('en', 'de') DEFAULT 'de' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Children table
CREATE TABLE IF NOT EXISTS children (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    assigned_group ENUM('A', 'B', 'C', 'D') NOT NULL,
    registration_code VARCHAR(50) UNIQUE NOT NULL,
    created_by_staff INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_staff) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_group (assigned_group),
    INDEX idx_registration_code (registration_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User-Child Links (many-to-many relationship for multiple parents per child)
CREATE TABLE IF NOT EXISTS user_child_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    child_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_child (user_id, child_id),
    INDEX idx_user_id (user_id),
    INDEX idx_child_id (child_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Daily Schedules table (stores daily group order and capacity)
CREATE TABLE IF NOT EXISTS daily_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_date DATE UNIQUE NOT NULL,
    group_order JSON NOT NULL COMMENT 'Array of groups in priority order, e.g., ["A","B","C","D"]',
    capacity_limit INT NOT NULL DEFAULT 4 CHECK (capacity_limit BETWEEN 0 AND 4),
    attending_groups JSON NOT NULL COMMENT 'Array of groups that can attend based on capacity',
    created_by_staff INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_staff) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_schedule_date (schedule_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attendance table (historical tracking)
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL,
    child_id INT NOT NULL,
    attended BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES daily_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    UNIQUE KEY unique_schedule_child (schedule_id, child_id),
    INDEX idx_schedule_id (schedule_id),
    INDEX idx_child_id (child_id),
    INDEX idx_attended (attended)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Daily attendance status (tracks slot releases and waiting list)
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

-- Password reset tokens (supports password recovery functionality)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial staff user
-- Email: staff@daycare.local
-- Password: 048204
-- Run this after creating tables, or manually change password after first login
INSERT INTO users (email, password, first_name, last_name, role) 
VALUES (
    'staff@daycare.local', 
    '$2a$10$YQ5B6Z9kN3XxN3xN3xN3xuK5qN5qN5qN5qN5qN5qN5qN5qN5qN5qO',
    'Admin', 
    'Staff', 
    'staff'
) ON DUPLICATE KEY UPDATE email=email;
