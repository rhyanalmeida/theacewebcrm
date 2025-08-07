#!/usr/bin/env node

/**
 * ACE CRM API Server - Production Ready
 * 
 * This is the main entry point for the ACE CRM backend API.
 * It provides a fully functional REST API with Supabase integration.
 * 
 * Features:
 * - Health checks and monitoring
 * - Database connectivity testing  
 * - Security middleware (CORS, Helmet, Rate limiting)
 * - Error handling and logging
 * - Production and development configurations
 * 
 * Usage:
 *   node start-api.js
 *   npm start (if configured in package.json)
 */

const path = require('path');
const fs = require('fs');

// Check if we should use the TypeScript version or the simple version
const useTypeScript = process.env.USE_TYPESCRIPT === 'true';
const tsFile = path.join(__dirname, 'src', 'app.ts');
const simpleFile = path.join(__dirname, 'src', 'simple-server.js');

console.log('🚀 Starting ACE CRM API Server...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📂 Working Directory: ${__dirname}`);

if (useTypeScript && fs.existsSync(tsFile)) {
  console.log('🔧 Using TypeScript server with ts-node');
  
  try {
    require('ts-node/register');
    const app = require('./src/app.ts').default;
    
    if (app && typeof app.listen === 'function') {
      const PORT = process.env.PORT || 3001;
      app.listen(PORT, () => {
        console.log('✅ TypeScript server started successfully!');
        console.log(`🌐 Server running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`🔗 API endpoints: http://localhost:${PORT}/api`);
      });
    } else {
      throw new Error('Failed to load TypeScript app');
    }
  } catch (error) {
    console.log('❌ TypeScript server failed, falling back to simple server');
    console.log(`Error: ${error.message}`);
    require(simpleFile);
  }
  
} else if (fs.existsSync(simpleFile)) {
  console.log('🔧 Using simplified JavaScript server');
  require(simpleFile);
  
} else {
  console.error('❌ No server files found!');
  console.error('Please ensure either src/app.ts or src/simple-server.js exists');
  process.exit(1);
}