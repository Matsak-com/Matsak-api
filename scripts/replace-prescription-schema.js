const fs = require('fs');
const path = require('path');
const target = path.resolve(__dirname, '../src/prescription/prescription.schema.ts');
const source = path.resolve(__dirname, '../src/prescription/prescription.schema.fixed.ts');
console.log('source', source);
console.log('target', target);
console.log('source exists', fs.existsSync(source));
console.log('target exists', fs.existsSync(target));
try {
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
    console.log('deleted old target');
  }
  fs.renameSync(source, target);
  console.log('renamed source to target');
  console.log('target exists now', fs.existsSync(target));
} catch (error) {
  console.error('error', error.message);
}
