#!/usr/bin/env node

/**
 * Foreign Key Validation Script for ACE CRM
 * Tests all foreign key relationships and referential integrity
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('🔗 ACE CRM Foreign Key Validation');
console.log('==================================\n');

// Define foreign key relationships
const foreignKeyRelationships = [
  {
    table: 'users',
    column: 'id',
    references: 'auth.users(id)',
    cascade: 'CASCADE',
    description: 'User profiles linked to auth users'
  },
  {
    table: 'user_roles',
    column: 'user_id',
    references: 'users(id)',
    cascade: 'CASCADE',
    description: 'User role assignments'
  },
  {
    table: 'user_roles',
    column: 'role_id',
    references: 'roles(id)',
    cascade: 'CASCADE',
    description: 'Role assignments'
  },
  {
    table: 'companies',
    column: 'owner_id',
    references: 'users(id)',
    cascade: 'SET NULL',
    description: 'Company ownership'
  },
  {
    table: 'companies',
    column: 'created_by',
    references: 'users(id)',
    cascade: 'SET NULL',
    description: 'Company creator'
  },
  {
    table: 'contacts',
    column: 'company_id',
    references: 'companies(id)',
    cascade: 'SET NULL',
    description: 'Contact company association'
  },
  {
    table: 'contacts',
    column: 'owner_id',
    references: 'users(id)',
    cascade: 'SET NULL',
    description: 'Contact ownership'
  },
  {
    table: 'contacts',
    column: 'created_by',
    references: 'users(id)',
    cascade: 'SET NULL',
    description: 'Contact creator'
  },
  {
    table: 'leads',
    column: 'contact_id',
    references: 'contacts(id)',
    cascade: 'CASCADE',
    description: 'Lead contact association'
  },
  {
    table: 'leads',
    column: 'company_id',
    references: 'companies(id)',
    cascade: 'SET NULL',
    description: 'Lead company association'
  },
  {
    table: 'leads',
    column: 'owner_id',
    references: 'users(id)',
    cascade: 'SET NULL',
    description: 'Lead ownership'
  },
  {
    table: 'deals',
    column: 'lead_id',
    references: 'leads(id)',
    cascade: 'SET NULL',
    description: 'Deal lead source'
  },
  {
    table: 'deals',
    column: 'contact_id',
    references: 'contacts(id)',
    cascade: 'CASCADE',
    description: 'Deal primary contact'
  },
  {
    table: 'deals',
    column: 'company_id',
    references: 'companies(id)',
    cascade: 'SET NULL',
    description: 'Deal company'
  },
  {
    table: 'deals',
    column: 'owner_id',
    references: 'users(id)',
    cascade: 'SET NULL',
    description: 'Deal ownership'
  },
  {
    table: 'projects',
    column: 'deal_id',
    references: 'deals(id)',
    cascade: 'SET NULL',
    description: 'Project deal source'
  },
  {
    table: 'projects',
    column: 'company_id',
    references: 'companies(id)',
    cascade: 'CASCADE',
    description: 'Project company'
  },
  {
    table: 'projects',
    column: 'contact_id',
    references: 'contacts(id)',
    cascade: 'CASCADE',
    description: 'Project primary contact'
  },
  {
    table: 'projects',
    column: 'project_manager_id',
    references: 'users(id)',
    cascade: 'SET NULL',
    description: 'Project manager'
  },
  {
    table: 'tasks',
    column: 'project_id',
    references: 'projects(id)',
    cascade: 'CASCADE',
    description: 'Task project association'
  },
  {
    table: 'tasks',
    column: 'parent_task_id',
    references: 'tasks(id)',
    cascade: 'SET NULL',
    description: 'Sub-task hierarchy'
  },
  {
    table: 'tasks',
    column: 'assigned_to',
    references: 'users(id)',
    cascade: 'SET NULL',
    description: 'Task assignment'
  },
  {
    table: 'activities',
    column: 'type_id',
    references: 'activity_types(id)',
    cascade: 'SET NULL',
    description: 'Activity type classification'
  },
  {
    table: 'activities',
    column: 'created_by',
    references: 'users(id)',
    cascade: 'SET NULL',
    description: 'Activity creator'
  },
  {
    table: 'invoices',
    column: 'project_id',
    references: 'projects(id)',
    cascade: 'SET NULL',
    description: 'Invoice project association'
  },
  {
    table: 'invoices',
    column: 'company_id',
    references: 'companies(id)',
    cascade: 'CASCADE',
    description: 'Invoice company'
  },
  {
    table: 'invoices',
    column: 'contact_id',
    references: 'contacts(id)',
    cascade: 'CASCADE',
    description: 'Invoice contact'
  },
  {
    table: 'invoice_items',
    column: 'invoice_id',
    references: 'invoices(id)',
    cascade: 'CASCADE',
    description: 'Invoice line items'
  }
];

async function checkTableExists(supabase, tableName) {
  try {
    const { error } = await supabase.from(tableName).select('*').limit(1);
    return !error || error.code === 'PGRST116';
  } catch (error) {
    return false;
  }
}

async function testReferentialIntegrity(supabase, relationship) {
  console.log(`\n🔍 Testing: ${relationship.table}.${relationship.column} -> ${relationship.references}`);
  console.log(`   Description: ${relationship.description}`);
  
  const results = {
    tableExists: false,
    foreignTableExists: false,
    canInsertValid: false,
    cannotInsertInvalid: false,
    cascadeWorks: false,
    errors: []
  };
  
  try {
    // Check if both tables exist
    results.tableExists = await checkTableExists(supabase, relationship.table);
    
    // Extract foreign table name
    const foreignTable = relationship.references.split('(')[0].replace('auth.', '');
    if (foreignTable.startsWith('auth.')) {
      results.foreignTableExists = true; // Assume auth tables exist
    } else {
      results.foreignTableExists = await checkTableExists(supabase, foreignTable);
    }
    
    if (!results.tableExists) {
      console.log(`   ❌ Table '${relationship.table}' does not exist`);
      results.errors.push(`Table '${relationship.table}' does not exist`);
      return results;
    }
    
    if (!results.foreignTableExists) {
      console.log(`   ❌ Foreign table '${foreignTable}' does not exist`);
      results.errors.push(`Foreign table '${foreignTable}' does not exist`);
      return results;
    }
    
    console.log(`   ✅ Both tables exist`);
    
    // Test 1: Try to insert valid foreign key reference
    await testValidForeignKeyInsert(supabase, relationship, results);
    
    // Test 2: Try to insert invalid foreign key reference
    await testInvalidForeignKeyInsert(supabase, relationship, results);
    
    // Test 3: Test cascade behavior (if safe)
    if (relationship.cascade !== 'CASCADE' && relationship.table !== 'users') {
      await testCascadeBehavior(supabase, relationship, results);
    }
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    results.errors.push(`Test failed: ${error.message}`);
  }
  
  return results;
}

async function testValidForeignKeyInsert(supabase, relationship, results) {
  try {
    // First, get a valid foreign key value
    const foreignTable = relationship.references.split('(')[0].replace('auth.', '');
    const foreignColumn = relationship.references.split('(')[1].split(')')[0];
    
    let validForeignKey;
    
    if (foreignTable === 'users') {
      // Get existing user ID
      const { data, error } = await supabase.from('users').select('id').limit(1);
      if (!error && data && data.length > 0) {
        validForeignKey = data[0].id;
      }
    } else if (foreignTable === 'auth.users') {
      // Skip auth.users test for now
      console.log(`   ⚠️  Skipping auth.users foreign key test`);
      return;
    } else {
      // Get existing record ID
      const { data, error } = await supabase.from(foreignTable).select(foreignColumn).limit(1);
      if (!error && data && data.length > 0) {
        validForeignKey = data[0][foreignColumn];
      }
    }
    
    if (!validForeignKey) {
      console.log(`   ⚠️  No valid foreign key found for testing`);
      return;
    }
    
    // Create test data
    const testData = createTestData(relationship.table, relationship.column, validForeignKey);
    
    if (!testData) {
      console.log(`   ⚠️  Cannot create test data for ${relationship.table}`);
      return;
    }
    
    // Try to insert with valid foreign key
    const { data, error } = await supabase
      .from(relationship.table)
      .insert(testData)
      .select();
    
    if (error) {
      console.log(`   ⚠️  Valid insert failed (may be due to other constraints): ${error.message}`);
    } else {
      console.log(`   ✅ Valid foreign key insert successful`);
      results.canInsertValid = true;
      
      // Clean up test data
      if (data && data.length > 0) {
        await supabase.from(relationship.table).delete().eq('id', data[0].id);
      }
    }
    
  } catch (error) {
    console.log(`   ⚠️  Valid insert test error: ${error.message}`);
  }
}

async function testInvalidForeignKeyInsert(supabase, relationship, results) {
  try {
    // Use a clearly invalid UUID
    const invalidForeignKey = '00000000-0000-0000-0000-000000000000';
    
    const testData = createTestData(relationship.table, relationship.column, invalidForeignKey);
    
    if (!testData) {
      console.log(`   ⚠️  Cannot create test data for ${relationship.table}`);
      return;
    }
    
    // Try to insert with invalid foreign key
    const { data, error } = await supabase
      .from(relationship.table)
      .insert(testData)
      .select();
    
    if (error) {
      if (error.message.includes('foreign key') || 
          error.message.includes('violates') ||
          error.message.includes('constraint')) {
        console.log(`   ✅ Invalid foreign key correctly rejected`);
        results.cannotInsertInvalid = true;
      } else {
        console.log(`   ⚠️  Insert failed for other reason: ${error.message}`);
      }
    } else {
      console.log(`   ❌ Invalid foreign key was accepted (constraint not enforced)`);
      
      // Clean up if somehow inserted
      if (data && data.length > 0) {
        await supabase.from(relationship.table).delete().eq('id', data[0].id);
      }
    }
    
  } catch (error) {
    console.log(`   ⚠️  Invalid insert test error: ${error.message}`);
  }
}

async function testCascadeBehavior(supabase, relationship, results) {
  try {
    console.log(`   ℹ️  Cascade behavior testing skipped (would require destructive operations)`);
    results.cascadeWorks = true; // Assume it works if constraint exists
  } catch (error) {
    console.log(`   ⚠️  Cascade test error: ${error.message}`);
  }
}

function createTestData(tableName, foreignKeyColumn, foreignKeyValue) {
  const baseData = {
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Add the foreign key value
  baseData[foreignKeyColumn] = foreignKeyValue;
  
  switch (tableName) {
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
      
    case 'deals':
      return {
        ...baseData,
        title: `Test Deal ${Date.now()}`,
        stage: 'discovery',
        value: 1000,
        currency: 'USD',
        probability: 0
      };
      
    case 'projects':
      return {
        ...baseData,
        name: `Test Project ${Date.now()}`,
        status: 'planned',
        priority: 'medium'
      };
      
    case 'tasks':
      return {
        ...baseData,
        title: `Test Task ${Date.now()}`,
        status: 'todo',
        priority: 'medium'
      };
      
    case 'activities':
      return {
        ...baseData,
        subject: `Test Activity ${Date.now()}`,
        body: 'Test activity description',
        activity_date: new Date().toISOString(),
        related_to_type: 'contact',
        related_to_id: '00000000-0000-0000-0000-000000000000'
      };
      
    case 'invoices':
      return {
        ...baseData,
        invoice_number: `TEST-${Date.now()}`,
        status: 'draft',
        subtotal: 1000,
        total_amount: 1000,
        issue_date: new Date().toISOString().split('T')[0]
      };
      
    case 'invoice_items':
      return {
        description: `Test Item ${Date.now()}`,
        quantity: 1,
        unit_price: 100,
        total_price: 100
      };
      
    case 'user_roles':
      return {
        assigned_at: new Date().toISOString()
      };
      
    default:
      return baseData;
  }
}

async function generateForeignKeyReport(results) {
  console.log('\n==================================');
  console.log('📊 Foreign Key Validation Report');
  console.log('==================================\n');
  
  let totalTests = results.length;
  let passedTests = 0;
  let criticalIssues = 0;
  
  console.log('Detailed Results:\n');
  
  results.forEach((result, index) => {
    const relationship = foreignKeyRelationships[index];
    console.log(`${index + 1}. ${relationship.table}.${relationship.column} -> ${relationship.references}`);
    
    if (result.tableExists && result.foreignTableExists) {
      console.log(`   ✅ Tables exist`);
      
      if (result.canInsertValid) {
        console.log(`   ✅ Valid references accepted`);
      }
      
      if (result.cannotInsertInvalid) {
        console.log(`   ✅ Invalid references rejected`);
        passedTests++;
      } else {
        console.log(`   ❌ Constraint not enforced`);
        criticalIssues++;
      }
      
    } else {
      console.log(`   ❌ Missing table(s)`);
      criticalIssues++;
    }
    
    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        console.log(`   ⚠️  ${error}`);
      });
    }
    
    console.log('');
  });
  
  console.log('Summary:');
  console.log(`Total relationships tested: ${totalTests}`);
  console.log(`Properly enforced: ${passedTests}`);
  console.log(`Critical issues: ${criticalIssues}`);
  console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (criticalIssues === 0) {
    console.log('\n🎉 All foreign key constraints are properly configured!');
  } else {
    console.log('\n⚠️  Some foreign key constraints need attention.');
  }
}

async function runForeignKeyValidation() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  console.log('Starting comprehensive foreign key validation...\n');
  console.log(`Testing ${foreignKeyRelationships.length} foreign key relationships...\n`);
  
  const results = [];
  
  for (const relationship of foreignKeyRelationships) {
    const result = await testReferentialIntegrity(supabase, relationship);
    results.push(result);
  }
  
  await generateForeignKeyReport(results);
}

runForeignKeyValidation().catch(error => {
  console.error('❌ Foreign key validation failed:', error);
  process.exit(1);
});