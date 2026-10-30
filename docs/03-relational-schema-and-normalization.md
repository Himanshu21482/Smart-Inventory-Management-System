# 03 - Relational Schema and Normalization

## 1. Formal Relational Schema Notation

The relational database structure is formally defined below. Primary keys are marked with `(PK)` and foreign keys with `-> TABLE.column`.

- **USERS** (
  `id` (PK), 
  `username`, 
  `email`, 
  `password_hash`, 
  `role`, 
  `created_at`
)

- **CATEGORIES** (
  `id` (PK), 
  `name`, 
  `description`, 
  `created_at`
)

- **SUPPLIERS** (
  `id` (PK), 
  `name`, 
  `contact_person`, 
  `email`, 
  `phone`, 
  `address`, 
  `created_at`
)

- **PRODUCTS** (
  `id` (PK), 
  `category_id` -> `CATEGORIES.id`, 
  `sku`, 
  `name`, 
  `description`, 
  `unit_price`, 
  `quantity`, 
  `reorder_level`, 
  `created_at`, 
  `updated_at`
)

- **STOCK_TRANSACTIONS** (
  `id` (PK), 
  `product_id` -> `PRODUCTS.id`, 
  `supplier_id` -> `SUPPLIERS.id`, 
  `user_id` -> `USERS.id`, 
  `transaction_type`, 
  `quantity`, 
  `unit_price`, 
  `transaction_date`, 
  `notes`
)

---

## 2. Functional Dependencies (FDs)

### 2.1. USERS Table
- **Candidate Keys:** `{id}`, `{username}`, `{email}`
- **Functional Dependencies:**
  - $id \rightarrow \{username, email, password\_hash, role, created\_at\}$
  - $username \rightarrow \{id, email, password\_hash, role, created\_at\}$
  - $email \rightarrow \{id, username, password\_hash, role, created\_at\}$

### 2.2. CATEGORIES Table
- **Candidate Keys:** `{id}`, `{name}`
- **Functional Dependencies:**
  - $id \rightarrow \{name, description, created\_at\}$
  - $name \rightarrow \{id, description, created\_at\}$

### 2.3. SUPPLIERS Table
- **Candidate Keys:** `{id}`, `{email}`
- **Functional Dependencies:**
  - $id \rightarrow \{name, contact\_person, email, phone, address, created\_at\}$
  - $email \rightarrow \{id, name, contact\_person, phone, address, created\_at\}$

### 2.4. PRODUCTS Table
- **Candidate Keys:** `{id}`, `{sku}`
- **Functional Dependencies:**
  - $id \rightarrow \{category\_id, sku, name, description, unit\_price, quantity, reorder\_level, created\_at, updated\_at\}$
  - $sku \rightarrow \{id, category\_id, name, description, unit\_price, quantity, reorder\_level, created\_at, updated\_at\}$

### 2.5. STOCK_TRANSACTIONS Table
- **Candidate Key:** `{id}`
- **Functional Dependencies:**
  - $id \rightarrow \{product\_id, supplier\_id, user\_id, transaction\_type, quantity, unit\_price, transaction\_date, notes\}$

---

## 3. Step-by-Step Normalization Analysis

### 3.1. First Normal Form (1NF)
**Requirements:**
1. Each table must have a unique identifier (Primary Key).
2. Each column must store strictly **atomic** (indivisible) scalar values.
3. No repeating groups or multi-valued attributes (e.g., comma-separated values or nested tables).

**Verification:**
- Every entity has a distinct surrogate primary key (`id INT AUTO_INCREMENT`).
- Attributes like `phone`, `email`, and `address` contain individual, atomic string values.
- Transactions are not stored as lists inside the `products` table; each movement is an independent row in `stock_transactions`.
- **Verdict: The schema strictly adheres to 1NF.**

---

### 3.2. Second Normal Form (2NF)
**Requirements:**
1. The schema must be in 1NF.
2. No non-prime attribute may be partially functionally dependent on any candidate key (i.e., **No Partial Dependencies**).

