const request = require('supertest');
const path = require('path');

// Load the main CRM application from the adjacent directory
const app = require(path.join(__dirname, '../../../ace crm/server.js'));
const { db } = require(path.join(__dirname, '../../../ace crm/src/config/database.js'));
const TestHelpers = require('../helpers/testHelpers');
const { generateRandomClient, generateRandomUser } = require('../fixtures/testData');

describe('Performance Benchmarks', () => {
  let testHelpers;

  beforeAll(async () => {
    testHelpers = new TestHelpers(app, db);
  });

  afterEach(async () => {
    await testHelpers.cleanupTestData();
  });

  afterAll(async () => {
    await testHelpers.resetDatabase();
    await db.destroy();
  });

  describe('Authentication Performance', () => {
    test('should handle login requests within acceptable time', async () => {
      const user = await testHelpers.createTestUser({
        email: 'performance@test.com',
        password: 'PerformanceTest123!'
      });

      const iterations = 50;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'performance@test.com',
            password: 'PerformanceTest123!'
          });

        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        testHelpers.expectSuccessResponse(response, 200);
        times.push(duration);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      console.log(`Login Performance Stats (${iterations} iterations):`);
      console.log(`  Average: ${avgTime.toFixed(2)}ms`);
      console.log(`  Min: ${minTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxTime.toFixed(2)}ms`);

      // Performance assertions
      expect(avgTime).toBeLessThan(500); // Average should be under 500ms
      expect(maxTime).toBeLessThan(1000); // Max should be under 1s
    });

    test('should handle concurrent login requests efficiently', async () => {
      const user = await testHelpers.createTestUser({
        email: 'concurrent@test.com',
        password: 'ConcurrentTest123!'
      });

      const concurrentRequests = 20;
      const startTime = process.hrtime.bigint();

      const promises = Array(concurrentRequests).fill().map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'concurrent@test.com',
            password: 'ConcurrentTest123!'
          })
      );

      const responses = await Promise.all(promises);
      const endTime = process.hrtime.bigint();
      const totalTime = Number(endTime - startTime) / 1000000;

      // Verify all requests succeeded
      responses.forEach(response => {
        testHelpers.expectSuccessResponse(response, 200);
      });

      console.log(`Concurrent Login Performance (${concurrentRequests} requests):`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average per request: ${(totalTime / concurrentRequests).toFixed(2)}ms`);

      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(5000); // Under 5 seconds total
    });
  });

  describe('Database Query Performance', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = await testHelpers.createTestUser();
      token = testHelpers.generateAuthToken(testUser.id, testUser.role);
    });

    test('should handle large client datasets efficiently', async () => {
      console.log('Creating 1000 test clients...');
      
      // Create large dataset
      const batchSize = 100;
      const totalClients = 1000;
      
      for (let batch = 0; batch < totalClients / batchSize; batch++) {
        const clients = Array(batchSize).fill().map((_, index) => {
          const clientData = generateRandomClient({
            email: `perf-client-${batch * batchSize + index}@test.com`,
            assigned_to: testUser.id,
            created_by: testUser.id,
            client_code: `PERF${(batch * batchSize + index + 1).toString().padStart(4, '0')}`,
            unsubscribe_token: require('crypto').randomBytes(32).toString('hex')
          });
          return clientData;
        });

        await db('clients').insert(clients);
      }

      console.log('Testing query performance...');

      // Test various query patterns
      const queries = [
        { name: 'List all clients (paginated)', url: '/api/v1/clients?limit=50' },
        { name: 'Search by name', url: '/api/v1/clients?search=John&limit=50' },
        { name: 'Filter by status', url: '/api/v1/clients?status=prospect&limit=50' },
        { name: 'Complex filter', url: '/api/v1/clients?status=prospect&engagement_level=warm&limit=50' },
        { name: 'Sort by date', url: '/api/v1/clients?sort_by=created_at&sort_order=desc&limit=50' },
        { name: 'Stats summary', url: '/api/v1/clients/stats/summary' }
      ];

      for (const query of queries) {
        const startTime = process.hrtime.bigint();
        
        const response = await request(app)
          .get(query.url)
          .set('Authorization', `Bearer ${token}`);

        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;

        testHelpers.expectSuccessResponse(response, 200);

        console.log(`  ${query.name}: ${duration.toFixed(2)}ms`);
        
        // Performance assertions
        expect(duration).toBeLessThan(2000); // Should complete under 2 seconds
      }
    });

    test('should handle complex client detail queries efficiently', async () => {
      // Create client with related data
      const client = await testHelpers.createTestClient({
        email: 'detail-test@test.com',
        first_name: 'Detail',
        last_name: 'Test'
      }, testUser.id);

      // Create related projects and communications
      const project = await testHelpers.createTestProject({
        name: 'Performance Test Project'
      }, client.id, testUser.id);

      // Add communication logs
      await db('communication_log').insert({
        client_id: client.id,
        user_id: testUser.id,
        type: 'email',
        direction: 'outbound',
        subject: 'Test Email',
        content: 'Test email content',
        sent_at: db.fn.now()
      });

      // Test client detail query performance
      const iterations = 100;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        
        const response = await request(app)
          .get(`/api/v1/clients/${client.id}`)
          .set('Authorization', `Bearer ${token}`);

        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;

        testHelpers.expectSuccessResponse(response, 200);
        times.push(duration);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      console.log(`Client Detail Query Performance (${iterations} iterations):`);
      console.log(`  Average: ${avgTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxTime.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(200); // Average under 200ms
      expect(maxTime).toBeLessThan(500); // Max under 500ms
    });

    test('should handle pagination efficiently with large datasets', async () => {
      // Create 500 clients for pagination test
      const clients = Array(500).fill().map((_, index) => ({
        ...generateRandomClient(),
        email: `page-test-${index}@test.com`,
        assigned_to: testUser.id,
        created_by: testUser.id,
        client_code: `PAGE${(index + 1).toString().padStart(3, '0')}`,
        unsubscribe_token: require('crypto').randomBytes(32).toString('hex')
      }));

      await db('clients').insert(clients);

      // Test different page sizes and positions
      const paginationTests = [
        { page: 1, limit: 20 },
        { page: 5, limit: 20 },
        { page: 10, limit: 50 },
        { page: 25, limit: 20 }
      ];

      for (const test of paginationTests) {
        const startTime = process.hrtime.bigint();
        
        const response = await request(app)
          .get(`/api/v1/clients?page=${test.page}&limit=${test.limit}`)
          .set('Authorization', `Bearer ${token}`);

        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;

        testHelpers.expectSuccessResponse(response, 200);
        
        console.log(`  Page ${test.page} (limit ${test.limit}): ${duration.toFixed(2)}ms`);
        
        expect(duration).toBeLessThan(1000); // Should complete under 1 second
        expect(response.body.data.clients).toHaveLength(Math.min(test.limit, 500 - (test.page - 1) * test.limit));
      }
    });
  });

  describe('Memory Usage Tests', () => {
    test('should not have memory leaks during repeated operations', async () => {
      const user = await testHelpers.createTestUser();
      const token = testHelpers.generateAuthToken(user.id, user.role);

      // Get initial memory usage
      const initialMemory = process.memoryUsage();
      console.log('Initial memory usage:', {
        rss: (initialMemory.rss / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed: (initialMemory.heapUsed / 1024 / 1024).toFixed(2) + ' MB'
      });

      // Perform repeated operations
      for (let i = 0; i < 100; i++) {
        const clientData = generateRandomClient({
          email: `memory-test-${i}@test.com`
        });

        const createResponse = await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${token}`)
          .send(clientData);

        testHelpers.expectSuccessResponse(createResponse, 201);

        const clientId = createResponse.body.data.client.id;

        // Read client
        await request(app)
          .get(`/api/v1/clients/${clientId}`)
          .set('Authorization', `Bearer ${token}`);

        // Update client
        await request(app)
          .put(`/api/v1/clients/${clientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ first_name: 'Updated' });

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Get final memory usage
      const finalMemory = process.memoryUsage();
      console.log('Final memory usage:', {
        rss: (finalMemory.rss / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed: (finalMemory.heapUsed / 1024 / 1024).toFixed(2) + ' MB'
      });

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      console.log('Memory increase:', (memoryIncrease / 1024 / 1024).toFixed(2) + ' MB');

      // Memory increase should be reasonable (less than 50MB for 100 operations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Response Time Distribution', () => {
    test('should have consistent response times under load', async () => {
      const user = await testHelpers.createTestUser();
      const token = testHelpers.generateAuthToken(user.id, user.role);

      // Create some test clients
      for (let i = 0; i < 10; i++) {
        await testHelpers.createTestClient({
          email: `load-test-${i}@test.com`,
          first_name: `Client${i}`,
          last_name: 'LoadTest'
        }, user.id);
      }

      // Simulate concurrent load
      const concurrentUsers = 10;
      const requestsPerUser = 20;
      const allTimes = [];

      const userPromises = Array(concurrentUsers).fill().map(async () => {
        const times = [];
        
        for (let i = 0; i < requestsPerUser; i++) {
          const startTime = process.hrtime.bigint();
          
          const response = await request(app)
            .get('/api/v1/clients')
            .set('Authorization', `Bearer ${token}`);

          const endTime = process.hrtime.bigint();
          const duration = Number(endTime - startTime) / 1000000;

          testHelpers.expectSuccessResponse(response, 200);
          times.push(duration);
        }
        
        return times;
      });

      const userTimes = await Promise.all(userPromises);
      userTimes.forEach(times => allTimes.push(...times));

      // Calculate statistics
      allTimes.sort((a, b) => a - b);
      const totalRequests = allTimes.length;
      const avgTime = allTimes.reduce((a, b) => a + b, 0) / totalRequests;
      const medianTime = allTimes[Math.floor(totalRequests / 2)];
      const p95Time = allTimes[Math.floor(totalRequests * 0.95)];
      const p99Time = allTimes[Math.floor(totalRequests * 0.99)];
      const maxTime = Math.max(...allTimes);

      console.log(`Load Test Results (${concurrentUsers} users, ${requestsPerUser} requests each):`);
      console.log(`  Total requests: ${totalRequests}`);
      console.log(`  Average: ${avgTime.toFixed(2)}ms`);
      console.log(`  Median: ${medianTime.toFixed(2)}ms`);
      console.log(`  95th percentile: ${p95Time.toFixed(2)}ms`);
      console.log(`  99th percentile: ${p99Time.toFixed(2)}ms`);
      console.log(`  Max: ${maxTime.toFixed(2)}ms`);

      // Performance assertions
      expect(avgTime).toBeLessThan(1000); // Average under 1s
      expect(p95Time).toBeLessThan(2000); // 95% under 2s
      expect(p99Time).toBeLessThan(3000); // 99% under 3s
    });
  });

  describe('Database Connection Pool Performance', () => {
    test('should handle database connections efficiently', async () => {
      const user = await testHelpers.createTestUser();
      const token = testHelpers.generateAuthToken(user.id, user.role);

      // Test rapid sequential requests that require database connections
      const iterations = 50;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const response = await request(app)
          .get('/api/v1/clients/stats/summary')
          .set('Authorization', `Bearer ${token}`);

        testHelpers.expectSuccessResponse(response, 200);
      }

      const totalTime = Date.now() - startTime;
      const avgTimePerRequest = totalTime / iterations;

      console.log(`Database Connection Pool Test (${iterations} requests):`);
      console.log(`  Total time: ${totalTime}ms`);
      console.log(`  Average per request: ${avgTimePerRequest.toFixed(2)}ms`);

      // Should handle connections efficiently
      expect(avgTimePerRequest).toBeLessThan(200); // Average under 200ms per request
      expect(totalTime).toBeLessThan(10000); // Total under 10 seconds
    });

    test('should handle concurrent database operations', async () => {
      const user = await testHelpers.createTestUser();
      const token = testHelpers.generateAuthToken(user.id, user.role);

      // Test concurrent requests that hit the database
      const concurrentRequests = 25;
      const startTime = Date.now();

      const promises = Array(concurrentRequests).fill().map(async (_, index) => {
        // Mix of different operations to test connection pool
        const operations = [
          () => request(app).get('/api/v1/clients').set('Authorization', `Bearer ${token}`),
          () => request(app).get('/api/v1/clients/stats/summary').set('Authorization', `Bearer ${token}`),
          () => request(app).post('/api/v1/clients').set('Authorization', `Bearer ${token}`)
                   .send(generateRandomClient({ email: `concurrent-${index}@test.com` }))
        ];

        const operation = operations[index % operations.length];
        return operation();
      });

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      console.log(`Concurrent Database Operations (${concurrentRequests} requests):`);
      console.log(`  Total time: ${totalTime}ms`);
      console.log(`  Average per request: ${(totalTime / concurrentRequests).toFixed(2)}ms`);

      // Verify all requests succeeded
      responses.forEach((response, index) => {
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(500);
      });

      // Should handle concurrent operations efficiently
      expect(totalTime).toBeLessThan(15000); // Under 15 seconds for all requests
    });
  });
});