-- ============================================================================
-- SMART INVENTORY MANAGEMENT SYSTEM (SIMS)
-- Seed Data Script (Realistic Sample Records)
-- ============================================================================
-- NOTE:
-- 1. Passwords for seeded users are hashed with bcrypt (cost factor 10).
--    - admin:   password is "admin123"
--    - staff_*: password is "user123"
-- 2. Products are initialized with quantity = 0.
-- 3. Stock transactions are executed via INSERT. The AFTER INSERT trigger
--    automatically increments/decrements products.quantity, demonstrating
--    trigger integrity and keeping the state 100% consistent!
-- ============================================================================

USE inventory_db;

-- Clear previous data safely
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE stock_transactions;
TRUNCATE TABLE products;
TRUNCATE TABLE suppliers;
TRUNCATE TABLE categories;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. SEED USERS (10 Records: 2 Admins, 8 Operational Staff)
-- Bcrypt Hash for "admin123": $2b$10$epRfZG5.o0eH6o9a8N4GweW9oHkFmsqj2z8z8m2L0a3Yf8M7Iu6wS
-- Bcrypt Hash for "user123":  $2b$10$3euPcmQFCiblsZeEu5s7p.9OVn0xOQnkWzX4pG/8yEa8a1Yg9C92e
-- ============================================================================
INSERT INTO users (id, username, email, password_hash, role, created_at) VALUES
(1, 'admin',       'admin@inventorysystem.local',    '$2b$10$epRfZG5.o0eH6o9a8N4GweW9oHkFmsqj2z8z8m2L0a3Yf8M7Iu6wS', 'ADMIN', '2026-01-01 08:00:00'),
(2, 'admin_sarah', 'sarah.admin@inventory.local',     '$2b$10$epRfZG5.o0eH6o9a8N4GweW9oHkFmsqj2z8z8m2L0a3Yf8M7Iu6wS', 'ADMIN', '2026-01-02 09:30:00'),
(3, 'staff_john',  'john.doe@inventory.local',        '$2b$10$3euPcmQFCiblsZeEu5s7p.9OVn0xOQnkWzX4pG/8yEa8a1Yg9C92e', 'USER',  '2026-01-05 10:15:00'),
(4, 'staff_emily', 'emily.chen@inventory.local',      '$2b$10$3euPcmQFCiblsZeEu5s7p.9OVn0xOQnkWzX4pG/8yEa8a1Yg9C92e', 'USER',  '2026-01-06 11:00:00'),
(5, 'staff_michael','michael.scot@inventory.local',   '$2b$10$3euPcmQFCiblsZeEu5s7p.9OVn0xOQnkWzX4pG/8yEa8a1Yg9C92e', 'USER',  '2026-01-08 09:00:00'),
(6, 'staff_priya', 'priya.sharma@inventory.local',    '$2b$10$3euPcmQFCiblsZeEu5s7p.9OVn0xOQnkWzX4pG/8yEa8a1Yg9C92e', 'USER',  '2026-01-10 14:20:00'),
(7, 'staff_david', 'david.kim@inventory.local',       '$2b$10$3euPcmQFCiblsZeEu5s7p.9OVn0xOQnkWzX4pG/8yEa8a1Yg9C92e', 'USER',  '2026-01-12 16:45:00'),
(8, 'staff_laura', 'laura.garcia@inventory.local',    '$2b$10$3euPcmQFCiblsZeEu5s7p.9OVn0xOQnkWzX4pG/8yEa8a1Yg9C92e', 'USER',  '2026-01-15 08:30:00'),
(9, 'staff_alex',  'alex.miller@inventory.local',     '$2b$10$3euPcmQFCiblsZeEu5s7p.9OVn0xOQnkWzX4pG/8yEa8a1Yg9C92e', 'USER',  '2026-01-18 13:10:00'),
(10,'staff_chloe', 'chloe.taylor@inventory.local',    '$2b$10$3euPcmQFCiblsZeEu5s7p.9OVn0xOQnkWzX4pG/8yEa8a1Yg9C92e', 'USER',  '2026-01-20 15:50:00');

