/**
 * Simple test server to verify basic API functionality
 * Uses ts-node to run TypeScript directly
 */

require('ts-node/register');

const path = require('path');
const express = require('express');

// Set environment variables for testing
process.env.NODE_ENV = 'development';
process.env.PORT = '3001';

// Basic logging
console.log('🔄 Starting test server...');
console.log(`📍 Environment: ${process.env.NODE_ENV}`);
console.log(`🌐 Port: ${process.env.PORT}`);

try {
  // Import the app
  const { default: app } = require('./app.ts');
  
  if (app && typeof app.listen === 'function') {
    const server = app.listen(process.env.PORT, () => {
      console.log('✅ Test server started successfully!');
      console.log(`📊 Health check: http://localhost:${process.env.PORT}/health`);
      console.log(`🔗 API endpoints: http://localhost:${process.env.PORT}/api`);
      console.log('');
      console.log('Available endpoints:');
      console.log('  GET  /health - Server health check');
      console.log('  GET  /api - API status');
      console.log('  POST /api/auth/register - User registration');
      console.log('  POST /api/auth/login - User login');
      console.log('  GET  /api/contacts - List contacts (requires auth)');
      console.log('  GET  /api/leads - List leads (requires auth)');
      console.log('');
      console.log('Press Ctrl+C to stop the server');
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down test server...');
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down test server...');
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    });

  } else {
    console.error('❌ Failed to load app - app is not a valid Express application');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Failed to start test server:');
  console.error(error.message);
  console.error('');
  console.error('Stack trace:');
  console.error(error.stack);
  process.exit(1);
}