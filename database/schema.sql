-- ============================================================
-- LIBRARY MANAGEMENT SYSTEM - FULL DATABASE SCHEMA
-- Run this ENTIRE file in MySQL Workbench 8.0
-- ============================================================

DROP DATABASE IF EXISTS library_management;
CREATE DATABASE library_management;
USE library_management;

-- ================= USERS TABLE =================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','student') DEFAULT 'student',
    phone VARCHAR(15),
    profile_image VARCHAR(255) DEFAULT NULL,
    membership_status ENUM('active','suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================= CATEGORIES TABLE =================
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE
);

-- ================= BOOKS TABLE =================
CREATE TABLE books (
    book_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(150) NOT NULL,
    isbn VARCHAR(20) UNIQUE,
    category_id INT,
    publisher VARCHAR(150),
    published_year INT,
    description TEXT,
    cover_image VARCHAR(500),
    total_copies INT DEFAULT 1,
    available_copies INT DEFAULT 1,
    shelf_location VARCHAR(50),
    rating_avg DECIMAL(3,2) DEFAULT 0,
    added_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL
);

-- ================= BORROW RECORDS TABLE =================
CREATE TABLE borrow_records (
    borrow_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    borrow_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE DEFAULT NULL,
    status ENUM('borrowed','returned','overdue') DEFAULT 'borrowed',
    fine_amount DECIMAL(10,2) DEFAULT 0,
    fine_paid BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE
);

-- ================= RESERVATIONS / WAITLIST TABLE (Unique Feature) =================
CREATE TABLE reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    reserved_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    queue_position INT NOT NULL,
    status ENUM('waiting','notified','fulfilled','cancelled') DEFAULT 'waiting',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE
);

-- ================= REVIEWS & RATINGS TABLE (Unique Feature) =================
CREATE TABLE reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE
);

-- ================= NOTIFICATIONS TABLE (Unique Feature) =================
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message VARCHAR(255) NOT NULL,
    type ENUM('due_reminder','fine','reservation','system') DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ================= WISHLIST TABLE (Unique Feature) =================
CREATE TABLE wishlist (
    wishlist_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    added_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_wish (user_id, book_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE
);

-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- Categories
INSERT INTO categories (category_name) VALUES
('Fiction'),('Science'),('Technology'),('History'),
('Biography'),('Fantasy'),('Self-Help'),('Mystery');

-- Users (password for all = "password123" hashed with bcrypt at app-level;
-- for direct SQL testing use the Node.js register API instead of inserting hashes manually)
-- Admin account will be created via the register API with role set to admin (see README step)

-- Books
INSERT INTO books (title, author, isbn, category_id, publisher, published_year, description, cover_image, total_copies, available_copies, shelf_location) VALUES
('The Alchemist','Paulo Coelho','9780062315007',1,'HarperOne',1988,'A shepherd boy journeys to find treasure and discovers his destiny.','https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg',5,5,'A1-01'),
('A Brief History of Time','Stephen Hawking','9780553380163',2,'Bantam',1988,'An exploration of cosmology for the general reader.','https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg',3,3,'B2-04'),
('Clean Code','Robert C. Martin','9780132350884',3,'Prentice Hall',2008,'A handbook of agile software craftsmanship.','https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg',4,4,'C1-10'),
('Sapiens','Yuval Noah Harari','9780062316097',4,'Harper',2015,'A brief history of humankind.','https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg',6,6,'D3-02'),
('Steve Jobs','Walter Isaacson','9781451648539',5,'Simon & Schuster',2011,'The exclusive biography of Steve Jobs.','https://covers.openlibrary.org/b/isbn/9781451648539-L.jpg',2,2,'E2-05'),
('Harry Potter and the Sorcerer''s Stone','J.K. Rowling','9780590353427',6,'Scholastic',1997,'A young boy discovers he is a wizard.','https://covers.openlibrary.org/b/isbn/9780590353427-L.jpg',7,7,'F1-01'),
('Atomic Habits','James Clear','9780735211292',7,'Avery',2018,'Tiny changes, remarkable results.','https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg',5,5,'G2-08'),
('The Da Vinci Code','Dan Brown','9780307474278',8,'Anchor',2003,'A murder mystery inside the Louvre.','https://covers.openlibrary.org/b/isbn/9780307474278-L.jpg',4,4,'H1-03');

-- Verify
SELECT * FROM books;
SELECT * FROM categories;
