#!/bin/bash

echo "=== Testing Local File Storage with Base64 ==="
echo ""

BASE_URL="http://localhost:3000"

# Create a test image file
echo "Creating test image..."
echo "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9QzwAEjDAGQwwADigBCfKmRhsAAAAASUVORK5CYII=" | base64 -d > test-local-image.png

echo "1. Creating category with image file"
echo "   This should save the file locally and return base64"
echo ""

RESPONSE=$(curl -s -X POST $BASE_URL/categories \
  -F "translations[name][en]=Test Local Storage" \
  -F "translations[name][fr]=Test Stockage Local" \
  -F "imageUrl=@test-local-image.png")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | jq -e '._id' > /dev/null 2>&1; then
  CATEGORY_ID=$(echo "$RESPONSE" | jq -r '._id')
  IMAGE_URL=$(echo "$RESPONSE" | jq -r '.imageUrl')
  
  echo ""
  echo "✅ SUCCESS: Category created"
  echo "   Category ID: $CATEGORY_ID"
  echo "   Name: $(echo "$RESPONSE" | jq -r '.name')"
  
  # Check if imageUrl is base64
  if [[ "$IMAGE_URL" == data:image/* ]]; then
    echo "   ✅ Image stored as base64 data URI"
    echo "   Image format: $(echo "$IMAGE_URL" | cut -d';' -f1)"
    echo "   Data length: ${#IMAGE_URL} characters"
  else
    echo "   ⚠️  Image format: $IMAGE_URL (not base64)"
  fi
  
  # Check if local file was created
  echo ""
  echo "2. Checking local file storage..."
  if [ -d "uploads/categories" ]; then
    echo "   ✅ uploads/categories directory exists"
    ls -lh uploads/categories/ | tail -n +2
  else
    echo "   ⚠️  uploads/categories directory not found"
  fi
  
  echo ""
  echo "3. Testing category update with new image"
  RESPONSE2=$(curl -s -X PATCH $BASE_URL/categories/$CATEGORY_ID \
    -F "translations[name][en]=Updated Local Storage" \
    -F "imageUrl=@test-local-image.png")
  
  echo "Update Response:"
  echo "$RESPONSE2" | jq '.' 2>/dev/null || echo "$RESPONSE2"
  
  NEW_IMAGE_URL=$(echo "$RESPONSE2" | jq -r '.imageUrl')
  if [[ "$NEW_IMAGE_URL" == data:image/* ]]; then
    echo "   ✅ Updated image stored as base64"
  fi
  
  echo ""
  echo "4. Creating subcategory with image"
  SUBCAT_RESPONSE=$(curl -s -X POST $BASE_URL/sub-categories \
    -F "translations[name][en]=Test Subcat Storage" \
    -F "categoryId=$CATEGORY_ID" \
    -F "imageUrl=@test-local-image.png")
  
  echo "Subcategory Response:"
  echo "$SUBCAT_RESPONSE" | jq '.' 2>/dev/null || echo "$SUBCAT_RESPONSE"
  
  SUBCAT_IMAGE=$(echo "$SUBCAT_RESPONSE" | jq -r '.imageUrl')
  if [[ "$SUBCAT_IMAGE" == data:image/* ]]; then
    echo "   ✅ Subcategory image stored as base64"
  fi
  
  # Check subcategory directory
  echo ""
  echo "5. Checking subcategory local files..."
  if [ -d "uploads/subcategories" ]; then
    echo "   ✅ uploads/subcategories directory exists"
    ls -lh uploads/subcategories/ | tail -n +2
  else
    echo "   ⚠️  uploads/subcategories directory not found"
  fi
  
else
  echo ""
  echo "❌ FAILED: Could not create category"
fi

# Cleanup
rm -f test-local-image.png

echo ""
echo "===================="
echo "SUMMARY"
echo "===================="
echo ""
echo "✅ Changes implemented:"
echo "1. Removed AWS S3 dependency from categories and subcategories"
echo "2. Images now saved locally in uploads/categories and uploads/subcategories"
echo "3. Images stored in database as base64 data URI format"
echo "4. Old local files deleted when updating with new image"
echo ""
echo "Image format in database:"
echo "  data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA..."
echo ""
echo "Local storage structure:"
echo "  uploads/"
echo "    categories/"
echo "      category-{id}.png"
echo "    subcategories/"
echo "      subcategory-{id}.png"
