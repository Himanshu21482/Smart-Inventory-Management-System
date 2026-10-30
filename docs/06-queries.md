# 06 - Key SQL Queries

This document details the operational SQL queries executed by the Node.js Express backend using raw parameterized SQL (`mysql2`), including search/filter implementations, stored procedure invocations, and complex multi-table analytical reporting queries with sample output tables.

---

## 1. Authentication & User Queries

### 1.1. User Lookup by Username or Email (Login)
```sql
SELECT id, username, email, password_hash, role
FROM users
WHERE username = ? OR email = ?
LIMIT 1;
```

### 1.2. Fetch Authenticated User Profile
```sql
SELECT id, username, email, role, created_at
FROM users
WHERE id = ?;
```

---

## 2. Product Catalog CRUD Queries

### 2.1. Create Product (Admin Only)
```sql
INSERT INTO products (category_id, sku, name, description, unit_price, quantity, reorder_level)
VALUES (?, ?, ?, ?, ?, ?, ?);
```

### 2.2. Fetch All Products with Category Metadata
```sql
SELECT 
    p.id,
    p.sku,
    p.name,
    p.description,
    p.unit_price,
    p.quantity,
    p.reorder_level,
    p.category_id,
    c.name AS category_name,
    p.created_at,
    p.updated_at
FROM products p
INNER JOIN categories c ON p.category_id = c.id
ORDER BY p.name ASC;
```

### 2.3. Fetch Single Product by ID
```sql
SELECT 
    p.id,
    p.sku,
    p.name,
    p.description,
    p.unit_price,
    p.quantity,
    p.reorder_level,
    p.category_id,
    c.name AS category_name,
    p.created_at,
    p.updated_at
FROM products p
INNER JOIN categories c ON p.category_id = c.id
WHERE p.id = ?;
```

### 2.4. Update Product Details (Admin Only)
*(Note: `quantity` is omitted here because it is exclusively managed by database triggers upon stock transactions)*
```sql
UPDATE products
SET 
    category_id = ?,
    sku = ?,
    name = ?,
    description = ?,
    unit_price = ?,
    reorder_level = ?
WHERE id = ?;
```

### 2.5. Delete Product (Admin Only)
```sql
DELETE FROM products 
WHERE id = ?;
```

---

## 3. Search and Filtering Queries

### 3.1. Unified Multi-Filter Dynamic Query
Supports keyword search across Product Name and SKU, category filtering, and an optional toggle to view low-stock items.

```sql
SELECT 
    p.id,
    p.sku,
    p.name,
    p.unit_price,
    p.quantity,
    p.reorder_level,
    c.id AS category_id,
    c.name AS category_name,
    CASE 
        WHEN p.quantity <= p.reorder_level THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
    END AS stock_status
FROM products p
INNER JOIN categories c ON p.category_id = c.id
WHERE 1 = 1
  -- Optional search condition (applied if search parameter provided)
  AND (p.name LIKE CONCAT('%', ?, '%') OR p.sku LIKE CONCAT('%', ?, '%'))
  -- Optional category filter (applied if category_id provided)
  AND (? IS NULL OR p.category_id = ?)
  -- Optional low-stock filter (applied if only_low_stock = 1)
  AND (? = 0 OR p.quantity <= p.reorder_level)
ORDER BY p.name ASC;
```

---

## 4. Categories & Suppliers CRUD Queries

### 4.1. Fetch Categories with Item Count
```sql
SELECT 
    c.id,
    c.name,
    c.description,
    COUNT(p.id) AS total_products,
    c.created_at
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.id, c.name, c.description, c.created_at
ORDER BY c.name ASC;
```

### 4.2. Fetch Suppliers with Inward Shipment Count
```sql
SELECT 
    s.id,
    s.name,
    s.contact_person,
    s.email,
    s.phone,
    s.address,
    COUNT(st.id) AS total_shipments,
    s.created_at
FROM suppliers s
LEFT JOIN stock_transactions st ON s.id = st.supplier_id AND st.transaction_type = 'IN'
GROUP BY s.id, s.name, s.contact_person, s.email, s.phone, s.address, s.created_at
ORDER BY s.name ASC;
```

---

## 5. Stock Transactions & Stored Procedure

### 5.1. Record a Stock Movement via Stored Procedure
Backend invokes the atomic procedure with output variables:
```sql
CALL sp_record_stock_transaction(
    ?,      -- p_product_id
    ?,      -- p_supplier_id (NULL for OUT)
    ?,      -- p_user_id
    ?,      -- p_transaction_type ('IN' or 'OUT')
    ?,      -- p_quantity
    ?,      -- p_unit_price
    ?,      -- p_notes
    @out_tx_id,
    @out_qty
);

SELECT @out_tx_id AS transaction_id, @out_qty AS updated_quantity;
```

### 5.2. Fetch Transaction Ledger with Full Relational Joins
```sql
SELECT 
    st.id,
    st.transaction_type,
    st.quantity,
    st.unit_price,
    (st.quantity * st.unit_price) AS total_cost,
    st.transaction_date,
    st.notes,
    p.id AS product_id,
    p.sku AS product_sku,
    p.name AS product_name,
    COALESCE(s.name, 'N/A (Retail Dispatch)') AS supplier_name,
    u.username AS recorded_by_user
FROM stock_transactions st
INNER JOIN products p ON st.product_id = p.id
LEFT JOIN suppliers s ON st.supplier_id = s.id
INNER JOIN users u ON st.user_id = u.id
ORDER BY st.transaction_date DESC
LIMIT 50;
```

