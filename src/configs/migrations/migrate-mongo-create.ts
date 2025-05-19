import * as prompt from 'prompt';
import { create, config } from 'migrate-mongo';
import migrateMongoConfig from './migrate-mongo-config.js';
import * as path from 'path';

//npm run migrate-mongo:create
async function migrateMongoCreate() {
  prompt.start();

  const schema = {
    properties: {
      description: {
        description: 'Trouvez le nom de cette migration 🦩🦩🦩',
        pattern: /^[a-zA-Z\s\-]+$/,
        message: 'Seulement des lettres et des espaces stp',
        required: true,
      },
    },
  };
  prompt.get(schema, async function (err, result: { description: string }) {
    const migrationConf = { ...migrateMongoConfig };
    migrationConf.migrationsDir = path.resolve(
      __dirname,
      '../../../migrations',
    );
    migrationConf.migrationFileExtension = '.ts';
    config.set(migrationConf as any);
    await create(result.description.trim());

    console.log('Fichier de migration créé avec succès !! ');
    process.exit(0);
  });
}
migrateMongoCreate();
