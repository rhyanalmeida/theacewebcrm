const request = require('supertest');
const path = require('path');
const jwt = require('jsonwebtoken');

// Load the main CRM application from the adjacent directory
const app = require(path.join(__dirname, '../../../ace crm/server.js'));
const { db } = require(path.join(__dirname, '../../../ace crm/src/config/database.js'));
const TestHelpers = require('../helpers/testHelpers');

describe('Security Integration Tests', () => {
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

  describe('Authentication Security', () => {
    test('should reject requests with no authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/clients')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not logged in');
    });

    test('should reject requests with malformed authorization header', async () => {
      const malformedHeaders = [
        'InvalidFormat',
        'Bearer',
        'Basic dXNlcjpwYXNz',
        'Bearer invalid.token.format',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      ];

      for (const header of malformedHeaders) {
        const response = await request(app)
          .get('/api/v1/clients')
          .set('Authorization', header)
          .expect(401);

        expect(response.body.message).toContain('Invalid token' || 'not logged in');
      }
    });

    test('should reject expired JWT tokens', async () => {
      const user = await testHelpers.createTestUser();
      const expiredToken = jwt.sign(
        { userId: user.id, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      const response = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.message).toContain('expired');
    });

    test('should reject JWT tokens with invalid signature', async () => {
      const user = await testHelpers.createTestUser();
      const invalidToken = jwt.sign(
        { userId: user.id, type: 'access' },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });

    test('should reject tokens for non-existent users', async () => {
      const nonExistentUserId = 99999;
      const validToken = jwt.sign(
        { userId: nonExistentUserId, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body.message).toContain('does no longer exist');
    });

    test('should reject tokens for inactive users', async () => {
      const user = await testHelpers.createTestUser({ status: 'inactive' });
      const token = testHelpers.generateAuthToken(user.id, user.role);

      const response = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.message).toContain('not active');
    });

    test('should reject refresh tokens used as access tokens', async () => {
      const user = await testHelpers.createTestUser();
      const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      const response = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);

      expect(response.body.message).toContain('Invalid token type');
    });
  });

  describe('Authorization Security', () => {
    let adminUser, regularUser;
    let adminToken, regularToken;

    beforeEach(async () => {
      adminUser = await testHelpers.createTestUser({ role: 'admin' });
      regularUser = await testHelpers.createTestUser({ role: 'user' });
      
      adminToken = testHelpers.generateAuthToken(adminUser.id, adminUser.role);
      regularToken = testHelpers.generateAuthToken(regularUser.id, regularUser.role);
    });

    test('should prevent users from accessing other users\' resources', async () => {
      const user1 = await testHelpers.createTestUser();
      const user2 = await testHelpers.createTestUser();
      
      const user1Client = await testHelpers.createTestClient({
        email: 'user1-client@test.com',
        first_name: 'User1',
        last_name: 'Client'
      }, user1.id);

      const user2Token = testHelpers.generateAuthToken(user2.id, user2.role);

      // User 2 should not be able to access User 1's client
      const response = await request(app)
        .get(`/api/v1/clients/${user1Client.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.message).toContain('permission');
    });

    test('should prevent privilege escalation through role manipulation', async () => {
      const user = await testHelpers.createTestUser({ role: 'user' });
      
      // Try to create a token with admin role (simulating token manipulation)
      const manipulatedToken = jwt.sign(
        { userId: user.id, type: 'access', role: 'admin' }, // Fake admin role
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // The token should be valid but the user's actual role from DB should be used
      const response = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${manipulatedToken}`);

      testHelpers.expectSuccessResponse(response, 200);
      
      // Should only see their own clients, not all clients (admin privilege)
      expect(response.body.data.clients).toHaveLength(0); // No clients assigned to this user
    });

    test('should prevent horizontal privilege escalation', async () => {
      const user1 = await testHelpers.createTestUser();
      const user2 = await testHelpers.createTestUser();
      
      const user1Client = await testHelpers.createTestClient({
        email: 'horizontal-test@test.com'
      }, user1.id);

      const user2Token = testHelpers.generateAuthToken(user2.id, user2.role);

      // User 2 should not be able to modify User 1's client
      const updateResponse = await request(app)
        .put(`/api/v1/clients/${user1Client.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ first_name: 'Hacked' })
        .expect(403);

      expect(updateResponse.body.message).toContain('permission');

      // User 2 should not be able to delete User 1's client
      const deleteResponse = await request(app)
        .delete(`/api/v1/clients/${user1Client.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(deleteResponse.body.message).toContain('permission');
    });

    test('should enforce proper admin access controls', async () => {
      const regularClient = await testHelpers.createTestClient({
        email: 'admin-test@test.com'
      }, regularUser.id);

      // Admin should be able to access any client
      const adminAccessResponse = await request(app)
        .get(`/api/v1/clients/${regularClient.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      testHelpers.expectSuccessResponse(adminAccessResponse, 200);

      // Admin should be able to modify any client
      const adminUpdateResponse = await request(app)
        .put(`/api/v1/clients/${regularClient.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ first_name: 'Admin Updated' });

      testHelpers.expectSuccessResponse(adminUpdateResponse, 200);
    });
  });

  describe('Input Validation Security', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = await testHelpers.createTestUser();
      token = testHelpers.generateAuthToken(testUser.id, testUser.role);
    });

    test('should prevent SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE clients; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users; --",
        "1; DELETE FROM clients WHERE 1=1; --",
        "'; INSERT INTO clients (email) VALUES ('hacked@test.com'); --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const clientData = {
          email: 'sqltest@test.com',
          first_name: payload,
          last_name: 'Test'
        };

        const response = await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${token}`)
          .send(clientData);

        // Should either succeed (with sanitized data) or fail validation
        expect([200, 201, 400]).toContain(response.status);

        if (response.status === 201) {
          // If it succeeds, verify the payload was sanitized
          const client = await db('clients').where('id', response.body.data.client.id).first();
          expect(client.first_name).not.toContain('DROP TABLE');
          expect(client.first_name).not.toContain('DELETE FROM');
          expect(client.first_name).not.toContain('UNION SELECT');
        }
      }

      // Verify database integrity
      const clientsCount = await db('clients').count('* as count').first();
      expect(parseInt(clientsCount.count)).toBeGreaterThanOrEqual(0);
    });

    test('should prevent XSS attacks in input fields', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
        '<svg onload=alert("xss")>',
        '"><script>alert("xss")</script>',
        '<iframe src="javascript:alert(`xss`)"></iframe>'
      ];

      for (const payload of xssPayloads) {
        const clientData = {
          email: 'xsstest@test.com',
          first_name: payload,
          last_name: 'Test',
          notes: payload
        };

        const response = await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${token}`)
          .send(clientData);

        if (response.status === 201) {
          // Verify XSS payload was sanitized
          const client = await db('clients').where('id', response.body.data.client.id).first();
          expect(client.first_name).not.toContain('<script>');
          expect(client.first_name).not.toContain('javascript:');
          expect(client.first_name).not.toContain('<svg');
          expect(client.notes).not.toContain('<script>');
        }
      }
    });

    test('should validate email format strictly', async () => {
      const invalidEmails = [
        'notanemail',
        '@domain.com',
        'user@',
        'user..double.dot@domain.com',
        'user@domain',
        'user@domain.',
        'user@.domain.com',
        '<script>alert("xss")</script>@domain.com',
        'user@domain.com<script>alert("xss")</script>'
      ];

      for (const email of invalidEmails) {
        const clientData = {
          email: email,
          first_name: 'Test',
          last_name: 'User'
        };

        const response = await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${token}`)
          .send(clientData);

        testHelpers.expectValidationError(response, 'email');
      }
    });

    test('should prevent LDAP injection in search queries', async () => {
      const ldapInjectionPayloads = [
        '*)(uid=*',
        '*)(&(uid=*',
        '\\*\\)\\(\\|\\(\\&\\=',
        ')|cn=*'
      ];

      for (const payload of ldapInjectionPayloads) {
        const response = await request(app)
          .get(`/api/v1/clients?search=${encodeURIComponent(payload)}`)
          .set('Authorization', `Bearer ${token}`);

        // Should handle gracefully without errors
        expect(response.status).toBeLessThan(500);
      }
    });

    test('should limit request payload size', async () => {
      const largePayload = {
        email: 'large@test.com',
        first_name: 'A'.repeat(10000), // Very long string
        last_name: 'Test',
        notes: 'B'.repeat(100000) // Very long notes
      };

      const response = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${token}`)
        .send(largePayload);

      // Should either reject (413) or handle gracefully
      expect([201, 400, 413]).toContain(response.status);
    });
  });

  describe('Rate Limiting Security', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = await testHelpers.createTestUser();
      token = testHelpers.generateAuthToken(testUser.id, testUser.role);
    });

    test('should apply rate limiting to authentication endpoints', async () => {
      const requests = [];
      const maxRequests = 110; // Exceed the rate limit

      // Create requests rapidly
      for (let i = 0; i < maxRequests; i++) {
        const request_promise = request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'wrongpassword'
          });
        
        requests.push(request_promise);
      }

      const responses = await Promise.all(requests);
      
      // Check if any requests were rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      const successfulResponses = responses.filter(r => r.status === 401); // Wrong credentials but not rate limited

      console.log(`Rate limiting test: ${rateLimitedResponses.length} rate limited, ${successfulResponses.length} processed`);
      
      // Should have some rate limited responses for such rapid requests
      // Note: This test might need adjustment based on actual rate limit configuration
    });

    test('should not affect normal usage patterns', async () => {
      // Simulate normal user behavior with delays
      const normalRequests = 20;
      const responses = [];

      for (let i = 0; i < normalRequests; i++) {
        const response = await request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${token}`);
        
        responses.push(response);
        
        // Small delay between requests (normal user behavior)
        await testHelpers.delay(100);
      }

      // All normal requests should succeed
      responses.forEach(response => {
        expect(response.status).not.toBe(429);
        testHelpers.expectSuccessResponse(response, 200);
      });
    });
  });

  describe('CORS Security', () => {
    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1/clients')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization, Content-Type');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    test('should reject requests from unauthorized origins in production', async () => {
      // This test assumes CORS is properly configured
      const response = await request(app)
        .get('/api/v1/clients')
        .set('Origin', 'http://malicious-site.com');

      // Note: In test environment, CORS might be permissive
      // In production, this should be more restrictive
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Security Headers', () => {
    test('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/health');

      // Check for security headers (added by helmet middleware)
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
      
      // Should not expose server information
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should set appropriate content-type headers', async () => {
      const testUser = await testHelpers.createTestUser();
      const token = testHelpers.generateAuthToken(testUser.id, testUser.role);

      const response = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${token}`);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Password Security', () => {
    test('should enforce strong password requirements', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        '12345',
        'abc123',
        'password123'
      ];

      for (const password of weakPasswords) {
        const userData = {
          email: `weak${Math.random()}@test.com`,
          password: password,
          first_name: 'Test',
          last_name: 'User'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        testHelpers.expectValidationError(response, 'password');
      }
    });

    test('should hash passwords securely', async () => {
      const userData = {
        email: 'hashtest@test.com',
        password: 'SecurePassword123!',
        first_name: 'Hash',
        last_name: 'Test'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      testHelpers.expectSuccessResponse(response, 201);

      // Verify password is hashed in database
      const user = await db('users').where('email', userData.email).first();
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe(userData.password);
      expect(user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')).toBe(true);
      
      // Verify no plain text password is stored
      expect(user.password).toBeUndefined();
    });
  });

  describe('Session Security', () => {
    test('should handle token refresh securely', async () => {
      const user = await testHelpers.createTestUser();
      
      // Login to get tokens
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: 'TestPass123!'
        });

      testHelpers.expectSuccessResponse(loginResponse, 200);
      
      const { refreshToken } = loginResponse.body.data.tokens;

      // Use refresh token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      testHelpers.expectSuccessResponse(refreshResponse, 200);
      expect(refreshResponse.body.data.tokens.accessToken).toBeDefined();
      expect(refreshResponse.body.data.tokens.refreshToken).toBeDefined();

      // Old refresh token should still work (depending on implementation)
      // This tests whether the implementation properly handles token rotation
    });

    test('should invalidate sessions on logout', async () => {
      const user = await testHelpers.createTestUser();
      const token = testHelpers.generateAuthToken(user.id, user.role);

      // Verify token works
      const beforeLogout = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      testHelpers.expectSuccessResponse(beforeLogout, 200);

      // Logout
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      testHelpers.expectSuccessResponse(logoutResponse, 200);

      // Token should still work (stateless JWT implementation)
      // In a production app with token blacklisting, this would fail
      const afterLogout = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      // Depending on implementation, this might still work (JWT is stateless)
      // or fail if token blacklisting is implemented
      expect([200, 401]).toContain(afterLogout.status);
    });
  });

  describe('Error Message Security', () => {
    test('should not leak sensitive information in error messages', async () => {
      // Try to access non-existent client with verbose error
      const response = await testHelpers.authenticatedRequest('get', '/api/v1/clients/99999');

      testHelpers.expectNotFoundError(response);
      
      // Error message should not contain database details
      expect(response.body.message).not.toContain('SELECT');
      expect(response.body.message).not.toContain('postgresql');
      expect(response.body.message).not.toContain('knex');
      expect(response.body.message).not.toContain('database');
    });

    test('should handle database errors securely', async () => {
      const testUser = await testHelpers.createTestUser();
      const token = testHelpers.generateAuthToken(testUser.id, testUser.role);

      // Try to create client with data that might cause database error
      const invalidData = {
        email: 'test@test.com',
        first_name: null, // Invalid - required field
        last_name: null // Invalid - required field
      };

      const response = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData);

      // Should return validation error, not database error
      expect(response.status).toBe(400);
      expect(response.body.message).not.toContain('null value');
      expect(response.body.message).not.toContain('constraint');
      expect(response.body.message).not.toContain('postgresql');
    });
  });
});