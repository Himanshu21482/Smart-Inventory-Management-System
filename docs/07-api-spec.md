# 07 - REST API Specification

## 1. Overview & Conventions
- **Base URL:** `http://localhost:5000/api`
- **Data Format:** All requests and responses use `application/json; charset=utf-8`.
- **Authentication:** Stateless Bearer JWT tokens sent in the standard HTTP header:  
  `Authorization: Bearer <jwt_token>`
- **Authorization Levels:**
  - `Public`: Accessible without authentication.
  - `Authenticated`: Accessible to any logged-in user (`ADMIN` or `USER`).
  - `Admin Only`: Restricted to users with the `ADMIN` role.

### Standard Response Envelope
```json
// Successful Response
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": { ... }
}

// Error Response
{
  "success": false,
  "error": "Error description or validation failure message."
}
```

---

## 2. API Endpoints Master Table

| Module | Method | Route | Auth Level | Request Body | Success Status | Description |
| :--- | :---: | :--- | :---: | :--- | :---: | :--- |
| **Auth** | `POST` | `/auth/login` | Public | `{ username, password }` | `200 OK` | Authenticates user; returns JWT & user profile |
| **Auth** | `GET` | `/auth/me` | Authenticated | None | `200 OK` | Retrieves current session user details |
| **Categories** | `GET` | `/categories` | Authenticated | None | `200 OK` | Lists all categories with product counts |
| **Categories** | `GET` | `/categories/:id` | Authenticated | None | `200 OK` | Retrieves a single category by ID |
| **Categories** | `POST` | `/categories` | Admin Only | `{ name, description }` | `201 Created` | Creates a new category |
| **Categories** | `PUT` | `/categories/:id` | Admin Only | `{ name, description }` | `200 OK` | Updates existing category |
| **Categories** | `DELETE` | `/categories/:id` | Admin Only | None | `200 OK` | Deletes category (restricted if products exist) |
| **Suppliers** | `GET` | `/suppliers` | Authenticated | None | `200 OK` | Lists all suppliers with shipment counts |
| **Suppliers** | `GET` | `/suppliers/:id` | Authenticated | None | `200 OK` | Retrieves a single supplier by ID |
| **Suppliers** | `POST` | `/suppliers` | Admin Only | `{ name, contact_person, email, phone, address }` | `201 Created` | Registers a new supplier |
| **Suppliers** | `PUT` | `/suppliers/:id` | Admin Only | `{ name, contact_person, email, phone, address }` | `200 OK` | Updates existing supplier |
| **Suppliers** | `DELETE` | `/suppliers/:id` | Admin Only | None | `200 OK` | Deletes supplier (restricted if active references) |
| **Products** | `GET` | `/products` | Authenticated | Query: `?search=&category_id=&low_stock=` | `200 OK` | Lists products with multi-filter search |
| **Products** | `GET` | `/products/:id` | Authenticated | None | `200 OK` | Retrieves single product details |
| **Products** | `POST` | `/products` | Admin Only | `{ category_id, sku, name, description, unit_price, reorder_level }` | `201 Created` | Creates product (initial stock defaults to 0) |
| **Products** | `PUT` | `/products/:id` | Admin Only | `{ category_id, sku, name, description, unit_price, reorder_level }` | `200 OK` | Updates product details |
| **Products** | `DELETE` | `/products/:id` | Admin Only | None | `200 OK` | Deletes product (restricted if transactions exist) |
| **Products** | `GET` | `/products/low-stock` | Authenticated | None | `200 OK` | Fetches items from MySQL View `v_low_stock` |
| **Transactions** | `GET` | `/transactions` | Authenticated | Query: `?limit=50&type=` | `200 OK` | Retrieves transaction history with relational joins |
| **Transactions** | `POST` | `/transactions` | Authenticated | `{ product_id, supplier_id, transaction_type, quantity, unit_price, notes }` | `201 Created` | **Calls Stored Procedure `sp_record_stock_transaction`** |
| **Reports** | `GET` | `/reports/category-summary` | Admin Only | None | `200 OK` | Category valuation report (`JOIN + GROUP BY`) |
| **Reports** | `GET` | `/reports/supplier-procurement` | Admin Only | None | `200 OK` | Supplier procurement report (`JOIN + GROUP BY`) |
| **Reports** | `GET` | `/reports/kpi-summary` | Authenticated | None | `200 OK` | Dashboard summary cards (calls `fn_calculate_inventory_value`) |

