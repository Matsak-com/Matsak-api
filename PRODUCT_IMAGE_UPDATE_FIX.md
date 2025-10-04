# Product Image Update Fix

## Problem
The product update endpoint was not properly handling different image scenarios:
- When `productImage` was not a File object, it was still attempting to process it
- There was no way to explicitly remove an existing image
- The logic didn't distinguish between "no change" and "remove image"

## Solution Implemented

### 1. Enhanced Image Handling Logic

The `ProductService.update()` method now properly handles four distinct scenarios:

#### Scenario 1: File Upload (Multipart)
```typescript
// When productImage is a File object from multipart upload
if (file && file instanceof Object && file.buffer) {
  // Remove existing image and create new one from file
}
```

#### Scenario 2: Base64 Data
```typescript
// When productImage contains base64 data in payload
else if (updateProductDto.imageData?.data) {
  // Remove existing image and create new one from base64
}
```

#### Scenario 3: Explicit Image Removal
```typescript
// When productImage is explicitly set to null
else if (updateProductDto.imageData === null || 
         (updateProductDto.imageData && updateProductDto.imageData.data === null)) {
  // Remove existing image, set to null
}
```

#### Scenario 4: No Change
```typescript
// When productImage is not provided or not a File
// Keep existing image unchanged
```

### 2. DTO Preprocessing Enhancement

Enhanced `simpleUpdateMultipartSchema` preprocessing to properly detect image removal:

```typescript
// Handle productImage object (with data, name, mimeType, altText, url structure)
if (cloned.hasOwnProperty('productImage')) {
  if (cloned.productImage === null || cloned.productImage === 'null') {
    // Explicit image removal
    cloned.imageData = null;
  } else if (cloned.productImage) {
    // Process image data
    cloned.imageData = { /* mapped structure */ };
  }
  delete cloned.productImage;
}
```

### 3. Update Flag Management

Added `shouldUpdateImage` flag to ensure image field is only modified when explicitly requested:

```typescript
let shouldUpdateImage = false;

// Set to true only when:
// - File upload provided
// - Base64 data provided  
// - Explicit removal requested

// Only update image if we explicitly changed it
if (shouldUpdateImage) {
  updateData.images = imageId; // Can be new ObjectId or null for removal
}
```

## Usage Examples

### Keep Existing Image (No Change)
```http
PUT /products/123
Content-Type: application/json

{
  "name": "Updated Product Name",
  "basePrice": 29.99
}
```
**Result**: Existing image remains unchanged

### Remove Existing Image
```http
PUT /products/123
Content-Type: application/json

{
  "name": "Updated Product Name",
  "productImage": null
}
```
**Result**: Existing image is removed, product.images set to null

### Replace with File Upload
```http
PUT /products/123
Content-Type: multipart/form-data

productImage: [binary file data]
name: "Updated Product Name"
```
**Result**: Existing image replaced with uploaded file

### Replace with Base64 Data
```http
PUT /products/123
Content-Type: application/json

{
  "name": "Updated Product Name",
  "productImage": {
    "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "name": "new-image.jpg",
    "mimeType": "image/jpeg",
    "altText": "Product image"
  }
}
```
**Result**: Existing image replaced with base64 data

## Key Benefits

1. **Predictable Behavior**: Clear distinction between different image update scenarios
2. **Explicit Control**: Frontend can explicitly remove images by sending `null`
3. **Performance**: No unnecessary image processing when no changes requested
4. **Data Integrity**: Prevents accidental image removal or modification
5. **Backward Compatibility**: Existing update calls continue to work as expected

## Technical Details

### File Type Checking
- Only processes `productImage` parameter if it's actually a File object with buffer
- Prevents errors from attempting to process non-file data

### Memory Management
- Properly removes old images before creating new ones
- Prevents orphaned image files in storage

### Error Handling
- Graceful fallback if base64 processing fails
- Continues with other update operations even if image processing fails

This implementation ensures robust and predictable image handling for product updates while maintaining backward compatibility and providing clear control over image operations.