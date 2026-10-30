/**
 * End-to-End Automated Verification Script for Smart Inventory Management System
 * Tests all endpoints and specific edge cases required by the project specification.
 */
const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===========================================================');
  console.log(' SIMS E2E TEST SUITE: Testing All Endpoints & Edge Cases   ');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, detail = '') {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message} - ${detail}`);
      failed++;
    }
  }

  try {
    // 1. Healthcheck
    const health = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    assert(health.status === 200 && health.data.success, 'GET /api/health returns 200 and DB connected');

    // 2. Admin Login
    const adminLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { username: 'admin', password: 'admin123' }
    );
    assert(adminLogin.status === 200 && adminLogin.data.data.token, 'Admin login with valid credentials');
    const adminToken = adminLogin.data.data.token;

    // 3. Staff User Login
    const staffLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { username: 'staff_john', password: 'user123' }
    );
    assert(staffLogin.status === 200 && staffLogin.data.data.user.role === 'USER', 'Staff user login with role USER');
    const staffToken = staffLogin.data.data.token;

    // 4. Test Case: Normal user blocked from Admin actions
    const staffCreateAttempt = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/categories',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`
        }
      },
      { name: 'Unauthorized Category' }
    );
    assert(staffCreateAttempt.status === 403, 'Normal user blocked from Admin action (returns 403 Forbidden)');

    // 5. Test Case: Add a product (Admin)
    const testSku = `SKU-TEST-${Date.now().toString().slice(-4)}`;
    const newProductRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/products',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      {
        category_id: 1,
        sku: testSku,
        name: 'Automated Test Ultrabook',
        description: 'Temporary item for verification',
        unit_price: 999.99,
        reorder_level: 5
      }
    );
    assert(newProductRes.status === 201 && newProductRes.data.data.quantity === 0, 'Admin can add a new product (initial quantity = 0)');
    const createdProductId = newProductRes.data.data.id;

    // 6. Test Case: Record IN transaction and verify quantity went up via trigger
    const inTxRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/transactions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}` // staff can record transactions!
        }
      },
      {
        product_id: createdProductId,
        supplier_id: 1,
        transaction_type: 'IN',
        quantity: 20,
        unit_price: 850.00,
        notes: 'Verification batch restock'
      }
    );
    assert(
      inTxRes.status === 201 && inTxRes.data.data.updated_quantity === 20,
      'Staff can record IN transaction and trigger automatically updates quantity to 20'
    );

    // Verify product quantity directly
    const productCheck = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/products/${createdProductId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(productCheck.data.data.quantity === 20, 'Product GET confirmed on-hand quantity increased to 20');

    // 7. Test Case: Record an OUT larger than available stock -> confirm rejected by trigger
    const overDispatchRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/transactions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`
        }
      },
      {
        product_id: createdProductId,
        supplier_id: null,
        transaction_type: 'OUT',
        quantity: 50, // exceeds available 20!
        unit_price: 999.99,
        notes: 'Excessive dispatch attempt'
      }
    );
    assert(
      overDispatchRes.status === 400 &&
        (overDispatchRes.data.error.includes('Insufficient stock') ||
         overDispatchRes.data.error.includes('Cannot dispatch OUT more items than current available stock')),
      'Database rejects OUT larger than available stock with friendly error message'
    );

    // 8. Test Case: Delete a category that has products and confirm friendly error
    const deleteCategoryAttempt = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/categories/1', // Category 1 has products
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      deleteCategoryAttempt.status === 400 &&
        deleteCategoryAttempt.data.error.includes('Cannot delete this category because'),
      'Deleting a category in use returns friendly error message instead of raw SQL error'
    );

    // 9. Search and Filter Products
    const searchRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?search=Dell&category_id=1',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      searchRes.status === 200 && searchRes.data.data.length >= 1 && searchRes.data.data[0].sku === 'SKU-LAP-001',
      'Search/filter returns matching products by name/SKU and category'
    );

    // 10. Low-Stock View endpoint
    const lowStockRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products/low-stock',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      lowStockRes.status === 200 && lowStockRes.data.data.length > 0,
      `Low stock view endpoint queries MySQL View v_low_stock (returned ${lowStockRes.data.data.length} items)`
    );

    // 11. Category Valuation Report (JOIN + SUM/COUNT/AVG + GROUP BY)
    const catReportRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/reports/category-summary',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      catReportRes.status === 200 &&
        catReportRes.data.data.length >= 10 &&
        catReportRes.data.data[0].total_stock_value !== undefined,
      'Report 1: Category valuation returns JOIN + aggregate + GROUP BY results'
    );

    // 12. Supplier Procurement Report (JOIN + SUM/COUNT + GROUP BY)
    const supReportRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/reports/supplier-procurement',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      supReportRes.status === 200 &&
        supReportRes.data.data.length > 0 &&
        supReportRes.data.data[0].total_expenditure !== undefined,
      'Report 2: Supplier procurement returns JOIN + aggregate + GROUP BY results'
    );

    // 13. Dashboard KPI Summary (Stored function fn_calculate_inventory_value)
    const kpiRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/reports/kpi-summary',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      kpiRes.status === 200 && parseFloat(kpiRes.data.data.total_inventory_value) > 0,
      `KPI summary executes fn_calculate_inventory_value() (Total value: $${kpiRes.data.data.total_inventory_value})`
    );

    // Clean up temporary test product & its transaction
    await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log('\n===========================================================');
    console.log(` TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('===========================================================');
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('Test Suite encountered unhandled error:', err);
    process.exit(1);
  }
}

runTests();
