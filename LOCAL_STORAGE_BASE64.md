# Local Storage with Base64 Implementation

## Overview
Changed category and subcategory image storage from AWS S3 to local filesystem with base64 encoding in the database.

## Changes Made

### 1. Created File Storage Helper
**File:** `src/helpers/file-storage.helper.ts`

New utility functions:
- `saveFileAsBase64()` - Save uploaded file locally and convert to base64 data URI
- `fileToBase64DataUri()` - Convert file buffer to base64 data URI
- `deleteLocalFile()` - Delete local file
- `readFileAsBase64()` - Read local file as base64 data URI

### 2. Updated Categories Service
**File:** `src/categories/categories.service.ts`

**Changes:**
- ❌ Removed: `AwsS3Service` dependency
- ✅ Added: `saveFileAsBase64`, `deleteLocalFile` from file-storage helper
- ✅ Modified `create()`: Saves image locally and stores base64 in DB
- ✅ Modified `update()`: Deletes old file, saves new one, stores base64

**Before:**
```typescript
uploadedImageUrl = (
  await this.awsS3Service.uploadFile({
    file: imageUrl,
    fileKey: `categories/${category._id}/image`,
  })
).fileKey;
```

**After:**
```typescript
const imageResult = await saveFileAsBase64(
  imageUrl,
  'uploads/categories',
  `category-${category._id}`,
);
imageBase64 = imageResult.base64; // data:image/png;base64,...
```

### 3. Updated Subcategories Service
**File:** `src/sub-categories/sub-categories.service.ts`

**Changes:**
- ❌ Removed: `AwsS3Service` dependency
- ✅ Added: `saveFileAsBase64`, `deleteLocalFile` from file-storage helper
- ✅ Modified `create()`: Saves image locally and stores base64 in DB
- ✅ Modified `update()`: Deletes old file, saves new one, stores base64

### 4. Updated Modules
**Files:**
- `src/categories/categories.module.ts`
- `src/sub-categories/sub-categories.module.ts`

**Changes:**
- ❌ Removed: `AwsS3Service` from providers
- ❌ Removed: `import { AwsS3Service }` statement

## Storage Structure

### Local Filesystem
```
uploads/
├── categories/
│   ├── category-6909509377fe4bb0edeaeb78.png
│   ├── category-6909509477fe4bb0edeaeb7a.jpg
│   └── ...
└── subcategories/
    ├── subcategory-6909509677fe4bb0edeaeb80.png
    ├── subcategory-6909509777fe4bb0edeaeb83.jpg
    └── ...
```

### Database Storage
Images are stored as base64 data URI strings in the `imageUrl` field:

```javascript
{
  "_id": "6909509377fe4bb0edeaeb78",
  "name": "Pharmacy",
  "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  // ... other fields
}
```

## Image Format

### Data URI Format
```
data:[MIME-TYPE];base64,[BASE64-ENCODED-DATA]
```

**Examples:**
- PNG: `data:image/png;base64,iVBORw0KGgo...`
- JPEG: `data:image/jpeg;base64,/9j/4AAQSkZJ...`
- WebP: `data:image/webp;base64,UklGRiQAAABX...`

### Advantages
1. **Self-contained**: Image data embedded in JSON response
2. **No additional requests**: Frontend gets image immediately
3. **Portable**: Easy to backup/restore (just database)
4. **Simple**: No external dependencies (S3, CDN)

### Considerations
1. **Database size**: Base64 increases size by ~33%
2. **Response payload**: Larger JSON responses
3. **Memory**: Full image loaded into memory
4. **Best for**: Small images (icons, thumbnails)

## API Behavior

### Create Category/Subcategory
```bash
curl -X POST http://localhost:3000/categories \
  -F "translations[name][en]=Test Category" \
  -F "imageUrl=@category-icon.png"
```

**Process:**
1. Receive multipart file upload
2. Save file to `uploads/categories/category-{id}.png`
3. Convert file buffer to base64 data URI
4. Store base64 string in database `imageUrl` field
5. Return response with base64 `imageUrl`

**Response:**
```json
{
  "_id": "6909509377fe4bb0edeaeb78",
  "name": "Test Category",
  "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAA..."
}
```

### Update Category/Subcategory
```bash
curl -X PATCH http://localhost:3000/categories/6909509377fe4bb0edeaeb78 \
  -F "imageUrl=@new-icon.png"
```

**Process:**
1. Check if old image exists (starts with 'uploads/')
2. Delete old local file if it exists
3. Save new file to `uploads/categories/category-{id}.png`
4. Convert to base64 data URI
5. Update database with new base64 string
6. Return updated response

