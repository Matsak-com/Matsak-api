/**
 * Migration script to rename geoLoc field to coordinates in teams collection
 * 
 * This migration is required because we changed the schema field name from 'geoLoc' to 'coordinates'
 * to maintain consistency between frontend payloads and backend storage.
 * 
 * Run this migration before deploying the coordinate field changes.
 */

const { MongoClient } = require('mongodb');

async function migrateGeoLocToCoordinates() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/matsak-db';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const teamsCollection = db.collection('teams');

    // Find all teams that have geoLoc field
    const teamsWithGeoLoc = await teamsCollection.find({ 
      geoLoc: { $exists: true, $ne: null } 
    }).toArray();

    console.log(`Found ${teamsWithGeoLoc.length} teams with geoLoc field`);

    if (teamsWithGeoLoc.length === 0) {
      console.log('No teams to migrate. All done!');
      return;
    }

    // Update each team: rename geoLoc to coordinates
    for (const team of teamsWithGeoLoc) {
      try {
        const result = await teamsCollection.updateOne(
          { _id: team._id },
          {
            $set: { coordinates: team.geoLoc },
            $unset: { geoLoc: 1 }
          }
        );

        if (result.modifiedCount === 1) {
          console.log(`✅ Migrated team: ${team.name} (${team._id})`);
        } else {
          console.log(`⚠️  Failed to migrate team: ${team.name} (${team._id})`);
        }
      } catch (error) {
        console.error(`❌ Error migrating team ${team.name}:`, error.message);
      }
    }

    // Verify migration
    const remainingGeoLoc = await teamsCollection.countDocuments({ 
      geoLoc: { $exists: true } 
    });
    
    const migratedCoordinates = await teamsCollection.countDocuments({ 
      coordinates: { $exists: true, $ne: null } 
    });

    console.log(`\n=== MIGRATION SUMMARY ===`);
    console.log(`Teams with old geoLoc field: ${remainingGeoLoc}`);
    console.log(`Teams with new coordinates field: ${migratedCoordinates}`);
    console.log(`Expected migrated count: ${teamsWithGeoLoc.length}`);

    if (remainingGeoLoc === 0) {
      console.log('🎉 Migration completed successfully!');
    } else {
      console.log('⚠️  Some teams still have geoLoc field. Review migration logs.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Script execution
if (require.main === module) {
  migrateGeoLocToCoordinates()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateGeoLocToCoordinates };