const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { handleDbError } = require('../middleware/errorHandler');

/**
 * Validates stock transaction payload.
 */
function validateTransaction(body) {
  const { product_id, transaction_type, quantity, unit_price, supplier_id } = body;

  if (!product_id || isNaN(Number(product_id)) || Number(product_id) <= 0) {
    return 'A valid product must be selected.';
  }
  if (!transaction_type || !['IN', 'OUT'].includes(transaction_type)) {
    return 'Transaction type must be either IN or OUT.';
  }
  if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0 || !Number.isInteger(Number(quantity))) {
    return 'Quantity must be a positive integer greater than zero.';
  }
  if (unit_price === undefined || unit_price === null || isNaN(Number(unit_price)) || Number(unit_price) < 0) {
    return 'Unit price/cost must be a valid non-negative number.';
  }
  if (transaction_type === 'IN' && !supplier_id) {
    return 'Supplier must be specified for inward (IN) inventory shipments.';
  }

  return null;
}

/**
 * GET /api/transactions
 * Returns transaction ledger with product, supplier, and user join details.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, limit } = req.query;

    let query = `
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
        s.id AS supplier_id,
        u.username AS recorded_by_user
      FROM stock_transactions st
      INNER JOIN products p ON st.product_id = p.id
      LEFT JOIN suppliers s ON st.supplier_id = s.id
      INNER JOIN users u ON st.user_id = u.id
      WHERE 1 = 1
    `;

    const params = [];

    if (type && ['IN', 'OUT'].includes(type.toUpperCase())) {
      query += ` AND st.transaction_type = ?`;
      params.push(type.toUpperCase());
    }

    query += ` ORDER BY st.transaction_date DESC`;

    const rowLimit = limit && !isNaN(Number(limit)) ? Math.min(Number(limit), 200) : 50;
    query += ` LIMIT ?`;
    params.push(rowLimit);

    const [rows] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to fetch transaction records.');
  }
});

/**
 * POST /api/transactions
 * Records a stock transaction by calling MySQL Stored Procedure `sp_record_stock_transaction`.
 * The AFTER INSERT trigger automatically maintains products.quantity.
 * Accessible to all authenticated users (Admin and Staff).
 */
router.post('/', authenticateToken, async (req, res) => {
  const errorMsg = validateTransaction(req.body);
  if (errorMsg) {
    return res.status(400).json({ success: false, error: errorMsg });
  }

  const { product_id, supplier_id, transaction_type, quantity, unit_price, notes } = req.body;
  const connection = await pool.getConnection();

  try {
    // Execute stored procedure with session variables
    await connection.query(
      `CALL sp_record_stock_transaction(?, ?, ?, ?, ?, ?, ?, @out_tx_id, @out_qty)`,
      [
        Number(product_id),
        supplier_id ? Number(supplier_id) : null,
        req.user.id,
        transaction_type,
        Number(quantity),
        Number(unit_price),
        notes ? notes.trim() : null
      ]
    );

    // Retrieve the OUT variables from the same connection
    const [outRows] = await connection.query(
      `SELECT @out_tx_id AS transaction_id, @out_qty AS updated_quantity`
    );

    const result = outRows[0] || {};

    return res.status(201).json({
      success: true,
      message: 'Stock transaction recorded successfully.',
      data: {
        transaction_id: result.transaction_id,
        product_id: Number(product_id),
        transaction_type,
        quantity: Number(quantity),
        updated_quantity: result.updated_quantity
      }
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to process stock movement.');
  } finally {
    connection.release();
  }
});

module.exports = router;
