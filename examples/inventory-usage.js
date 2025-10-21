/**
 * Inventory Management API Usage Examples
 * 
 * This file demonstrates how to use the inventory management endpoints
 * in the Matsak API.
 */

// Example 1: Add stock when receiving inventory
async function receiveInventory(authToken) {
  const response = await fetch('http://localhost:3000/inventory/stock-in', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId: '507f1f77bcf86cd799439011',
      quantity: 100,
      reason: 'Purchase order received',
      reference: 'PO-2025-001',
    }),
  });

  const result = await response.json();
  console.log('Stock In Result:', result);
  return result;
}

// Example 2: Process a sale (remove stock)
async function processSale(authToken) {
  const response = await fetch('http://localhost:3000/inventory/stock-out', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId: '507f1f77bcf86cd799439011',
      quantity: 5,
      reason: 'Customer order',
      reference: 'ORDER-12345',
    }),
  });

  const result = await response.json();
  console.log('Stock Out Result:', result);
  return result;
}

// Example 3: Adjust stock after physical count
async function adjustStockAfterCount(authToken) {
  const response = await fetch('http://localhost:3000/inventory/adjust', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId: '507f1f77bcf86cd799439011',
      newQuantity: 95,
      reason: 'Physical inventory count - found discrepancy',
      reference: 'COUNT-2025-Q4',
    }),
  });

  const result = await response.json();
  console.log('Stock Adjustment Result:', result);
  return result;
}

// Example 4: Check current stock level
async function checkStockLevel() {
  const response = await fetch('http://localhost:3000/inventory/product/507f1f77bcf86cd799439011');
  const result = await response.json();
  
  console.log('Current Stock:', result);
  
  if (result.isLowStock) {
    console.warn('⚠️  Low stock alert! Only', result.stockQuantity, 'items remaining');
  }
  
  return result;
}

// Example 5: Get transaction history for a product
async function getProductHistory(authToken, productId) {
  const params = new URLSearchParams({
    productId: productId,
  });

  const response = await fetch(`http://localhost:3000/inventory/transactions?${params}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const transactions = await response.json();
  console.log('Transaction History:', transactions);
  
  // Calculate total in/out
  const summary = transactions.reduce((acc, tx) => {
    if (tx.type === 'in') acc.totalIn += tx.quantity;
    if (tx.type === 'out') acc.totalOut += tx.quantity;
    return acc;
  }, { totalIn: 0, totalOut: 0 });
  
  console.log('Summary:', summary);
  return transactions;
}

// Example 6: Get all low stock products
async function checkLowStockProducts(authToken) {
  const response = await fetch('http://localhost:3000/inventory/low-stock', {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const lowStockProducts = await response.json();
  console.log('Low Stock Products:', lowStockProducts);
  
  if (lowStockProducts.length > 0) {
    console.warn(`⚠️  ${lowStockProducts.length} products are running low on stock!`);
    lowStockProducts.forEach(product => {
      console.warn(`  - ${product.detail?.name || product._id}: ${product.stockQuantity} (threshold: ${product.lowStockThreshold})`);
    });
  } else {
    console.log('✅ All products have sufficient stock');
  }
  
  return lowStockProducts;
}

// Example 7: Get transactions within a date range
async function getTransactionsByDateRange(authToken, startDate, endDate) {
  const params = new URLSearchParams({
    startDate: startDate,
    endDate: endDate,
  });

  const response = await fetch(`http://localhost:3000/inventory/transactions?${params}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const transactions = await response.json();
  console.log('Transactions in date range:', transactions);
  return transactions;
}

// Example 8: Bulk receive multiple products
async function bulkReceiveInventory(authToken, items) {
  const results = [];
  
  for (const item of items) {
    const response = await fetch('http://localhost:3000/inventory/stock-in', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: item.productId,
        quantity: item.quantity,
        reason: item.reason || 'Bulk receive',
        reference: item.reference,
      }),
    });

    const result = await response.json();
    results.push(result);
  }
  
  console.log('Bulk receive results:', results);
  return results;
}

// Example workflow: Complete inventory lifecycle
async function inventoryLifecycleExample(authToken) {
  console.log('=== Inventory Lifecycle Example ===\n');
  
  // 1. Check initial stock
  console.log('Step 1: Check initial stock');
  const initialStock = await checkStockLevel();
  console.log('\n');
  
  // 2. Receive new inventory
  console.log('Step 2: Receive inventory');
  await receiveInventory(authToken);
  console.log('\n');
  
  // 3. Process several sales
  console.log('Step 3: Process sales');
  await processSale(authToken);
  await processSale(authToken);
  console.log('\n');
  
  // 4. Check stock after sales
  console.log('Step 4: Check stock after sales');
  const currentStock = await checkStockLevel();
  console.log('\n');
  
  // 5. View transaction history
  console.log('Step 5: View transaction history');
  await getProductHistory(authToken, '507f1f77bcf86cd799439011');
  console.log('\n');
  
  // 6. Check for low stock items
  console.log('Step 6: Check for low stock items');
  await checkLowStockProducts(authToken);
  console.log('\n');
}

// Export functions for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    receiveInventory,
    processSale,
    adjustStockAfterCount,
    checkStockLevel,
    getProductHistory,
    checkLowStockProducts,
    getTransactionsByDateRange,
    bulkReceiveInventory,
    inventoryLifecycleExample,
  };
}
