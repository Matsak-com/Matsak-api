# Inventory Management System

## Overview

The inventory management system provides comprehensive stock tracking and management capabilities for products in the Matsak API. This system allows you to track stock levels, record stock movements, and get alerts for low stock items.

## Features

- **Stock Tracking**: Track current stock quantity for each product
- **Stock In/Out Operations**: Record when stock is added or removed
- **Stock Adjustments**: Correct stock quantities when needed
- **Transaction History**: Complete audit trail of all stock movements
- **Low Stock Alerts**: Identify products running low on inventory
- **User Tracking**: Track who performed each inventory operation

## Product Schema Updates

The `Product` schema now includes the following inventory-related fields:

```typescript
{
  stockQuantity: number;        // Current stock level (default: 0)
  lowStockThreshold: number;    // Alert threshold (default: 0)
  trackStock: boolean;          // Enable/disable tracking (default: true)
}
```

## API Endpoints

### 1. Stock In (Add Stock)

Add stock to a product (e.g., receiving inventory, returns).

**Endpoint**: `POST /inventory/stock-in`

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 100,
  "reason": "Purchase order",
  "reference": "PO-12345"
}
```

**Response**:
```json
{
  "product": "507f1f77bcf86cd799439011",
  "type": "in",
  "quantity": 100,
  "previousStock": 50,
  "newStock": 150,
  "reason": "Purchase order",
  "reference": "PO-12345",
  "team": "507f1f77bcf86cd799439012",
  "performedBy": "507f1f77bcf86cd799439013",
  "createdAt": "2025-10-17T09:43:06.335Z"
}
```

### 2. Stock Out (Remove Stock)

Remove stock from a product (e.g., sales, damage).

**Endpoint**: `POST /inventory/stock-out`

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 25,
  "reason": "Sale",
  "reference": "ORDER-67890"
}
```

**Response**: Similar to stock-in response with `type: "out"`

**Note**: Returns 400 error if insufficient stock available.

### 3. Stock Adjustment

Adjust stock to a specific quantity (for corrections).

**Endpoint**: `POST /inventory/adjust`

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "productId": "507f1f77bcf86cd799439011",
  "newQuantity": 75,
  "reason": "Inventory count correction",
  "reference": "COUNT-2025-10"
}
```

**Response**: Similar to stock-in response with `type: "adjustment"`

### 4. Get Product Stock

Get current stock information for a product.

**Endpoint**: `GET /inventory/product/:productId`

**Authentication**: Not required

**Response**:
```json
{
  "productId": "507f1f77bcf86cd799439011",
  "stockQuantity": 150,
  "lowStockThreshold": 20,
  "trackStock": true,
  "isLowStock": false
}
```

### 5. Get Transaction History

Query inventory transaction history with filters.

**Endpoint**: `GET /inventory/transactions`

**Authentication**: Required (JWT)

**Query Parameters**:
- `productId` (optional): Filter by product
- `type` (optional): Filter by transaction type (`in`, `out`, `adjustment`)
- `startDate` (optional): Filter from date (ISO 8601)
- `endDate` (optional): Filter to date (ISO 8601)

**Example**: `GET /inventory/transactions?productId=507f1f77bcf86cd799439011&type=in`

**Response**:
```json
[
  {
    "product": {
      "_id": "507f1f77bcf86cd799439011",
      "detail": {...},
      "stockQuantity": 150
    },
    "type": "in",
    "quantity": 100,
    "previousStock": 50,
    "newStock": 150,
    "reason": "Purchase order",
    "reference": "PO-12345",
    "performedBy": {...},
    "createdAt": "2025-10-17T09:43:06.335Z"
  }
]
```

### 6. Get Low Stock Products

Get all products with stock at or below their threshold.

**Endpoint**: `GET /inventory/low-stock`

**Authentication**: Required (JWT)

**Query Parameters**:
- `teamId` (optional): Filter by team

**Response**:
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "detail": {...},
    "stockQuantity": 15,
    "lowStockThreshold": 20,
    "trackStock": true
  }
]
```

## Error Codes

The system uses the following error codes:

- `PRODUCT_NOT_FOUND`: Product does not exist
- `INSUFFICIENT_STOCK`: Not enough stock available for stock-out operation
- `STOCK_NOT_TRACKED`: Stock tracking is disabled for the product
- `INVENTORY_TRANSACTION_FAILED`: Internal error during transaction

## Usage Examples

### Setting Up a Product with Stock Tracking

When creating or updating a product, include stock fields:

```typescript
{
  "name": "Widget A",
  "price": 29.99,
  "stockQuantity": 100,
  "lowStockThreshold": 20,
  "trackStock": true
}
```

### Receiving Inventory

```bash
curl -X POST https://api.matsak.com/inventory/stock-in \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "507f1f77bcf86cd799439011",
    "quantity": 50,
    "reason": "Purchase order received",
    "reference": "PO-2025-001"
  }'
```

### Processing a Sale

```bash
curl -X POST https://api.matsak.com/inventory/stock-out \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "507f1f77bcf86cd799439011",
    "quantity": 5,
    "reason": "Customer order",
    "reference": "ORDER-12345"
  }'
```

### Inventory Count Adjustment

```bash
curl -X POST https://api.matsak.com/inventory/adjust \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "507f1f77bcf86cd799439011",
    "newQuantity": 95,
    "reason": "Physical inventory count",
    "reference": "COUNT-2025-Q4"
  }'
```

### Checking Low Stock Items

```bash
curl -X GET https://api.matsak.com/inventory/low-stock \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Best Practices

1. **Always provide reasons**: Include descriptive reasons for all stock movements for better audit trails
2. **Use references**: Link transactions to related documents (POs, orders, etc.)
3. **Set appropriate thresholds**: Configure `lowStockThreshold` based on lead times and sales velocity
4. **Regular audits**: Use the adjustment endpoint to correct discrepancies found during physical counts
5. **Monitor low stock**: Regularly check the low-stock endpoint to prevent stockouts

## Database Schema

### InventoryTransaction Collection

```typescript
{
  product: ObjectId,          // Reference to Product
  type: String,               // 'in' | 'out' | 'adjustment'
  quantity: Number,           // Quantity changed
  previousStock: Number,      // Stock before transaction
  newStock: Number,           // Stock after transaction
  reason: String,             // Reason for transaction
  reference: String,          // External reference (PO, Order, etc.)
  performedBy: ObjectId,      // User who performed the action
  team: ObjectId,             // Team that owns the product
  createdAt: Date,            // Timestamp
  updatedAt: Date,            // Timestamp
  deleted_at: Date            // Soft delete timestamp
}
```

## Integration with Existing Features

The inventory system integrates seamlessly with:

- **Product Module**: Stock fields are part of the product schema
- **Auth Module**: JWT authentication protects inventory operations
- **Team Module**: Inventory is scoped to teams
- **User Module**: Tracks who performed each operation

## Future Enhancements

Potential improvements for future versions:

- Batch operations for multiple products
- Reserved stock for pending orders
- Automatic reordering based on thresholds
- Stock transfers between locations
- Expiry date tracking for perishable items
- SKU/barcode integration
