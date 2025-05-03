import { database, config, status } from 'migrate-mongo';
import migrateMongoConfig from './migrate-mongo-config.js';

async function migrateMongoStatus() {
  config.set(migrateMongoConfig as any);
  const { db } = await database.connect();
  const migrated = await status(db);
  migrated.forEach((fileName) => console.log('Status:', fileName));
  process.exit(0);
}
migrateMongoStatus();
