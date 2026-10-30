const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleDbError } = require('../middleware/errorHandler');

/**
 * GET /api/reports/category-summary
 * Category Stock Value and Inventory Summary.
 * Demonstrates: JOIN, aggregate functions (COUNT, SUM, AVG), GROUP BY.
 * Restricted to Admins.
 */
router.get('/category-summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         c.id AS category_id,
         c.name AS category_name,
         COUNT(p.id) AS total_product_count,
         COALESCE(SUM(p.quantity), 0) AS total_stock_quantity,
         COALESCE(AVG(p.unit_price), 0.00) AS avg_product_price,
         COALESCE(SUM(p.quantity * p.unit_price), 0.00) AS total_stock_value
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id
       GROUP BY c.id, c.name
       ORDER BY total_stock_value DESC`
    );

    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to generate category report.');
  }
});

/**
 * GET /api/reports/supplier-procurement
 * Supplier Procurement & Movement Summary.
 * Demonstrates: JOIN, aggregates (COUNT, SUM), GROUP BY.
 * Restricted to Admins.
 */
router.get('/supplier-procurement', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
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
       ORDER BY total_expenditure DESC`
    );

    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to generate supplier procurement report.');
  }
});

/**
 * GET /api/reports/kpi-summary
 * Dashboard executive summary cards.
 * Uses stored function fn_calculate_inventory_value() and counts.
 * Accessible to all authenticated users.
 */
router.get('/kpi-summary', authenticateToken, async (req, res) => {
  try {
    const [fnRows] = await pool.query(`SELECT fn_calculate_inventory_value() AS total_inventory_value`);
    const [prodRows] = await pool.query(`SELECT COUNT(*) AS total_products FROM products`);
    const [catRows] = await pool.query(`SELECT COUNT(*) AS total_categories FROM categories`);
    const [supRows] = await pool.query(`SELECT COUNT(*) AS total_suppliers FROM suppliers`);
    const [lowRows] = await pool.query(`SELECT COUNT(*) AS low_stock_count FROM v_low_stock`);
    const [txRows] = await pool.query(`SELECT COUNT(*) AS total_transactions FROM stock_transactions`);

    return res.status(200).json({
      success: true,
      data: {
        total_products: prodRows[0].total_products,
        total_categories: catRows[0].total_categories,
        total_suppliers: supRows[0].total_suppliers,
        low_stock_count: lowRows[0].low_stock_count,
        total_transactions: txRows[0].total_transactions,
        total_inventory_value: fnRows[0].total_inventory_value || 0.00
      }
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to fetch KPI dashboard metrics.');
  }
});

module.exports = router;
