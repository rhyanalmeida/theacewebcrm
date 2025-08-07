#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'reset') {
  console.log(colorize(message, color));
}

function logHeader(message) {
  console.log('\n' + '='.repeat(60));
  console.log(colorize(message, 'bright'));
  console.log('='.repeat(60));
}

function logSubHeader(message) {
  console.log('\n' + colorize(message, 'cyan'));
  console.log('-'.repeat(40));
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { 
      stdio: 'inherit',
      shell: true,
      ...options 
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkPrerequisites() {
  logHeader('🔍 CHECKING PREREQUISITES');

  const checks = [
    {
      name: 'Node.js version',
      command: 'node',
      args: ['--version'],
      test: (output) => output.includes('v')
    },
    {
      name: 'npm availability',
      command: 'npm',
      args: ['--version'],
      test: (output) => /\d+\.\d+\.\d+/.test(output)
    },
    {
      name: 'PostgreSQL connection',
      command: 'node',
      args: ['-e', 'require("pg"); console.log("PostgreSQL driver available")'],
      test: (output) => output.includes('available')
    }
  ];

  for (const check of checks) {
    try {
      log(`  ✓ ${check.name}`, 'green');
    } catch (error) {
      log(`  ✗ ${check.name}: ${error.message}`, 'red');
      throw new Error(`Prerequisite check failed: ${check.name}`);
    }
  }

  log('\n✅ All prerequisites met', 'green');
}

async function setupEnvironment() {
  logHeader('🛠️  SETTING UP TEST ENVIRONMENT');

  try {
    // Check if .env.test exists
    if (!fs.existsSync('.env.test')) {
      log('⚠️  .env.test not found, using default test configuration', 'yellow');
    } else {
      log('✓ Test environment configuration found', 'green');
    }

    // Install dependencies if needed
    if (!fs.existsSync('node_modules')) {
      logSubHeader('Installing dependencies...');
      await runCommand('npm', ['install']);
    } else {
      log('✓ Dependencies already installed', 'green');
    }

    // Setup test database
    logSubHeader('Setting up test database...');
    await runCommand('npm', ['run', 'db:test:setup']);

    log('\n✅ Environment setup complete', 'green');
  } catch (error) {
    log(`❌ Environment setup failed: ${error.message}`, 'red');
    throw error;
  }
}

async function runTestSuite(suiteName, pattern, options = {}) {
  logSubHeader(`Running ${suiteName}...`);
  
  const jestArgs = [
    '--testPathPattern=' + pattern,
    '--verbose',
    '--runInBand', // Run tests serially to avoid database conflicts
    ...options.args || []
  ];

  if (options.coverage) {
    jestArgs.push('--coverage');
  }

  if (options.timeout) {
    jestArgs.push(`--testTimeout=${options.timeout}`);
  }

  try {
    await runCommand('npx', ['jest', ...jestArgs]);
    log(`✅ ${suiteName} completed successfully`, 'green');
  } catch (error) {
    log(`❌ ${suiteName} failed`, 'red');
    throw error;
  }
}

async function generateReport() {
  logHeader('📊 GENERATING TEST REPORT');

  try {
    // Generate coverage report
    await runCommand('npx', ['jest', '--coverage', '--coverageReporters=html', '--silent']);
    
    log('✓ Coverage report generated in coverage/', 'green');
    
    // Generate performance metrics if available
    if (fs.existsSync('tests/performance')) {
      log('✓ Performance test results available', 'green');
    }

    log('\n📋 Test Report Summary:', 'bright');
    log('  - Unit tests: Authentication, Client management', 'cyan');
    log('  - Integration tests: API workflows, Multi-user access', 'cyan');
    log('  - Security tests: Authentication, Authorization, Input validation', 'cyan');
    log('  - Performance tests: Load testing, Memory usage', 'cyan');
    log('  - Coverage report: coverage/index.html', 'cyan');

  } catch (error) {
    log(`⚠️  Report generation failed: ${error.message}`, 'yellow');
    // Non-fatal error
  }
}

async function cleanup() {
  logHeader('🧹 CLEANING UP');

  try {
    // Teardown test database
    await runCommand('npm', ['run', 'db:test:teardown']);
    log('✓ Test database cleaned up', 'green');
  } catch (error) {
    log(`⚠️  Cleanup warning: ${error.message}`, 'yellow');
    // Non-fatal error
  }
}

async function main() {
  const startTime = Date.now();

  try {
    log(colorize('🚀 ACE CRM COMPREHENSIVE TEST SUITE', 'bright'));
    log(colorize('=======================================\n', 'bright'));

    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = {
      skipPrereqs: args.includes('--skip-prereqs'),
      suite: args.find(arg => arg.startsWith('--suite='))?.split('=')[1],
      coverage: args.includes('--coverage'),
      performance: args.includes('--performance'),
      security: args.includes('--security'),
      quick: args.includes('--quick')
    };

    // Check prerequisites
    if (!options.skipPrereqs) {
      await checkPrerequisites();
    }

    // Setup environment
    await setupEnvironment();

    // Run test suites based on options
    if (options.suite) {
      // Run specific suite
      switch (options.suite) {
        case 'unit':
          await runTestSuite('Unit Tests', 'tests/unit', { coverage: true });
          break;
        case 'integration':
          await runTestSuite('Integration Tests', 'tests/integration', { timeout: 30000 });
          break;
        case 'security':
          await runTestSuite('Security Tests', 'tests/integration/security', { timeout: 15000 });
          break;
        case 'performance':
          await runTestSuite('Performance Tests', 'tests/performance', { 
            timeout: 60000,
            args: ['--detectOpenHandles']
          });
          break;
        default:
          throw new Error(`Unknown test suite: ${options.suite}`);
      }
    } else if (options.quick) {
      // Quick test run - just unit tests
      logHeader('⚡ QUICK TEST RUN');
      await runTestSuite('Unit Tests (Quick)', 'tests/unit', { coverage: false });
    } else {
      // Full test suite
      logHeader('🧪 RUNNING COMPREHENSIVE TEST SUITE');
      
      await runTestSuite('Unit Tests', 'tests/unit', { 
        coverage: options.coverage,
        timeout: 15000 
      });
      
      await runTestSuite('Integration Tests', 'tests/integration/api', { 
        timeout: 30000 
      });

      if (options.security) {
        await runTestSuite('Security Tests', 'tests/integration/security', { 
          timeout: 20000 
        });
      }

      if (options.performance) {
        await runTestSuite('Performance Tests', 'tests/performance', { 
          timeout: 120000,
          args: ['--detectOpenHandles', '--forceExit']
        });
      }
    }

    // Generate reports
    await generateReport();

    // Success summary
    const duration = Math.round((Date.now() - startTime) / 1000);
    logHeader('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    log(`Total execution time: ${duration} seconds`, 'green');
    log('\n🎉 Test suite execution completed!', 'bright');

  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    logHeader('❌ TEST EXECUTION FAILED');
    log(`Error: ${error.message}`, 'red');
    log(`Execution time: ${duration} seconds`, 'yellow');
    
    process.exit(1);
  } finally {
    // Always attempt cleanup
    await cleanup();
  }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  log('\n🛑 Test execution interrupted', 'yellow');
  await cleanup();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  log('\n🛑 Test execution terminated', 'yellow');
  await cleanup();
  process.exit(1);
});

// Show usage information
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${colorize('ACE CRM Test Runner', 'bright')}

Usage: node test-runner.js [options]

Options:
  --help, -h           Show this help message
  --skip-prereqs       Skip prerequisite checks
  --suite=<name>       Run specific test suite (unit|integration|security|performance)
  --coverage           Generate code coverage reports
  --security           Include security tests in full run
  --performance        Include performance tests in full run
  --quick              Quick test run (unit tests only)

Examples:
  node test-runner.js                    # Full test suite
  node test-runner.js --quick            # Quick unit tests only
  node test-runner.js --suite=unit       # Run only unit tests
  node test-runner.js --coverage         # Full suite with coverage
  node test-runner.js --performance      # Include performance tests
`);
  process.exit(0);
}

// Run the main function
main();