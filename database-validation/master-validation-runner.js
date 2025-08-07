#!/usr/bin/env node

/**
 * Master Database Validation Runner
 * Runs all validation scripts and generates comprehensive report
 */

require('dotenv').config();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const VALIDATION_SCRIPTS = [
  {
    name: 'Supabase Connection Test',
    script: 'supabase-connection-test.js',
    description: 'Tests basic database connectivity and authentication',
    critical: true,
    timeout: 60000 // 1 minute
  },
  {
    name: 'Schema Validation',
    script: 'schema-validation.js',
    description: 'Validates table structure, indexes, and constraints',
    critical: true,
    timeout: 120000 // 2 minutes
  },
  {
    name: 'RLS Policy Testing',
    script: 'rls-policy-test.js',
    description: 'Tests Row Level Security policies and access control',
    critical: true,
    timeout: 180000 // 3 minutes
  },
  {
    name: 'Foreign Key Validation',
    script: 'foreign-key-validation.js',
    description: 'Validates referential integrity and foreign key constraints',
    critical: false,
    timeout: 120000 // 2 minutes
  },
  {
    name: 'Sample Data Insertion',
    script: 'sample-data-insertion.js',
    description: 'Inserts test data to validate database functionality',
    critical: false,
    timeout: 180000 // 3 minutes
  },
  {
    name: 'Real-time Subscription Test',
    script: 'realtime-subscription-test.js',
    description: 'Tests real-time subscriptions and WebSocket functionality',
    critical: false,
    timeout: 300000 // 5 minutes
  },
  {
    name: 'Storage Bucket Validation',
    script: 'storage-bucket-validation.js',
    description: 'Tests file upload, download, and storage functionality',
    critical: false,
    timeout: 180000 // 3 minutes
  },
  {
    name: 'Performance Testing',
    script: 'performance-testing.js',
    description: 'Tests database performance and query optimization',
    critical: false,
    timeout: 300000 // 5 minutes
  }
];

console.log('🔍 ACE CRM Master Database Validation');
console.log('====================================\n');

const testResults = [];
let totalTests = 0;
let passedTests = 0;
let criticalFailures = 0;

function runScript(scriptInfo) {
  return new Promise((resolve) => {
    console.log(`\n🚀 Running: ${scriptInfo.name}`);
    console.log(`   Description: ${scriptInfo.description}`);
    console.log(`   Critical: ${scriptInfo.critical ? 'Yes' : 'No'}`);
    console.log('   ────────────────────────────────────────────');
    
    const scriptPath = path.join(__dirname, scriptInfo.script);
    const startTime = Date.now();
    
    if (!fs.existsSync(scriptPath)) {
      console.log(`   ❌ Script file not found: ${scriptPath}`);
      resolve({
        ...scriptInfo,
        status: 'error',
        error: 'Script file not found',
        duration: 0,
        output: ''
      });
      return;
    }
    
    const child = spawn('node', [scriptPath], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(output);
      stdout += output;
    });
    
    child.stderr.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(output);
      stderr += output;
    });
    
    // Set up timeout
    const timeout = setTimeout(() => {
      console.log(`\n   ⏰ Test timed out after ${scriptInfo.timeout / 1000} seconds`);
      child.kill('SIGTERM');
      
      setTimeout(() => {
        child.kill('SIGKILL');
      }, 5000);
    }, scriptInfo.timeout);
    
    child.on('close', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      
      console.log(`\n   ────────────────────────────────────────────`);
      
      let status = 'unknown';
      if (code === 0) {
        console.log(`   ✅ ${scriptInfo.name} completed successfully (${duration}ms)`);
        status = 'passed';
      } else if (code === null) {
        console.log(`   ⏰ ${scriptInfo.name} timed out (${duration}ms)`);
        status = 'timeout';
      } else {
        console.log(`   ❌ ${scriptInfo.name} failed with exit code ${code} (${duration}ms)`);
        status = 'failed';
      }
      
      resolve({
        ...scriptInfo,
        status,
        exitCode: code,
        duration,
        output: stdout,
        error: stderr
      });
    });
    
    child.on('error', (error) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      
      console.log(`\n   ❌ ${scriptInfo.name} encountered an error: ${error.message}`);
      
      resolve({
        ...scriptInfo,
        status: 'error',
        error: error.message,
        duration,
        output: stdout
      });
    });
  });
}

