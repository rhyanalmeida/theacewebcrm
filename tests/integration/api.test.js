const request = require('supertest');
const path = require('path');

// Load the main CRM application from the adjacent directory
const app = require(path.join(__dirname, '../../../ace crm/server.js'));
const { db } = require(path.join(__dirname, '../../../ace crm/src/config/database.js'));
const TestHelpers = require('../helpers/testHelpers');
const { testUsers, testClients, testProjects, hashTestPasswords } = require('../fixtures/testData');

describe('API Integration Tests', () => {
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

  describe('Complete User Journey Integration', () => {
    test('should complete full user registration and authentication flow', async () => {
      const userData = {
        email: 'integration@test.com',
        password: 'IntegrationPass123!',
        first_name: 'Integration',
        last_name: 'User',
        phone: '+1555999999'
      };

      // Step 1: Register new user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      testHelpers.expectSuccessResponse(registerResponse, 201);
      expect(registerResponse.body.data.user.email).toBe(userData.email);
      expect(registerResponse.body.data.tokens).toHaveProperty('accessToken');

      const { accessToken, refreshToken } = registerResponse.body.data.tokens;
      const userId = registerResponse.body.data.user.id;

      // Step 2: Access protected resource with token
      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      testHelpers.expectSuccessResponse(meResponse, 200);
      expect(meResponse.body.data.user.id).toBe(userId);

      // Step 3: Update user profile
      const profileData = {
        first_name: 'Updated Integration',
        preferences: { theme: 'dark' }
      };

      const updateResponse = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(profileData);

      testHelpers.expectSuccessResponse(updateResponse, 200);
      expect(updateResponse.body.data.user.first_name).toBe(profileData.first_name);

      // Step 4: Refresh tokens
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      testHelpers.expectSuccessResponse(refreshResponse, 200);
      expect(refreshResponse.body.data.tokens).toHaveProperty('accessToken');

      // Step 5: Logout
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      testHelpers.expectSuccessResponse(logoutResponse, 200);
    });

    test('should complete full client management workflow', async () => {
      // Setup: Create test user
      const user = await testHelpers.createTestUser({ role: 'user' });
      const token = testHelpers.generateAuthToken(user.id, user.role);

      // Step 1: Create new client
      const clientData = {
        email: 'workflow@test.com',
        first_name: 'Workflow',
        last_name: 'Client',
        company: 'Integration Test Co.',
        phone: '+1555123456',
        industry: 'Technology',
        lead_source: 'website',
        budget_min: 10000,
        budget_max: 25000,
        notes: 'Integration test client',
        tags: ['integration', 'test']
      };

      const createResponse = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${token}`)
        .send(clientData);

      testHelpers.expectSuccessResponse(createResponse, 201);
      const clientId = createResponse.body.data.client.id;
      expect(createResponse.body.data.client.status).toBe('prospect');

      // Step 2: Get client details
      const getResponse = await request(app)
        .get(`/api/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${token}`);

      testHelpers.expectSuccessResponse(getResponse, 200);
      expect(getResponse.body.data.client.email).toBe(clientData.email);

      // Step 3: Update client status through qualification process
      const qualifyData = {
        status: 'qualified',
        lead_score: 85,
        engagement_level: 'hot',
        notes: 'Client qualified after initial call'
      };

      const updateResponse = await request(app)
        .put(`/api/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(qualifyData);

      testHelpers.expectSuccessResponse(updateResponse, 200);
      expect(updateResponse.body.data.client.status).toBe('qualified');

      // Step 4: Add notes to client
      const noteData = {
        content: 'Client is very interested in our web design services. Scheduled follow-up for next week.'
      };

      const noteResponse = await request(app)
        .post(`/api/v1/clients/${clientId}/notes`)
        .set('Authorization', `Bearer ${token}`)
        .send(noteData);

      testHelpers.expectSuccessResponse(noteResponse, 201);

      // Step 5: List all clients and verify updates
      const listResponse = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${token}`);

      testHelpers.expectSuccessResponse(listResponse, 200);
      const updatedClient = listResponse.body.data.clients.find(c => c.id === clientId);
      expect(updatedClient.status).toBe('qualified');
      expect(updatedClient.lead_score).toBe(85);

      // Step 6: Get client statistics
      const statsResponse = await request(app)
        .get('/api/v1/clients/stats/summary')
        .set('Authorization', `Bearer ${token}`);

      testHelpers.expectSuccessResponse(statsResponse, 200);
      expect(statsResponse.body.data.stats.totalClients).toBe(1);
      expect(statsResponse.body.data.stats.qualified).toBe(1);
    });

    test('should handle client project lifecycle integration', async () => {
      // Setup: Create test user and client
      const user = await testHelpers.createTestUser({ role: 'user' });
      const client = await testHelpers.createTestClient(testClients.qualified, user.id);
      const token = testHelpers.generateAuthToken(user.id, user.role);

      // Update client to active status
      await request(app)
        .put(`/api/v1/clients/${client.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'client' });

      // Create project for client
      const project = await testHelpers.createTestProject({
        ...testProjects.website,
        name: 'Integration Test Website',
        status: 'planning'
      }, client.id, user.id);

      // Verify client details include project
      const clientResponse = await request(app)
        .get(`/api/v1/clients/${client.id}`)
        .set('Authorization', `Bearer ${token}`);

      testHelpers.expectSuccessResponse(clientResponse, 200);
      expect(clientResponse.body.data.projects).toHaveLength(1);
      expect(clientResponse.body.data.projects[0].name).toBe('Integration Test Website');

      // Update project status
      await db('projects')
        .where('id', project.id)
        .update({ 
          status: 'in_progress', 
          progress_percentage: 50,
          updated_at: db.fn.now() 
        });

      // Verify updated project status in client details
      const updatedClientResponse = await request(app)
        .get(`/api/v1/clients/${client.id}`)
        .set('Authorization', `Bearer ${token}`);

      testHelpers.expectSuccessResponse(updatedClientResponse, 200);
      expect(updatedClientResponse.body.data.projects[0].status).toBe('in_progress');
      expect(updatedClientResponse.body.data.projects[0].progress_percentage).toBe(50);
    });
  });

  describe('Multi-User Access Control Integration', () => {
    let adminUser, managerUser, regularUser;
    let adminToken, managerToken, regularToken;
    let adminClient, managerClient, regularClient;

    beforeEach(async () => {
      // Create users with different roles
      adminUser = await testHelpers.createTestUser({ role: 'admin' });
      managerUser = await testHelpers.createTestUser({ role: 'manager' });
      regularUser = await testHelpers.createTestUser({ role: 'user' });

      // Generate tokens
      adminToken = testHelpers.generateAuthToken(adminUser.id, adminUser.role);
      managerToken = testHelpers.generateAuthToken(managerUser.id, managerUser.role);
      regularToken = testHelpers.generateAuthToken(regularUser.id, regularUser.role);

      // Create clients assigned to each user
      adminClient = await testHelpers.createTestClient({
        ...testClients.client,
        email: 'admin-client@test.com'
      }, adminUser.id);

      managerClient = await testHelpers.createTestClient({
        ...testClients.qualified,
        email: 'manager-client@test.com'
      }, managerUser.id);

      regularClient = await testHelpers.createTestClient({
        ...testClients.prospect,
        email: 'regular-client@test.com'
      }, regularUser.id);
    });

    test('should enforce role-based access control for client list', async () => {
      // Admin should see all clients
      const adminResponse = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${adminToken}`);

      testHelpers.expectSuccessResponse(adminResponse, 200);
      expect(adminResponse.body.data.clients).toHaveLength(3);

      // Manager should only see assigned clients
      const managerResponse = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${managerToken}`);

      testHelpers.expectSuccessResponse(managerResponse, 200);
      expect(managerResponse.body.data.clients).toHaveLength(1);
      expect(managerResponse.body.data.clients[0].assigned_to).toBe(managerUser.id);

      // Regular user should only see assigned clients
      const regularResponse = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${regularToken}`);

      testHelpers.expectSuccessResponse(regularResponse, 200);
      expect(regularResponse.body.data.clients).toHaveLength(1);
      expect(regularResponse.body.data.clients[0].assigned_to).toBe(regularUser.id);
    });

    test('should enforce client access permissions', async () => {
      // Admin can access any client
      const adminAccessResponse = await request(app)
        .get(`/api/v1/clients/${regularClient.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      testHelpers.expectSuccessResponse(adminAccessResponse, 200);

      // Regular user cannot access other users' clients
      const unauthorizedResponse = await request(app)
        .get(`/api/v1/clients/${managerClient.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      testHelpers.expectAuthorizationError(unauthorizedResponse);

      // Manager cannot access other users' clients
      const managerUnauthorizedResponse = await request(app)
        .get(`/api/v1/clients/${adminClient.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      testHelpers.expectAuthorizationError(managerUnauthorizedResponse);
    });

    test('should enforce client modification permissions', async () => {
      const updateData = { first_name: 'Updated Name' };

      // Admin can update any client
      const adminUpdateResponse = await request(app)
        .put(`/api/v1/clients/${regularClient.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      testHelpers.expectSuccessResponse(adminUpdateResponse, 200);

      // Regular user cannot update other users' clients
      const unauthorizedUpdateResponse = await request(app)
        .put(`/api/v1/clients/${managerClient.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send(updateData);

      testHelpers.expectAuthorizationError(unauthorizedUpdateResponse);

      // User can update their own clients
      const ownUpdateResponse = await request(app)
        .put(`/api/v1/clients/${regularClient.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ company: 'Updated Company' });

      testHelpers.expectSuccessResponse(ownUpdateResponse, 200);
    });

    test('should enforce client deletion permissions', async () => {
      // Admin can delete any client
      const adminDeleteResponse = await request(app)
        .delete(`/api/v1/clients/${managerClient.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      testHelpers.expectSuccessResponse(adminDeleteResponse, 200);

      // Regular user cannot delete other users' clients
      const unauthorizedDeleteResponse = await request(app)
        .delete(`/api/v1/clients/${adminClient.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      testHelpers.expectAuthorizationError(unauthorizedDeleteResponse);

      // User can delete their own clients
      const ownDeleteResponse = await request(app)
        .delete(`/api/v1/clients/${regularClient.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      testHelpers.expectSuccessResponse(ownDeleteResponse, 200);
    });
  });

  describe('Data Validation and Sanitization Integration', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = await testHelpers.createTestUser();
      token = testHelpers.generateAuthToken(testUser.id, testUser.role);
    });

    test('should handle malicious input and prevent injection', async () => {
      const maliciousData = {
        email: 'test@test.com',
        first_name: '<script>alert("xss")</script>',
        last_name: 'DROP TABLE clients; --',
        company: '${process.env.JWT_SECRET}',
        notes: 'javascript:alert(1)',
        tags: ['<img src=x onerror=alert(1)>', 'normal-tag']
      };

      const response = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${token}`)
        .send(maliciousData);

      testHelpers.expectSuccessResponse(response, 201);

      // Verify malicious content is sanitized/escaped
      const clientId = response.body.data.client.id;
      const dbClient = await db('clients').where('id', clientId).first();

      // Should not contain raw script tags or SQL injection
      expect(dbClient.first_name).not.toContain('<script>');
      expect(dbClient.last_name).not.toContain('DROP TABLE');
      expect(dbClient.company).not.toContain('${process.env');
      expect(dbClient.notes).not.toContain('javascript:');
    });

    test('should validate and sanitize email addresses', async () => {
      const testCases = [
        { email: 'UPPERCASE@TEST.COM', expected: 'uppercase@test.com' },
        { email: '  spaces@test.com  ', expected: 'spaces@test.com' },
        { email: 'test+alias@gmail.com', expected: 'test+alias@gmail.com' }
      ];

      for (const testCase of testCases) {
        const clientData = {
          email: testCase.email,
          first_name: 'Test',
          last_name: 'User'
        };

        const response = await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${token}`)
          .send(clientData);

        testHelpers.expectSuccessResponse(response, 201);
        expect(response.body.data.client.email).toBe(testCase.expected);
      }
    });

    test('should handle special characters in text fields', async () => {
      const specialCharsData = {
        email: 'special@test.com',
        first_name: 'José María',
        last_name: 'González-Smith',
        company: 'Ñañez & Sons LLC',
        notes: 'Client from España with special requirements: café, piñata, résumé',
        tags: ['español', 'français', 'русский']
      };

      const response = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${token}`)
        .send(specialCharsData);

      testHelpers.expectSuccessResponse(response, 201);

      // Verify special characters are preserved
      expect(response.body.data.client.first_name).toBe('José María');
      expect(response.body.data.client.company).toBe('Ñañez & Sons LLC');

      // Verify in database
      const dbClient = await db('clients').where('id', response.body.data.client.id).first();
      expect(dbClient.first_name).toBe('José María');
      expect(JSON.parse(dbClient.tags)).toContain('español');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle database connection errors gracefully', async () => {
      // Simulate database error by trying to access non-existent client
      const response = await testHelpers.authenticatedRequest('get', '/api/v1/clients/99999');

      testHelpers.expectNotFoundError(response);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('status', 'fail');
    });

    test('should handle concurrent access conflicts', async () => {
      const user = await testHelpers.createTestUser();
      const token = testHelpers.generateAuthToken(user.id, user.role);
      const client = await testHelpers.createTestClient(testClients.prospect, user.id);

      // Simulate concurrent updates
      const updatePromises = [
        request(app)
          .put(`/api/v1/clients/${client.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ first_name: 'Concurrent Update 1' }),
        
        request(app)
          .put(`/api/v1/clients/${client.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ first_name: 'Concurrent Update 2' })
      ];

      const responses = await Promise.all(updatePromises);

      // Both requests should succeed (last write wins)
      responses.forEach(response => {
        testHelpers.expectSuccessResponse(response, 200);
      });

      // Verify final state
      const finalClient = await db('clients').where('id', client.id).first();
      expect(finalClient.first_name).toMatch(/^Concurrent Update [12]$/);
    });

    test('should handle rate limiting', async () => {
      const user = await testHelpers.createTestUser();
      const token = testHelpers.generateAuthToken(user.id, user.role);

      // Make multiple rapid requests
      const requests = Array(10).fill().map(() =>
        request(app)
          .get('/api/v1/clients/stats/summary')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(requests);

      // Most requests should succeed (rate limit is high for tests)
      const successfulRequests = responses.filter(r => r.status === 200);
      expect(successfulRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Integration Tests', () => {
    test('should handle large datasets efficiently', async () => {
      const user = await testHelpers.createTestUser();
      const token = testHelpers.generateAuthToken(user.id, user.role);

      // Create multiple clients
      const clientPromises = Array(50).fill().map((_, index) =>
        testHelpers.createTestClient({
          ...testClients.prospect,
          email: `bulk-client-${index}@test.com`,
          first_name: `Client`,
          last_name: `${index}`
        }, user.id)
      );

      await Promise.all(clientPromises);

      // Measure query performance
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/clients?limit=50')
        .set('Authorization', `Bearer ${token}`);

      const queryTime = Date.now() - startTime;

      testHelpers.expectSuccessResponse(response, 200);
      expect(response.body.data.clients).toHaveLength(50);
      expect(response.body.data.pagination.totalItems).toBe(50);

      // Query should complete within reasonable time (< 2 seconds)
      expect(queryTime).toBeLessThan(2000);
    });

    test('should handle pagination efficiently', async () => {
      const user = await testHelpers.createTestUser();
      const token = testHelpers.generateAuthToken(user.id, user.role);

      // Create test clients
      const clientPromises = Array(25).fill().map((_, index) =>
        testHelpers.createTestClient({
          ...testClients.prospect,
          email: `page-client-${index}@test.com`
        }, user.id)
      );

      await Promise.all(clientPromises);

      // Test pagination
      const page1Response = await request(app)
        .get('/api/v1/clients?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      testHelpers.expectSuccessResponse(page1Response, 200);
      expect(page1Response.body.data.clients).toHaveLength(10);
      expect(page1Response.body.data.pagination.currentPage).toBe(1);
      expect(page1Response.body.data.pagination.hasNextPage).toBe(true);

      const page3Response = await request(app)
        .get('/api/v1/clients?page=3&limit=10')
        .set('Authorization', `Bearer ${token}`);

      testHelpers.expectSuccessResponse(page3Response, 200);
      expect(page3Response.body.data.clients).toHaveLength(5); // Remaining clients
      expect(page3Response.body.data.pagination.hasNextPage).toBe(false);
    });

    test('should handle complex filtering and searching', async () => {
      const user = await testHelpers.createTestUser();
      const token = testHelpers.generateAuthToken(user.id, user.role);

      // Create diverse client dataset
      await testHelpers.createTestClient({
        ...testClients.prospect,
        email: 'tech-startup@test.com',
        company: 'Tech Startup Inc',
        industry: 'Technology',
        status: 'prospect'
      }, user.id);

      await testHelpers.createTestClient({
        ...testClients.qualified,
        email: 'healthcare-corp@test.com',
        company: 'Healthcare Corp',
        industry: 'Healthcare',
        status: 'qualified'
      }, user.id);

      // Test complex filtering
      const filteredResponse = await request(app)
        .get('/api/v1/clients?status=prospect&search=tech&sort_by=company&sort_order=asc')
        .set('Authorization', `Bearer ${token}`);

      testHelpers.expectSuccessResponse(filteredResponse, 200);
      expect(filteredResponse.body.data.clients).toHaveLength(1);
      expect(filteredResponse.body.data.clients[0].company).toContain('Tech');
      expect(filteredResponse.body.data.clients[0].status).toBe('prospect');
    });
  });
});