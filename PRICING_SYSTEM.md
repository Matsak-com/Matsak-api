# Product Pricing and Discount System

This document describes the comprehensive pricing and discount system implemented for the Matsak API product management.

## Overview

The system provides a flexible and robust solution for managing product prices and discounts directly through the Product controller, following industry best practices.

## Features

### 1. Base Price Management
- Set and update product base prices
- Multi-currency support (default: MGA)
- Price validation and error handling

### 2. Discount System
- **Percentage Discounts**: Apply percentage-based reductions (e.g., 15% off)
- **Fixed Amount Discounts**: Apply fixed monetary reductions (e.g., 10 MGA off)
- **Bulk Discounts**: Apply discounts based on quantity thresholds

### 3. Advanced Features
- **Time-based Activation**: Discounts can have start and end dates
- **Multiple Discount Stacking**: Apply multiple discounts to a single product
- **Quantity-based Calculations**: Different pricing for bulk purchases
- **Active/Inactive States**: Enable or disable discounts without deleting them

## API Endpoints

### Set Product Price
```http
POST /products/:id/price
Content-Type: application/json

{
  "basePrice": 100,
  "currency": "MGA"
}
```

### Add Discount
```http
POST /products/:id/discounts
Content-Type: application/json

{
  "type": "percentage",
  "value": 15,
  "description": "Seasonal discount",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "isActive": true
}
```

### Update Discount
```http
PUT /products/:id/discounts/:discountIndex
Content-Type: application/json

{
  "value": 20,
  "description": "Updated discount value"
}
```

### Remove Discount
```http
DELETE /products/:id/discounts/:discountIndex
```

### Calculate Price
```http
GET /products/:id/price?quantity=5&calculateAt=2024-06-01T00:00:00Z
```

### Get Pricing History
```http
GET /products/:id/price/history
```

## Discount Types

### Percentage Discount
```json
{
  "type": "percentage",
  "value": 15,
  "description": "15% off sale"
}
```
- Value: 0-100 (percentage)
- Applied as: `price * (value / 100)`

### Fixed Amount Discount
```json
{
  "type": "fixed",
  "value": 10,
  "description": "10 MGA off"
}
```
- Value: Any positive number
- Applied as: `price - value`

### Bulk Discount
```json
{
  "type": "bulk",
  "value": 20,
  "minQuantity": 5,
  "description": "Bulk discount for 5+ items"
}
```
- Requires `minQuantity` field
- Only applies when purchase quantity >= minQuantity

## Price Calculation Logic

1. Start with base price
2. Filter discounts by:
   - Active status (`isActive: true`)
   - Time validity (current date between startDate and endDate)
   - Quantity requirements (for bulk discounts)
3. Apply valid discounts sequentially
4. Return final price with discount details

## Example Calculations

### Single Discount
- Base Price: 100 MGA
- 15% Discount: 100 - (100 * 0.15) = 85 MGA

### Multiple Discounts
- Base Price: 100 MGA
- 15% Discount: 100 - 15 = 85 MGA
- 10 MGA Fixed: 85 - 10 = 75 MGA
- Final Price: 75 MGA

### Bulk Pricing
- Base Price: 100 MGA
- Quantity: 5
- Bulk Discount (5+ items): 20 MGA off
- Unit Price: 80 MGA
- Total Price: 80 * 5 = 400 MGA

## Data Structures

### Product Schema (Enhanced)
```typescript
class Product {
  // Existing fields...
  basePrice?: number;
  currency?: string;
  discounts: Discount[];
}
```

### Discount Schema
```typescript
class Discount {
  type: 'percentage' | 'fixed' | 'bulk';
  value: number;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  minQuantity?: number; // For bulk discounts
}
```

## Validation Rules

- Base price must be >= 0
- Percentage discounts: 0 <= value <= 100
- Fixed discounts: value >= 0
- Bulk discounts must have minQuantity >= 1
- Dates must be valid ISO strings
- Currency codes follow standard format

## Backward Compatibility

The new pricing system is designed to work alongside the existing TeamProduct pricing model:

- Products can have both direct pricing and team-specific pricing
- Team-specific prices (TeamProduct) take precedence when available
- Direct product pricing serves as a fallback/base price
- Migration path provided for existing data

## Error Handling

- `400 Bad Request`: Invalid pricing data, validation errors
- `404 Not Found`: Product not found
- `422 Unprocessable Entity`: Business logic violations

## Security Considerations

- All pricing endpoints require JWT authentication
- Input validation using Zod schemas
- SQL injection prevention through parameterized queries
- Rate limiting recommended for pricing updates

## Performance Considerations

- Discount calculations are done in-memory (no additional DB queries)
- Indexes recommended on product._id for price lookups
- Consider caching for frequently accessed pricing data
- Bulk operations supported for performance-critical scenarios

## Testing

Comprehensive test suite includes:
- Unit tests for pricing calculations
- Integration tests for API endpoints
- Edge case testing for discount combinations
- Performance testing for bulk calculations

## Future Enhancements

Potential future features:
- Tiered pricing based on customer segments
- Dynamic pricing based on market conditions
- Promotional codes and coupons
- Price change history tracking
- Analytics and reporting