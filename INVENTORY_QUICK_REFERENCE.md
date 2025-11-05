# Inventory Management - Quick Reference

## Quick Start

### 1. Basic Stock Operations

**Add Stock (Receiving)**
```bash
POST /inventory/stock-in
{
  "productId": "PRODUCT_ID",
  "quantity": 100,
  "reason": "Purchase order",
  "reference": "PO-12345"
}
```

**Remove Stock (Sale)**
```bash
POST /inventory/stock-out
{
  "productId": "PRODUCT_ID",
  "quantity": 5,
  "reason": "Sale",
  "reference": "ORDER-12345"
}
```

**Adjust Stock (Correction)**
```bash
POST /inventory/adjust
{
  "productId": "PRODUCT_ID",
  "newQuantity": 95,
  "reason": "Inventory count"
}
```

### 2. Query Operations

**Check Product Stock**
```bash
GET /inventory/product/:productId
```

**Get Low Stock Items**
```bash
GET /inventory/low-stock?teamId=TEAM_ID
```

**Transaction History**
```bash
GET /inventory/transactions?productId=PRODUCT_ID&type=in&startDate=2025-01-01
```

## Product Fields

```typescript
{
  stockQuantity: 100,        // Current stock
  lowStockThreshold: 20,     // Alert when stock <= this value
  trackStock: true           // Enable/disable tracking
}
```

## Transaction Types

- `in` - Stock added (purchases, returns)
- `out` - Stock removed (sales, damage)
- `adjustment` - Stock corrected (inventory count)

## Error Codes

- `PRODUCT_NOT_FOUND` - Product doesn't exist
- `INSUFFICIENT_STOCK` - Not enough stock available
- `STOCK_NOT_TRACKED` - Stock tracking disabled for product

## Common Workflows

### Receiving Purchase Order
1. Verify product exists
2. POST to `/inventory/stock-in` with PO reference
3. Check updated stock with GET `/inventory/product/:id`

### Processing Order
1. Verify sufficient stock
2. POST to `/inventory/stock-out` with order reference
3. Monitor low stock alerts

### Monthly Inventory Count
1. GET current stock levels
2. Perform physical count
3. POST to `/inventory/adjust` for discrepancies
4. Review transaction history

## Migration

Run once to add inventory fields to existing products:
```bash
npm run migrate-mongo:up
```

## Testing Examples

See `examples/inventory-usage.js` for complete working examples.

## Documentation

Full API documentation: `INVENTORY_MANAGEMENT.md`
