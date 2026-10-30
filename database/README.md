# Database Setup Guide

This folder contains the complete database scripts for the **Smart Inventory Management System (SIMS)** on MySQL 8.0+.

---

## Files
- `schema.sql`: Creates database `inventory_db`, all 5 tables (`users`, `categories`, `suppliers`, `products`, `stock_transactions`), all constraints, view `v_low_stock`, triggers, stored function, and stored procedure.
- `seed.sql`: Populates realistic baseline data (10 users, 10 categories, 10 suppliers, 12 products, 22 stock transactions). Triggers automatically calculate and maintain `products.quantity`.

---

## Prerequisites
- MySQL 8.0+ running on port 3306.
- A user account with database creation and trigger privileges (e.g., `root`).

---

## Import Instructions

### Option 1: MySQL Command-Line Client (Windows CMD / PowerShell)

```cmd
:: 1. Import schema (DDL, view, triggers, stored procedures)
mysql -u root -p < "database/schema.sql"

:: 2. Import seed data (sample records, trigger execution)
mysql -u root -p < "database/seed.sql"
```

If running inside PowerShell directly, use:
```powershell
cmd.exe /c "mysql -u root -p < database/schema.sql"
cmd.exe /c "mysql -u root -p < database/seed.sql"
```

---

### Option 2: MySQL Workbench or Interactive Prompt

1. Connect to your MySQL server in Workbench or the terminal:
   ```bash
   mysql -u root -p
   ```
2. Execute the schema script:
   ```sql
   SOURCE c:/DBMS project/database/schema.sql;
   ```
3. Execute the seed script:
   ```sql
   SOURCE c:/DBMS project/database/seed.sql;
   ```

---

## Verification Queries

Run the following checks to confirm successful setup:

```sql
USE inventory_db;

-- 1. Check table existence
SHOW TABLES;

-- 2. Verify view returns low stock items
SELECT * FROM v_low_stock;

-- 3. Verify products.quantity equals SUM(IN) - SUM(OUT)
SELECT 
    p.id, 
    p.sku, 
    p.name, 
    p.quantity AS stored_quantity, 
    COALESCE(SUM(CASE WHEN st.transaction_type = 'IN' THEN st.quantity WHEN st.transaction_type = 'OUT' THEN -st.quantity ELSE 0 END), 0) AS calculated_quantity
FROM products p
LEFT JOIN stock_transactions st ON p.id = st.product_id
GROUP BY p.id, p.sku, p.name, p.quantity;
```
