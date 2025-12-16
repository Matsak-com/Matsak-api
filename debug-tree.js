const mongoose = require('mongoose');

async function debug() {
  await mongoose.connect('mongodb://localhost:27017/matsak');
  
  const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
  const SubCategory = mongoose.model('SubCategory', new mongoose.Schema({}, { strict: false }));
  
  const cat = await Category.findOne({});
  console.log('Category:', cat._id);
  
  // Check all subcategories
  const allSubs = await SubCategory.find({ categoryId: cat._id });
  console.log('\n=== ALL Subcategories (including deleted) ===');
  console.log('Total:', allSubs.length);
  
  const withDeleted = allSubs.filter(s => s.deleted_at);
  console.log('With deleted_at:', withDeleted.length);
  
  const withoutDeleted = allSubs.filter(s => !s.deleted_at);
  console.log('Without deleted_at:', withoutDeleted.length);
  
  // Check with $exists query
  const existsQuery = await SubCategory.find({
    categoryId: cat._id,
    deleted_at: { $exists: false }
  });
  console.log('\nUsing {$exists: false}:', existsQuery.length);
  
  // Check root level
  const rootSubs = await SubCategory.find({
    categoryId: cat._id,
    parentId: null,
    deleted_at: { $exists: false }
  });
  console.log('\n=== Root Subcategories (parentId: null) ===');
  console.log('Count:', rootSubs.length);
  rootSubs.forEach(s => {
    console.log(`- ${s.name?.en || s.name} (ID: ${s._id})`);
  });
  
  await mongoose.disconnect();
}

debug().catch(console.error);
