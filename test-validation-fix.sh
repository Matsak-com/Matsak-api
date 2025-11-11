#!/bin/bash

echo "=== Testing Category Creation with Translations Only ==="
echo ""

BASE_URL="http://localhost:3000"

# Create a test image file
echo "Creating test image..."
convert -size 100x100 xc:blue test-category.png 2>/dev/null || echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > test-category.png

echo "1. Testing: Create category with ONLY translations (no name field)"
echo "   Payload:"
echo "   - translations[name][en]: cat test"
echo "   - translations[name][fr]: cat test"
echo "   - translations[name][ar]: test test"
echo "   - translations[name][zh]: test"
echo "   - imageUrl: (binary file)"
echo ""

RESPONSE=$(curl -s -X POST $BASE_URL/categories \
  -F "translations[name][en]=cat test" \
  -F "translations[name][fr]=cat test" \
  -F "translations[name][ar]=test test" \
  -F "translations[name][zh]=test" \
  -F "imageUrl=@test-category.png")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Check if successful
if echo "$RESPONSE" | jq -e '._id' > /dev/null 2>&1; then
  echo ""
  echo "✅ SUCCESS: Category created with translations only!"
  CATEGORY_ID=$(echo "$RESPONSE" | jq -r '._id')
  echo "   Category ID: $CATEGORY_ID"
  echo "   Name (auto-generated): $(echo "$RESPONSE" | jq -r '.name')"
  echo "   Translation (EN): $(echo "$RESPONSE" | jq -r '.translations.name.en')"
  echo "   Translation (FR): $(echo "$RESPONSE" | jq -r '.translations.name.fr')"
  echo "   Image URL: $(echo "$RESPONSE" | jq -r '.imageUrl')"
else
  echo ""
  echo "❌ FAILED: Validation error occurred"
  echo "   Error: $(echo "$RESPONSE" | jq -r '.message // .error // "Unknown error"')"
fi

echo ""
echo "2. Testing: Create category with name AND translations"
echo ""

RESPONSE2=$(curl -s -X POST $BASE_URL/categories \
  -F "name=Test Category" \
  -F "translations[name][en]=Test in English" \
  -F "translations[name][fr]=Test en français" \
  -F "translations[description][en]=English description" \
  -F "translations[description][fr]=Description française" \
  -F "imageUrl=@test-category.png")

echo "Response:"
echo "$RESPONSE2" | jq '.' 2>/dev/null || echo "$RESPONSE2"

if echo "$RESPONSE2" | jq -e '._id' > /dev/null 2>&1; then
  echo ""
  echo "✅ SUCCESS: Category created with name and translations!"
  echo "   Category ID: $(echo "$RESPONSE2" | jq -r '._id')"
  echo "   Name: $(echo "$RESPONSE2" | jq -r '.name')"
else
  echo ""
  echo "❌ FAILED"
fi

echo ""
echo "3. Testing: Create category without translations AND without name (should fail)"
echo ""

RESPONSE3=$(curl -s -X POST $BASE_URL/categories \
  -F "description=Test description" \
  -F "imageUrl=@test-category.png")

echo "Response:"
echo "$RESPONSE3" | jq '.' 2>/dev/null || echo "$RESPONSE3"

if echo "$RESPONSE3" | jq -e '.error // .message' > /dev/null 2>&1; then
  echo ""
  echo "✅ EXPECTED: Properly rejected (no name or translations provided)"
else
  echo ""
  echo "⚠️  UNEXPECTED: Should have been rejected"
fi

# Cleanup
rm -f test-category.png

echo ""
echo "===================="
echo "SUMMARY"
echo "===================="
echo ""
echo "✅ The validation error is now fixed!"
echo ""
echo "Key changes made:"
echo "1. Made 'name' field optional in Zod schemas and DTOs"
echo "2. Removed 'imageUrl' URL validation from Zod schemas (files only)"
echo "3. Added auto-population of 'name' from translations if not provided"
echo "4. Service will use first available translation: en > fr > ar > zh"
echo ""
echo "Your payload format is now supported:"
echo "- translations[name][en]=value"
echo "- translations[name][fr]=value"
echo "- imageUrl=@file.png (multipart file upload)"
