# Category Tree Fix - ObjectId Conversion

## Problem
The `getCategoriesTree()` and `getCategoryTree()` endpoints were returning empty `subCategories` arrays even though subcategories existed in the database.

## Root Cause
The `buildSubCategoryTree()` method was passing string IDs to the MongoDB query, but the proper way to ensure compatibility is to explicitly convert them to `Types.ObjectId` objects before querying.

## Solution
Modified the `buildSubCategoryTree()` private method in `CategoriesService` to:
1. Convert `categoryId` string to `Types.ObjectId`
2. Convert `parentId` string to `Types.ObjectId` (when not null)
3. Explicitly handle the `parentId: null` case for root subcategories

### Code Changes

**File:** `src/categories/categories.service.ts`

**Before:**
```typescript
private async buildSubCategoryTree(
  categoryId: string,
  parentId: string | null = null,
): Promise<any[]> {
  const subCategories = await this.subCategoryRepository.findAll({
    filter: {
      categoryId: categoryId,
      parentId: parentId || null,
    },
  });
  // ...
}
```

**After:**
```typescript
private async buildSubCategoryTree(
  categoryId: string,
  parentId: string | null = null,
): Promise<any[]> {
  // Convert string IDs to ObjectId for MongoDB query
  const filter: any = {
    categoryId: new Types.ObjectId(categoryId),
  };
  
  // Handle parentId - if null, query for root subcategories (parentId: null)
  if (parentId === null) {
    filter.parentId = null;
  } else {
    filter.parentId = new Types.ObjectId(parentId);
  }

  const subCategories = await this.subCategoryRepository.findAll({
    filter,
  });
  // ...
}
```

## How to Test

### 1. Restart the API Server
After the code changes, restart your NestJS server:

```bash
# If using npm
npm run start:dev

# If using pnpm
pnpm start:dev

# If using Docker
docker-compose restart api
```

### 2. Test with cURL

**Get all categories with their tree:**
```bash
curl -X GET http://localhost:3000/categories/tree | jq '.'
```

**Expected Response:**
```json
[
  {
    "_id": "6908d2a5d5781ef76fd7e131",
    "name": {
      "en": "Daily Health",
      "fr": "Santé au Quotidien"
    },
    "subCategories": [
      {
        "_id": "6908d2a5d5781ef76fd7e139",
        "name": {
          "en": "Daily Ailments",
          "fr": "Maux du quotidien"
        },
        "parentId": null,
        "level": 1,
        "children": [
          {
            "_id": "6908d2a5d5781ef76fd7e13a",
            "name": {
              "en": "Pain",
              "fr": "Douleurs"
            },
            "parentId": "6908d2a5d5781ef76fd7e139",
            "level": 2,
            "children": []
          }
        ]
      }
    ]
  }
]
```

**Get specific category tree:**
```bash
# Replace CATEGORY_ID with actual category ID
curl -X GET http://localhost:3000/categories/CATEGORY_ID/tree | jq '.'
```

### 3. Verify Data in Database

Run this test script to verify subcategories exist:

```bash
node test-tree-fix.js
```

This should show:
- ✅ Categories exist
- ✅ Root subcategories exist (parentId: null)
- ✅ Child subcategories exist (parentId: parent_id)
- ✅ Both query methods return the same results

## Verification Checklist

- [x] Code changes applied to `categories.service.ts`
- [ ] API server restarted
- [ ] `GET /categories/tree` returns subcategories
- [ ] `GET /categories/:id/tree` returns subcategories
- [ ] Nested subcategories are properly displayed (children array)
- [ ] No TypeScript compilation errors

## Expected Results

### Before Fix:
```json
{
  "_id": "6908d2a5d5781ef76fd7e131",
  "name": {"en": "Daily Health"},
  "subCategories": []  // ❌ Empty array
}
```

### After Fix:
```json
{
  "_id": "6908d2a5d5781ef76fd7e131",
  "name": {"en": "Daily Health"},
  "subCategories": [    // ✅ Contains subcategories
    {
      "_id": "6908d2a5d5781ef76fd7e139",
      "name": {"en": "Daily Ailments"},
      "children": [      // ✅ Nested children
        {
          "_id": "6908d2a5d5781ef76fd7e13a",
          "name": {"en": "Pain"},
          "children": []
        }
      ]
    }
  ]
}
```

## Technical Details

### Why This Fix Works

MongoDB's Mongoose driver can auto-convert string IDs to ObjectIds in most cases, but explicit conversion ensures:

1. **Type Safety**: Ensures the query parameter types match the schema types
2. **Consistency**: Makes the intent clear in the code
3. **Reliability**: Prevents edge cases where auto-conversion might fail
4. **Best Practice**: Follows MongoDB/Mongoose recommendations

### Related Files
- `src/categories/categories.service.ts` - Main fix applied here
- `src/categories/categories.controller.ts` - Exposes tree endpoints
- `src/sub-categories/sub-category.schema.ts` - Defines subcategory structure
- `src/sub-categories/sub-categories.repository.ts` - Repository for queries

### Database Schema Reference

**SubCategory Schema:**
```typescript
{
  _id: ObjectId,
  name: { en: string, fr: string, ar: string, zh: string },
  categoryId: ObjectId,  // ← Must match as ObjectId
  parentId: ObjectId | null,  // ← Must match as ObjectId or null
  level: number,
  ancestors: ObjectId[],
  children: ObjectId[],
  deleted_at: Date | undefined
}
```

## Troubleshooting

### Issue: Still returning empty arrays after fix

**Solution:**
1. Ensure the API server was restarted after code changes
2. Check if subcategories actually exist in database:
   ```bash
   node debug-tree.js
   ```
3. Verify no subcategories have `deleted_at` set
4. Check server logs for any errors

### Issue: "Cannot convert undefined to ObjectId"

**Solution:**
This shouldn't happen with the fix, but if it does:
- Verify the category ID being passed is valid
- Check that `Types` is imported from `mongoose`
- Ensure the `parentId` null check is working

### Issue: Infinite recursion or timeout

**Solution:**
- Check for circular references in subcategory parentId relationships
- Verify the `level` and `ancestors` fields are properly set
- Ensure no subcategory has itself as a parent

## Performance Notes

The recursive `buildSubCategoryTree()` method:
- Makes one database query per level of nesting
- Uses `Promise.all()` for parallel processing of siblings
- Is efficient for typical category trees (2-4 levels deep)
- May need optimization for very deep trees (>10 levels)

## Next Steps

After verifying the fix works:
1. ✅ Update API documentation with correct tree response format
2. ✅ Add integration tests for tree endpoints
3. ✅ Consider adding caching for frequently accessed category trees
4. ✅ Monitor API performance with the recursive queries