---

## 3. Detailed Request / Response Schemas

### 3.1. Authentication
#### `POST /api/auth/login`
- **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Login successful.",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@inventorysystem.local",
        "role": "ADMIN"
      }
    }
  }
  ```

---

### 3.2. Products Module
#### `GET /api/products?search=Logi&category_id=2&low_stock=1`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 2,
        "category_id": 2,
        "category_name": "Computer Peripherals",
        "sku": "SKU-LOG-002",
        "name": "Logitech MX Master 3S",
        "unit_price": "99.00",
        "quantity": 12,
        "reorder_level": 15,
        "stock_status": "LOW_STOCK"
      }
    ]
  }
  ```

#### `POST /api/products` *(Admin Only)*
- **Request Body:**
  ```json
  {
    "category_id": 2,
    "sku": "SKU-WAC-013",
    "name": "Wacom One Graphics Tablet",
    "description": "Medium digital drawing tablet with battery-free stylus",
    "unit_price": 59.99,
    "reorder_level": 8
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "message": "Product created successfully.",
    "data": {
      "id": 13,
      "sku": "SKU-WAC-013",
      "quantity": 0
    }
  }
  ```

---

### 3.3. Low-Stock Alerts View
#### `GET /api/products/low-stock`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "product_id": 5,
        "sku": "SKU-HDD-005",
        "product_name": "Seagate Barracuda 2TB HDD",
        "category_name": "Storage & Memory",
        "current_quantity": 4,
        "reorder_level": 10,
        "deficit_quantity": 6,
        "unit_price": "58.00",
        "current_stock_value": "232.00"
      }
    ]
  }
  ```

---

### 3.4. Stock Transactions (Invoking Stored Procedure)
#### `POST /api/transactions`
- **Request Body:**
  ```json
  {
    "product_id": 2,
    "supplier_id": 6,
    "transaction_type": "IN",
    "quantity": 20,
    "unit_price": 70.00,
    "notes": "Emergency restock batch"
  }
  ```
- **Backend Implementation:**  
  Extracts `user_id` from the verified JWT payload and calls MySQL Stored Procedure:
  ```sql
  CALL sp_record_stock_transaction(2, 6, 1, 'IN', 20, 70.00, 'Emergency restock batch', @tx_id, @new_qty);
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "message": "Stock transaction processed successfully.",
    "data": {
      "transaction_id": 23,
      "product_id": 2,
      "transaction_type": "IN",
      "quantity": 20,
      "updated_quantity": 32
    }
  }
  ```
- **Error Response `400 Bad Request` (Trigger / Procedure Rejection):**
  ```json
  {
    "success": false,
    "error": "Business Rule Violation: Cannot dispatch OUT more items than current available stock."
  }
  ```

---

### 3.5. Reports & Analytics
#### `GET /api/reports/category-summary` *(Admin Only)*
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "category_id": 1,
        "category_name": "Laptops & Computers",
        "total_product_count": 1,
        "total_stock_quantity": 10,
        "avg_product_price": "650.00",
        "total_stock_value": "6500.00"
      },
      {
        "category_id": 5,
        "category_name": "Audio & Headphones",
        "total_product_count": 2,
        "total_stock_quantity": 28,
        "avg_product_price": "242.50",
        "total_stock_value": "4205.00"
      }
    ]
  }
  ```

#### `GET /api/reports/kpi-summary`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "total_products": 12,
      "total_categories": 10,
      "total_suppliers": 10,
      "low_stock_count": 6,
      "total_inventory_value": "20892.50"
    }
  }
  ```
