module.exports = {
  /**
   * Migration to add inventory management fields to existing products
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Add stock tracking fields to all existing products
    await db.collection('products').updateMany(
      {},
      {
        $set: {
          stockQuantity: 0,
          lowStockThreshold: 0,
          trackStock: true,
          updatedAt: new Date(),
        },
      }
    );

    console.log('Successfully added inventory fields to all products');
  },

  /**
   * Rollback migration
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Remove stock tracking fields from all products
    await db.collection('products').updateMany(
      {},
      {
        $unset: {
          stockQuantity: '',
          lowStockThreshold: '',
          trackStock: '',
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    console.log('Successfully removed inventory fields from all products');
  },
};
