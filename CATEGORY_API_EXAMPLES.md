# Category and Subcategory API - Complete Examples

## Table of Contents
1. [Create Category](#create-category)
2. [Update Category](#update-category)
3. [Create Subcategory](#create-subcategory)
4. [Update Subcategory](#update-subcategory)
5. [Get Category Tree](#get-category-tree)
6. [cURL Examples](#curl-examples)
7. [Postman Examples](#postman-examples)

---

## Create Category

### Endpoint
```
POST /categories
Content-Type: multipart/form-data
```

### Request Payload

**With Image File:**
```bash
# Using cURL
curl -X POST http://localhost:3000/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name[en]=Pharmacy" \
  -F "name[fr]=Pharmacie" \
  -F "name[ar]=صيدلية" \
  -F "name[zh]=药店" \
  -F "description[en]=Health and wellness products" \
  -F "description[fr]=Produits de santé et bien-être" \
  -F "description[ar]=منتجات الصحة والعافية" \
  -F "description[zh]=健康保健产品" \
  -F "imageUrl=@/path/to/pharmacy-icon.png"
```

**Without Image (Optional):**
```bash
curl -X POST http://localhost:3000/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name[en]=Electronics" \
  -F "name[fr]=Électronique" \
  -F "name[ar]=إلكترونيات" \
  -F "name[zh]=电子产品" \
  -F "description[en]=Electronic devices and accessories" \
  -F "description[fr]=Appareils électroniques et accessoires" \
  -F "description[ar]=الأجهزة الإلكترونية والإكسسوارات" \
  -F "description[zh]=电子设备和配件"
```

### Response
```json
{
  "_id": "6909509377fe4bb0edeaeb78",
  "name": {
    "en": "Pharmacy",
    "fr": "Pharmacie",
    "ar": "صيدلية",
    "zh": "药店"
  },
  "description": {
    "en": "Health and wellness products",
    "fr": "Produits de santé et bien-être",
    "ar": "منتجات الصحة والعافية",
    "zh": "健康保健产品"
  },
  "imageUrl": "categories/6909509377fe4bb0edeaeb78/image.png",
  "level": 0,
  "ancestors": [],
  "children": [],
  "created_at": "2025-11-04T10:30:00.000Z",
  "updated_at": "2025-11-04T10:30:00.000Z"
}
```

---

## Update Category

### Endpoint
```
PUT /categories/:id
Content-Type: multipart/form-data
```

### Request Payload

**Update with New Image:**
```bash
curl -X PUT http://localhost:3000/categories/6909509377fe4bb0edeaeb78 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name[en]=Pharmacy & Health" \
  -F "name[fr]=Pharmacie et Santé" \
  -F "imageUrl=@/path/to/new-pharmacy-icon.png"
```

**Update Only Text (Keep Existing Image):**
```bash
curl -X PUT http://localhost:3000/categories/6909509377fe4bb0edeaeb78 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name[en]=Health & Wellness" \
  -F "description[en]=Complete health solutions"
```

### Response
```json
{
  "_id": "6909509377fe4bb0edeaeb78",
  "name": {
    "en": "Pharmacy & Health",
    "fr": "Pharmacie et Santé",
    "ar": "صيدلية",
    "zh": "药店"
  },
  "imageUrl": "categories/6909509377fe4bb0edeaeb78/image.png",
  "updated_at": "2025-11-04T11:00:00.000Z"
}
```

---

## Create Subcategory

### Endpoint
```
POST /sub-categories
Content-Type: multipart/form-data
```

### Request Payload

**Create Root-Level Subcategory:**
```bash
curl -X POST http://localhost:3000/sub-categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name[en]=Medications" \
  -F "name[fr]=Médicaments" \
  -F "name[ar]=الأدوية" \
  -F "name[zh]=药品" \
  -F "description[en]=Prescription and over-the-counter medications" \
  -F "description[fr]=Médicaments sur ordonnance et en vente libre" \
  -F "description[ar]=الأدوية الموصوفة والمتاحة دون وصفة" \
  -F "description[zh]=处方药和非处方药" \
  -F "parentId=6909509377fe4bb0edeaeb78" \
  -F "imageUrl=@/path/to/medications-icon.png"
```

**Create Nested Subcategory (Child of Another Subcategory):**
```bash
curl -X POST http://localhost:3000/sub-categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name[en]=Pain Relief" \
  -F "name[fr]=Soulagement de la douleur" \
  -F "name[ar]=تخفيف الآلام" \
  -F "name[zh]=止痛药" \
  -F "description[en]=Pain medications and analgesics" \
  -F "description[fr]=Médicaments contre la douleur et analgésiques" \
  -F "description[ar]=أدوية الألم والمسكنات" \
  -F "description[zh]=止痛药和镇痛药" \
  -F "parentId=6909509677fe4bb0edeaeb80" \
  -F "imageUrl=@/path/to/pain-relief-icon.png"
```

**Without Image (Optional):**
```bash
curl -X POST http://localhost:3000/sub-categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name[en]=Vitamins" \
  -F "name[fr]=Vitamines" \
  -F "name[ar]=الفيتامينات" \
  -F "name[zh]=维生素" \
  -F "parentId=6909509377fe4bb0edeaeb78"
```

### Response
```json
{
  "_id": "6909509677fe4bb0edeaeb80",
  "name": {
    "en": "Medications",
    "fr": "Médicaments",
    "ar": "الأدوية",
    "zh": "药品"
  },
  "description": {
    "en": "Prescription and over-the-counter medications",
    "fr": "Médicaments sur ordonnance et en vente libre",
    "ar": "الأدوية الموصوفة والمتاحة دون وصفة",
    "zh": "处方药和非处方药"
  },
  "parentId": "6909509377fe4bb0edeaeb78",
  "imageUrl": "subcategories/6909509677fe4bb0edeaeb80/image.png",
  "level": 1,
  "ancestors": ["6909509377fe4bb0edeaeb78"],
  "children": [],
  "created_at": "2025-11-04T10:35:00.000Z",
  "updated_at": "2025-11-04T10:35:00.000Z"
}
```

---

## Update Subcategory

### Endpoint
```
PUT /sub-categories/:id
Content-Type: multipart/form-data
```

### Request Payload

**Update with New Image:**
```bash
curl -X PUT http://localhost:3000/sub-categories/6909509677fe4bb0edeaeb80 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name[en]=Prescription Medications" \
  -F "imageUrl=@/path/to/updated-medications-icon.png"
```

**Move to Different Parent:**
```bash
curl -X PUT http://localhost:3000/sub-categories/6909509677fe4bb0edeaeb80 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "parentId=NEW_PARENT_ID"
```

---

## Get Category Tree

### Get All Categories with Full Tree
```bash
# GET /categories/tree
curl -X GET http://localhost:3000/categories/tree \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response
```json
[
  {
    "_id": "6909509377fe4bb0edeaeb78",
    "name": {
      "en": "Pharmacy",
      "fr": "Pharmacie",
      "ar": "صيدلية",
      "zh": "药店"
    },
    "imageUrl": "categories/6909509377fe4bb0edeaeb78/image.png",
    "level": 0,
    "children": [
      {
        "_id": "6909509677fe4bb0edeaeb80",
        "name": {
          "en": "Medications",
          "fr": "Médicaments",
          "ar": "الأدوية",
          "zh": "药品"
        },
        "parentId": "6909509377fe4bb0edeaeb78",
        "imageUrl": "subcategories/6909509677fe4bb0edeaeb80/image.png",
        "level": 1,
        "children": [
          {
            "_id": "690950a777fe4bb0edeaeb85",
            "name": {
              "en": "Pain Relief",
              "fr": "Soulagement de la douleur",
              "ar": "تخفيف الآلام",
              "zh": "止痛药"
            },
            "parentId": "6909509677fe4bb0edeaeb80",
            "level": 2,
            "children": []
          }
        ]
      }
    ]
  }
]
```

### Get Specific Category Tree
```bash
# GET /categories/:id/tree
curl -X GET http://localhost:3000/categories/6909509377fe4bb0edeaeb78/tree \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Subcategory Tree
```bash
# GET /sub-categories/:id/tree
curl -X GET http://localhost:3000/sub-categories/6909509677fe4bb0edeaeb80/tree \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## cURL Examples

### Complete Category Creation Flow

```bash
#!/bin/bash

# 1. Create main category
CATEGORY_RESPONSE=$(curl -s -X POST http://localhost:3000/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name[en]=Pharmacy" \
  -F "name[fr]=Pharmacie" \
  -F "name[ar]=صيدلية" \
  -F "name[zh]=药店" \
  -F "description[en]=Health and wellness products" \
  -F "imageUrl=@./pharmacy-icon.png")

CATEGORY_ID=$(echo $CATEGORY_RESPONSE | jq -r '._id')
echo "Created category: $CATEGORY_ID"

# 2. Create first-level subcategory
SUBCAT1_RESPONSE=$(curl -s -X POST http://localhost:3000/sub-categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name[en]=Medications" \
  -F "name[fr]=Médicaments" \
  -F "parentId=$CATEGORY_ID" \
  -F "imageUrl=@./medications-icon.png")

SUBCAT1_ID=$(echo $SUBCAT1_RESPONSE | jq -r '._id')
echo "Created subcategory: $SUBCAT1_ID"

# 3. Create second-level subcategory (nested)
SUBCAT2_RESPONSE=$(curl -s -X POST http://localhost:3000/sub-categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name[en]=Pain Relief" \
  -F "name[fr]=Soulagement de la douleur" \
  -F "parentId=$SUBCAT1_ID" \
  -F "imageUrl=@./pain-relief-icon.png")

echo "Created nested subcategory: $(echo $SUBCAT2_RESPONSE | jq -r '._id')"

# 4. Get full category tree
curl -X GET http://localhost:3000/categories/tree \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.'
```

---

## Postman Examples

### Setup in Postman

1. **Create a new request**
2. **Set method to POST**
3. **URL:** `http://localhost:3000/categories`
4. **Headers:**
   - `Authorization: Bearer YOUR_JWT_TOKEN`
5. **Body → form-data:**

| KEY | VALUE | TYPE |
|-----|-------|------|
| name[en] | Pharmacy | Text |
| name[fr] | Pharmacie | Text |
| name[ar] | صيدلية | Text |
| name[zh] | 药店 | Text |
| description[en] | Health and wellness products | Text |
| description[fr] | Produits de santé et bien-être | Text |
| imageUrl | [Select File: pharmacy-icon.png] | File |

### Postman Collection JSON

```json
{
  "info": {
    "name": "Matsak Categories API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Category with Image",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}"
          }
        ],
        "body": {
          "mode": "formdata",
          "formdata": [
            {"key": "name[en]", "value": "Pharmacy", "type": "text"},
            {"key": "name[fr]", "value": "Pharmacie", "type": "text"},
            {"key": "name[ar]", "value": "صيدلية", "type": "text"},
            {"key": "name[zh]", "value": "药店", "type": "text"},
            {"key": "description[en]", "value": "Health products", "type": "text"},
            {"key": "imageUrl", "type": "file", "src": "/path/to/image.png"}
          ]
        },
        "url": {
          "raw": "{{base_url}}/categories",
          "host": ["{{base_url}}"],
          "path": ["categories"]
        }
      }
    },
    {
      "name": "Create Subcategory",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}"
          }
        ],
        "body": {
          "mode": "formdata",
          "formdata": [
            {"key": "name[en]", "value": "Medications", "type": "text"},
            {"key": "name[fr]", "value": "Médicaments", "type": "text"},
            {"key": "parentId", "value": "{{category_id}}", "type": "text"},
            {"key": "imageUrl", "type": "file", "src": "/path/to/image.png"}
          ]
        },
        "url": {
          "raw": "{{base_url}}/sub-categories",
          "host": ["{{base_url}}"],
          "path": ["sub-categories"]
        }
      }
    },
    {
      "name": "Get Category Tree",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/categories/tree",
          "host": ["{{base_url}}"],
          "path": ["categories", "tree"]
        }
      }
    }
  ]
}
```

---

## Important Notes

### File Upload Requirements
- **Field Name:** `imageUrl` (must match exactly)
- **File Types:** image/* (PNG, JPEG, GIF, WebP, SVG, etc.)
- **Max Size:** 3 MB
- **Upload Method:** multipart/form-data ONLY
- **URL Strings:** ❌ NOT accepted (file upload required)

### Translations
- **Required Languages:** en, fr, ar, zh
- **Format:** `name[language]` and `description[language]`
- **All languages required** for name and description

### Tree Structure
- **Unlimited Nesting:** Subcategories can have unlimited children
- **Level:** Automatically calculated (0 for categories, increments for each level)
- **Ancestors:** Automatically tracked for efficient querying
- **Cascade Delete:** Deleting a category/subcategory removes all children

### Authentication
- All endpoints require JWT authentication
- Include `Authorization: Bearer YOUR_JWT_TOKEN` header

---

## Testing Script

Save this as `test-categories.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
TOKEN="YOUR_JWT_TOKEN"

echo "=== Testing Category and Subcategory API ==="

# Create category with image
echo -e "\n1. Creating category with image..."
CATEGORY=$(curl -s -X POST $BASE_URL/categories \
  -H "Authorization: Bearer $TOKEN" \
  -F "name[en]=Test Pharmacy" \
  -F "name[fr]=Test Pharmacie" \
  -F "name[ar]=اختبار صيدلية" \
  -F "name[zh]=测试药店" \
  -F "description[en]=Test description" \
  -F "description[fr]=Description de test" \
  -F "description[ar]=وصف الاختبار" \
  -F "description[zh]=测试说明" \
  -F "imageUrl=@./test-image.png")

CATEGORY_ID=$(echo $CATEGORY | jq -r '._id')
echo "✅ Created category: $CATEGORY_ID"

# Create subcategory
echo -e "\n2. Creating subcategory..."
SUBCAT=$(curl -s -X POST $BASE_URL/sub-categories \
  -H "Authorization: Bearer $TOKEN" \
  -F "name[en]=Test Medications" \
  -F "name[fr]=Test Médicaments" \
  -F "name[ar]=اختبار الأدوية" \
  -F "name[zh]=测试药品" \
  -F "parentId=$CATEGORY_ID" \
  -F "imageUrl=@./test-image.png")

SUBCAT_ID=$(echo $SUBCAT | jq -r '._id')
echo "✅ Created subcategory: $SUBCAT_ID"

# Get tree
echo -e "\n3. Getting category tree..."
curl -s -X GET $BASE_URL/categories/$CATEGORY_ID/tree \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n✅ All tests completed!"
```

---

## Quick Reference

| Action | Method | Endpoint | Body Type |
|--------|--------|----------|-----------|
| Create Category | POST | `/categories` | multipart/form-data |
| Update Category | PUT | `/categories/:id` | multipart/form-data |
| Delete Category | DELETE | `/categories/:id` | - |
| Get Category Tree | GET | `/categories/tree` | - |
| Get Single Category Tree | GET | `/categories/:id/tree` | - |
| Create Subcategory | POST | `/sub-categories` | multipart/form-data |
| Update Subcategory | PUT | `/sub-categories/:id` | multipart/form-data |
| Delete Subcategory | DELETE | `/sub-categories/:id` | - |
| Get Subcategory Tree | GET | `/sub-categories/:id/tree` | - |

