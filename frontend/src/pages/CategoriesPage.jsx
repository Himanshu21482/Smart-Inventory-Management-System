import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Alert from '../components/Alert';

export default function CategoriesPage() {
  const { isAdmin } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedId, setSelectedId] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories');
      if (res.data.success) setCategories(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch categories.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setSelectedId(null);
    setName('');
    setDescription('');
    setNameError('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setModalMode('edit');
    setSelectedId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setNameError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setNameError('Category name is required and must be at least 2 characters.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (modalMode === 'add') {
        const res = await api.post('/categories', {
          name: name.trim(),
          description: description.trim() || null
        });
        setSuccess(res.data.message || 'Category created successfully.');
      } else {
        const res = await api.put(`/categories/${selectedId}`, {
          name: name.trim(),
          description: description.trim() || null
        });
        setSuccess(res.data.message || 'Category updated successfully.');
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setError('');
      setSuccess('');
      const res = await api.delete(`/categories/${deleteId}`);
      setSuccess(res.data.message || 'Category deleted successfully.');
      setDeleteId(null);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete category.');
      setDeleteId(null);
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Categories</h1>
          <p className="page-subtitle">Organize and group items into logical departments</p>
        </div>
        {isAdmin && (
          <button onClick={openAddModal} className="btn btn-primary">
            + Add Category
          </button>
        )}
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      {loading ? (
        <p>Loading categories...</p>
      ) : categories.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📁</div>
          <h3>No Categories Found</h3>
          <p>Create your first category to start organizing inventory.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Category Name</th>
                <th>Description</th>
                <th>Associated Products</th>
                <th>Created At</th>
                {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td><code>#{cat.id}</code></td>
                  <td><strong>{cat.name}</strong></td>
                  <td>{cat.description || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>
                    <span className="badge badge-ok">{cat.total_products} products</span>
                  </td>
                  <td>{new Date(cat.created_at).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td style={{ textAlign: 'right' }}>
                      <div className="btn-group">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="btn btn-secondary btn-sm"
                          title="Edit Category"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => {
                            setDeleteId(cat.id);
                            setDeleteName(cat.name);
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--danger)' }}
                          title="Delete Category"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        title={modalMode === 'add' ? 'Add New Category' : 'Edit Category'}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Category Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${nameError ? 'is-invalid' : ''}`}
              placeholder="e.g. Storage & Memory"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError('');
              }}
              disabled={isSubmitting}
            />
            {nameError && <div className="form-error">{nameError}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Brief details about what belongs in this category..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              {isSubmitting ? 'Saving...' : modalMode === 'add' ? 'Create Category' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        title="Confirm Category Deletion"
        onClose={() => setDeleteId(null)}
      >
        <p style={{ marginBottom: '1rem' }}>
          Are you sure you want to delete category <strong>"{deleteName}"</strong>?
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Foreign key protection: The database will reject deletion if any products are assigned to this category.
        </p>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleDeleteConfirm}>
            Yes, Delete Category
          </button>
        </div>
      </Modal>
    </div>
  );
}
