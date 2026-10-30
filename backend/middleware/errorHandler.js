/**
 * Formats MySQL errors into user-friendly JSON responses with appropriate HTTP status codes.
 */
function handleDbError(err, res, defaultMsg = 'Database operation failed.') {
  console.error('Database Error:', err);

  // Custom SIGNAL SQLSTATE 45000 from triggers or stored procedures
  if (err.sqlState === '45000' || err.errno === 1644) {
    return res.status(400).json({
      success: false,
      error: err.sqlMessage || 'Business rule violation occurred.'
    });
  }

  // Duplicate key entry (e.g. unique SKU, email, username, category name)
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    let field = 'entry';
    if (err.sqlMessage && err.sqlMessage.includes('key')) {
      const match = err.sqlMessage.match(/for key '.*?\.?(.*?)'/);
      if (match && match[1]) field = match[1];
    }
    return res.status(400).json({
      success: false,
      error: `A record with this ${field} already exists. Please use a unique value.`
    });
  }

  // Foreign key restriction on DELETE (e.g. deleting category/supplier/product that has linked rows)
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete this record because other records depend on it (e.g. products in this category or transactions for this item).'
    });
  }

  // Foreign key restriction on INSERT/UPDATE (e.g. non-existent category_id or supplier_id)
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
    return res.status(400).json({
      success: false,
      error: 'The referenced foreign record does not exist. Please check your selection.'
    });
  }

  // CHECK constraint violation
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err.errno === 3819) {
    return res.status(400).json({
      success: false,
      error: 'Data validation failed: Value violates database constraints (e.g., negative price, invalid quantity, or role).'
    });
  }

  return res.status(500).json({
    success: false,
    error: defaultMsg
  });
}

module.exports = {
  handleDbError
};
