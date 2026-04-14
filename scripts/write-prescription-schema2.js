const fs = require('fs');
const path = require('path');
const target = path.resolve(__dirname, '../src/prescription/prescription.schema.ts');
console.log('target', target);
console.log('exists', fs.existsSync(target));
if (fs.existsSync(target)) {
  const stats = fs.statSync(target);
  console.log('size', stats.size);
}
console.error(
  'This script is disabled because it can overwrite src/prescription/prescription.schema.ts with a non-canonical schema.',
);
console.error(
  'Update the canonical schema directly instead of generating it from scripts/write-prescription-schema2.js.',
);
process.exitCode = 1;
