/**
 * Server entry point for THE ACE CRM API
 * Using Supabase as the database backend
 */

const express = require('express');
const path = require('path');

// Import the compiled TypeScript app
const app = require('./src/app.ts').default || require('./dist/app.js').default;

const PORT = process.env.PORT || 3001;

// For development, use ts-node to run TypeScript directly
if (process.env.NODE_ENV !== 'production') {
  require('ts-node/register');
  
  // Clear require cache for hot reloading in development
  delete require.cache[require.resolve('./src/app.ts')];
  const { default: devApp } = require('./src/app.ts');
  
  if (devApp) {
    devApp.listen(PORT, () => {
      console.log(`🚀 Development server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API endpoints: http://localhost:${PORT}/api`);
    });
  } else {
    console.error('❌ Failed to load development app');
    process.exit(1);
  }
} else {
  // Production mode - use compiled JavaScript
  if (app) {
    app.listen(PORT, () => {
      console.log(`🚀 Production server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API endpoints: http://localhost:${PORT}/api`);
    });
  } else {
    console.error('❌ Failed to load production app');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});