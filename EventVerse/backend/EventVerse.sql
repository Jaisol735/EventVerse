CREATE DATABASE EVENTVERSE;
USE EVENTVERSE;
-- USERS TABLE (Admin + Students + Heads)
CREATE TABLE Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    role ENUM('admin', 'student', 'head') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- COMMITTEES TABLE
CREATE TABLE Committees (
    committee_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    description TEXT,
    head_id INT,
    FOREIGN KEY (head_id) REFERENCES Users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- COMMITTEE MEMBERSHIP
CREATE TABLE Committee_Members (
    member_id INT PRIMARY KEY AUTO_INCREMENT,
    committee_id INT,
    user_id INT,
    role ENUM('member', 'head') DEFAULT 'member',
    FOREIGN KEY (committee_id) REFERENCES Committees(committee_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- EVENTS TABLE (Livestreams included)
CREATE TABLE Events (
    event_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255),
    description TEXT,
    committee_id INT,
    is_livestream BOOLEAN DEFAULT FALSE,
    livestream_url VARCHAR(500),
    event_date DATETIME,
    FOREIGN KEY (committee_id) REFERENCES Committees(committee_id)
);

-- NOTIFICATIONS
CREATE TABLE Notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT NOT NULL,        -- Who sends the notification
    type ENUM(
        'committee_request',       -- Student → Head
        'join_request',            -- Student → Admin
        'role_transfer',           -- Head → Committee Member
        'event_update',            -- Head → All Users
        'livestream_update'        -- Auto → All Users
    ) NOT NULL,
    related_committee_id INT NULL, -- For committee/join/role transfer
    related_event_id INT NULL,     -- For events/livestreams
    related_post_id INT NULL,      -- For posts
    message TEXT,                  -- Notification text
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sender_id) REFERENCES Users(user_id),
    FOREIGN KEY (related_committee_id) REFERENCES Committees(committee_id),
    FOREIGN KEY (related_event_id) REFERENCES Events(event_id)
);
CREATE TABLE Notification_Receivers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    notification_id INT NOT NULL,
    receiver_id INT NOT NULL,  -- Each receiver gets their own record
    is_read BOOLEAN DEFAULT FALSE,
    status ENUM('pending', 'accepted', 'declined', 'completed') DEFAULT 'pending',
    action_timestamp TIMESTAMP NULL, -- When user clicked OK or took action

    FOREIGN KEY (notification_id) REFERENCES Notifications(notification_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES Users(user_id)
);

-- HEAD TRANSFER LOG
CREATE TABLE Head_Transfers (
    transfer_id INT PRIMARY KEY AUTO_INCREMENT,
    old_head_id INT,
    new_head_id INT,
    committee_id INT,
    transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (old_head_id) REFERENCES Users(user_id),
    FOREIGN KEY (new_head_id) REFERENCES Users(user_id),
    FOREIGN KEY (committee_id) REFERENCES Committees(committee_id)
);
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS Head_Transfers;
DROP TABLE IF EXISTS Notification_Receivers;
DROP TABLE IF EXISTS Notifications;
DROP TABLE IF EXISTS Events;
DROP TABLE IF EXISTS Committee_Members;
DROP TABLE IF EXISTS Committees;
DROP TABLE IF EXISTS Users;

SET FOREIGN_KEY_CHECKS = 1;
INSERT INTO Users (name, email, password_hash, role)
VALUES (
    'Jainam Solanki',
    'solankijainam07@gmail.com',
    SHA2('Jaisol735', 256),  -- Secure password hashing
    'admin'
);
SELECT * FROM Users WHERE name = "Hardik";
SELECT * FROM Committee_Members WHERE committee_id = 1;
SELECT * FROM Committees;
SET SQL_SAFE_UPDATES = 0;

DELETE FROM Users WHERE name = 'Jainam';

SET SQL_SAFE_UPDATES = 1; 

INSERT INTO Users (name, email, password_hash, role)
VALUES ('Hardik', 'rahul.sharma@example.com',SHA2('hashed_password_here', 256) , 'student');


INSERT INTO Committee_Members (committee_id, user_id, role)
VALUES (1, 305, 'member');

UPDATE Committee_Members
SET role = 'member'
WHERE committee_id = 1 AND user_id = 2;

UPDATE Committee_Members
SET role = 'head'
WHERE committee_id = 1 AND user_id = 305;
INSERT INTO Head_Transfers (old_head_id, new_head_id, committee_id)
VALUES (2, 305, 1);
UPDATE Committees
SET head_id = 305
WHERE committee_id = 1;


