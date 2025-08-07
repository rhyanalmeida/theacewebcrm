const knex = require('knex');
const path = require('path');

// Load test environment
require('dotenv').config({
  path: path.join(__dirname, '../../.env.test')
});

const teardownTestDatabase = async () => {
  console.log('🧹 Tearing down test database...');
  
  // Create connection to drop test database
  const rootConnection = knex({
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    }
  });

  try {
    const dbName = process.env.DB_NAME || 'ace_crm_test';
    
    // Terminate existing connections to the database
    await rootConnection.raw(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
        AND pid <> pg_backend_pid()
    `);
    
    // Drop test database
    await rootConnection.raw(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`✅ Test database "${dbName}" dropped`);
    
    await rootConnection.destroy();
    console.log('✅ Test database teardown completed');
    
  } catch (error) {
    console.error('❌ Test database teardown failed:', error.message);
    await rootConnection.destroy();
    throw error;
  }
};

// Run teardown if called directly
if (require.main === module) {
  teardownTestDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Teardown failed:', error);
      process.exit(1);
    });
}

module.exports = teardownTestDatabase;