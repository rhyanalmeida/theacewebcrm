const path = require('path');

module.exports = async () => {
  console.log('🧹 Global test teardown started...');
  
  try {
    // Load test environment variables
    require('dotenv').config({
      path: path.join(__dirname, '../../.env.test')
    });

    // Run database teardown script
    const dbTeardownPath = path.join(__dirname, 'dbTeardown.js');
    require(dbTeardownPath);
    
    console.log('✅ Global test teardown completed successfully');
  } catch (error) {
    console.error('❌ Global test teardown failed:', error.message);
  }
};