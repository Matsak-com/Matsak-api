module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    await db.collection('roles').deleteMany({});
    await db.collection('roles').insertMany([
      {
        name: 'superadmin',
        permissions: ['read', 'write', 'delete'],
        level: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'admin',
        permissions: ['read', 'write', 'delete'],
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'director',
        level: 2,
        permissions: ['read', 'write'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'user',
        level: 3,
        permissions: ['read'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    await db.collection('roles').deleteMany({});
  }
};
