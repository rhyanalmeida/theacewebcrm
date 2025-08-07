#!/usr/bin/env node

/**
 * Supabase Database Connection Test Script
 * Tests connection, authentication, and basic functionality
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Test Results
const testResults = {
  connection: false,
  authentication: false,
  adminConnection: false,
  basicQuery: false,
  errors: []
};

console.log('🔍 ACE CRM Supabase Database Validation');
console.log('=====================================\n');

async function testBasicConnection() {
  console.log('1. Testing Basic Connection...');
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const error = 'Missing Supabase credentials in environment variables';
    console.error('❌', error);
    testResults.errors.push(error);
    return false;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Test basic connection with a simple query
    const startTime = Date.now();
    const { data, error } = await supabase.from('users').select('count').limit(1);
    const latency = Date.now() - startTime;
    
    if (error) {
      // Check if it's just an empty table (which is expected)
      if (error.code === 'PGRST116' || error.message.includes('no rows')) {
        console.log('✅ Connection successful (empty table is expected)');
        console.log(`   Latency: ${latency}ms`);
        testResults.connection = true;
        return true;
      } else {
        console.error('❌ Connection error:', error.message);
        testResults.errors.push(`Connection error: ${error.message}`);
        return false;
      }
    }
    
    console.log('✅ Connection successful');
    console.log(`   Latency: ${latency}ms`);
    testResults.connection = true;
    return true;
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    testResults.errors.push(`Connection failed: ${error.message}`);
    return false;
  }
}

async function testAdminConnection() {
  console.log('\n2. Testing Admin Connection...');
  
  if (!SUPABASE_SERVICE_KEY) {
    const error = 'Missing SUPABASE_SERVICE_KEY in environment variables';
    console.error('❌', error);
    testResults.errors.push(error);
    return false;
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Test admin connection
    const startTime = Date.now();
    const { data, error } = await supabaseAdmin.from('users').select('count').limit(1);
    const latency = Date.now() - startTime;
    
    if (error && error.code !== 'PGRST116' && !error.message.includes('no rows')) {
      console.error('❌ Admin connection error:', error.message);
      testResults.errors.push(`Admin connection error: ${error.message}`);
      return false;
    }
    
    console.log('✅ Admin connection successful');
    console.log(`   Latency: ${latency}ms`);
    testResults.adminConnection = true;
    return true;
    
  } catch (error) {
    console.error('❌ Admin connection failed:', error.message);
    testResults.errors.push(`Admin connection failed: ${error.message}`);
    return false;
  }
}

async function testSchemaExistence() {
  console.log('\n3. Testing Schema Existence...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const tables = [
      'users', 'roles', 'user_roles', 'companies', 'contacts', 
      'leads', 'deals', 'projects', 'tasks', 'activities', 
      'invoices', 'invoice_items', 'settings', 'custom_fields'
    ];
    
    const existingTables = [];
    const missingTables = [];
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error && error.code !== 'PGRST116' && !error.message.includes('no rows')) {
          if (error.message.includes('does not exist') || error.message.includes('relation')) {
            missingTables.push(table);
          } else {
            // Table exists but may have other issues
            existingTables.push(table);
          }
        } else {
          existingTables.push(table);
        }
      } catch (e) {
        missingTables.push(table);
      }
    }
    
    console.log(`✅ Found ${existingTables.length} tables:`, existingTables.join(', '));
    
    if (missingTables.length > 0) {
      console.log(`⚠️  Missing ${missingTables.length} tables:`, missingTables.join(', '));
      testResults.errors.push(`Missing tables: ${missingTables.join(', ')}`);
    }
    
    testResults.basicQuery = existingTables.length > 0;
    return existingTables.length > 0;
    
  } catch (error) {
    console.error('❌ Schema test failed:', error.message);
    testResults.errors.push(`Schema test failed: ${error.message}`);
    return false;
  }
}

async function testAuthentication() {
  console.log('\n4. Testing Authentication...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Test anonymous access
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Auth test error:', error.message);
      testResults.errors.push(`Auth test error: ${error.message}`);
      return false;
    }
    
    console.log('✅ Authentication system accessible');
    console.log('   Session:', session ? 'Active' : 'None (expected for anonymous)');
    
    testResults.authentication = true;
    return true;
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    testResults.errors.push(`Authentication test failed: ${error.message}`);
    return false;
  }
}

async function testRealtimeConnection() {
  console.log('\n5. Testing Realtime Connection...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Test realtime connection
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'users' }, 
        (payload) => {
          console.log('   Realtime event received:', payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connection successful');
        }
      });
    
    // Wait for subscription
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clean up
    await supabase.removeChannel(channel);
    
    return true;
    
  } catch (error) {
    console.error('❌ Realtime test failed:', error.message);
    testResults.errors.push(`Realtime test failed: ${error.message}`);
    return false;
  }
}

async function testStorageConnection() {
  console.log('\n6. Testing Storage Connection...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // List storage buckets
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Storage test error:', error.message);
      testResults.errors.push(`Storage test error: ${error.message}`);
      return false;
    }
    
    console.log('✅ Storage system accessible');
    console.log('   Buckets found:', data ? data.length : 0);
    
    if (data && data.length > 0) {
      console.log('   Bucket names:', data.map(b => b.name).join(', '));
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Storage test failed:', error.message);
    testResults.errors.push(`Storage test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log(`Testing Supabase at: ${SUPABASE_URL}\n`);
  
  const results = await Promise.allSettled([
    testBasicConnection(),
    testAdminConnection(),
    testSchemaExistence(),
    testAuthentication(),
    testRealtimeConnection(),
    testStorageConnection()
  ]);
  
  console.log('\n=====================================');
  console.log('📊 Test Results Summary');
  console.log('=====================================');
  
  const passed = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total} tests`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  console.log('\n📋 Component Status:');
  console.log(`   Connection: ${testResults.connection ? '✅' : '❌'}`);
  console.log(`   Admin Access: ${testResults.adminConnection ? '✅' : '❌'}`);
  console.log(`   Schema: ${testResults.basicQuery ? '✅' : '❌'}`);
  console.log(`   Authentication: ${testResults.authentication ? '✅' : '❌'}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Supabase is fully operational.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});