async function runAllValidations() {
  console.log(`Starting comprehensive validation of ${VALIDATION_SCRIPTS.length} components...\n`);
  
  const startTime = Date.now();
  
  // Run each validation script
  for (const script of VALIDATION_SCRIPTS) {
    totalTests++;
    const result = await runScript(script);
    testResults.push(result);
    
    if (result.status === 'passed') {
      passedTests++;
    } else if (result.critical && result.status !== 'passed') {
      criticalFailures++;
    }
    
    // Add delay between tests to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  const totalDuration = Date.now() - startTime;
  
  // Generate comprehensive report
  generateMasterReport(totalDuration);
}

function generateMasterReport(totalDuration) {
  console.log('\n\n████████████████████████████████████████████████████████████████');
  console.log('📊 MASTER VALIDATION REPORT - ACE CRM DATABASE');
  console.log('████████████████████████████████████████████████████████████████\n');
  
  // Executive Summary
  console.log('📋 EXECUTIVE SUMMARY');
  console.log('══════════════════════════════════════════════════════════════\n');
  
  const successRate = Math.round((passedTests / totalTests) * 100);
  console.log(`Total Tests Run: ${totalTests}`);
  console.log(`Tests Passed: ${passedTests} (${successRate}%)`);
  console.log(`Critical Failures: ${criticalFailures}`);
  console.log(`Total Execution Time: ${Math.round(totalDuration / 1000)} seconds`);
  
  let overallStatus = 'UNKNOWN';
  if (criticalFailures === 0 && successRate >= 90) {
    overallStatus = 'EXCELLENT ✅';
  } else if (criticalFailures === 0 && successRate >= 70) {
    overallStatus = 'GOOD ⚠️';
  } else if (criticalFailures === 0) {
    overallStatus = 'NEEDS ATTENTION ❌';
  } else {
    overallStatus = 'CRITICAL ISSUES 🚨';
  }
  
  console.log(`\n🏆 Overall Database Health: ${overallStatus}\n`);
  
  // Detailed Test Results
  console.log('📊 DETAILED TEST RESULTS');
  console.log('══════════════════════════════════════════════════════════════\n');
  
  testResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}`);
    console.log(`   Status: ${getStatusIcon(result.status)} ${result.status.toUpperCase()}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log(`   Critical: ${result.critical ? 'Yes' : 'No'}`);
    
    if (result.status !== 'passed') {
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.exitCode !== undefined && result.exitCode !== 0) {
        console.log(`   Exit Code: ${result.exitCode}`);
      }
    }
    
    console.log('');
  });
  
  // Critical Issues Section
  const criticalIssues = testResults.filter(r => r.critical && r.status !== 'passed');
  
  if (criticalIssues.length > 0) {
    console.log('🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION');
    console.log('══════════════════════════════════════════════════════════════\n');
    
    criticalIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.name}`);
      console.log(`   Issue: ${issue.status.toUpperCase()}`);
      console.log(`   Impact: System may not function correctly`);
      console.log(`   Action: Must be resolved before production deployment`);
      if (issue.error) {
        console.log(`   Details: ${issue.error}`);
      }
      console.log('');
    });
  }
  
  // Recommendations Section
  console.log('💡 RECOMMENDATIONS');
  console.log('══════════════════════════════════════════════════════════════\n');
  
  if (criticalFailures > 0) {
    console.log('🚨 IMMEDIATE ACTIONS REQUIRED:');
    console.log('   1. Resolve all critical test failures before proceeding');
    console.log('   2. Verify database connection and credentials');
    console.log('   3. Ensure all required tables and schemas are created');
    console.log('   4. Check RLS policies are properly configured');
    console.log('');
  }
  
  console.log('📋 GENERAL RECOMMENDATIONS:');
  
  if (passedTests === totalTests) {
    console.log('   ✅ All tests passed! Database is ready for production.');
  } else {
    console.log('   1. Review failed tests and address underlying issues');
    console.log('   2. Re-run specific validation scripts after fixes');
    console.log('   3. Monitor database performance in production');
  }
  
  console.log('   4. Set up automated monitoring for database health');
  console.log('   5. Implement regular backup procedures');
  console.log('   6. Schedule periodic performance testing');
  console.log('   7. Review and update RLS policies as needed');
  console.log('   8. Consider implementing database connection pooling');
  
  // Performance Insights
  const performanceTests = testResults.filter(r => r.name.includes('Performance'));
  if (performanceTests.length > 0) {
    console.log('\n📈 PERFORMANCE INSIGHTS:');
    performanceTests.forEach(test => {
      if (test.status === 'passed') {
        console.log(`   ✅ ${test.name}: Completed in ${test.duration}ms`);
      } else {
        console.log(`   ❌ ${test.name}: Failed or incomplete`);
      }
    });
  }
  
  // Security Assessment
  const securityTests = testResults.filter(r => r.name.includes('RLS') || r.name.includes('Security'));
  if (securityTests.length > 0) {
    console.log('\n🔒 SECURITY ASSESSMENT:');
    const passedSecurity = securityTests.filter(t => t.status === 'passed').length;
    console.log(`   Security Tests: ${passedSecurity}/${securityTests.length} passed`);
    
    if (passedSecurity === securityTests.length) {
      console.log('   ✅ Security configuration appears correct');
    } else {
      console.log('   ⚠️  Security issues detected - review RLS policies');
    }
  }
  
  // Next Steps
  console.log('\n🎯 NEXT STEPS');
  console.log('══════════════════════════════════════════════════════════════\n');
  
  if (criticalFailures === 0 && successRate >= 90) {
    console.log('✅ READY FOR PRODUCTION');
    console.log('   1. Deploy to production environment');
    console.log('   2. Configure monitoring and alerting');
    console.log('   3. Set up automated backups');
    console.log('   4. Implement performance monitoring');
  } else if (criticalFailures === 0) {
    console.log('⚠️  READY FOR STAGING');
    console.log('   1. Address non-critical issues');
    console.log('   2. Re-run validation after fixes');
    console.log('   3. Deploy to staging environment for testing');
  } else {
    console.log('🚨 NOT READY FOR DEPLOYMENT');
    console.log('   1. Fix all critical issues immediately');
    console.log('   2. Re-run master validation');
    console.log('   3. Do not proceed to production until all critical tests pass');
  }
  
  console.log('\n████████████████████████████████████████████████████████████████');
  console.log('End of Master Validation Report');
  console.log('████████████████████████████████████████████████████████████████\n');
  
  // Generate summary file
  generateSummaryFile();
  
  // Exit with appropriate code
  if (criticalFailures > 0) {
    console.log('❌ Exiting with error due to critical failures');
    process.exit(1);
  } else if (passedTests < totalTests) {
    console.log('⚠️  Exiting with warning due to test failures');
    process.exit(2);
  } else {
    console.log('✅ All validations completed successfully!');
    process.exit(0);
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'passed': return '✅';
    case 'failed': return '❌';
    case 'timeout': return '⏰';
    case 'error': return '🚨';
    default: return '❓';
  }
}

function generateSummaryFile() {
  const summaryData = {
    timestamp: new Date().toISOString(),
    database: {
      url: process.env.SUPABASE_URL,
      project: process.env.SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'unknown'
    },
    summary: {
      totalTests,
      passedTests,
      criticalFailures,
      successRate: Math.round((passedTests / totalTests) * 100)
    },
    testResults: testResults.map(result => ({
      name: result.name,
      status: result.status,
      critical: result.critical,
      duration: result.duration,
      error: result.error || null
    })),
    recommendations: [
      criticalFailures > 0 ? 'Fix critical issues before deployment' : 'Critical tests passed',
      passedTests === totalTests ? 'All tests passed' : 'Review and fix failed tests',
      'Implement monitoring and alerting',
      'Set up automated backups',
      'Schedule regular validation runs'
    ]
  };
  
  const summaryPath = path.join(__dirname, 'validation-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
  console.log(`📄 Summary file saved: ${summaryPath}`);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Validation interrupted by user');
  console.log('Generating partial report...\n');
  generateMasterReport(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Validation terminated');
  console.log('Generating partial report...\n');
  generateMasterReport(0);
});

// Run all validations
runAllValidations().catch(error => {
  console.error('\n❌ Master validation runner encountered an error:', error);
  process.exit(1);
});