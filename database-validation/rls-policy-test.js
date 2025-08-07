#!/usr/bin/env node

/**
 * Supabase Row Level Security (RLS) Policy Testing Script
 * Tests RLS policies for all tables with different user roles
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('🔒 ACE CRM Row Level Security Testing');
console.log('====================================\n');

// Test user credentials (these would be created during testing)
const testUsers = {
  admin: {
    email: 'admin@test.acecrm.com',
    password: 'TestAdmin123!',
    role: 'admin'
  },
  manager: {
    email: 'manager@test.acecrm.com',
    password: 'TestManager123!',
    role: 'manager'
  },
  user: {
    email: 'user@test.acecrm.com',
    password: 'TestUser123!',
    role: 'user'
  }
};

const tables = [
  'users', 'companies', 'contacts', 'leads', 'deals',
  'projects', 'tasks', 'activities', 'invoices'
];

let testResults = {
  anonymous: {},
  authenticated: {},
  admin: {},
  manager: {},
  user: {}
};

async function testAnonymousAccess() {
  console.log('1. Testing Anonymous Access...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        if (error.message.includes('permission denied') || 
            error.message.includes('policy') ||
            error.message.includes('not allowed')) {
          console.log(`   ✅ ${table}: Properly restricted (${error.code})`);
          testResults.anonymous[table] = 'restricted';
        } else if (error.code === 'PGRST116') {
          console.log(`   ⚠️  ${table}: Empty table but accessible`);
          testResults.anonymous[table] = 'accessible_empty';
        } else {
          console.log(`   ❌ ${table}: Unexpected error - ${error.message}`);
          testResults.anonymous[table] = 'error';
        }
      } else {
        console.log(`   ⚠️  ${table}: Accessible to anonymous users`);
        testResults.anonymous[table] = 'accessible';
      }
    } catch (error) {
      console.log(`   ❌ ${table}: Exception - ${error.message}`);
      testResults.anonymous[table] = 'exception';
    }
  }
}

async function createTestUser(userInfo) {
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // Create user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userInfo.email,
      password: userInfo.password,
      email_confirm: true
    });
    
    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`   ℹ️  User ${userInfo.email} already exists`);
        return true;
      } else {
        console.log(`   ❌ Failed to create auth user: ${authError.message}`);
        return false;
      }
    }
    
    // Create user profile if needed
    if (authData.user) {
      try {
        const { error: profileError } = await supabaseAdmin
          .from('users')
          .upsert({
            id: authData.user.id,
            email: userInfo.email,
            first_name: userInfo.role,
            last_name: 'Test',
            status: 'active'
          });
          
        if (profileError && !profileError.message.includes('duplicate')) {
          console.log(`   ⚠️  Profile creation warning: ${profileError.message}`);
        }
      } catch (e) {
        // Profile creation might fail if table doesn't exist yet
      }
      
      // Assign role if possible
      try {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .upsert({
            user_id: authData.user.id,
            role_id: userInfo.role === 'admin' ? '1' : userInfo.role === 'manager' ? '2' : '3'
          });
          
        if (roleError && !roleError.message.includes('duplicate')) {
          console.log(`   ⚠️  Role assignment warning: ${roleError.message}`);
        }
      } catch (e) {
        // Role assignment might fail if tables don't exist yet
      }
    }
    
    console.log(`   ✅ Test user created: ${userInfo.email}`);
    return true;
    
  } catch (error) {
    console.log(`   ❌ Failed to create test user: ${error.message}`);
    return false;
  }
}

async function testAuthenticatedAccess(userInfo, userType) {
  console.log(`\n${userType === 'admin' ? '2' : userType === 'manager' ? '3' : '4'}. Testing ${userType.toUpperCase()} Access...`);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    // Attempt to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: userInfo.email,
      password: userInfo.password
    });
    
    if (authError) {
      console.log(`   ❌ Authentication failed: ${authError.message}`);
      
      // Try to create the user if it doesn't exist
      if (authError.message.includes('Invalid') || authError.message.includes('not found')) {
        console.log(`   🔧 Creating test user...`);
        await createTestUser(userInfo);
        
        // Retry authentication
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email: userInfo.email,
          password: userInfo.password
        });
        
        if (retryError) {
          console.log(`   ❌ Retry authentication failed: ${retryError.message}`);
          return false;
        }
        
        console.log(`   ✅ Authentication successful on retry`);
      } else {
        return false;
      }
    } else {
      console.log(`   ✅ Authentication successful`);
    }
    
    // Test access to each table
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        
        if (error) {
          if (error.code === 'PGRST116') {
            console.log(`   ✅ ${table}: Accessible (empty table)`);
            testResults[userType][table] = 'accessible_empty';
          } else {
            console.log(`   ❌ ${table}: Restricted - ${error.message}`);
            testResults[userType][table] = 'restricted';
          }
        } else {
          console.log(`   ✅ ${table}: Accessible (${data ? data.length : 0} records)`);
          testResults[userType][table] = 'accessible';
        }
      } catch (error) {
        console.log(`   ❌ ${table}: Exception - ${error.message}`);
        testResults[userType][table] = 'exception';
      }
    }
    
    // Test insert operations
    console.log(`   \n   📝 Testing INSERT permissions:`);
    for (const table of ['companies', 'contacts', 'leads']) {
      try {
        const testData = getTestInsertData(table);
        const { error } = await supabase.from(table).insert(testData).select();
        
        if (error) {
          if (error.message.includes('permission') || error.message.includes('policy')) {
            console.log(`   ❌ ${table}: INSERT restricted (expected for ${userType})`);
          } else {
            console.log(`   ⚠️  ${table}: INSERT failed - ${error.message}`);
          }
        } else {
          console.log(`   ✅ ${table}: INSERT allowed`);
        }
      } catch (error) {
        console.log(`   ❌ ${table}: INSERT exception - ${error.message}`);
      }
    }
    
    // Sign out
    await supabase.auth.signOut();
    return true;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    return false;
  }
}

function getTestInsertData(table) {
  const baseData = {
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  switch (table) {
    case 'companies':
      return {
        ...baseData,
        name: `Test Company ${Date.now()}`,
        status: 'active'
      };
    case 'contacts':
      return {
        ...baseData,
        first_name: 'Test',
        last_name: `Contact ${Date.now()}`,
        email: `test.${Date.now()}@example.com`,
        status: 'active'
      };
    case 'leads':
      return {
        ...baseData,
        title: `Test Lead ${Date.now()}`,
        status: 'new',
        priority: 'medium',
        probability: 0
      };
    default:
      return baseData;
  }
}

async function testRLSPolicies() {
  console.log('\n5. Testing RLS Policy Logic...');
  
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    // Check if RLS helper functions exist
    const { data, error } = await supabaseAdmin.rpc('get_user_role', { user_uuid: '00000000-0000-0000-0000-000000000000' });
    
    if (!error) {
      console.log('   ✅ RLS helper functions are working');
    } else {
      console.log('   ⚠️  RLS helper functions may not be installed');
    }
    
    // Test policy functions
    const policyFunctions = ['is_admin', 'is_manager', 'can_access_record'];
    
    for (const func of policyFunctions) {
      try {
        const { data, error } = await supabaseAdmin.rpc(func, { user_uuid: '00000000-0000-0000-0000-000000000000' });
        
        if (!error) {
          console.log(`   ✅ Function ${func}: Working`);
        } else {
          console.log(`   ❌ Function ${func}: ${error.message}`);
        }
      } catch (e) {
        console.log(`   ❌ Function ${func}: Exception - ${e.message}`);
      }
    }
    
  } catch (error) {
    console.log('   ❌ RLS policy testing failed:', error.message);
  }
}

async function generateRLSReport() {
  console.log('\n====================================');
  console.log('📊 RLS Testing Summary Report');
  console.log('====================================\n');
  
  const accessLevels = ['anonymous', 'user', 'manager', 'admin'];
  
  // Create summary table
  const summary = {};
  
  for (const table of tables) {
    summary[table] = {};
    for (const level of accessLevels) {
      const result = testResults[level][table];
      if (result === 'accessible' || result === 'accessible_empty') {
        summary[table][level] = '✅';
      } else if (result === 'restricted') {
        summary[table][level] = '🔒';
      } else if (result === 'error' || result === 'exception') {
        summary[table][level] = '❌';
      } else {
        summary[table][level] = '❓';
      }
    }
  }
  
  // Print summary table
  console.log('Table'.padEnd(15) + 'Anonymous'.padEnd(12) + 'User'.padEnd(8) + 'Manager'.padEnd(10) + 'Admin');
  console.log('─'.repeat(55));
  
  for (const table of tables) {
    const row = table.padEnd(15) +
                (summary[table]['anonymous'] || '❓').padEnd(12) +
                (summary[table]['user'] || '❓').padEnd(8) +
                (summary[table]['manager'] || '❓').padEnd(10) +
                (summary[table]['admin'] || '❓');
    console.log(row);
  }
  
  console.log('\n🔑 Legend:');
  console.log('   ✅ = Accessible');
  console.log('   🔒 = Restricted (RLS working)');
  console.log('   ❌ = Error/Exception');
  console.log('   ❓ = Not tested');
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  
  let hasIssues = false;
  
  for (const table of tables) {
    if (summary[table]['anonymous'] === '✅') {
      console.log(`   ⚠️  ${table}: Consider restricting anonymous access`);
      hasIssues = true;
    }
    if (summary[table]['admin'] === '🔒') {
      console.log(`   ⚠️  ${table}: Admin access should not be restricted`);
      hasIssues = true;
    }
  }
  
  if (!hasIssues) {
    console.log('   🎉 No issues found! RLS policies appear to be working correctly.');
  }
}

async function runRLSTests() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
  }
  
  console.log('Starting comprehensive RLS testing...\n');
  
  // Test anonymous access
  await testAnonymousAccess();
  
  // Test authenticated access for different user types
  for (const [userType, userInfo] of Object.entries(testUsers)) {
    await testAuthenticatedAccess(userInfo, userType);
  }
  
  // Test RLS policy logic
  await testRLSPolicies();
  
  // Generate comprehensive report
  await generateRLSReport();
  
  console.log('\n🏁 RLS testing completed!');
}

runRLSTests().catch(error => {
  console.error('❌ RLS testing failed:', error);
  process.exit(1);
});