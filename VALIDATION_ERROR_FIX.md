# Validation Error Fix - Translations and File Upload

## Problem
When creating categories/subcategories with the following payload format:
```
translations[name][en]: cat test
translations[name][fr]: cat test
translations[name][ar]: test test
translations[name][zh]: test
imageUrl: (binary file)
```

The API was returning:
```json
{
  "code": "VALIDATION_FAILED"
}
```

## Root Causes

### 1. **Missing Required `name` Field**
The DTO and Zod schema required a `name` field, but the payload only provided translations without a main `name` field.

### 2. **ImageUrl Type Mismatch**
The Zod schemas still expected `imageUrl` to be a URL string:
```typescript
imageUrl: z.string().url('Invalid image URL').optional()
```

But we changed the implementation to accept **file uploads only** via multipart/form-data.

## Solutions Applied

### 1. Made `name` Field Optional

**Files Updated:**
- `src/categories/dto/create-category.dto.ts`
- `src/sub-categories/dto/create-sub-category.dto.ts`
- `src/common/schemas/category.schemas.ts`
- `src/common/schemas/sub-category.schemas.ts`

**Changes:**
```typescript
// BEFORE
@IsString()
@IsNotEmpty()
name: string;

// AFTER
@IsString()
@IsOptional()
name?: string;
```

### 2. Removed `imageUrl` from Zod Validation

**Files Updated:**
- `src/common/schemas/category.schemas.ts`
- `src/common/schemas/sub-category.schemas.ts`

**Changes:**
```typescript
// BEFORE
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  imageUrl: z.string().url('Invalid image URL').optional(), // ❌ Wrong!
  // ...
});

// AFTER
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').optional(),
  // imageUrl is handled as file upload via multipart, not validated in Zod
  // ...
});
```

**Reason:** File uploads are validated by `ParseFilePipe` with `FileTypeValidator` and `MaxFileSizeValidator`, not by Zod.

### 3. Auto-populate `name` from Translations

**Files Updated:**
- `src/categories/categories.service.ts`
- `src/sub-categories/sub-categories.service.ts`

**Logic Added:**
```typescript
// If name is not provided, use the first available translation
if (!categoryData.name && categoryData.translations?.name) {
  const translations = categoryData.translations.name;
  categoryData.name =
    translations.en ||
    translations.fr ||
    translations.ar ||
    translations.zh ||
    'Unnamed Category';
}

// Validate that we have at least a name
if (!categoryData.name) {
  throw new Error('Category must have a name or translations');
}
```

**Priority Order:**
1. English (en)
2. French (fr)
3. Arabic (ar)
4. Chinese (zh)
5. Fallback: "Unnamed Category"

## How It Works Now

### Scenario 1: Translations Only (Your Use Case)
```bash
curl -X POST http://localhost:3000/categories \
  -F "translations[name][en]=Health Products" \
  -F "translations[name][fr]=Produits de santé" \
  -F "translations[name][ar]=منتجات صحية" \
  -F "translations[name][zh]=健康产品" \
  -F "imageUrl=@category-icon.png"
```

**Result:**
- ✅ Validation passes
- `name` field is auto-populated with `"Health Products"` (from `translations.name.en`)
- `translations` object is stored with all 4 languages
- Image is uploaded to S3

### Scenario 2: Name + Translations
```bash
curl -X POST http://localhost:3000/categories \
  -F "name=Main Category Name" \
  -F "translations[name][en]=English Name" \
  -F "translations[name][fr]=Nom français" \
  -F "imageUrl=@category-icon.png"
```

**Result:**
- ✅ Validation passes
- `name` field uses provided value: `"Main Category Name"`
- `translations` are also stored
- Image is uploaded to S3

### Scenario 3: No Name, No Translations (Should Fail)
```bash
curl -X POST http://localhost:3000/categories \
  -F "description=Some description" \
  -F "imageUrl=@category-icon.png"
```

**Result:**
- ❌ Validation fails with error: `"Category must have a name or translations"`

## Testing

Run the test script:
```bash
./test-validation-fix.sh
```

This will test:
1. ✅ Create with translations only (your use case)
2. ✅ Create with name + translations
3. ✅ Proper rejection when neither name nor translations provided

## File Upload Validation

Images are validated using NestJS `ParseFilePipe`:
```typescript
@UploadedFile(
  new ParseFilePipe({
    validators: [
      new FileTypeValidator({ fileType: 'image/*' }),
      new MaxFileSizeValidator({ maxSize: 3 * 1024 * 1024 }), // 3MB
    ],
    fileIsRequired: false, // Optional field
  }),
)
imageUrl: Express.Multer.File
```

**Validation Rules:**
- ✅ File type: image/* (PNG, JPEG, GIF, WebP, SVG, etc.)
- ✅ Max size: 3 MB
- ✅ Optional field (can be omitted)
- ❌ URL strings are NOT accepted

## Database Schema

The MongoDB schema remains unchanged:
```typescript
@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true })  // Still required in DB
  name: string;

  @Prop({ type: Object })
  translations?: {
    name?: { en?: string; fr?: string; ar?: string; zh?: string; };
    description?: { en?: string; fr?: string; ar?: string; zh?: string; };
  };

  @Prop()
  imageUrl: string;  // Stores S3 file key
}
```

The `name` field is still **required in the database**, but the service layer auto-populates it from translations if not provided in the request.

## API Response Example

When creating with translations only:
```json
{
  "_id": "6909509377fe4bb0edeaeb78",
  "name": "cat test",  // ← Auto-populated from translations.name.en
  "translations": {
    "name": {
      "en": "cat test",
      "fr": "cat test",
      "ar": "test test",
      "zh": "test"
    }
  },
  "imageUrl": "categories/6909509377fe4bb0edeaeb78/image.png",
  "status": true,
  "created_at": "2025-11-10T10:30:00.000Z",
  "updated_at": "2025-11-10T10:30:00.000Z"
}
```

## Migration Compatibility

Existing categories/subcategories are not affected:
- ✅ Old records with `name` field work as before
- ✅ Old records with `name` + `translations` work as before
- ✅ New records can use translations-only approach

## Summary of Changes

| File | Change |
|------|--------|
| `create-category.dto.ts` | Made `name` optional, removed `IsNotEmpty` |
| `create-sub-category.dto.ts` | Made `name` optional, removed `IsNotEmpty` |
| `category.schemas.ts` | Made `name` optional, removed `imageUrl` URL validation |
| `sub-category.schemas.ts` | Made `name` optional, removed `imageUrl` URL validation |
| `categories.service.ts` | Added auto-population logic from translations |
| `sub-categories.service.ts` | Added auto-population logic from translations |

## Restart Required

After applying these changes, restart your NestJS server:
```bash
pnpm start:dev
# or
npm run start:dev
# or
docker-compose restart api
```

## Next Steps

1. ✅ Restart API server
2. ✅ Test with your exact payload format
3. ✅ Verify response includes auto-populated `name` field
4. ✅ Verify image upload works correctly
5. ✅ Update frontend/API documentation if needed
