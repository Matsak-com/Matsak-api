# Product Creation Price Fix

## Issue
When creating a product, the `price` and `currency` fields from the request payload were not being saved to the database.

## Solution
Updated the `createProduct` method in `ProductService` to include `basePrice` and `currency` fields in the product document.

### Changes Made

#### 1. Product Service (`src/product/product.service.ts`)
```typescript
const productDoc: any = {
  detail: detail._id,
  team: new Types.ObjectId(createDto.teamId),
  images: null,
  basePrice: createDto.basePrice,        // ✅ Added
  currency: createDto.currency || 'MGA', // ✅ Added  
  discounts: createDto.discounts
    ? createDto.discounts.map((d) => ({
        ...d,
        startDate: d.startDate ? new Date(d.startDate) : undefined,
        endDate: d.endDate ? new Date(d.endDate) : undefined,
      }))
    : [],
};
```

### Request Payload Mapping
The DTO preprocessing (already working correctly) handles:

```javascript
// Input payload
{
  price: "15000",      // → maps to basePrice: 15000 (number)
  currency: "MGA",     // → maps to currency: "MGA" 
  discountType: "fixed",
  discountValue: "100"
}

// Processed DTO
{
  basePrice: 15000,    // ✅ Now saved to database
  currency: "MGA",     // ✅ Now saved to database
  discounts: [{
    type: "fixed",
    value: 100,
    isActive: true
  }]
}
```

### Schema Support
The following schemas already support pricing fields:
- ✅ `Product` schema has `basePrice` and `currency` fields
- ✅ `createProductSchema` validates `basePrice` and `currency`
- ✅ DTO preprocessing correctly maps `price` → `basePrice`

## Test Payload
```
productImage: (binary)
categoryId: 68cab79404d0dddc25e17ccf
detailData: {"team":"68c595106d5c75c3fb5aedbe","name":"Suppo grand",...}
price: 15000          ← Now correctly saved as basePrice
currency: MGA         ← Now correctly saved
discountType: fixed
discountValue: 100
teamId: 68c595106d5c75c3fb5aedbe
```

## Result
✅ Product creation now properly saves:
- `basePrice`: 15000
- `currency`: "MGA"  
- `discounts`: [{ type: "fixed", value: 100, isActive: true }]