-- ============================================================================
-- 2. SEED CATEGORIES (10 Records)
-- ============================================================================
INSERT INTO categories (id, name, description, created_at) VALUES
(1,  'Laptops & Computers',       'Desktop workstations, business laptops, and ultrabooks', '2026-01-01 09:00:00'),
(2,  'Computer Peripherals',     'Mice, mechanical keyboards, webcams, and USB hubs',       '2026-01-01 09:05:00'),
(3,  'Storage & Memory',          'NVMe M.2 SSDs, external hard drives, and DDR5 RAM sticks','2026-01-01 09:10:00'),
(4,  'Networking & Cables',       'Gigabit routers, Cat6/Cat7 cables, switches, and patch cords','2026-01-01 09:15:00'),
(5,  'Audio & Headphones',        'Studio monitor headphones, noise-canceling headsets, mics','2026-01-01 09:20:00'),
(6,  'Power & Charging',          'GaN wall chargers, surge protectors, power banks, and UPS','2026-01-01 09:25:00'),
(7,  'Display & Monitors',        'IPS 4K monitors, high-refresh gaming displays, mount arms', '2026-01-01 09:30:00'),
(8,  'Security & Surveillance',   'IP cameras, PoE injectors, smart doorbells, and sensors',  '2026-01-01 09:35:00'),
(9,  'Office Supplies',           'Thermal receipt rolls, barcode scanners, and printer toners','2026-01-01 09:40:00'),
(10, 'Mobile Accessories',        'Protective cases, screen guards, magnetic stands, dongles', '2026-01-01 09:45:00');

-- ============================================================================
-- 3. SEED SUPPLIERS (10 Records)
-- ============================================================================
INSERT INTO suppliers (id, name, contact_person, email, phone, address, created_at) VALUES
(1,  'TechSource Wholesale Ltd.',      'Vikram Seth',     'sales@techsource.com',     '9876543210', 'Plot 45, Okhla Industrial Area Phase III, New Delhi', '2026-01-02 10:00:00'),
(2,  'Apex Component Distributors',    'Rohan Mehta',     'rohan@apexcomponents.in',  '9811223344', '120 Electronic City Phase 1, Bengaluru, Karnataka',   '2026-01-02 10:30:00'),
(3,  'Global Hardware & Logistics',    'Sunita Patel',    'info@globalhardware.org',  '9822334455', 'GIDC Sector 24, Gandhinagar, Gujarat',                 '2026-01-03 11:00:00'),
(4,  'Nexus Electronics Supply Co.',   'Amitabh Roy',     'orders@nexuselec.com',     '9833445566', 'Salt Lake Sector V, Kolkata, West Bengal',             '2026-01-03 11:30:00'),
(5,  'Prime Retail Warehousing Hub',   'Kavita Nair',     'kavita@primeretail.co',    '9844556677', 'Kakkanad Industrial Estate, Kochi, Kerala',            '2026-01-04 12:00:00'),
(6,  'SwiftTrade Peripherals Inc.',    'Arjun Verma',     'arjun@swifttrade.net',     '9855667788', 'Andheri East MIDC, Mumbai, Maharashtra',               '2026-01-04 12:30:00'),
(7,  'Horizon Digital Solutions',      'Deepa Menon',     'contact@horizondigi.com',  '9866778899', 'HITEC City Madhapur, Hyderabad, Telangana',           '2026-01-05 14:00:00'),
(8,  'Metro Cable & Network Works',    'Suresh Gupta',    'suresh@metronetworks.in',  '9877889900', 'Chandni Chowk Market, Old Delhi',                      '2026-01-05 14:30:00'),
(9,  'Vantage Displays & Mounts',      'Neha Kulkarni',   'neha@vantagedisplays.com', '9888990011', 'Shivaji Nagar, Pune, Maharashtra',                     '2026-01-06 15:00:00'),
(10, 'Quantum Power & Batteries',      'Harish Chandra',  'harish@quantumpower.biz',  '9899001122', 'Industrial Area B, Ludhiana, Punjab',                  '2026-01-06 15:30:00');

