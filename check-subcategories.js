const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/matsak', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('Connected to MongoDB');
  
  const SubCategory = mongoose.model('SubCategory', new mongoose.Schema({}, { strict: false }));
  const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
  
  const categories = await Category.find({}).limit(2);
  console.log('\n=== Categories ===');
  categories.forEach(cat => {
    console.log(`ID: ${cat._id}, Name: ${cat.name?.en || cat.name}`);
  });
  
  if (categories.length > 0) {
    const categoryId = categories[0]._id;
    console.log(`\n=== Subcategories for category ${categoryId} ===`);
    const subcats = await SubCategory.find({ categoryId: categoryId }).limit(5);
    console.log(`Found ${subcats.length} subcategories`);
    subcats.forEach(sub => {
      console.log(`ID: ${sub._id}`);
      console.log(`  Name: ${sub.name?.en || sub.name}`);
      console.log(`  CategoryId: ${sub.categoryId}`);
      console.log(`  ParentId: ${sub.parentId}`);
      console.log('---');
    });
  }
  
  await mongoose.disconnect();
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
