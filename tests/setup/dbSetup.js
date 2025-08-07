const knex = require('knex');
const path = require('path');

// Load test environment
require('dotenv').config({
  path: path.join(__dirname, '../../.env.test')
});

const setupTestDatabase = async () => {
  console.log('🔧 Setting up test database...');
  
  // Create database connection without specifying database name
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
    // Create test database if it doesn't exist
    const dbName = process.env.DB_NAME || 'ace_crm_test';
    
    try {
      await rootConnection.raw(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Test database "${dbName}" created`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`📊 Test database "${dbName}" already exists`);
      } else {
        throw error;
      }
    }
    
    await rootConnection.destroy();
    
    // Connect to test database and run migrations
    const testDbConnection = knex({
      client: 'postgresql',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: dbName,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      },
      migrations: {
        directory: path.join(__dirname, '../../src/database/migrations'),
        tableName: 'knex_migrations'
      }
    });

    // Run migrations
    console.log('🔄 Running database migrations...');
    await testDbConnection.migrate.latest();
    console.log('✅ Database migrations completed');
    
    await testDbConnection.destroy();
    
    console.log('✅ Test database setup completed successfully');
    
  } catch (error) {
    console.error('❌ Test database setup failed:', error.message);
    await rootConnection.destroy();
    throw error;
  }
};

// Run setup if called directly
if (require.main === module) {
  setupTestDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupTestDatabase;