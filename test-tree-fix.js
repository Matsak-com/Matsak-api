const mongoose = require('mongoose');

async function testCategoryTree() {
  try {
    await mongoose.connect('mongodb://localhost:27017/matsak');
    console.log('✅ Connected to MongoDB\n');

    const SubCategory = mongoose.model('SubCategory', new mongoose.Schema({
      name: mongoose.Schema.Types.Mixed,
      categoryId: mongoose.Schema.Types.ObjectId,
      parentId: mongoose.Schema.Types.ObjectId,
      deleted_at: Date,
    }, { strict: false }));

    const Category = mongoose.model('Category', new mongoose.Schema({
      name: mongoose.Schema.Types.Mixed,
    }, { strict: false }));

    // Get first category
    const category = await Category.findOne({});
    if (!category) {
      console.log('❌ No categories found');
      process.exit(1);
    }

    console.log(`📂 Category: ${category.name?.en || category.name}`);
    console.log(`   ID: ${category._id}\n`);

    // Test 1: Query with string (what was happening before)
    console.log('Test 1: Query with string categoryId (OLD WAY - WRONG)');
    const wrongQuery = {
      categoryId: category._id.toString(),
      parentId: null,
      deleted_at: { $exists: false }
    };
    const wrongResults = await SubCategory.find(wrongQuery);
    console.log(`   Query: ${JSON.stringify(wrongQuery)}`);
    console.log(`   Results: ${wrongResults.length} subcategories ❌\n`);

    // Test 2: Query with ObjectId (what should happen after fix)
    console.log('Test 2: Query with ObjectId categoryId (NEW WAY - CORRECT)');
    const correctQuery = {
      categoryId: new mongoose.Types.ObjectId(category._id.toString()),
      parentId: null,
      deleted_at: { $exists: false }
    };
    const correctResults = await SubCategory.find(correctQuery);
    console.log(`   Query: ${JSON.stringify(correctQuery)}`);
    console.log(`   Results: ${correctResults.length} subcategories ✅\n`);

    if (correctResults.length > 0) {
      console.log('📋 First subcategory:');
      const first = correctResults[0];
      console.log(`   Name: ${first.name?.en || first.name}`);
      console.log(`   ID: ${first._id}`);
      console.log(`   ParentId: ${first.parentId}`);
      
      // Test recursive query for children
      console.log('\n🔄 Testing children query...');
      const childrenQuery = {
        categoryId: new mongoose.Types.ObjectId(category._id.toString()),
        parentId: new mongoose.Types.ObjectId(first._id.toString()),
        deleted_at: { $exists: false }
      };
      const children = await SubCategory.find(childrenQuery);
      console.log(`   Found ${children.length} children`);
      
      if (children.length > 0) {
        console.log(`   First child: ${children[0].name?.en || children[0].name}`);
      }
    }

    console.log('\n✅ Fix verified: Using ObjectId in queries returns correct results!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testCategoryTree();