**Verification:**
- In all five relations (`USERS`, `CATEGORIES`, `SUPPLIERS`, `PRODUCTS`, `STOCK_TRANSACTIONS`), every candidate key consists of a **single attribute** (e.g., `id`, `sku`, `email`, `username`).
- Partial functional dependency can only occur when a candidate key is composite (consisting of two or more attributes). Because every candidate key is a singleton, partial dependency is mathematically impossible:
$$\forall X \rightarrow Y, \quad |X| = 1 \implies \text{No proper subset of } X \text{ exists}.$$
- **Verdict: The schema strictly adheres to 2NF.**

---

### 3.3. Third Normal Form (3NF)
**Requirements:**
1. The schema must be in 2NF.
2. No non-prime attribute may depend transitively on any candidate key (i.e., for every functional dependency $X \rightarrow Y$, either $X$ is a superkey or $Y$ is a prime attribute). **No Transitive Dependencies ($X \rightarrow Z \rightarrow Y$).**

**Verification:**
- **In `PRODUCTS`:** We do not store `category_name` or `category_description`. If `category_name` were stored in `PRODUCTS`, we would have $id \rightarrow category\_id \rightarrow category\_name$, which would violate 3NF. Instead, only the foreign key `category_id` is retained.
- **In `STOCK_TRANSACTIONS`:** We do not store `product_name`, `supplier_name`, or `username`. We store only foreign keys `product_id`, `supplier_id`, and `user_id`. Non-key attributes (`quantity`, `unit_price`, `transaction_date`) depend directly and solely on `id`.
- **In `SUPPLIERS` and `USERS`:** Every non-key attribute directly describes the entity identified by `id`.
- **Verdict: The schema strictly adheres to 3NF.**

---

## 4. Architectural Justification: Deliberate Denormalization of `products.quantity`

In a textbook 3NF theoretical model, **`products.quantity` is a derived attribute**:
$$\text{quantity} = \sum_{\text{IN}} \text{quantity} - \sum_{\text{OUT}} \text{quantity}$$
Strict normalization theory would dictate dropping the `quantity` column entirely and calculating stock on-the-fly using aggregate queries on `stock_transactions`.

In this project, `products.quantity` is **deliberately retained and denormalized** for critical operational and performance reasons:

### 1. Read Performance ($O(1)$ vs $O(N)$)
- Calculating stock balance dynamically requires an aggregate table scan over the entire history of `stock_transactions` for every catalog view, search, and dashboard refresh.
- As the transactions table scales into hundreds of thousands of rows, computing stock for 50 products on a search page requires grouping thousands of historical rows.
- Storing `products.quantity` provides instantaneous $O(1)$ lookups, ideal for responsive UI rendering and pagination.

### 2. High-Speed Low-Stock Monitoring
- The system must trigger alerts when stock drops below `reorder_level`.
- With a stored column, the low-stock view query is an indexed scan:
  ```sql
  SELECT * FROM products WHERE quantity <= reorder_level;
  ```
  Without this column, the query would require a `HAVING SUM(...) <= reorder_level` aggregate scan over every transaction ever recorded.

### 3. Concurrency and Race-Condition Defense
- When dispatching stock (`OUT`), the system must verify whether sufficient items exist before approving the request.
- Checking a single row in `products` is instant and can be locked (`FOR UPDATE`). Aggregating historical rows on high-frequency dispatches creates lock contention and deadlock risks.

### 4. Integrity Guaranteed via Database Triggers
- Denormalization typically risks data inconsistency if the application code fails to update the derived field.
- In this architecture, **the application never updates `products.quantity` directly**. 
- An automated **MySQL `AFTER INSERT` Trigger** on `stock_transactions` atomically increments or decrements `products.quantity` inside the exact same database transaction.
- If the transaction fails, both the log entry and the quantity update rollback together, guaranteeing ACID compliance and zero drift.
