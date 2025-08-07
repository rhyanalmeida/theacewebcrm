#!/usr/bin/env node

/**
 * ACE CRM Deployment Verification Script
 * Verifies that all configurations are correctly set up for production deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ACE CRM Deployment Verification\n');

let errors = [];
let warnings = [];
let success = [];

// Utility functions
const fileExists = (filePath) => fs.existsSync(filePath);
const readJSON = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
};

const readFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return null;
  }
};

// Check render.yaml configuration
console.log('📋 Checking render.yaml configuration...');
if (fileExists('render.yaml')) {
  const renderConfig = readFile('render.yaml');
  
  // Check backend configuration
  if (renderConfig.includes('rootDir: src')) {
    success.push('✅ Backend rootDir correctly set to src/');
  } else {
    errors.push('❌ Backend rootDir not set to src/ in render.yaml');
  }
  
  if (renderConfig.includes('startCommand: node dist/app.js')) {
    success.push('✅ Backend start command correctly configured');
  } else {
    errors.push('❌ Backend start command not properly configured');
  }
  
  if (renderConfig.includes('healthCheckPath: /health')) {
    success.push('✅ Backend health check path configured');
  } else {
    errors.push('❌ Backend health check path not configured');
  }
  
  // Check CORS configuration
  if (renderConfig.includes('ace-crm-frontend.onrender.com') && renderConfig.includes('ace-crm-portal.onrender.com')) {
    success.push('✅ CORS origins properly configured');
  } else {
    errors.push('❌ CORS origins not properly configured');
  }
  
} else {
  errors.push('❌ render.yaml not found');
}

// Check backend package.json
console.log('🏗️  Checking backend configuration...');
if (fileExists('src/package.json')) {
  const backendPkg = readJSON('src/package.json');
  
  if (backendPkg && backendPkg.scripts && backendPkg.scripts.build) {
    success.push('✅ Backend build script configured');
  } else {
    errors.push('❌ Backend build script missing');
  }
  
  if (backendPkg && backendPkg.scripts && backendPkg.scripts.start === 'node dist/app.js') {
    success.push('✅ Backend start script properly configured');
  } else {
    errors.push('❌ Backend start script not properly configured');
  }
  
  if (backendPkg && backendPkg.main === 'dist/app.js') {
    success.push('✅ Backend main entry point configured');
  } else {
    warnings.push('⚠️  Backend main entry point should be dist/app.js');
  }
  
} else {
  errors.push('❌ Backend package.json not found in src/');
}

// Check backend app.ts
console.log('🔧 Checking backend application configuration...');
if (fileExists('src/app.ts')) {
  const appContent = readFile('src/app.ts');
  
  if (appContent.includes('app.get(\'/health\'')) {
    success.push('✅ Backend health endpoint configured');
  } else {
    errors.push('❌ Backend health endpoint missing');
  }
  
  if (appContent.includes('process.env.CORS_ORIGIN')) {
    success.push('✅ Backend CORS environment variable handling configured');
  } else {
    errors.push('❌ Backend CORS environment variable handling missing');
  }
  
  if (appContent.includes('process.env.PORT || 5000')) {
    success.push('✅ Backend port configuration correct');
  } else {
    warnings.push('⚠️  Backend should use PORT environment variable with 5000 fallback');
  }
  
} else {
  errors.push('❌ Backend app.ts not found');
}

// Check frontend package.json
console.log('🎨 Checking frontend configuration...');
if (fileExists('frontend/package.json')) {
  const frontendPkg = readJSON('frontend/package.json');
  
  if (frontendPkg && frontendPkg.scripts && frontendPkg.scripts.build) {
    success.push('✅ Frontend build script configured');
  } else {
    errors.push('❌ Frontend build script missing');
  }
  
  if (frontendPkg && frontendPkg.scripts && frontendPkg.scripts.start.includes('$PORT')) {
    success.push('✅ Frontend start script uses PORT variable');
  } else {
    errors.push('❌ Frontend start script should use $PORT variable');
  }
  
} else {
  errors.push('❌ Frontend package.json not found');
}

// Check frontend Next.js config
console.log('⚙️  Checking frontend Next.js configuration...');
if (fileExists('frontend/next.config.js')) {
  const nextConfig = readFile('frontend/next.config.js');
  
  if (nextConfig.includes('output: \'standalone\'')) {
    success.push('✅ Frontend configured for standalone deployment');
  } else {
    warnings.push('⚠️  Frontend should use standalone output for better deployment');
  }
  
  if (nextConfig.includes('NODE_ENV === \'production\'')) {
    success.push('✅ Frontend has production-specific configuration');
  } else {
    warnings.push('⚠️  Frontend should have production-specific configuration');
  }
  
} else {
  errors.push('❌ Frontend next.config.js not found');
}

// Check client portal
console.log('👥 Checking client portal configuration...');
if (fileExists('client-portal/package.json')) {
  const portalPkg = readJSON('client-portal/package.json');
  
  if (portalPkg && portalPkg.scripts && portalPkg.scripts.build) {
    success.push('✅ Client portal build script configured');
  } else {
    errors.push('❌ Client portal build script missing');
  }
  
  if (portalPkg && portalPkg.scripts && portalPkg.scripts.start.includes('$PORT')) {
    success.push('✅ Client portal start script uses PORT variable');
  } else {
    errors.push('❌ Client portal start script should use $PORT variable');
  }
  
} else {
  errors.push('❌ Client portal package.json not found');
}

// Check client portal Next.js config
if (fileExists('client-portal/next.config.js')) {
  const portalNextConfig = readFile('client-portal/next.config.js');
  
  if (portalNextConfig.includes('output: \'standalone\'')) {
    success.push('✅ Client portal configured for standalone deployment');
  } else {
    warnings.push('⚠️  Client portal should use standalone output');
  }
  
  if (portalNextConfig.includes('async headers()')) {
    success.push('✅ Client portal has security headers configured');
  } else {
    warnings.push('⚠️  Client portal should have security headers');
  }
  
} else {
  errors.push('❌ Client portal next.config.js not found');
}

// Check health check endpoints
console.log('🏥 Checking health check endpoints...');
const healthCheckFiles = [
  'frontend/src/app/api/health/route.ts',
  'client-portal/src/app/api/health/route.ts'
];

healthCheckFiles.forEach(file => {
  if (fileExists(file)) {
    const content = readFile(file);
    if (content && content.includes('export async function GET')) {
      success.push(`✅ Health check endpoint exists: ${file}`);
    } else {
      errors.push(`❌ Health check endpoint malformed: ${file}`);
    }
  } else {
    errors.push(`❌ Health check endpoint missing: ${file}`);
  }
});

// Summary
console.log('\n📊 Verification Summary\n');

if (success.length > 0) {
  console.log('✅ SUCCESS ITEMS:');
  success.forEach(item => console.log(`   ${item}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNING ITEMS:');
  warnings.forEach(item => console.log(`   ${item}`));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ ERROR ITEMS:');
  errors.forEach(item => console.log(`   ${item}`));
  console.log('');
}

console.log(`📊 Results: ${success.length} success, ${warnings.length} warnings, ${errors.length} errors\n`);

if (errors.length === 0) {
  console.log('🎉 All critical configurations are correct!');
  console.log('✅ Your project is ready for production deployment.\n');
  console.log('🚀 Next steps:');
  console.log('   1. Run: git add . && git commit -m "Production deployment ready"');
  console.log('   2. Run: git push origin main');
  console.log('   3. Deploy to Render using render.yaml blueprint');
  console.log('   4. Configure required environment variables in Render dashboard\n');
  process.exit(0);
} else {
  console.log('⚠️  Please fix the errors above before deploying to production.');
  console.log('🔧 Run ./deploy-production.sh to attempt automatic fixes.\n');
  process.exit(1);
}