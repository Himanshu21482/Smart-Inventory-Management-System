import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Alert from '../components/Alert';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('category'); // 'category' or 'supplier'
  const [categoryData, setCategoryData] = useState([]);
  const [supplierData, setSupplierData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReportData();
  }, [activeTab]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError('');
      if (activeTab === 'category') {
        const res = await api.get('/reports/category-summary');
        if (res.data.success) setCategoryData(res.data.data);
      } else {
        const res = await api.get('/reports/supplier-procurement');
        if (res.data.success) setSupplierData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch analytical report.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? '$0.00' : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Compute category totals
  const totalCategoryStockVal = categoryData.reduce((acc, row) => acc + parseFloat(row.total_stock_value || 0), 0);
  const totalCategoryProducts = categoryData.reduce((acc, row) => acc + parseInt(row.total_product_count || 0), 0);
  const totalCategoryUnits = categoryData.reduce((acc, row) => acc + parseInt(row.total_stock_quantity || 0), 0);

  // Compute supplier totals
  const totalSupplierSpend = supplierData.reduce((acc, row) => acc + parseFloat(row.total_expenditure || 0), 0);
  const totalSupplierUnits = supplierData.reduce((acc, row) => acc + parseInt(row.total_units_procured || 0), 0);
  const totalSupplierTransactions = supplierData.reduce((acc, row) => acc + parseInt(row.total_inward_transactions || 0), 0);

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Business Intelligence & Analytics</h1>
          <p className="page-subtitle">
            Demonstrates complex multi-table SQL queries with <code>JOIN</code>, aggregate functions (<code>COUNT</code>, <code>SUM</code>, <code>AVG</code>), and <code>GROUP BY</code>
          </p>
        </div>
        <button onClick={fetchReportData} className="btn btn-secondary btn-sm">
          🔄 Run Report Query
        </button>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      {/* Tabs */}
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'category' ? 'active' : ''}`}
          onClick={() => setActiveTab('category')}
        >
          📊 Category Stock Valuation (Report 1)
        </button>
        <button
          className={`tab-btn ${activeTab === 'supplier' ? 'active' : ''}`}
          onClick={() => setActiveTab('supplier')}
        >
          🚚 Supplier Procurement & Spend (Report 2)
        </button>
      </div>

      {/* Tab 1: Category Valuation Report */}
      {activeTab === 'category' && (
        <div>
          {/* Summary Metric Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <span>Total Inventory Value</span>
                <span className="kpi-icon">💵</span>
              </div>
              <div className="kpi-value">{formatCurrency(totalCategoryStockVal)}</div>
              <div className="kpi-subtext">Sum of (quantity &times; unit_price)</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span>Total Active SKUs</span>
                <span className="kpi-icon">📦</span>
              </div>
              <div className="kpi-value">{totalCategoryProducts}</div>
              <div className="kpi-subtext">Across {categoryData.length} categories</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span>Total Units On Hand</span>
                <span className="kpi-icon">🔢</span>
              </div>
              <div className="kpi-value">{totalCategoryUnits.toLocaleString()} units</div>
              <div className="kpi-subtext">Physical units currently in warehouse</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Category Stock Value & Inventory Summary Table
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Query: <code>SELECT categories LEFT JOIN products ... COUNT(), SUM(), AVG() GROUP BY c.id, c.name</code>
            </p>

            {loading ? (
              <p>Executing aggregation query...</p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>ID</th>
                      <th>Category Name</th>
                      <th>Total SKUs (COUNT)</th>
                      <th>Stock Quantity (SUM)</th>
                      <th>Avg Product Price (AVG)</th>
                      <th>Total Stock Value (SUM qty &times; price)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.map((row) => (
                      <tr key={row.category_id}>
                        <td><code>#{row.category_id}</code></td>
                        <td><strong>{row.category_name}</strong></td>
                        <td>{row.total_product_count} items</td>
                        <td><strong>{row.total_stock_quantity} units</strong></td>
                        <td>{formatCurrency(row.avg_product_price)}</td>
                        <td><strong style={{ color: 'var(--primary)' }}>{formatCurrency(row.total_stock_value)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                      <td colSpan="2">Report Totals / Grand Summary</td>
                      <td>{totalCategoryProducts} SKUs</td>
                      <td>{totalCategoryUnits} units</td>
                      <td>—</td>
                      <td style={{ color: 'var(--primary)', fontSize: '1rem' }}>{formatCurrency(totalCategoryStockVal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Supplier Procurement Report */}
      {activeTab === 'supplier' && (
        <div>
          {/* Summary Metric Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <span>Total Procurement Spend</span>
                <span className="kpi-icon">💳</span>
              </div>
              <div className="kpi-value">{formatCurrency(totalSupplierSpend)}</div>
              <div className="kpi-subtext">Cumulative inward inventory spend</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span>Inward Consignments</span>
                <span className="kpi-icon">📦</span>
              </div>
              <div className="kpi-value">{totalSupplierTransactions} shipments</div>
              <div className="kpi-subtext">Completed purchase order deliveries</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span>Total Units Procured</span>
                <span className="kpi-icon">🚚</span>
              </div>
              <div className="kpi-value">{totalSupplierUnits.toLocaleString()} units</div>
              <div className="kpi-subtext">Procured from {supplierData.length} vendors</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Supplier Procurement & Inventory Movement Report
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Query: <code>SELECT suppliers INNER JOIN stock_transactions ... COUNT(), SUM() WHERE type = 'IN' GROUP BY s.id</code>
            </p>

            {loading ? (
              <p>Executing supplier procurement aggregation...</p>
            ) : supplierData.length === 0 ? (
              <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>No inward procurement transactions found.</p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>ID</th>
                      <th>Supplier Company</th>
                      <th>Contact Person</th>
                      <th>Inward Shipments (COUNT)</th>
                      <th>Total Units Received (SUM)</th>
                      <th>Total Expenditure (SUM qty &times; price)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierData.map((row) => (
                      <tr key={row.supplier_id}>
                        <td><code>#{row.supplier_id}</code></td>
                        <td><strong>{row.supplier_name}</strong></td>
                        <td>{row.contact_person}</td>
                        <td>{row.total_inward_transactions} shipments</td>
                        <td><strong>{row.total_units_procured} units</strong></td>
                        <td><strong style={{ color: 'var(--primary)' }}>{formatCurrency(row.total_expenditure)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                      <td colSpan="3">Cumulative Procurement Summary</td>
                      <td>{totalSupplierTransactions} shipments</td>
                      <td>{totalSupplierUnits} units</td>
                      <td style={{ color: 'var(--primary)', fontSize: '1rem' }}>{formatCurrency(totalSupplierSpend)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