-- ============================================================================
-- 4. SEED PRODUCTS (12 Records, quantity initialized to 0)
-- Trigger trg_after_stock_transaction_insert will compute true quantity balances
-- ============================================================================
INSERT INTO products (id, category_id, sku, name, description, unit_price, quantity, reorder_level, created_at) VALUES
(1,  1, 'SKU-LAP-001', 'Dell Latitude 3520 15.6"',   'Intel Core i5-1135G7, 16GB RAM, 512GB NVMe SSD, Win 11 Pro', 650.00, 0,  5, '2026-01-10 10:00:00'),
(2,  2, 'SKU-LOG-002', 'Logitech MX Master 3S',       'Ergonomic wireless mouse with 8K DPI darkfield sensor',          99.00, 0, 15, '2026-01-10 10:15:00'),
(3,  2, 'SKU-KEY-003', 'Keychron K2 V2 Wireless',     '75% compact Bluetooth mechanical keyboard, Gateron Brown',        85.00, 0, 10, '2026-01-10 10:30:00'),
(4,  3, 'SKU-SSD-004', 'Samsung 980 Pro 1TB NVMe',    'PCIe 4.0 high speed internal solid state drive (up to 7000 MB/s)',110.00, 0, 12, '2026-01-10 10:45:00'),
(5,  3, 'SKU-HDD-005', 'Seagate Barracuda 2TB HDD',   '3.5-inch SATA 6Gb/s 7200 RPM internal hard drive',                58.00, 0, 10, '2026-01-10 11:00:00'),
(6,  4, 'SKU-ROU-006', 'TP-Link Archer AX73 AX5400',  'Dual-band Gigabit Wi-Fi 6 router with 6 external antennas',      130.00, 0,  8, '2026-01-10 11:15:00'),
(7,  4, 'SKU-CAB-007', 'Cat6 Snagless Patch Cable 10m','Molded RJ45 Gigabit Ethernet stranded cable, Blue',               7.50, 0, 25, '2026-01-10 11:30:00'),
(8,  5, 'SKU-SON-008', 'Sony WH-1000XM5 Wireless',    'Premium industry-leading active noise-canceling headphones',      360.00, 0,  6, '2026-01-10 11:45:00'),
(9,  5, 'SKU-MIC-009', 'Blue Yeti USB Condenser Mic', 'Multi-pattern studio recording and podcast microphone',           125.00, 0, 10, '2026-01-10 12:00:00'),
(10, 6, 'SKU-ANK-010', 'Anker 735 GaN 65W Charger',   '3-Port high-speed PPS fast compact travel adapter',               38.00, 0, 20, '2026-01-10 12:15:00'),
(11, 7, 'SKU-MON-011', 'LG 27UP850-W 27" 4K UHD',     'IPS monitor with HDR400, USB-C 96W PD, and hardware calibrate',  430.00, 0,  5, '2026-01-10 12:30:00'),
(12, 8, 'SKU-CAM-012', 'Hikvision 1080p Dome IP Cam', 'Outdoor vandal-proof PoE security camera with IR night vision',   55.00, 0,  8, '2026-01-10 12:45:00');

-- ============================================================================
-- 5. SEED STOCK TRANSACTIONS (20 Records: IN & OUT movements)
-- The trigger trg_after_stock_transaction_insert will automatically update
-- products.quantity for each row inserted below!
-- ============================================================================

-- Batch 1: Inward receipts from suppliers (IN transactions)
INSERT INTO stock_transactions (id, product_id, supplier_id, user_id, transaction_type, quantity, unit_price, transaction_date, notes) VALUES
(1,  1, 1, 1, 'IN', 15, 580.00, '2026-01-15 09:30:00', 'Initial stock purchase order #PO-2026-001'),
(2,  2, 6, 3, 'IN', 40,  68.00, '2026-01-15 10:00:00', 'Bulk distributor shipment from SwiftTrade'),
(3,  3, 6, 3, 'IN', 25,  58.00, '2026-01-15 10:15:00', 'Keychron shipment received and inspected'),
(4,  4, 2, 4, 'IN', 50,  78.00, '2026-01-16 11:00:00', 'Samsung NVMe batch received from Apex'),
(5,  5, 2, 4, 'IN', 30,  39.00, '2026-01-16 11:30:00', 'Seagate HDD replenishment'),
(6,  6, 8, 5, 'IN', 20,  88.00, '2026-01-17 14:00:00', 'TP-Link router consignments from Metro Cable'),
(7,  7, 8, 5, 'IN', 100,  3.20, '2026-01-17 14:15:00', 'Bulk reel of Cat6 patch cables'),
(8,  8, 4, 1, 'IN', 15, 270.00, '2026-01-18 10:30:00', 'Sony audio hardware arrival via Nexus'),
(9,  9, 4, 6, 'IN', 25,  82.00, '2026-01-18 11:00:00', 'Blue Yeti studio microphone stock'),
(10, 10,10,7, 'IN', 60,  21.50, '2026-01-19 13:00:00', 'Anker GaN fast chargers container delivery'),
(11, 11, 9, 2, 'IN', 12, 315.00, '2026-01-20 15:00:00', 'LG 4K display monitors from Vantage'),
(12, 12, 7, 6, 'IN', 30,  34.00, '2026-01-21 16:30:00', 'Surveillance IP cameras from Horizon Digital');

