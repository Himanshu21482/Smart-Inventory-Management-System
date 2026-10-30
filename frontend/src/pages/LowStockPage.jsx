import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Modal from '../components/Modal';
import Alert from '../components/Alert';

export default function LowStockPage() {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Quick Restock Modal State
  const [restockItem, setRestockItem] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchLowStock();
    fetchSuppliers();
  }, []);

  const fetchLowStock = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products/low-stock');
      if (res.data.success) setLowStockItems(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch low stock view.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      if (res.data.success) {
        setSuppliers(res.data.data);
        if (res.data.data.length > 0) setSupplierId(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load suppliers for restock', err);
    }
  };

  const openRestockModal = (item) => {
    setRestockItem(item);
    // Suggest ordering at least the deficit + safety buffer
    const suggested = Math.max(item.deficit_quantity + 10, 10);
    setRestockQty(suggested);
    setUnitCost(item.unit_price);
    setFormError('');
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId) {
      setFormError('Please select a supplier for inward restock.');
      return;
    }
    if (!restockQty || Number(restockQty) <= 0 || !Number.isInteger(Number(restockQty))) {
      setFormError('Restock quantity must be a positive integer.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        product_id: restockItem.product_id,
        supplier_id: Number(supplierId),
        transaction_type: 'IN',
        quantity: Number(restockQty),
        unit_price: Number(unitCost),
        notes: `Restock order triggered from Low Stock Alert view (deficit was: ${restockItem.deficit_quantity})`
      };

      const res = await api.post('/transactions', payload);
      setSuccess(
        `Restock successful! ${restockItem.product_name} quantity increased to ${res.data.data.updated_quantity} units.`
      );
      setRestockItem(null);
      fetchLowStock();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to execute restock movement.');
    } finally {
      setIsSubmitting(false);
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
          <h1 className="page-title">Low Stock Reorder Alerts</h1>
          <p className="page-subtitle">
            Powered by MySQL View <code>v_low_stock</code> (Filters products where <code>quantity &le; reorder_level</code>)
          </p>
        </div>
        <button onClick={fetchLowStock} className="btn btn-secondary btn-sm">
          🔄 Refresh View
        </button>
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      {/* Low Stock Summary Banner */}
      <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.5rem' }}>⚠️</span>
        <div>
          <strong>{lowStockItems.length} Products Require Immediate Replenishment</strong>
          <div style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
            Stock deficit calculated automatically by database view logic: <code>(reorder_level - quantity)</code>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Querying MySQL view v_low_stock...</p>
      ) : lowStockItems.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">✅</div>
          <h3>Inventory Healthy</h3>
          <p>No products are currently at or below their minimum reorder thresholds.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Current Quantity</th>
                <th>Reorder Threshold</th>
                <th>Deficit Units</th>
                <th>Unit Price</th>
                <th>Current Stock Value</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.map((item) => (
                <tr key={item.product_id} className="row-low-stock">
                  <td><code>{item.sku}</code></td>
                  <td><strong>{item.product_name}</strong></td>
                  <td>{item.category_name}</td>
                  <td>
                    <span className="badge badge-low">{item.current_quantity} units</span>
                  </td>
                  <td>{item.reorder_level} units</td>
                  <td style={{ color: 'var(--danger)', fontWeight: 700 }}>
                    {item.deficit_quantity > 0 ? `-${item.deficit_quantity} units` : '0 (At Threshold)'}
                  </td>
                  <td>{formatCurrency(item.unit_price)}</td>
                  <td>{formatCurrency(item.current_stock_value)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => openRestockModal(item)}
                      className="btn btn-primary btn-sm"
                    >
                      ⚡ Quick Restock (IN)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Restock Modal */}
      <Modal
        isOpen={!!restockItem}
        title={`Restock: ${restockItem?.product_name}`}
        onClose={() => setRestockItem(null)}
      >
        {restockItem && (
          <form onSubmit={handleRestockSubmit}>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div>SKU: <code>{restockItem.sku}</code></div>
              <div>Current Stock: <strong>{restockItem.current_quantity} units</strong></div>
              <div>Reorder Threshold: <strong>{restockItem.reorder_level} units</strong> (Deficit: {restockItem.deficit_quantity})</div>
            </div>

            {formError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{formError}</div>}

            <div className="form-group">
              <label className="form-label">
                Supplier <span className="required">*</span>
              </label>
              <select
                className="form-control"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                disabled={isSubmitting}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.contact_person})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Inward Quantity <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Cost per Unit ($) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRestockItem(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                {isSubmitting ? 'Recording Inward Movement...' : 'Confirm Restock (IN)'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
