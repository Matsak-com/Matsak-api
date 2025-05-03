import { database, config, down } from 'migrate-mongo';
import migrateMongoConfig from './migrate-mongo-config.js';

async function migrateMongoDown() {
  config.set(migrateMongoConfig as any);
  const { db, client } = await database.connect();
  const migrated = await down(db, client);
  migrated.forEach((fileName) => console.log('Migrated down:', fileName));
  process.exit(0);
}

migrateMongoDown();