---

## 6. Low-Stock Alerts View Query

### 6.1. Query against MySQL View `v_low_stock`
```sql
SELECT 
    product_id,
    sku,
    product_name,
    category_name,
    current_quantity,
    reorder_level,
    deficit_quantity,
    unit_price,
    current_stock_value,
    last_updated
FROM v_low_stock
ORDER BY deficit_quantity DESC, current_quantity ASC;
```

### 6.2. Sample Output Table for View
*(Based on the provided seed dataset)*

| product_id | sku | product_name | category_name | current_quantity | reorder_level | deficit_quantity | unit_price | current_stock_value |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| 5 | `SKU-HDD-005` | Seagate Barracuda 2TB HDD | Storage & Memory | 4 | 10 | 6 | $58.00 | $232.00 |
| 11 | `SKU-MON-011` | LG 27UP850-W 27" 4K UHD | Display & Monitors | 2 | 5 | 3 | $430.00 | $860.00 |
| 8 | `SKU-SON-008` | Sony WH-1000XM5 Wireless | Audio & Headphones | 3 | 6 | 3 | $360.00 | $1,080.00 |
| 3 | `SKU-KEY-003` | Keychron K2 V2 Wireless | Computer Peripherals | 7 | 10 | 3 | $85.00 | $595.00 |
| 2 | `SKU-LOG-002` | Logitech MX Master 3S | Computer Peripherals | 12 | 15 | 3 | $99.00 | $1,188.00 |
| 6 | `SKU-ROU-006` | TP-Link Archer AX73 AX5400 | Networking & Cables | 8 | 8 | 0 | $130.00 | $1,040.00 |

---

## 7. Business Intelligence & Analytical Reports

### 7.1. Report 1: Category Stock Value & Inventory Summary
**Features Demonstrated:** `JOIN`, `COUNT(p.id)`, `SUM(p.quantity)`, `AVG(p.unit_price)`, `SUM(quantity * unit_price)`, `GROUP BY`.

```sql
SELECT 
    c.id AS category_id,
    c.name AS category_name,
    COUNT(p.id) AS total_product_count,
    COALESCE(SUM(p.quantity), 0) AS total_stock_quantity,
    COALESCE(AVG(p.unit_price), 0.00) AS avg_product_price,
    COALESCE(SUM(p.quantity * p.unit_price), 0.00) AS total_stock_value
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.id, c.name
ORDER BY total_stock_value DESC;
```

#### Sample Output: Category Stock Valuation Report

| category_id | category_name | total_product_count | total_stock_quantity | avg_product_price | total_stock_value |
| :---: | :--- | :---: | :---: | :---: | :---: |
| 1 | Laptops & Computers | 1 | 10 | $650.00 | $6,500.00 |
| 5 | Audio & Headphones | 2 | 28 | $242.50 | $4,205.00 |
| 3 | Storage & Memory | 2 | 24 | $84.00 | $2,432.00 |
| 2 | Computer Peripherals | 2 | 19 | $92.00 | $1,783.00 |
| 8 | Security & Surveillance | 1 | 30 | $55.00 | $1,650.00 |
| 4 | Networking & Cables | 2 | 63 | $68.75 | $1,452.50 |
| 6 | Power & Charging | 1 | 25 | $38.00 | $950.00 |
| 7 | Display & Monitors | 1 | 2 | $430.00 | $860.00 |
| 9 | Office Supplies | 0 | 0 | $0.00 | $0.00 |
| 10 | Mobile Accessories | 0 | 0 | $0.00 | $0.00 |

---

### 7.2. Report 2: Supplier Procurement & Movement Summary
**Features Demonstrated:** Multi-table `JOIN`, `COUNT(st.id)`, `SUM(st.quantity)`, `SUM(st.quantity * st.unit_price)`, `GROUP BY`, `HAVING`.

```sql
SELECT 
    s.id AS supplier_id,
    s.name AS supplier_name,
    s.contact_person,
    COUNT(st.id) AS total_inward_transactions,
    COALESCE(SUM(st.quantity), 0) AS total_units_procured,
    COALESCE(SUM(st.quantity * st.unit_price), 0.00) AS total_expenditure
FROM suppliers s
INNER JOIN stock_transactions st ON s.id = st.supplier_id
WHERE st.transaction_type = 'IN'
GROUP BY s.id, s.name, s.contact_person
ORDER BY total_expenditure DESC;
```

#### Sample Output: Supplier Procurement Report

| supplier_id | supplier_name | contact_person | total_inward_transactions | total_units_procured | total_expenditure |
| :---: | :--- | :--- | :---: | :---: | :---: |
| 1 | TechSource Wholesale Ltd. | Vikram Seth | 1 | 15 | $8,700.00 |
| 4 | Nexus Electronics Supply Co. | Amitabh Roy | 2 | 40 | $6,100.00 |
| 2 | Apex Component Distributors | Rohan Mehta | 2 | 80 | $5,070.00 |
| 6 | SwiftTrade Peripherals Inc. | Arjun Verma | 2 | 65 | $4,170.00 |
| 9 | Vantage Displays & Mounts | Neha Kulkarni | 1 | 12 | $3,780.00 |
| 8 | Metro Cable & Network Works | Suresh Gupta | 2 | 120 | $2,080.00 |
| 10 | Quantum Power & Batteries | Harish Chandra | 1 | 60 | $1,290.00 |
| 7 | Horizon Digital Solutions | Deepa Menon | 1 | 30 | $1,020.00 |
