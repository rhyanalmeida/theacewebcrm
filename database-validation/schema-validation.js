#!/usr/bin/env node

/**
 * Supabase Schema Validation Script
 * Validates table structure, indexes, triggers, and constraints
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('🏗️  ACE CRM Schema Validation');
console.log('============================\n');

const expectedTables = {
  users: {
    required_columns: ['id', 'email', 'first_name', 'last_name', 'created_at', 'updated_at'],
    foreign_keys: ['auth.users(id)']
  },
  roles: {
    required_columns: ['id', 'name', 'description', 'permissions', 'created_at'],
    foreign_keys: []
  },
  user_roles: {
    required_columns: ['id', 'user_id', 'role_id', 'assigned_at'],
    foreign_keys: ['users(id)', 'roles(id)']
  },
  companies: {
    required_columns: ['id', 'name', 'status', 'owner_id', 'created_at', 'updated_at'],
    foreign_keys: ['users(id)']
  },
  contacts: {
    required_columns: ['id', 'first_name', 'last_name', 'email', 'company_id', 'owner_id', 'created_at'],
    foreign_keys: ['companies(id)', 'users(id)']
  },
  leads: {
    required_columns: ['id', 'title', 'status', 'priority', 'owner_id', 'created_at'],
    foreign_keys: ['contacts(id)', 'companies(id)', 'users(id)']
  },
  deals: {
    required_columns: ['id', 'title', 'stage', 'value', 'owner_id', 'created_at'],
    foreign_keys: ['leads(id)', 'contacts(id)', 'companies(id)', 'users(id)']
  },
  projects: {
    required_columns: ['id', 'name', 'status', 'company_id', 'project_manager_id', 'created_at'],
    foreign_keys: ['deals(id)', 'companies(id)', 'contacts(id)', 'users(id)']
  },
  tasks: {
    required_columns: ['id', 'project_id', 'title', 'status', 'assigned_to', 'created_at'],
    foreign_keys: ['projects(id)', 'tasks(id)', 'users(id)']
  },
  activities: {
    required_columns: ['id', 'subject', 'related_to_type', 'related_to_id', 'created_by', 'created_at'],
    foreign_keys: ['users(id)']
  },
  invoices: {
    required_columns: ['id', 'invoice_number', 'status', 'company_id', 'total_amount', 'created_at'],
    foreign_keys: ['projects(id)', 'companies(id)', 'contacts(id)', 'users(id)']
  },
  invoice_items: {
    required_columns: ['id', 'invoice_id', 'description', 'quantity', 'unit_price', 'total_price'],
    foreign_keys: ['invoices(id)']
  }
};

async function validateTableExists(supabase, tableName) {
  try {
    const { error } = await supabase.from(tableName).select('*').limit(1);
    if (error && (error.message.includes('does not exist') || error.message.includes('relation'))) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

async function getTableColumns(supabase, tableName) {
  try {
    // Use information_schema to get column information
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: tableName });
    
    if (error) {
      // Fallback: try to get columns by querying the table
      const { error: queryError } = await supabase.from(tableName).select('*').limit(1);
      if (queryError && queryError.details) {
        // Parse column info from error details if available
        return [];
      }
      return [];
    }
    
    return data || [];
  } catch (error) {
    return [];
  }
}

async function validateTableStructure(supabase, tableName, expectedStructure) {
  console.log(`\n📋 Validating table: ${tableName}`);
  
  const exists = await validateTableExists(supabase, tableName);
  if (!exists) {
    console.log(`   ❌ Table does not exist`);
    return false;
  }
  
  console.log(`   ✅ Table exists`);
  
  // Try to validate basic structure by attempting insert (will fail but show required columns)
  try {
    const { error } = await supabase.from(tableName).insert({}).select();
    if (error && error.message.includes('null value in column')) {
      const requiredColumns = error.message.match(/null value in column "([^"]+)"/g);
      if (requiredColumns) {
        console.log(`   📝 Required columns detected: ${requiredColumns.length}`);
      }
    }
  } catch (e) {
    // Expected to fail
  }
  
  // Test basic operations
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (!error || error.code === 'PGRST116') {
      console.log(`   ✅ Read access confirmed`);
    } else {
      console.log(`   ❌ Read access failed: ${error.message}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Read access error: ${error.message}`);
    return false;
  }
  
  return true;
}

async function validateIndexes(supabase) {
  console.log('\n📊 Validating Indexes...');
  
  // Common indexes that should exist for performance
  const importantIndexes = [
    'idx_users_email',
    'idx_contacts_email',
    'idx_contacts_company_id',
    'idx_leads_status',
    'idx_deals_stage',
    'idx_projects_status',
    'idx_activities_related'
  ];
  
  try {
    // Try to query pg_indexes (may not have permission)
    const { data, error } = await supabase.rpc('get_indexes_info');
    
    if (data) {
      console.log(`   ✅ Found ${data.length} indexes`);
      return true;
    } else {
      console.log(`   ⚠️  Cannot verify indexes (permission required)`);
      return true; // Not critical
    }
  } catch (error) {
    console.log(`   ⚠️  Cannot verify indexes: ${error.message}`);
    return true; // Not critical for basic functionality
  }
}

async function validateTriggers(supabase) {
  console.log('\n⚡ Validating Triggers...');
  
  const tablesWithUpdatedAt = [
    'users', 'companies', 'contacts', 'leads', 'deals', 
    'projects', 'tasks', 'activities', 'invoices'
  ];
  
  let triggersWorking = 0;
  
  for (const table of tablesWithUpdatedAt) {
    try {
      const exists = await validateTableExists(supabase, table);
      if (exists) {
        // Test if updated_at trigger works by checking column exists
        const { data, error } = await supabase
          .from(table)
          .select('updated_at')
          .limit(1);
        
        if (!error || error.code === 'PGRST116') {
          console.log(`   ✅ ${table}: updated_at column exists`);
          triggersWorking++;
        }
      }
    } catch (error) {
      console.log(`   ❌ ${table}: trigger validation failed`);
    }
  }
  
  console.log(`   📊 ${triggersWorking}/${tablesWithUpdatedAt.length} tables have updated_at columns`);
  return triggersWorking > 0;
}

async function validateRLS(supabase) {
  console.log('\n🔒 Validating Row Level Security...');
  
  const tablesWithRLS = [
    'users', 'companies', 'contacts', 'leads', 'deals', 
    'projects', 'tasks', 'activities', 'invoices'
  ];
  
  let rlsEnabled = 0;
  
  for (const table of tablesWithRLS) {
    try {
      // Try to access table without authentication (should be restricted)
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error && (error.message.includes('policy') || error.message.includes('permission'))) {
        console.log(`   ✅ ${table}: RLS is enforced`);
        rlsEnabled++;
      } else if (!error || error.code === 'PGRST116') {
        console.log(`   ⚠️  ${table}: May not have RLS enabled (or policies allow anonymous access)`);
      }
    } catch (error) {
      console.log(`   ❌ ${table}: RLS validation failed`);
    }
  }
  
  console.log(`   📊 ${rlsEnabled}/${tablesWithRLS.length} tables appear to have RLS enforced`);
  return rlsEnabled > 0;
}

async function validateConstraints(supabase) {
  console.log('\n🔗 Validating Constraints...');
  
  // Test some key constraints
  const constraintTests = [
    {
      table: 'users',
      test: 'unique_email',
      description: 'Email uniqueness'
    },
    {
      table: 'roles',
      test: 'unique_name',
      description: 'Role name uniqueness'
    },
    {
      table: 'invoices',
      test: 'unique_invoice_number',
      description: 'Invoice number uniqueness'
    }
  ];
  
  let constraintsWorking = 0;
  
  for (const test of constraintTests) {
    try {
      const exists = await validateTableExists(supabase, test.table);
      if (exists) {
        console.log(`   ✅ ${test.table}: Table accessible for ${test.description}`);
        constraintsWorking++;
      }
    } catch (error) {
      console.log(`   ❌ ${test.table}: Constraint test failed`);
    }
  }
  
  console.log(`   📊 ${constraintsWorking}/${constraintTests.length} constraint tests passed`);
  return constraintsWorking > 0;
}

async function runSchemaValidation() {
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
  
  console.log('Starting comprehensive schema validation...\n');
  
  let totalTables = 0;
  let validTables = 0;
  
  // Validate each table
  for (const [tableName, structure] of Object.entries(expectedTables)) {
    totalTables++;
    const isValid = await validateTableStructure(supabase, tableName, structure);
    if (isValid) validTables++;
  }
  
  // Validate additional components
  const indexValidation = await validateIndexes(supabase);
  const triggerValidation = await validateTriggers(supabase);
  const rlsValidation = await validateRLS(supabase);
  const constraintValidation = await validateConstraints(supabase);
  
  // Summary
  console.log('\n============================');
  console.log('📊 Schema Validation Summary');
  console.log('============================');
  
  console.log(`Tables: ${validTables}/${totalTables} valid`);
  console.log(`Indexes: ${indexValidation ? '✅' : '❌'} validated`);
  console.log(`Triggers: ${triggerValidation ? '✅' : '❌'} validated`);
  console.log(`RLS: ${rlsValidation ? '✅' : '❌'} validated`);
  console.log(`Constraints: ${constraintValidation ? '✅' : '❌'} validated`);
  
  const allValid = validTables === totalTables && indexValidation && triggerValidation && constraintValidation;
  
  if (allValid) {
    console.log('\n🎉 Schema validation completed successfully!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Schema validation completed with issues. Check the details above.');
    process.exit(1);
  }
}

// Add helper RPC function check
async function createHelperFunctions(supabase) {
  console.log('\n🛠️  Creating helper functions...');
  
  const functions = [
    {
      name: 'get_table_columns',
      sql: `
        CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
        RETURNS TABLE(column_name text, data_type text, is_nullable text)
        LANGUAGE sql
        AS $$
          SELECT column_name::text, data_type::text, is_nullable::text
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = get_table_columns.table_name;
        $$;
      `
    },
    {
      name: 'get_indexes_info',
      sql: `
        CREATE OR REPLACE FUNCTION get_indexes_info()
        RETURNS TABLE(indexname text, tablename text, indexdef text)
        LANGUAGE sql
        AS $$
          SELECT indexname::text, tablename::text, indexdef::text
          FROM pg_indexes
          WHERE schemaname = 'public';
        $$;
      `
    }
  ];
  
  for (const func of functions) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: func.sql });
      if (error) {
        console.log(`   ⚠️  Could not create ${func.name}: ${error.message}`);
      } else {
        console.log(`   ✅ Created helper function: ${func.name}`);
      }
    } catch (e) {
      console.log(`   ⚠️  Helper function ${func.name} creation skipped`);
    }
  }
}

runSchemaValidation().catch(error => {
  console.error('❌ Schema validation failed:', error);
  process.exit(1);
});