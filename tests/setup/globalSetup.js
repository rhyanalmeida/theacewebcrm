const path = require('path');
const { execSync } = require('child_process');

module.exports = async () => {
  console.log('🚀 Global test setup started...');
  
  // Load test environment variables
  require('dotenv').config({
    path: path.join(__dirname, '../../.env.test')
  });

  // Set test environment
  process.env.NODE_ENV = 'test';
  
  try {
    // Create test database if it doesn't exist
    console.log('📊 Setting up test database...');
    
    // Run database setup script
    const dbSetupPath = path.join(__dirname, 'dbSetup.js');
    execSync(`node ${dbSetupPath}`, { stdio: 'inherit' });
    
    console.log('✅ Global test setup completed successfully');
  } catch (error) {
    console.error('❌ Global test setup failed:', error.message);
    process.exit(1);
  }
};