#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe');
require('dotenv').config();

console.log('🔍 ACE CRM - System Connection Test\n');
console.log('=' .repeat(50));

// Test Supabase Connection
async function testSupabase() {
  console.log('\n📊 Testing Supabase Connection...');
  
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://hxcrjwrinexiyeyyyhfa.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Y3Jqd3JpbmV4aXlleXl5aGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDcyMTQsImV4cCI6MjA3MDA4MzIxNH0.UgHQzFICQqj5AAJty3PXqsEqL9s2NPRXyxIss1515M4';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test database connection
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist yet
      console.log('❌ Supabase Error:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connected successfully!');
    console.log('   URL:', supabaseUrl);
    console.log('   Status: Online');
    return true;
  } catch (err) {
    console.log('❌ Supabase connection failed:', err.message);
    return false;
  }
}

// Test Stripe Connection
async function testStripe() {
  console.log('\n💳 Testing Stripe Connection...');
  
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey || stripeKey === 'your_stripe_secret_key_here') {
      console.log('⚠️  Stripe key not configured yet');
      return false;
    }
    
    const stripeClient = stripe(stripeKey);
    
    // Test by retrieving account info
    const account = await stripeClient.balance.retrieve();
    
    console.log('✅ Stripe connected successfully!');
    console.log('   Mode:', stripeKey.startsWith('sk_live') ? 'LIVE' : 'TEST');
    console.log('   Currency:', account.available[0]?.currency || 'USD');
    return true;
  } catch (err) {
    console.log('❌ Stripe connection failed:', err.message);
    return false;
  }
}

// Check Environment Variables
function checkEnvironment() {
  console.log('\n🔐 Environment Configuration:');
  
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'STRIPE_SECRET_KEY',
    'JWT_SECRET',
    'NODE_ENV'
  ];
  
  const configured = [];
  const missing = [];
  
  required.forEach(key => {
    if (process.env[key] && !process.env[key].includes('your_') && !process.env[key].includes('placeholder')) {
      configured.push(key);
    } else {
      missing.push(key);
    }
  });
  
  console.log(`✅ Configured: ${configured.length}/${required.length}`);
  configured.forEach(key => console.log(`   ✓ ${key}`));
  
  if (missing.length > 0) {
    console.log(`⚠️  Missing or placeholder: ${missing.length}`);
    missing.forEach(key => console.log(`   ✗ ${key}`));
  }
  
  return missing.length === 0;
}

// Check Security
function checkSecurity() {
  console.log('\n🛡️  Security Check:');
  
  const checks = [];
  
  // Check if using HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    const appUrl = process.env.APP_URL || '';
    if (appUrl.startsWith('https://')) {
      checks.push({ name: 'HTTPS enabled', status: true });
    } else {
      checks.push({ name: 'HTTPS enabled', status: false });
    }
  }
  
  // Check JWT secret strength
  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length >= 32) {
    checks.push({ name: 'JWT secret strength', status: true });
  } else {
    checks.push({ name: 'JWT secret strength', status: false });
  }
  
  // Check CORS configuration
  if (process.env.CORS_ORIGIN) {
    checks.push({ name: 'CORS configured', status: true });
  } else {
    checks.push({ name: 'CORS configured', status: false });
  }
  
  // Check rate limiting
  if (process.env.RATE_LIMIT_MAX_REQUESTS) {
    checks.push({ name: 'Rate limiting enabled', status: true });
  } else {
    checks.push({ name: 'Rate limiting enabled', status: false });
  }
  
  checks.forEach(check => {
    console.log(`   ${check.status ? '✓' : '✗'} ${check.name}`);
  });
  
  const passed = checks.filter(c => c.status).length;
  console.log(`\n   Security Score: ${passed}/${checks.length}`);
  
  return passed === checks.length;
}

// Main test runner
async function runTests() {
  console.log('\n🚀 Starting Connection Tests...\n');
  
  const results = {
    environment: checkEnvironment(),
    supabase: await testSupabase(),
    stripe: await testStripe(),
    security: checkSecurity()
  };
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY:');
  console.log('=' .repeat(50));
  
  let totalPassed = 0;
  let totalTests = 0;
  
  Object.entries(results).forEach(([test, passed]) => {
    totalTests++;
    if (passed) totalPassed++;
    console.log(`${passed ? '✅' : '❌'} ${test.charAt(0).toUpperCase() + test.slice(1)}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log('\n' + '=' .repeat(50));
  console.log(`Overall: ${totalPassed}/${totalTests} tests passed`);
  
  if (totalPassed === totalTests) {
    console.log('\n🎉 All systems operational! Your CRM is ready to use.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the configuration above.');
  }
  
  // Provide next steps
  console.log('\n📝 Next Steps:');
  if (!results.supabase) {
    console.log('1. Set up Supabase database tables (run migrations)');
  }
  if (!results.stripe) {
    console.log('2. Add Stripe publishable key to frontend');
    console.log('3. Configure Stripe webhooks');
  }
  if (!results.security) {
    console.log('4. Enable HTTPS for production');
    console.log('5. Strengthen security settings');
  }
  
  console.log('\nTo start the application:');
  console.log('  Backend:  npm run dev');
  console.log('  Frontend: cd frontend && npm run dev');
  console.log('  Portal:   cd client-portal && npm run dev');
}

// Run tests
runTests().catch(console.error);