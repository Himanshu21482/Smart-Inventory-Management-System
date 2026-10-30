import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Alert from '../components/Alert';

export default function ProductsPage() {
  const { isAdmin } = useAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedProductId, setSelectedProductId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category_id: '',
    unit_price: '',
    reorder_level: 10,
    description: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, lowStockFilter]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.data.success) setCategories(res.data.data);
    } catch (err) {
      console.error('Failed to load categories for dropdown', err);
    }
  };

  const fetchProducts = async (overrideSearch = search) => {
    try {
      setLoading(true);
      const params = {};
      if (overrideSearch.trim()) params.search = overrideSearch.trim();
      if (categoryFilter) params.category_id = categoryFilter;
      if (lowStockFilter) params.low_stock = 1;

      const res = await api.get('/products', { params });
      if (res.data.success) setProducts(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts(search);
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setLowStockFilter(false);
    fetchProducts('');
  };

  // Open Add Modal
  const openAddModal = () => {
    setModalMode('add');
    setSelectedProductId(null);
    setFormData({
      sku: '',
      name: '',
      category_id: categories.length > 0 ? categories[0].id : '',
      unit_price: '',
      reorder_level: 10,
      description: ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (product) => {
    setModalMode('edit');
    setSelectedProductId(product.id);
    setFormData({
      sku: product.sku,
      name: product.name,
      category_id: product.category_id,
      unit_price: product.unit_price,
      reorder_level: product.reorder_level,
      description: product.description || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.sku.trim() || formData.sku.trim().length < 3) {
      errors.sku = 'SKU is required (letters, numbers, hyphens, min 3 chars).';
    }
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Product name is required (min 2 characters).';
    }
    if (!formData.category_id) {
      errors.category_id = 'Please select a valid category.';
    }
    if (formData.unit_price === '' || isNaN(Number(formData.unit_price)) || Number(formData.unit_price) < 0) {
      errors.unit_price = 'Unit price must be a valid non-negative number.';
    }
    if (
      formData.reorder_level === '' ||
      isNaN(Number(formData.reorder_level)) ||
      Number(formData.reorder_level) < 0 ||
      !Number.isInteger(Number(formData.reorder_level))
    ) {
      errors.reorder_level = 'Reorder level must be a non-negative integer.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Form Submit (Add or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        sku: formData.sku.trim().toUpperCase(),
        name: formData.name.trim(),
        category_id: Number(formData.category_id),
        unit_price: Number(formData.unit_price),
        reorder_level: Number(formData.reorder_level),
        description: formData.description.trim() || null
      };

      if (modalMode === 'add') {
        const res = await api.post('/products', payload);
        setSuccess(res.data.message || 'Product created successfully.');
      } else {
        const res = await api.put(`/products/${selectedProductId}`, payload);
        setSuccess(res.data.message || 'Product updated successfully.');
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm and Execute Delete
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setError('');
      setSuccess('');
      const res = await api.delete(`/products/${deleteId}`);
      setSuccess(res.data.message || 'Product deleted successfully.');
      setDeleteId(null);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete product.');
      setDeleteId(null);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products Master Catalog</h1>
          <p className="page-subtitle">Manage items, stock thresholds, and search inventory</p>
        </div>
        {isAdmin && (
          <button onClick={openAddModal} className="btn btn-primary">
            + Add New Product
          </button>
        )}
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      {/* Filter and Search Bar */}
      <form onSubmit={handleSearchSubmit} className="filter-bar">
        <input
          type="text"
          className="form-control search-input"
          placeholder="Search by Product Name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="form-control"
          style={{ width: '220px' }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={lowStockFilter}
            onChange={(e) => setLowStockFilter(e.target.checked)}
          />
          <strong>Low Stock Only</strong>
        </label>

        <button type="submit" className="btn btn-secondary btn-sm">
          🔍 Search
        </button>
        <button type="button" onClick={handleClearFilters} className="btn btn-outline btn-sm">
          Clear Filters
        </button>
      </form>

      {/* Products Table */}
      {loading ? (
        <p>Loading products catalog...</p>
      ) : products.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No products match your criteria</h3>
          <p>Try clearing filters or adding new products.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Current Stock</th>
                <th>Reorder Level</th>
                <th>Status</th>
                {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isLow = p.quantity <= p.reorder_level;
                return (
                  <tr key={p.id} className={isLow ? 'row-low-stock' : ''}>
                    <td><code>{p.sku}</code></td>
                    <td>
                      <strong>{p.name}</strong>
                      {p.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.description}</div>
                      )}
                    </td>
                    <td>{p.category_name}</td>
                    <td>{formatCurrency(p.unit_price)}</td>
                    <td>
                      <strong style={{ color: isLow ? 'var(--danger)' : 'inherit' }}>
                        {p.quantity} units
                      </strong>
                    </td>
                    <td>{p.reorder_level}</td>
                    <td>
                      <span className={`badge ${isLow ? 'badge-low' : 'badge-ok'}`}>
                        {isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        <div className="btn-group">
                          <button
                            onClick={() => openEditModal(p)}
                            className="btn btn-secondary btn-sm"
                            title="Edit Product"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeleteId(p.id);
                              setDeleteName(p.name);
                            }}
                            className="btn btn-outline btn-sm"
                            style={{ color: 'var(--danger)' }}
                            title="Delete Product"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        title={modalMode === 'add' ? 'Add New Product' : 'Edit Product'}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                SKU <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${formErrors.sku ? 'is-invalid' : ''}`}
                placeholder="e.g. SKU-LAP-001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                disabled={isSubmitting}
              />
              {formErrors.sku && <div className="form-error">{formErrors.sku}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Category <span className="required">*</span>
              </label>
              <select
                className={`form-control ${formErrors.category_id ? 'is-invalid' : ''}`}
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                disabled={isSubmitting}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {formErrors.category_id && <div className="form-error">{formErrors.category_id}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Product Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
              placeholder="e.g. Logitech MX Master 3S"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isSubmitting}
            />
            {formErrors.name && <div className="form-error">{formErrors.name}</div>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Unit Price ($) <span className="required">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`form-control ${formErrors.unit_price ? 'is-invalid' : ''}`}
                placeholder="0.00"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                disabled={isSubmitting}
              />
              {formErrors.unit_price && <div className="form-error">{formErrors.unit_price}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Reorder Threshold <span className="required">*</span>
              </label>
              <input
                type="number"
                min="0"
                className={`form-control ${formErrors.reorder_level ? 'is-invalid' : ''}`}
                placeholder="10"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                disabled={isSubmitting}
              />
              {formErrors.reorder_level && <div className="form-error">{formErrors.reorder_level}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Hardware specifications, model variant, etc."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : modalMode === 'add' ? 'Create Product' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        title="Confirm Product Deletion"
        onClose={() => setDeleteId(null)}
      >
        <p style={{ marginBottom: '1rem' }}>
          Are you sure you want to delete product <strong>"{deleteName}"</strong>?
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Note: Products with existing stock transaction history cannot be deleted to maintain relational integrity.
        </p>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleDeleteConfirm}>
            Yes, Delete Product
          </button>
        </div>
      </Modal>
    </div>
  );
}
