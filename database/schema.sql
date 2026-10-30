-- ============================================================================
-- SMART INVENTORY MANAGEMENT SYSTEM (SIMS)
-- Database DDL Schema Script (MySQL 8.0)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS inventory_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE inventory_db;

-- ----------------------------------------------------------------------------
-- Drop existing objects in reverse order of foreign key dependencies
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_stock_transaction_insert;
DROP TRIGGER IF EXISTS trg_before_stock_transaction_insert;
DROP PROCEDURE IF EXISTS sp_record_stock_transaction;
DROP FUNCTION IF EXISTS fn_calculate_inventory_value;
DROP VIEW IF EXISTS v_low_stock;

DROP TABLE IF EXISTS stock_transactions;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- ============================================================================
-- 1. USERS TABLE
-- Purpose: Stores login credentials and system roles for authentication.
-- Application Usage: Used by Auth module (JWT login) and for audit trails.
-- Constraints Demonstrated: PRIMARY KEY, UNIQUE, NOT NULL, CHECK, DEFAULT.
-- ============================================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'USER',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'USER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. CATEGORIES TABLE
-- Purpose: Groups products into business categories (e.g., Electronics, Audio).
-- Application Usage: Used in catalog filters, dropdowns, and category reports.
-- Constraints Demonstrated: PRIMARY KEY, UNIQUE, NOT NULL, DEFAULT.
-- ============================================================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. SUPPLIERS TABLE
-- Purpose: Central directory of authorized vendors providing products.
-- Application Usage: Used for supplier CRUD, procurement logging, and reports.
-- Constraints Demonstrated: PRIMARY KEY, UNIQUE, NOT NULL, CHECK, DEFAULT.
-- ============================================================================
CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    address TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_suppliers_phone CHECK (LENGTH(phone) >= 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. PRODUCTS TABLE
-- Purpose: Master inventory table holding SKU, pricing, and stock balance.
-- Application Usage: Product catalog, CRUD, low-stock alerts, and valuations.
-- Constraints Demonstrated: PRIMARY KEY, FOREIGN KEY (RESTRICT/CASCADE),
--                           UNIQUE, NOT NULL, CHECK, DEFAULT.
-- ============================================================================
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    quantity INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 10,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category 
        FOREIGN KEY (category_id) REFERENCES categories (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT chk_products_unit_price CHECK (unit_price >= 0.00),
    CONSTRAINT chk_products_quantity CHECK (quantity >= 0),
    CONSTRAINT chk_products_reorder_level CHECK (reorder_level >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. STOCK_TRANSACTIONS TABLE
-- Purpose: Immutable ledger recording every stock inward (IN) and dispatch (OUT).
-- Application Usage: Auditing inventory movements, stock replenishment, dispatches.
-- Constraints Demonstrated: PRIMARY KEY, 3 FOREIGN KEYS (with SET NULL & RESTRICT),
--                           NOT NULL, CHECK, DEFAULT.
-- ============================================================================
CREATE TABLE stock_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    supplier_id INT NULL,
    user_id INT NOT NULL,
    transaction_type VARCHAR(10) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,
    CONSTRAINT fk_transactions_product 
        FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_transactions_supplier 
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_transactions_user 
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT chk_transactions_type CHECK (transaction_type IN ('IN', 'OUT')),
    CONSTRAINT chk_transactions_quantity CHECK (quantity > 0),
    CONSTRAINT chk_transactions_unit_price CHECK (unit_price >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_quantity ON products(quantity);
CREATE INDEX idx_transactions_product ON stock_transactions(product_id);
CREATE INDEX idx_transactions_supplier ON stock_transactions(supplier_id);
CREATE INDEX idx_transactions_date ON stock_transactions(transaction_date);

-- ============================================================================
-- VIEW: v_low_stock
-- Purpose: Identifies all products whose on-hand quantity is less than or
--          equal to their configured reorder threshold.
-- Application Usage: Displayed on the Dashboard banner and the dedicated
--                    Low Stock Alerts screen.
-- ============================================================================
CREATE OR REPLACE VIEW v_low_stock AS
SELECT
    p.id AS product_id,
    p.sku,
    p.name AS product_name,
    c.id AS category_id,
    c.name AS category_name,
    p.quantity AS current_quantity,
    p.reorder_level,
    (p.reorder_level - p.quantity) AS deficit_quantity,
    p.unit_price,
    (p.quantity * p.unit_price) AS current_stock_value,
    p.updated_at AS last_updated
FROM products p
INNER JOIN categories c ON p.category_id = c.id
WHERE p.quantity <= p.reorder_level;

-- ============================================================================
-- STORED FUNCTION: fn_calculate_inventory_value
-- Purpose: Computes the gross monetary valuation of all items stored in warehouse.
-- Application Usage: Invoked on the Executive Dashboard KPI card.
-- ============================================================================
DELIMITER //

CREATE FUNCTION fn_calculate_inventory_value()
RETURNS DECIMAL(12, 2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE total_val DECIMAL(12, 2) DEFAULT 0.00;

    SELECT COALESCE(SUM(quantity * unit_price), 0.00)
    INTO total_val
    FROM products;

    RETURN total_val;
END //

DELIMITER ;

-- ============================================================================
-- TRIGGER 1: trg_before_stock_transaction_insert (BEFORE INSERT)
-- Purpose: Intercepts 'OUT' transactions to verify that available on-hand stock
--          is sufficient before inserting. Throws a custom SQLSTATE 45000 error
--          if requested quantity exceeds available stock.
-- Application Usage: Enforces inventory defense at the database layer.
-- ============================================================================
DELIMITER //

CREATE TRIGGER trg_before_stock_transaction_insert
BEFORE INSERT ON stock_transactions
FOR EACH ROW
BEGIN
    DECLARE v_available_qty INT DEFAULT 0;

    -- Query current stock for the product
    SELECT quantity INTO v_available_qty
    FROM products
    WHERE id = NEW.product_id;

    -- Verify stock if attempting to dispatch items OUT
    IF NEW.transaction_type = 'OUT' THEN
        IF v_available_qty < NEW.quantity THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Business Rule Violation: Cannot dispatch OUT more items than current available stock.';
        END IF;
    END IF;
END //

DELIMITER ;

-- ============================================================================
-- TRIGGER 2: trg_after_stock_transaction_insert (AFTER INSERT)
-- Purpose: Automatically updates products.quantity whenever a stock transaction
--          is recorded (IN increments, OUT decrements).
-- Application Usage: Eliminates manual stock calculations in application code;
--                    guarantees database ACID transactional consistency.
-- ============================================================================
DELIMITER //

CREATE TRIGGER trg_after_stock_transaction_insert
AFTER INSERT ON stock_transactions
FOR EACH ROW
BEGIN
    IF NEW.transaction_type = 'IN' THEN
        UPDATE products
        SET quantity = quantity + NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.product_id;
    ELSEIF NEW.transaction_type = 'OUT' THEN
        UPDATE products
        SET quantity = quantity - NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.product_id;
    END IF;
END //

DELIMITER ;

-- ============================================================================
-- STORED PROCEDURE: sp_record_stock_transaction
-- Purpose: Secure, atomic transaction handler to log inventory receipts and dispatches.
-- Application Usage: Invoked by the Express backend API `POST /api/transactions`.
-- Features:
--   - Validates existence of Product, User, and Supplier.
--   - Locks the product row using FOR UPDATE to prevent race conditions.
--   - Inserts into stock_transactions (which fires the triggers above).
--   - Returns the created transaction ID and updated product quantity.
-- ============================================================================
DELIMITER //

CREATE PROCEDURE sp_record_stock_transaction(
    IN  p_product_id       INT,
    IN  p_supplier_id      INT,
    IN  p_user_id          INT,
    IN  p_transaction_type VARCHAR(10),
    IN  p_quantity         INT,
    IN  p_unit_price       DECIMAL(10, 2),
    IN  p_notes            TEXT,
    OUT p_transaction_id   INT,
    OUT p_updated_quantity INT
)
proc_label: BEGIN
    DECLARE v_product_exists INT DEFAULT 0;
    DECLARE v_user_exists INT DEFAULT 0;
    DECLARE v_supplier_exists INT DEFAULT 0;
    DECLARE v_current_quantity INT DEFAULT 0;

    -- Standard SQL exception handler with transaction rollback
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- 1. Input parameter validation
    IF p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Quantity must be greater than zero.';
    END IF;

    IF p_unit_price < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Unit price cannot be negative.';
    END IF;

    IF p_transaction_type NOT IN ('IN', 'OUT') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Transaction type must be either IN or OUT.';
    END IF;

    -- 2. Foreign Key Existence Checks
    SELECT COUNT(*) INTO v_product_exists FROM products WHERE id = p_product_id;
    IF v_product_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Foreign Key Error: Product ID does not exist.';
    END IF;

    SELECT COUNT(*) INTO v_user_exists FROM users WHERE id = p_user_id;
    IF v_user_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Foreign Key Error: User ID does not exist.';
    END IF;

    IF p_supplier_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_supplier_exists FROM suppliers WHERE id = p_supplier_id;
        IF v_supplier_exists = 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Foreign Key Error: Supplier ID does not exist.';
        END IF;
    END IF;

    -- 3. Execute atomic transaction
    START TRANSACTION;

        -- Lock the target product row to prevent race conditions during concurrent access
        SELECT quantity INTO v_current_quantity
        FROM products
        WHERE id = p_product_id
        FOR UPDATE;

        -- Verify stock sufficiency for OUT movements
        IF p_transaction_type = 'OUT' AND v_current_quantity < p_quantity THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Stock Error: Insufficient stock for outward transaction.';
        END IF;

        -- Insert transaction record (triggers trg_after_stock_transaction_insert)
        INSERT INTO stock_transactions (
            product_id,
            supplier_id,
            user_id,
            transaction_type,
            quantity,
            unit_price,
            transaction_date,
            notes
        ) VALUES (
            p_product_id,
            p_supplier_id,
            p_user_id,
            p_transaction_type,
            p_quantity,
            p_unit_price,
            CURRENT_TIMESTAMP,
            p_notes
        );

        SET p_transaction_id = LAST_INSERT_ID();

        -- Retrieve updated quantity resulting from the trigger execution
        SELECT quantity INTO p_updated_quantity
        FROM products
        WHERE id = p_product_id;

    COMMIT;

END //

DELIMITER ;
