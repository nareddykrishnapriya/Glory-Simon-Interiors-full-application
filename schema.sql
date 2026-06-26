-- ============================================================================
-- SQL Schema for Glory Simon Interiors Site Progress Reporting System
-- Target Database: MySQL 8.0+
-- ============================================================================

CREATE DATABASE IF NOT EXISTS glory_simon_interiors
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE glory_simon_interiors;

-- Drop tables in order of dependency to avoid foreign key violations
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS daily_progress_reports;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. Users Table
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM(
        'Admin', 
        'Interior Designer', 
        'Project Manager', 
        'Site Engineer', 
        'Vendor Coordinator', 
        'Client'
    ) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints & Indexes
    UNIQUE KEY uq_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Projects Table
-- ----------------------------------------------------------------------------
CREATE TABLE projects (
    project_id INT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    project_type VARCHAR(100) NOT NULL, -- e.g., 'Residential', 'Commercial'
    room_details TEXT NULL,              -- e.g., "Living Room, Modular Kitchen"
    status VARCHAR(50) NOT NULL DEFAULT 'In Progress', -- e.g., 'Planning', 'In Progress', 'Completed', 'On Hold'
    progress INT NOT NULL DEFAULT 0,     -- completion percentage (0-100)
    start_date DATE NULL,
    end_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_project_type (project_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Daily Progress Reports Table
-- ----------------------------------------------------------------------------
CREATE TABLE daily_progress_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    work_details TEXT NOT NULL,
    completed_tasks TEXT NOT NULL,       -- JSON format or text summary list
    issues_reported TEXT NULL,           -- Snag / Blocker details
    next_day_plans TEXT NOT NULL,
    photo_url VARCHAR(255) NULL,         -- Direct URL to site update image
    status ENUM(
        'On Track', 
        'Delayed', 
        'Action Required'
    ) NOT NULL DEFAULT 'On Track',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT fk_reports_projects 
        FOREIGN KEY (project_id) REFERENCES projects(project_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
        
    CONSTRAINT fk_reports_users 
        FOREIGN KEY (user_id) REFERENCES users(user_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,

    -- Indexes for searching and sorting feed
    INDEX idx_reports_project (project_id),
    INDEX idx_reports_user (user_id),
    INDEX idx_reports_status (status),
    INDEX idx_reports_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