### Get Category/Subcategory
```bash
curl http://localhost:3000/categories/6909509377fe4bb0edeaeb78
```

**Response includes base64 image:**
```json
{
  "_id": "6909509377fe4bb0edeaeb78",
  "name": "Test Category",
  "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAA..."
}
```

## Frontend Usage

### Display Image in HTML
```html
<img src="data:image/png;base64,iVBORw0KGgo..." alt="Category" />
```

or directly from API response:
```html
<img :src="category.imageUrl" alt="Category" />
```

### Display in React/Vue
```javascript
// React
<img src={category.imageUrl} alt={category.name} />

// Vue
<img :src="category.imageUrl" :alt="category.name" />
```

No additional image loading required!

## File Upload Validation

Validation remains unchanged:
- **File Type**: image/* (PNG, JPEG, GIF, WebP, SVG, etc.)
- **Max Size**: 3 MB
- **Required**: No (optional field)

## Migration from AWS S3

If you have existing categories/subcategories with S3 URLs:

### Option 1: Keep Both Systems
Detect the format in frontend:
```javascript
if (category.imageUrl.startsWith('data:')) {
  // Base64 image
  return <img src={category.imageUrl} />
} else {
  // S3 URL
  return <img src={`https://s3.amazonaws.com/${category.imageUrl}`} />
}
```

### Option 2: Migrate Existing Images
Run migration script to download S3 images and convert to base64:
```javascript
// Pseudo-code
const categories = await Category.find({ imageUrl: { $exists: true } });
for (const cat of categories) {
  if (!cat.imageUrl.startsWith('data:')) {
    // Download from S3
    const imageBuffer = await downloadFromS3(cat.imageUrl);
    // Convert to base64
    const base64 = bufferToBase64DataUri(imageBuffer);
    // Update database
    await Category.updateOne({ _id: cat._id }, { imageUrl: base64 });
    // Save locally
    await saveBuffer(imageBuffer, `uploads/categories/category-${cat._id}`);
  }
}
```

## Testing

Run the test script:
```bash
./test-local-storage.sh
```

**Tests:**
1. ✅ Create category with image → base64 stored
2. ✅ Local file created in `uploads/categories/`
3. ✅ Update category with new image → old file deleted, new base64 stored
4. ✅ Create subcategory with image → base64 stored
5. ✅ Local file created in `uploads/subcategories/`

## Directory Structure

Ensure upload directories exist (created automatically):
```bash
mkdir -p uploads/categories
mkdir -p uploads/subcategories
```

The helper automatically creates directories if they don't exist.

## Backup Considerations

### Database Backup
```bash
# Export with base64 images
mongodump --db matsak --collection categories

# Images are included in the dump
```

### Local Files Backup
```bash
# Backup local files (optional redundancy)
tar -czf uploads-backup.tar.gz uploads/
```

### Restore
```bash
# Restore database (includes base64 images)
mongorestore --db matsak dump/matsak/

# Restore local files (optional)
tar -xzf uploads-backup.tar.gz
```

## Performance Notes

### Pros
- ✅ No external API calls (S3)
- ✅ No network latency
- ✅ Simple deployment (no S3 credentials)
- ✅ Single database backup includes images

### Cons
- ⚠️ Larger database size (~33% overhead)
- ⚠️ Larger API responses
- ⚠️ More memory usage
- ⚠️ Not ideal for large images

### Recommendations
- ✅ Good for: Icons, thumbnails (< 100 KB)
- ⚠️ Consider S3 for: Large images (> 500 KB)
- 💡 Hybrid approach: Small images (base64) + Large images (S3/CDN)

## Environment Variables

No AWS credentials needed anymore! Remove these if present:
```
# .env - can remove these
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_S3_BUCKET=...
```

## Summary

| Aspect | Before (AWS S3) | After (Local + Base64) |
|--------|----------------|------------------------|
| Storage | AWS S3 bucket | Local filesystem |
| Database | S3 key string | Base64 data URI |
| Dependencies | AWS SDK | None (built-in fs) |
| Network | Internet required | None |
| Credentials | AWS keys needed | None |
| Backup | DB + S3 separate | DB only |
| Response size | Small (URL only) | Large (full image) |
| Best for | Large images | Small images/icons |

## Next Steps

1. ✅ Restart NestJS server
2. ✅ Test with image uploads
3. ✅ Verify base64 in database
4. ✅ Check local files created
5. ✅ Update frontend to use base64 images (already works)
6. ✅ Remove AWS S3 credentials from environment
