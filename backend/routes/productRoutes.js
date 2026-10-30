const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleDbError } = require('../middleware/errorHandler');

/**
 * Validates product creation/update payload.
 */
function validateProduct(body) {
  const { sku, name, category_id, unit_price, reorder_level } = body;

  if (!sku || sku.trim().length < 3 || sku.trim().length > 50) {
    return 'SKU is required and must be between 3 and 50 characters (e.g. SKU-LAP-001).';
  }
  if (!name || name.trim().length < 2) {
    return 'Product name is required and must be at least 2 characters.';
  }
  if (!category_id || isNaN(Number(category_id)) || Number(category_id) <= 0) {
    return 'A valid category must be selected.';
  }
  if (unit_price === undefined || unit_price === null || isNaN(Number(unit_price)) || Number(unit_price) < 0) {
    return 'Unit price must be a valid non-negative number (e.g. 19.99).';
  }
  if (reorder_level !== undefined && (isNaN(Number(reorder_level)) || Number(reorder_level) < 0 || !Number.isInteger(Number(reorder_level)))) {
    return 'Reorder level must be a non-negative integer (e.g. 10).';
  }

  return null;
}

/**
 * GET /api/products
 * Returns products with optional search keyword, category filter, and low-stock filter.
 * Accessible to all authenticated users.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, category_id, low_stock } = req.query;

    let query = `
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
        CASE 
          WHEN p.quantity <= p.reorder_level THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END AS stock_status,
        p.created_at,
        p.updated_at
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      WHERE 1 = 1
    `;

    const params = [];

    // Filter by keyword search (SKU or Name)
    if (search && search.trim() !== '') {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    // Filter by category
    if (category_id && category_id !== '' && !isNaN(Number(category_id))) {
      query += ` AND p.category_id = ?`;
      params.push(Number(category_id));
    }

    // Filter by low stock status (quantity <= reorder_level)
    if (low_stock === '1' || low_stock === 'true') {
      query += ` AND p.quantity <= p.reorder_level`;
    }

    query += ` ORDER BY p.name ASC`;

    const [rows] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to fetch products.');
  }
});

/**
 * GET /api/products/low-stock
 * Queries the MySQL View v_low_stock to return all items at or below reorder level.
 * Placed before /:id to prevent routing collision.
 */
router.get('/low-stock', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         product_id,
         sku,
         product_name,
         category_id,
         category_name,
         current_quantity,
         reorder_level,
         deficit_quantity,
         unit_price,
         current_stock_value,
         last_updated
       FROM v_low_stock
       ORDER BY deficit_quantity DESC, current_quantity ASC`
    );

    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to fetch low-stock view.');
  }
});

/**
 * GET /api/products/:id
 * Retrieves a single product by ID.
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         p.id,
         p.sku,
         p.name,
         p.description,
         p.unit_price,
         p.quantity,
         p.reorder_level,
         p.category_id,
         c.name AS category_name,
         CASE 
           WHEN p.quantity <= p.reorder_level THEN 'LOW_STOCK'
           ELSE 'IN_STOCK'
         END AS stock_status,
         p.created_at,
         p.updated_at
       FROM products p
       INNER JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to fetch product.');
  }
});

/**
 * POST /api/products
 * Creates a new product catalog item. Restricted to Admins.
 * Quantity defaults to 0 and is altered only via stock transactions.
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errorMsg = validateProduct(req.body);
    if (errorMsg) {
      return res.status(400).json({ success: false, error: errorMsg });
    }

    const { sku, name, description, category_id, unit_price, reorder_level } = req.body;

    const [result] = await pool.query(
      `INSERT INTO products (category_id, sku, name, description, unit_price, quantity, reorder_level)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [
        Number(category_id),
        sku.trim().toUpperCase(),
        name.trim(),
        description ? description.trim() : null,
        Number(unit_price),
        reorder_level !== undefined ? Number(reorder_level) : 10
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: {
        id: result.insertId,
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        quantity: 0
      }
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to create product.');
  }
});

/**
 * PUT /api/products/:id
 * Updates product metadata. Restricted to Admins.
 * Note: 'quantity' is intentionally excluded to preserve trigger consistency.
 */
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errorMsg = validateProduct(req.body);
    if (errorMsg) {
      return res.status(400).json({ success: false, error: errorMsg });
    }

    const { sku, name, description, category_id, unit_price, reorder_level } = req.body;

    const [result] = await pool.query(
      `UPDATE products
       SET category_id = ?,
           sku = ?,
           name = ?,
           description = ?,
           unit_price = ?,
           reorder_level = ?
       WHERE id = ?`,
      [
        Number(category_id),
        sku.trim().toUpperCase(),
        name.trim(),
        description ? description.trim() : null,
        Number(unit_price),
        reorder_level !== undefined ? Number(reorder_level) : 10,
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      data: {
        id: Number(req.params.id),
        sku: sku.trim().toUpperCase(),
        name: name.trim()
      }
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to update product.');
  }
});

/**
 * DELETE /api/products/:id
 * Deletes a product. Restricted to Admins.
 * Returns a friendly error if transactions exist.
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [txRows] = await pool.query(
      `SELECT COUNT(*) AS tx_count FROM stock_transactions WHERE product_id = ?`,
      [req.params.id]
    );

    if (txRows[0].tx_count > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete product because ${txRows[0].tx_count} stock transaction(s) are recorded for it. Inventory audit trail must be maintained.`
      });
    }

    const [result] = await pool.query(
      `DELETE FROM products WHERE id = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully.'
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to delete product.');
  }
});

module.exports = router;
