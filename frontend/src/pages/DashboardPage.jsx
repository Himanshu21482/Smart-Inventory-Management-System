import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Alert from '../components/Alert';

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [kpiRes, lowRes, txRes] = await Promise.all([
        api.get('/reports/kpi-summary'),
        api.get('/products/low-stock'),
        api.get('/transactions?limit=6')
      ]);

      if (kpiRes.data.success) setKpis(kpiRes.data.data);
      if (lowRes.data.success) setLowStockItems(lowRes.data.data);
      if (txRes.data.success) setRecentTransactions(txRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? '$0.00' : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return <div className="main-content"><p>Loading dashboard metrics...</p></div>;
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">Real-time inventory levels, valuation, and transaction logs</p>
        </div>
        <button onClick={fetchDashboardData} className="btn btn-secondary btn-sm">
          🔄 Refresh
        </button>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      {/* KPI Metrics Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span>Total Catalog Products</span>
            <span className="kpi-icon">📦</span>
          </div>
          <div className="kpi-value">{kpis?.total_products ?? 0}</div>
          <div className="kpi-subtext">Across {kpis?.total_categories ?? 0} categories</div>
        </div>

        <div className={`kpi-card ${kpis?.low_stock_count > 0 ? 'alert-card' : ''}`}>
          <div className="kpi-header">
            <span>Low Stock Alerts</span>
            <span className="kpi-icon">⚠️</span>
          </div>
          <div className="kpi-value">{kpis?.low_stock_count ?? 0}</div>
          <div className="kpi-subtext">
            <Link to="/low-stock" style={{ color: 'inherit', textDecoration: 'underline' }}>
              View items needing reorder &rarr;
            </Link>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span>Gross Inventory Value</span>
            <span className="kpi-icon">💰</span>
          </div>
          <div className="kpi-value">{formatCurrency(kpis?.total_inventory_value)}</div>
          <div className="kpi-subtext">Calculated via MySQL stored function</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span>Stock Movements Logged</span>
            <span className="kpi-icon">📋</span>
          </div>
          <div className="kpi-value">{kpis?.total_transactions ?? 0}</div>
          <div className="kpi-subtext">From {kpis?.total_suppliers ?? 0} active suppliers</div>
        </div>
      </div>

      {/* Quick Low Stock Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>⚠️ Critical Low Stock Items</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Items populated dynamically by MySQL View `v_low_stock`</p>
          </div>
          <Link to="/low-stock" className="btn btn-outline btn-sm">
            View All ({lowStockItems.length})
          </Link>
        </div>

        {lowStockItems.length === 0 ? (
          <p style={{ color: 'var(--success)', padding: '1rem 0' }}>✓ All products are currently above their reorder thresholds.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Deficit</th>
                  <th>Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.slice(0, 5).map((item) => (
                  <tr key={item.product_id} className="row-low-stock">
                    <td><code>{item.sku}</code></td>
                    <td><strong>{item.product_name}</strong></td>
                    <td>{item.category_name}</td>
                    <td><span className="badge badge-low">{item.current_quantity}</span></td>
                    <td>{item.reorder_level}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: 600 }}>-{item.deficit_quantity}</td>
                    <td>{formatCurrency(item.current_stock_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Movements Activity Feed */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>🕒 Recent Stock Movements</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Audit ledger maintaining product quantities automatically</p>
          </div>
          <Link to="/transactions" className="btn btn-outline btn-sm">
            Full Ledger &rarr;
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No stock movements recorded yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Party / Notes</th>
                  <th>Logged By</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.transaction_date).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${tx.transaction_type === 'IN' ? 'badge-in' : 'badge-out'}`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td><strong>{tx.product_name}</strong> ({tx.product_sku})</td>
                    <td><strong>{tx.quantity} units</strong></td>
                    <td>{tx.supplier_name} {tx.notes ? `— ${tx.notes}` : ''}</td>
                    <td><code>{tx.recorded_by_user}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
