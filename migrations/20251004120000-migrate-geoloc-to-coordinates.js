/**
 * Migration script to rename geoLoc field to coordinates in teams collection
 * 
 * This migration is required because we changed the schema field name from 'geoLoc' to 'coordinates'
 * to maintain consistency between frontend payloads and backend storage.
 * 
 * Run this migration before deploying the coordinate field changes.
 */

module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    console.log('Starting migration: rename geoLoc to coordinates');

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
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    console.log('Starting rollback: rename coordinates back to geoLoc');

    const teamsCollection = db.collection('teams');

    // Find all teams that have coordinates field
    const teamsWithCoordinates = await teamsCollection.find({ 
      coordinates: { $exists: true, $ne: null } 
    }).toArray();

    console.log(`Found ${teamsWithCoordinates.length} teams with coordinates field`);

    if (teamsWithCoordinates.length === 0) {
      console.log('No teams to rollback. All done!');
      return;
    }

    // Update each team: rename coordinates back to geoLoc
    for (const team of teamsWithCoordinates) {
      try {
        const result = await teamsCollection.updateOne(
          { _id: team._id },
          {
            $set: { geoLoc: team.coordinates },
            $unset: { coordinates: 1 }
          }
        );

        if (result.modifiedCount === 1) {
          console.log(`✅ Rolled back team: ${team.name} (${team._id})`);
        } else {
          console.log(`⚠️  Failed to rollback team: ${team.name} (${team._id})`);
        }
      } catch (error) {
        console.error(`❌ Error rolling back team ${team.name}:`, error.message);
      }
    }

    // Verify rollback
    const remainingCoordinates = await teamsCollection.countDocuments({ 
      coordinates: { $exists: true } 
    });
    
    const rolledBackGeoLoc = await teamsCollection.countDocuments({ 
      geoLoc: { $exists: true, $ne: null } 
    });

    console.log(`\n=== ROLLBACK SUMMARY ===`);
    console.log(`Teams with new coordinates field: ${remainingCoordinates}`);
    console.log(`Teams with old geoLoc field: ${rolledBackGeoLoc}`);
    console.log(`Expected rolled back count: ${teamsWithCoordinates.length}`);

    if (remainingCoordinates === 0) {
      console.log('🎉 Rollback completed successfully!');
    } else {
      console.log('⚠️  Some teams still have coordinates field. Review rollback logs.');
    }
  }
};