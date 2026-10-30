const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleDbError } = require('../middleware/errorHandler');

// Email regex pattern (RFC 5322 compliant simple check)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Phone regex: 10 digits numeric
const PHONE_REGEX = /^\d{10}$/;

/**
 * Validates supplier payload. Returns error message or null.
 */
function validateSupplier(body) {
  const { name, contact_person, email, phone } = body;
  if (!name || name.trim().length < 2) {
    return 'Supplier name is required and must be at least 2 characters.';
  }
  if (!contact_person || contact_person.trim().length < 2) {
    return 'Contact person name is required and must be at least 2 characters.';
  }
  if (!email || !EMAIL_REGEX.test(email.trim())) {
    return 'A valid corporate email address is required (e.g. name@company.com).';
  }
  if (!phone || !PHONE_REGEX.test(phone.trim())) {
    return 'Phone number must be a valid 10-digit number (e.g. 9876543210).';
  }
  return null;
}

/**
 * GET /api/suppliers
 * Returns all suppliers with total completed shipments count.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
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
       ORDER BY s.name ASC`
    );

    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to fetch suppliers.');
  }
});

/**
 * GET /api/suppliers/:id
 * Returns a single supplier by ID.
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, contact_person, email, phone, address, created_at
       FROM suppliers
       WHERE id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to fetch supplier.');
  }
});

/**
 * POST /api/suppliers
 * Registers a new supplier. Restricted to Admins.
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errorMsg = validateSupplier(req.body);
    if (errorMsg) {
      return res.status(400).json({ success: false, error: errorMsg });
    }

    const { name, contact_person, email, phone, address } = req.body;

    const [result] = await pool.query(
      `INSERT INTO suppliers (name, contact_person, email, phone, address)
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), contact_person.trim(), email.trim().toLowerCase(), phone.trim(), address ? address.trim() : null]
    );

    return res.status(201).json({
      success: true,
      message: 'Supplier registered successfully.',
      data: {
        id: result.insertId,
        name: name.trim(),
        contact_person: contact_person.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address ? address.trim() : null
      }
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to register supplier.');
  }
});

/**
 * PUT /api/suppliers/:id
 * Updates an existing supplier. Restricted to Admins.
 */
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errorMsg = validateSupplier(req.body);
    if (errorMsg) {
      return res.status(400).json({ success: false, error: errorMsg });
    }

    const { name, contact_person, email, phone, address } = req.body;

    const [result] = await pool.query(
      `UPDATE suppliers
       SET name = ?, contact_person = ?, email = ?, phone = ?, address = ?
       WHERE id = ?`,
      [name.trim(), contact_person.trim(), email.trim().toLowerCase(), phone.trim(), address ? address.trim() : null, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Supplier updated successfully.',
      data: {
        id: Number(req.params.id),
        name: name.trim(),
        contact_person: contact_person.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address ? address.trim() : null
      }
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to update supplier.');
  }
});

/**
 * DELETE /api/suppliers/:id
 * Deletes a supplier. Restricted to Admins.
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM suppliers WHERE id = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully.'
    });
  } catch (err) {
    return handleDbError(err, res, 'Failed to delete supplier.');
  }
});

module.exports = router;
