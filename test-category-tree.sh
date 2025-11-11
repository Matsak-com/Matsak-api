#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Testing Category Tree Endpoint ==="

# Get first category ID
echo -e "\n1. Getting categories..."
CATEGORIES=$(curl -s -X GET $BASE_URL/categories)
FIRST_CATEGORY_ID=$(echo $CATEGORIES | jq -r '.[0]._id')
FIRST_CATEGORY_NAME=$(echo $CATEGORIES | jq -r '.[0].name.en // .[0].name')

echo "✅ First category: $FIRST_CATEGORY_NAME (ID: $FIRST_CATEGORY_ID)"

# Get tree for specific category
echo -e "\n2. Getting tree for category $FIRST_CATEGORY_ID..."
TREE=$(curl -s -X GET $BASE_URL/categories/$FIRST_CATEGORY_ID/tree)

echo "$TREE" | jq '.'

# Count subcategories
SUBCAT_COUNT=$(echo "$TREE" | jq '.subCategories | length')
echo -e "\n✅ Found $SUBCAT_COUNT root subcategories"

# Show first subcategory details
if [ "$SUBCAT_COUNT" -gt 0 ]; then
  echo -e "\n3. First subcategory details:"
  echo "$TREE" | jq '.subCategories[0] | {
    id: ._id,
    name: .name.en // .name,
    parentId: .parentId,
    childrenCount: (.children | length)
  }'
  
  # Check if first subcategory has children
  CHILDREN_COUNT=$(echo "$TREE" | jq '.subCategories[0].children | length')
  if [ "$CHILDREN_COUNT" -gt 0 ]; then
    echo -e "\n4. First child of first subcategory:"
    echo "$TREE" | jq '.subCategories[0].children[0] | {
      id: ._id,
      name: .name.en // .name,
      parentId: .parentId
    }'
  fi
fi

echo -e "\n✅ Category tree test completed!"
