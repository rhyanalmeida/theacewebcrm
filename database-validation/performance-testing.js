#!/usr/bin/env node

/**
 * Supabase Performance Testing Script
 * Tests database performance, indexes, and query optimization
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('⚡ ACE CRM Database Performance Testing');
console.log('======================================\n');

let performanceResults = {
  connectionLatency: {},
  queryPerformance: {},
  indexEfficiency: {},
  concurrentConnections: {},
  bulkOperations: {},
  memoryUsage: {},
  recommendations: []
};

async function measureConnectionLatency(supabase) {
  console.log('🔗 Measuring Connection Latency...\n');
  
  const tests = [];
  
  for (let i = 0; i < 10; i++) {
    const startTime = Date.now();
    
    try {
      const { error } = await supabase.from('users').select('count').limit(1);
      const latency = Date.now() - startTime;
      
      if (!error || error.code === 'PGRST116') {
        tests.push(latency);
        console.log(`   Test ${i + 1}: ${latency}ms`);
      } else {
        console.log(`   Test ${i + 1}: Error - ${error.message}`);
      }
      
    } catch (error) {
      console.log(`   Test ${i + 1}: Exception - ${error.message}`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (tests.length > 0) {
    const avgLatency = Math.round(tests.reduce((a, b) => a + b, 0) / tests.length);
    const minLatency = Math.min(...tests);
    const maxLatency = Math.max(...tests);
    
    console.log(`\n   📊 Connection Latency Results:`);
    console.log(`   Average: ${avgLatency}ms`);
    console.log(`   Min: ${minLatency}ms`);
    console.log(`   Max: ${maxLatency}ms`);
    
    performanceResults.connectionLatency = {
      average: avgLatency,
      min: minLatency,
      max: maxLatency,
      tests: tests.length,
      samples: tests
    };
    
    if (avgLatency > 500) {
      performanceResults.recommendations.push('High connection latency detected. Consider using connection pooling.');
    }
    
  } else {
    console.log('   ❌ No successful connection tests');
  }
}

async function testBasicQueryPerformance(supabase) {
  console.log('\n📊 Testing Basic Query Performance...\n');
  
  const queries = [
    {
      name: 'Simple COUNT',
      description: 'Count all users',
      query: () => supabase.from('users').select('*', { count: 'exact', head: true })
    },
    {
      name: 'Basic SELECT',
      description: 'Select first 10 users',
      query: () => supabase.from('users').select('id, email, first_name, last_name').limit(10)
    },
    {
      name: 'Filtered SELECT',
      description: 'Select active users',
      query: () => supabase.from('users').select('id, email').eq('status', 'active').limit(10)
    },
    {
      name: 'JOIN Query',
      description: 'Users with companies',
      query: () => supabase.from('users').select(`
        id, email, first_name, last_name,
        companies!inner(name, status)
      `).limit(10)
    },
    {
      name: 'Complex JOIN',
      description: 'Contacts with companies and leads',
      query: () => supabase.from('contacts').select(`
        id, first_name, last_name, email,
        companies(name, industry),
        leads(title, status)
      `).limit(5)
    },
    {
      name: 'Aggregation',
      description: 'Count deals by stage',
      query: () => supabase.rpc('count_deals_by_stage')
    }
  ];
  
  for (const queryTest of queries) {
    console.log(`   🔍 Testing: ${queryTest.name}`);
    console.log(`      Description: ${queryTest.description}`);
    
    const timings = [];
    
    // Run each query multiple times for accurate measurement
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      
      try {
        const { data, error } = await queryTest.query();
        const duration = Date.now() - startTime;
        
        if (error) {
          console.log(`      ❌ Query ${i + 1} failed: ${error.message}`);
        } else {
          timings.push(duration);
          console.log(`      ⏱️  Query ${i + 1}: ${duration}ms (${Array.isArray(data) ? data.length : 'N/A'} rows)`);
        }
        
      } catch (error) {
        console.log(`      ❌ Query ${i + 1} exception: ${error.message}`);
      }
    }
    
    if (timings.length > 0) {
      const avgTiming = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);
      const minTiming = Math.min(...timings);
      const maxTiming = Math.max(...timings);
      
      console.log(`      📈 Average: ${avgTiming}ms, Min: ${minTiming}ms, Max: ${maxTiming}ms`);
      
      performanceResults.queryPerformance[queryTest.name] = {
        average: avgTiming,
        min: minTiming,
        max: maxTiming,
        timings: timings
      };
      
      // Performance recommendations
      if (avgTiming > 1000) {
        performanceResults.recommendations.push(`${queryTest.name} query is slow (${avgTiming}ms). Consider adding indexes or optimizing the query.`);
      }
      
    } else {
      performanceResults.queryPerformance[queryTest.name] = {
        status: 'failed',
        error: 'No successful executions'
      };
    }
    
    console.log('');
  }
}

async function testIndexEfficiency(supabase) {
  console.log('\n🔍 Testing Index Efficiency...\n');
  
  const indexTests = [
    {
      name: 'Email Lookup',
      description: 'Find user by email (should use index)',
      query: () => supabase.from('users').select('id, first_name, last_name').eq('email', 'admin@acecrm.com').single()
    },
    {
      name: 'Contact Company Lookup',
      description: 'Find contacts by company (should use index)',
      query: () => supabase.from('contacts').select('id, first_name, last_name').eq('company_id', '00000000-0000-0000-0000-000000000000')
    },
    {
      name: 'Lead Status Filter',
      description: 'Filter leads by status (should use index)',
      query: () => supabase.from('leads').select('id, title').eq('status', 'new').limit(10)
    },
    {
      name: 'Deal Stage Filter',
      description: 'Filter deals by stage (should use index)',
      query: () => supabase.from('deals').select('id, title').eq('stage', 'discovery').limit(10)
    },
    {
      name: 'Date Range Query',
      description: 'Activities in date range (should use index)',
      query: () => supabase.from('activities').select('id, subject').gte('created_at', '2025-01-01').limit(10)
    }
  ];
  
  for (const indexTest of indexTests) {
    console.log(`   📋 Testing: ${indexTest.name}`);
    console.log(`      Description: ${indexTest.description}`);
    
    const timings = [];
    
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      
      try {
        const { data, error } = await indexTest.query();
        const duration = Date.now() - startTime;
        
        if (error) {
          if (error.code === 'PGRST116') {
            // No rows found, but query worked
            timings.push(duration);
            console.log(`      ⏱️  Test ${i + 1}: ${duration}ms (no rows found, but query executed)`);
          } else {
            console.log(`      ❌ Test ${i + 1} failed: ${error.message}`);
          }
        } else {
          timings.push(duration);
          console.log(`      ⏱️  Test ${i + 1}: ${duration}ms (${Array.isArray(data) ? data.length : data ? 1 : 0} rows)`);
        }
        
      } catch (error) {
        console.log(`      ❌ Test ${i + 1} exception: ${error.message}`);
      }
    }
    
    if (timings.length > 0) {
      const avgTiming = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);
      
      console.log(`      📈 Average query time: ${avgTiming}ms`);
      
      performanceResults.indexEfficiency[indexTest.name] = {
        average: avgTiming,
        timings: timings
      };
      
      // Efficiency recommendations
      if (avgTiming > 100) {
        performanceResults.recommendations.push(`${indexTest.name} may be missing an index (${avgTiming}ms). Consider adding appropriate indexes.`);
      }
      
    }
    
    console.log('');
  }
}

async function testConcurrentConnections(supabase) {
  console.log('\n🔄 Testing Concurrent Connection Performance...\n');
  
  const concurrentTests = [5, 10, 20];
  
  for (const concurrentCount of concurrentTests) {
    console.log(`   🔀 Testing ${concurrentCount} concurrent queries...`);
    
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < concurrentCount; i++) {
      const promise = supabase
        .from('users')
        .select('id, email')
        .limit(5)
        .then(result => ({
          success: !result.error,
          duration: Date.now() - startTime,
          error: result.error?.message
        }))
        .catch(error => ({
          success: false,
          duration: Date.now() - startTime,
          error: error.message
        }));
        
      promises.push(promise);
    }
    
    try {
      const results = await Promise.all(promises);
      const totalDuration = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      
      console.log(`      📊 Results: ${successCount}/${concurrentCount} successful`);
      console.log(`      ⏱️  Total time: ${totalDuration}ms`);
      console.log(`      📈 Average per query: ${Math.round(totalDuration / concurrentCount)}ms`);
      
      performanceResults.concurrentConnections[`${concurrentCount}_concurrent`] = {
        totalQueries: concurrentCount,
        successful: successCount,
        totalDuration: totalDuration,
        averagePerQuery: Math.round(totalDuration / concurrentCount),
        successRate: Math.round((successCount / concurrentCount) * 100)
      };
      
      if (successCount < concurrentCount) {
        performanceResults.recommendations.push(`${concurrentCount} concurrent queries: ${concurrentCount - successCount} failed. Consider connection limits.`);
      }
      
    } catch (error) {
      console.log(`      ❌ Concurrent test failed: ${error.message}`);
      performanceResults.concurrentConnections[`${concurrentCount}_concurrent`] = {
        error: error.message
      };
    }
    
    console.log('');
  }
}

async function testBulkOperations(supabase) {
  console.log('\n📦 Testing Bulk Operations Performance...\n');
  
  // Test bulk insert performance
  console.log('   📝 Testing bulk insert performance...');
  
  const bulkSizes = [10, 50, 100];
  
  for (const bulkSize of bulkSizes) {
    console.log(`      📊 Testing bulk insert of ${bulkSize} records...`);
    
    // Generate test data
    const testData = [];
    for (let i = 0; i < bulkSize; i++) {
      testData.push({
        name: `Bulk Test Company ${i}_${Date.now()}`,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert(testData)
        .select('id');
      
      const duration = Date.now() - startTime;
      
      if (error) {
        console.log(`         ❌ Bulk insert failed: ${error.message}`);
      } else {
        console.log(`         ✅ Bulk insert successful: ${duration}ms (${data.length} records)`);
        console.log(`         📈 Rate: ${Math.round(data.length / (duration / 1000))} records/second`);
        
        performanceResults.bulkOperations[`insert_${bulkSize}`] = {
          records: data.length,
          duration: duration,
          rate: Math.round(data.length / (duration / 1000))
        };
        
        // Clean up test data
        if (data && data.length > 0) {
          const ids = data.map(record => record.id);
          await supabase.from('companies').delete().in('id', ids);
        }
      }
      
    } catch (error) {
      console.log(`         ❌ Bulk insert exception: ${error.message}`);
    }
  }
  
  // Test bulk update performance
  console.log('\n   ✏️  Testing bulk update performance...');
  
  // Create test records first
  const testRecords = [];
  for (let i = 0; i < 20; i++) {
    testRecords.push({
      name: `Update Test Company ${i}_${Date.now()}`,
      status: 'active',
      description: 'Original description'
    });
  }
  
  try {
    const { data: insertedData, error: insertError } = await supabase
      .from('companies')
      .insert(testRecords)
      .select('id');
    
    if (insertError) {
      console.log('      ❌ Could not create test records for bulk update test');
    } else {
      const startTime = Date.now();
      
      // Perform bulk update
      const { error: updateError } = await supabase
        .from('companies')
        .update({ 
          description: 'Updated by performance test',
          updated_at: new Date().toISOString()
        })
        .in('id', insertedData.map(r => r.id));
      
      const duration = Date.now() - startTime;
      
      if (updateError) {
        console.log(`      ❌ Bulk update failed: ${updateError.message}`);
      } else {
        console.log(`      ✅ Bulk update successful: ${duration}ms (${insertedData.length} records)`);
        console.log(`      📈 Rate: ${Math.round(insertedData.length / (duration / 1000))} records/second`);
        
        performanceResults.bulkOperations[`update_${insertedData.length}`] = {
          records: insertedData.length,
          duration: duration,
          rate: Math.round(insertedData.length / (duration / 1000))
        };
      }
      
      // Clean up test data
      await supabase.from('companies').delete().in('id', insertedData.map(r => r.id));
    }
    
  } catch (error) {
    console.log(`      ❌ Bulk update test exception: ${error.message}`);
  }
}

async function generatePerformanceReport() {
  console.log('\n======================================');
  console.log('📊 Database Performance Report');
  console.log('======================================\n');
  
  // Connection Performance
  if (performanceResults.connectionLatency.average) {
    console.log('🔗 Connection Performance:');
    console.log(`   Average Latency: ${performanceResults.connectionLatency.average}ms`);
    console.log(`   Min Latency: ${performanceResults.connectionLatency.min}ms`);
    console.log(`   Max Latency: ${performanceResults.connectionLatency.max}ms`);
    
    if (performanceResults.connectionLatency.average < 100) {
      console.log('   ✅ Excellent connection performance');
    } else if (performanceResults.connectionLatency.average < 300) {
      console.log('   ⚠️  Good connection performance');
    } else {
      console.log('   ❌ Poor connection performance - investigate network issues');
    }
    console.log('');
  }
  
  // Query Performance
  console.log('📊 Query Performance:');
  Object.entries(performanceResults.queryPerformance).forEach(([queryName, results]) => {
    if (results.average) {
      let status = '✅';
      if (results.average > 1000) status = '❌';
      else if (results.average > 500) status = '⚠️ ';
      
      console.log(`   ${queryName}: ${status} ${results.average}ms avg`);
    } else {
      console.log(`   ${queryName}: ❌ Failed`);
    }
  });
  console.log('');
  
  // Index Efficiency
  console.log('🔍 Index Efficiency:');
  Object.entries(performanceResults.indexEfficiency).forEach(([testName, results]) => {
    if (results.average) {
      let status = '✅';
      if (results.average > 100) status = '❌';
      else if (results.average > 50) status = '⚠️ ';
      
      console.log(`   ${testName}: ${status} ${results.average}ms avg`);
    }
  });
  console.log('');
  
  // Concurrent Performance
  console.log('🔄 Concurrent Performance:');
  Object.entries(performanceResults.concurrentConnections).forEach(([testName, results]) => {
    if (results.successRate !== undefined) {
      let status = '✅';
      if (results.successRate < 80) status = '❌';
      else if (results.successRate < 95) status = '⚠️ ';
      
      console.log(`   ${testName}: ${status} ${results.successRate}% success rate (${results.averagePerQuery}ms avg)`);
    }
  });
  console.log('');
  
  // Bulk Operations
  console.log('📦 Bulk Operations:');
  Object.entries(performanceResults.bulkOperations).forEach(([operation, results]) => {
    if (results.rate) {
      console.log(`   ${operation}: ${results.rate} records/second (${results.duration}ms for ${results.records} records)`);
    }
  });
  console.log('');
  
  // Recommendations
  if (performanceResults.recommendations.length > 0) {
    console.log('💡 Performance Recommendations:');
    performanceResults.recommendations.forEach((recommendation, index) => {
      console.log(`   ${index + 1}. ${recommendation}`);
    });
    console.log('');
  }
  
  // Overall Performance Score
  let performanceScore = 100;
  
  if (performanceResults.connectionLatency.average > 300) performanceScore -= 20;
  else if (performanceResults.connectionLatency.average > 100) performanceScore -= 10;
  
  const slowQueries = Object.values(performanceResults.queryPerformance)
    .filter(q => q.average && q.average > 500).length;
  performanceScore -= slowQueries * 15;
  
  const slowIndexes = Object.values(performanceResults.indexEfficiency)
    .filter(i => i.average && i.average > 100).length;
  performanceScore -= slowIndexes * 10;
  
  const concurrentIssues = Object.values(performanceResults.concurrentConnections)
    .filter(c => c.successRate && c.successRate < 95).length;
  performanceScore -= concurrentIssues * 15;
  
  performanceScore = Math.max(0, performanceScore);
  
  console.log('🏆 Overall Performance Score:');
  if (performanceScore >= 90) {
    console.log(`   ${performanceScore}/100 - ✅ Excellent`);
  } else if (performanceScore >= 70) {
    console.log(`   ${performanceScore}/100 - ⚠️  Good`);
  } else if (performanceScore >= 50) {
    console.log(`   ${performanceScore}/100 - ❌ Needs Improvement`);
  } else {
    console.log(`   ${performanceScore}/100 - 🚨 Poor - Immediate Action Required`);
  }
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Review and implement performance recommendations');
  console.log('   2. Monitor query performance in production');
  console.log('   3. Set up automated performance testing');
  console.log('   4. Consider connection pooling for high-concurrency scenarios');
  console.log('   5. Implement query result caching where appropriate');
}

async function runPerformanceTests() {
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
  
  console.log('Starting comprehensive performance testing...\n');
  
  try {
    // Run all performance tests
    await measureConnectionLatency(supabase);
    await testBasicQueryPerformance(supabase);
    await testIndexEfficiency(supabase);
    await testConcurrentConnections(supabase);
    await testBulkOperations(supabase);
    
    // Generate comprehensive report
    await generatePerformanceReport();
    
    console.log('\n🏁 Performance testing completed!');
    
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    process.exit(1);
  }
}

runPerformanceTests();