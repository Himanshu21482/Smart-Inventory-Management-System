const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleDbError } = require('../middleware/errorHandler');

/**
 * GET /api/categories
 * Returns all categories with product counts. Accessible to all logged-in users.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         c.id,
         c.name,
         c.description,
         COUNT(p.id) AS total_products,
         c.created_at
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id
       GROUP BY c.id, c.name, c.description, c.created_at
       ORDER BY c.name ASC`
    );

    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to fetch categories.');
  }
});

/**
 * GET /api/categories/:id
 * Returns a single category by ID.
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, description, created_at
       FROM categories
       WHERE id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to fetch category.');
  }
});

/**
 * POST /api/categories
 * Creates a new category. Restricted to Admins.
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required and must be at least 2 characters.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO categories (name, description) VALUES (?, ?)`,
      [name.trim(), description ? description.trim() : null]
    );

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: {
        id: result.insertId,
        name: name.trim(),
        description: description ? description.trim() : null
      }
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to create category.');
  }
});

/**
 * PUT /api/categories/:id
 * Updates an existing category. Restricted to Admins.
 */
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required and must be at least 2 characters.'
      });
    }

    const [result] = await pool.query(
      `UPDATE categories
       SET name = ?, description = ?
       WHERE id = ?`,
      [name.trim(), description ? description.trim() : null, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      data: {
        id: Number(req.params.id),
        name: name.trim(),
        description: description ? description.trim() : null
      }
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to update category.');
  }
});

/**
 * DELETE /api/categories/:id
 * Deletes a category. Restricted to Admins.
 * Returns friendly error if products exist in this category.
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check if category has associated products
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS product_count FROM products WHERE category_id = ?`,
      [req.params.id]
    );

    if (countRows[0].product_count > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete this category because ${countRows[0].product_count} product(s) are linked to it. Please reassign or delete the products first.`
      });
    }

    const [result] = await pool.query(
      `DELETE FROM categories WHERE id = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully.'
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to delete category.');
  }
});

module.exports = router;
