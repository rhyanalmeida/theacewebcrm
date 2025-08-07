#!/usr/bin/env node

/**
 * ACE CRM Environment Validation Script
 * Validates that all required environment variables are properly configured
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

// Required environment variables by component
const requiredVars = {
  backend: {
    file: 'src/.env',
    vars: [
      'NODE_ENV',
      'PORT',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'SESSION_SECRET',
      'STRIPE_SECRET_KEY',
      'EMAIL_SERVICE',
      'EMAIL_USER',
      'EMAIL_PASSWORD',
      'CORS_ORIGIN'
    ]
  },
  frontend: {
    file: 'frontend/.env.local',
    vars: [
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_APP_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
    ]
  },
  clientPortal: {
    file: 'client-portal/.env.local',
    vars: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_API_URL'
    ]
  }
};

// Security checks
const securityChecks = {
  jwtMinLength: 32,
  stripeTestKeyPattern: /^sk_test_/,
  stripeLiveKeyPattern: /^sk_live_/,
  supabaseUrlPattern: /^https:\/\/\w+\.supabase\.co$/
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadEnvFile(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      env[key.trim()] = value.trim();
    }
  });

  return env;
}

function validateComponent(componentName, config) {
  log(`\n🔍 Validating ${componentName}...`, 'blue');
  
  const env = loadEnvFile(config.file);
  
  if (!env) {
    log(`❌ Environment file not found: ${config.file}`, 'red');
    log(`💡 Copy ${config.file}.example to ${config.file} and configure it`, 'yellow');
    return false;
  }

  let isValid = true;
  const issues = [];

  // Check required variables
  config.vars.forEach(varName => {
    if (!env[varName] || env[varName] === '') {
      issues.push(`❌ Missing: ${varName}`);
      isValid = false;
    } else if (env[varName].includes('your-') || env[varName].includes('replace-')) {
      issues.push(`⚠️  Placeholder value: ${varName}`);
      isValid = false;
    } else {
      log(`✅ ${varName}`, 'green');
    }
  });

  // Security checks
  if (env.JWT_SECRET && env.JWT_SECRET.length < securityChecks.jwtMinLength) {
    issues.push(`🔒 JWT_SECRET is too short (minimum ${securityChecks.jwtMinLength} characters)`);
    isValid = false;
  }

  if (env.STRIPE_SECRET_KEY) {
    const isTest = securityChecks.stripeTestKeyPattern.test(env.STRIPE_SECRET_KEY);
    const isLive = securityChecks.stripeLiveKeyPattern.test(env.STRIPE_SECRET_KEY);
    
    if (env.NODE_ENV === 'production' && isTest) {
      issues.push(`⚠️  Using test Stripe key in production environment`);
    } else if (env.NODE_ENV === 'development' && isLive) {
      issues.push(`⚠️  Using live Stripe key in development environment`);
    }
  }

  if (env.SUPABASE_URL && !securityChecks.supabaseUrlPattern.test(env.SUPABASE_URL)) {
    issues.push(`🔗 Invalid Supabase URL format`);
    isValid = false;
  }

  // Print issues
  if (issues.length > 0) {
    log(`\n⚠️  Issues found in ${componentName}:`, 'yellow');
    issues.forEach(issue => log(`   ${issue}`, 'red'));
  }

  return isValid;
}

function checkGitIgnore() {
  log('\n🔒 Checking .gitignore configuration...', 'blue');
  
  const gitignorePath = path.resolve(process.cwd(), '.gitignore');
  
  if (!fs.existsSync(gitignorePath)) {
    log('❌ .gitignore file not found', 'red');
    return false;
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  const requiredEntries = [
    '.env',
    'src/.env',
    'frontend/.env.local',
    'client-portal/.env.local'
  ];

  let isValid = true;
  requiredEntries.forEach(entry => {
    if (gitignoreContent.includes(entry)) {
      log(`✅ ${entry} is ignored`, 'green');
    } else {
      log(`❌ ${entry} is NOT ignored - SECURITY RISK!`, 'red');
      isValid = false;
    }
  });

  return isValid;
}

function generateSecrets() {
  log('\n🔐 Generate secure secrets:', 'cyan');
  log('Run these commands to generate secure secrets:\n', 'white');
  
  log('# JWT Secret (64 characters)', 'yellow');
  log('openssl rand -base64 64\n', 'green');
  
  log('# JWT Refresh Secret (64 characters)', 'yellow');
  log('openssl rand -base64 64\n', 'green');
  
  log('# Session Secret (64 characters)', 'yellow');
  log('openssl rand -base64 64\n', 'green');
}

function main() {
  log('🚀 ACE CRM Environment Validation', 'cyan');
  log('=====================================\n', 'cyan');

  let allValid = true;

  // Validate each component
  Object.entries(requiredVars).forEach(([name, config]) => {
    const componentValid = validateComponent(name, config);
    allValid = allValid && componentValid;
  });

  // Check .gitignore
  const gitIgnoreValid = checkGitIgnore();
  allValid = allValid && gitIgnoreValid;

  // Final result
  log('\n=====================================', 'cyan');
  if (allValid) {
    log('🎉 All environment configurations are valid!', 'green');
    log('Your ACE CRM system is ready to run.', 'green');
  } else {
    log('❌ Environment validation failed!', 'red');
    log('Please fix the issues above before running the system.', 'red');
    
    generateSecrets();
    
    log('\n📚 For detailed setup instructions, see:', 'blue');
    log('   ENVIRONMENT_SETUP_GUIDE.md', 'white');
  }

  process.exit(allValid ? 0 : 1);
}

// Run validation if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateComponent,
  loadEnvFile,
  requiredVars
};