import { database, config, up } from 'migrate-mongo';
import migrateMongoConfig from './migrate-mongo-config.js';

async function migrateMongoUp() {
  config.set(migrateMongoConfig as any);
  const { db, client } = await database.connect();
  const migrated = await up(db, client);
  migrated.forEach((fileName) => console.log('Migrated up:', fileName));
  process.exit(0);
}
migrateMongoUp();