-- Batch 2: Outward dispatches to customers / retail counter (OUT transactions)
-- Notice supplier_id is NULL for standard outward retail dispatches
INSERT INTO stock_transactions (id, product_id, supplier_id, user_id, transaction_type, quantity, unit_price, transaction_date, notes) VALUES
(13, 1, NULL, 3, 'OUT',  5, 650.00, '2026-01-22 11:00:00', 'Corporate sales dispatch to local tech startup'),
(14, 2, NULL, 4, 'OUT', 28,  99.00, '2026-01-23 12:30:00', 'Retail counter weekly sales aggregate'),
(15, 3, NULL, 4, 'OUT', 18,  85.00, '2026-01-23 14:15:00', 'Online order dispatch batch #104'),
(16, 4, NULL, 5, 'OUT', 30, 110.00, '2026-01-24 15:45:00', 'Sold to gaming lounge upgrade project'),
(17, 5, NULL, 5, 'OUT', 26,  58.00, '2026-01-25 09:30:00', 'Bulk sale to video editing firm'),
(18, 6, NULL, 6, 'OUT', 12, 130.00, '2026-01-25 11:15:00', 'Issued to local network installation contractors'),
(19, 7, NULL, 6, 'OUT', 45,   7.50, '2026-01-26 14:00:00', 'Sold 45 patch cables over counter'),
(20, 8, NULL, 7, 'OUT', 12, 360.00, '2026-01-26 16:20:00', 'High-end retail sales dispatch');

-- Batch 3: Additional outward transactions to simulate critical low-stock scenarios
INSERT INTO stock_transactions (id, product_id, supplier_id, user_id, transaction_type, quantity, unit_price, transaction_date, notes) VALUES
(21, 11, NULL, 3, 'OUT', 10, 430.00, '2026-01-27 10:00:00', 'Dispatched 10 monitors to university lab'),
(22, 10, NULL, 4, 'OUT', 35,  38.00, '2026-01-27 13:45:00', 'Dispatched 35 wall adapters');

-- ============================================================================
-- VERIFICATION OF TRIGGER-GENERATED QUANTITIES
-- Expected Result Summary:
-- Product 1  (Dell Laptop):    15 IN - 5 OUT = 10 (Reorder: 5)  -> Normal
-- Product 2  (Logitech Mouse): 40 IN - 28 OUT = 12 (Reorder: 15) -> LOW STOCK!
-- Product 3  (Keychron):       25 IN - 18 OUT = 7  (Reorder: 10) -> LOW STOCK!
-- Product 4  (Samsung SSD):    50 IN - 30 OUT = 20 (Reorder: 12) -> Normal
-- Product 5  (Seagate HDD):    30 IN - 26 OUT = 4  (Reorder: 10) -> LOW STOCK!
-- Product 6  (TP-Link Router): 20 IN - 12 OUT = 8  (Reorder: 8)  -> LOW STOCK! (Equal)
-- Product 7  (Cat6 Cable):    100 IN - 45 OUT = 55 (Reorder: 25) -> Normal
-- Product 8  (Sony Headphone): 15 IN - 12 OUT = 3  (Reorder: 6)  -> LOW STOCK!
-- Product 9  (Blue Yeti Mic):  25 IN - 0 OUT  = 25 (Reorder: 10) -> Normal
-- Product 10 (Anker Charger):  60 IN - 35 OUT = 25 (Reorder: 20) -> Normal
-- Product 11 (LG 4K Monitor):  12 IN - 10 OUT = 2  (Reorder: 5)  -> LOW STOCK!
-- Product 12 (Hikvision Cam):  30 IN - 0 OUT  = 30 (Reorder: 8)  -> Normal
-- ============================================================================
