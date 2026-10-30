import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Alert from '../components/Alert';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;

export default function SuppliersPage() {
  const { isAdmin } = useAuth();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedId, setSelectedId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/suppliers');
      if (res.data.success) setSuppliers(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch suppliers.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setSelectedId(null);
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (sup) => {
    setModalMode('edit');
    setSelectedId(sup.id);
    setFormData({
      name: sup.name,
      contact_person: sup.contact_person,
      email: sup.email,
      phone: sup.phone,
      address: sup.address || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Supplier company name is required (min 2 chars).';
    }
    if (!formData.contact_person.trim() || formData.contact_person.trim().length < 2) {
      errors.contact_person = 'Contact person name is required (min 2 chars).';
    }
    if (!formData.email.trim() || !EMAIL_REGEX.test(formData.email.trim())) {
      errors.email = 'Please provide a valid corporate email address.';
    }
    if (!formData.phone.trim() || !PHONE_REGEX.test(formData.phone.trim())) {
      errors.phone = 'Phone number must be exactly 10 digits (e.g. 9876543210).';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        address: formData.address.trim() || null
      };

      if (modalMode === 'add') {
        const res = await api.post('/suppliers', payload);
        setSuccess(res.data.message || 'Supplier registered successfully.');
      } else {
        const res = await api.put(`/suppliers/${selectedId}`, payload);
        setSuccess(res.data.message || 'Supplier updated successfully.');
      }

      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save supplier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setError('');
      setSuccess('');
      const res = await api.delete(`/suppliers/${deleteId}`);
      setSuccess(res.data.message || 'Supplier deleted successfully.');
      setDeleteId(null);
      fetchSuppliers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete supplier.');
      setDeleteId(null);
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers Directory</h1>
          <p className="page-subtitle">Manage authorized hardware distributors, logistics, and vendors</p>
        </div>
        {isAdmin && (
          <button onClick={openAddModal} className="btn btn-primary">
            + Register Supplier
          </button>
        )}
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      {loading ? (
        <p>Loading suppliers directory...</p>
      ) : suppliers.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🏢</div>
          <h3>No Suppliers Found</h3>
          <p>Register suppliers to track inward procurement shipments.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Location / Address</th>
                <th>Total Shipments</th>
                {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((sup) => (
                <tr key={sup.id}>
                  <td><strong>{sup.name}</strong></td>
                  <td>{sup.contact_person}</td>
                  <td><a href={`mailto:${sup.email}`}>{sup.email}</a></td>
                  <td><code>{sup.phone}</code></td>
                  <td>{sup.address || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>
                    <span className="badge badge-in">{sup.total_shipments} inward shipments</span>
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign: 'right' }}>
                      <div className="btn-group">
                        <button
                          onClick={() => openEditModal(sup)}
                          className="btn btn-secondary btn-sm"
                          title="Edit Supplier"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => {
                            setDeleteId(sup.id);
                            setDeleteName(sup.name);
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--danger)' }}
                          title="Delete Supplier"
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

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        title={modalMode === 'add' ? 'Register New Supplier' : 'Edit Supplier'}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Company Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
              placeholder="e.g. Apex Component Distributors"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isSubmitting}
            />
            {formErrors.name && <div className="form-error">{formErrors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Contact Person <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${formErrors.contact_person ? 'is-invalid' : ''}`}
              placeholder="e.g. Rohan Mehta"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              disabled={isSubmitting}
            />
            {formErrors.contact_person && <div className="form-error">{formErrors.contact_person}</div>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Corporate Email <span className="required">*</span>
              </label>
              <input
                type="email"
                className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                placeholder="sales@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSubmitting}
              />
              {formErrors.email && <div className="form-error">{formErrors.email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Phone Number (10 Digits) <span className="required">*</span>
              </label>
              <input
                type="tel"
                maxLength="10"
                className={`form-control ${formErrors.phone ? 'is-invalid' : ''}`}
                placeholder="9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={isSubmitting}
              />
              {formErrors.phone && <div className="form-error">{formErrors.phone}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Office Address (Optional)</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Industrial area, city, state, postal code..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
              {isSubmitting ? 'Saving...' : modalMode === 'add' ? 'Register Supplier' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        title="Confirm Supplier Deletion"
        onClose={() => setDeleteId(null)}
      >
        <p style={{ marginBottom: '1rem' }}>
          Are you sure you want to remove supplier <strong>"{deleteName}"</strong>?
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Database referential integrity: Historical transaction references will be preserved.
        </p>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleDeleteConfirm}>
            Yes, Remove Supplier
          </button>
        </div>
      </Modal>
    </div>
  );
}
