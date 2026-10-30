import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Modal from '../components/Modal';
import Alert from '../components/Alert';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    transaction_type: 'IN',
    supplier_id: '',
    quantity: '',
    unit_price: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter]);

  const fetchMetadata = async () => {
    try {
      const [prodRes, supRes] = await Promise.all([
        api.get('/products'),
        api.get('/suppliers')
      ]);
      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (supRes.data.success) setSuppliers(supRes.data.data);
    } catch (err) {
      console.error('Failed to load transaction metadata', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (typeFilter) params.type = typeFilter;
      const res = await api.get('/transactions', { params });
      if (res.data.success) setTransactions(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch transaction ledger.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    const defaultProduct = products.length > 0 ? products[0] : null;
    setFormData({
      product_id: defaultProduct ? defaultProduct.id : '',
      transaction_type: 'IN',
      supplier_id: suppliers.length > 0 ? suppliers[0].id : '',
      quantity: '',
      unit_price: defaultProduct ? defaultProduct.unit_price : '',
      notes: ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleProductChange = (productId) => {
    const prod = products.find((p) => p.id === Number(productId));
    setFormData({
      ...formData,
      product_id: productId,
      unit_price: prod ? prod.unit_price : formData.unit_price
    });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.product_id) {
      errors.product_id = 'Please select a valid product.';
    }
    if (!formData.transaction_type || !['IN', 'OUT'].includes(formData.transaction_type)) {
      errors.transaction_type = 'Please select transaction type (IN or OUT).';
    }
    if (formData.transaction_type === 'IN' && !formData.supplier_id) {
      errors.supplier_id = 'Supplier is required for inward procurement shipments.';
    }
    if (
      !formData.quantity ||
      isNaN(Number(formData.quantity)) ||
      Number(formData.quantity) <= 0 ||
      !Number.isInteger(Number(formData.quantity))
    ) {
      errors.quantity = 'Quantity must be a positive integer greater than zero.';
    }
    if (formData.unit_price === '' || isNaN(Number(formData.unit_price)) || Number(formData.unit_price) < 0) {
      errors.unit_price = 'Unit price must be a valid non-negative number.';
    }

    // Client-side warning if OUT exceeds current stock
    if (formData.transaction_type === 'OUT' && formData.product_id) {
      const selectedProd = products.find((p) => p.id === Number(formData.product_id));
      if (selectedProd && Number(formData.quantity) > selectedProd.quantity) {
        errors.quantity = `Requested dispatch (${formData.quantity}) exceeds on-hand stock (${selectedProd.quantity}). Database trigger will reject this.`;
      }
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
        product_id: Number(formData.product_id),
        supplier_id: formData.transaction_type === 'IN' ? Number(formData.supplier_id) : null,
        transaction_type: formData.transaction_type,
        quantity: Number(formData.quantity),
        unit_price: Number(formData.unit_price),
        notes: formData.notes.trim() || null
      };

      const res = await api.post('/transactions', payload);
      setSuccess(
        `${res.data.message} Product quantity automatically updated to ${res.data.data.updated_quantity} units by MySQL trigger.`
      );
      setIsModalOpen(false);
      fetchTransactions();
      fetchMetadata(); // refresh products stock balances
    } catch (err) {
      // Shows exact database trigger error message
      setError(err.response?.data?.error || 'Failed to process transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
  };

  const selectedProduct = products.find((p) => p.id === Number(formData.product_id));

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Movements & Transactions</h1>
          <p className="page-subtitle">
            Processed via MySQL Stored Procedure <code>sp_record_stock_transaction</code> with trigger-enforced balances
          </p>
        </div>
        <button onClick={openModal} className="btn btn-primary">
          + Record Stock Movement
        </button>
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      {/* Filter Header */}
      <div className="filter-bar">
        <label className="filter-group">
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Filter Movement Type:</span>
          <select
            className="form-control"
            style={{ width: '180px' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Movements (IN & OUT)</option>
            <option value="IN">Inward Receipts (IN)</option>
            <option value="OUT">Outward Dispatches (OUT)</option>
          </select>
        </label>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Showing latest {transactions.length} transactions
        </span>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <p>Loading transactions ledger...</p>
      ) : transactions.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📄</div>
          <h3>No Transactions Recorded</h3>
          <p>Record your first stock arrival or dispatch movement.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Product SKU & Name</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Total Value</th>
                <th>Party / Source</th>
                <th>Recorded By</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.transaction_date).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${tx.transaction_type === 'IN' ? 'badge-in' : 'badge-out'}`}>
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td>
                    <strong>{tx.product_name}</strong>
                    <div><code>{tx.product_sku}</code></div>
                  </td>
                  <td><strong>{tx.quantity} units</strong></td>
                  <td>{formatCurrency(tx.unit_price)}</td>
                  <td><strong>{formatCurrency(tx.total_cost)}</strong></td>
                  <td>{tx.supplier_name}</td>
                  <td><code>{tx.recorded_by_user}</code></td>
                  <td>{tx.notes || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Stock Movement Modal */}
      <Modal isOpen={isModalOpen} title="Record Inventory Movement" onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Product <span className="required">*</span>
            </label>
            <select
              className={`form-control ${formErrors.product_id ? 'is-invalid' : ''}`}
              value={formData.product_id}
              onChange={(e) => handleProductChange(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select Product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Current Stock: {p.quantity} units
                </option>
              ))}
            </select>
            {formErrors.product_id && <div className="form-error">{formErrors.product_id}</div>}
            {selectedProduct && (
              <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                On-hand available balance: <strong>{selectedProduct.quantity} units</strong> (Reorder Level: {selectedProduct.reorder_level})
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Movement Type <span className="required">*</span>
              </label>
              <select
                className="form-control"
                value={formData.transaction_type}
                onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                disabled={isSubmitting}
              >
                <option value="IN">Stock IN (Procurement / Restock)</option>
                <option value="OUT">Stock OUT (Customer Dispatch / Sale)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Quantity <span className="required">*</span>
              </label>
              <input
                type="number"
                min="1"
                className={`form-control ${formErrors.quantity ? 'is-invalid' : ''}`}
                placeholder="Number of units"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                disabled={isSubmitting}
              />
              {formErrors.quantity && <div className="form-error">{formErrors.quantity}</div>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Supplier {formData.transaction_type === 'IN' && <span className="required">*</span>}
              </label>
              <select
                className={`form-control ${formErrors.supplier_id ? 'is-invalid' : ''}`}
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                disabled={formData.transaction_type === 'OUT' || isSubmitting}
              >
                <option value="">
                  {formData.transaction_type === 'OUT' ? 'N/A (Customer Dispatch)' : 'Select Supplier...'}
                </option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.contact_person})
                  </option>
                ))}
              </select>
              {formErrors.supplier_id && <div className="form-error">{formErrors.supplier_id}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Unit Cost / Price ($) <span className="required">*</span>
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
          </div>

          <div className="form-group">
            <label className="form-label">Transaction Notes / Reference (Optional)</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="e.g. Purchase order PO-2026-009 or Counter invoice #482"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
              {isSubmitting ? 'Executing Procedure...' : 'Submit Transaction'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
