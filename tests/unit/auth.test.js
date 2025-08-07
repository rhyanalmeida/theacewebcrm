const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

// Load the main CRM application from the adjacent directory
const app = require(path.join(__dirname, '../../../ace crm/server.js'));
const { db } = require(path.join(__dirname, '../../../ace crm/src/config/database.js'));
const TestHelpers = require('../helpers/testHelpers');
const { testUsers, hashTestPasswords } = require('../fixtures/testData');

describe('Authentication Unit Tests', () => {
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

  describe('POST /api/v1/auth/register', () => {
    test('should register a new user with valid data', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'ValidPass123!',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      testHelpers.expectSuccessResponse(response, 201);
      
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user).not.toHaveProperty('password_hash');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');

      // Verify user was created in database
      const dbUser = await db('users').where('email', userData.email).first();
      expect(dbUser).toBeDefined();
      expect(dbUser.first_name).toBe(userData.first_name);
      expect(dbUser.last_name).toBe(userData.last_name);
      expect(await bcrypt.compare(userData.password, dbUser.password_hash)).toBe(true);
    });

    test('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'ValidPass123!',
        first_name: 'John',
        last_name: 'Doe'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      testHelpers.expectValidationError(response, 'email');
    });

    test('should reject registration with short password', async () => {
      const userData = {
        email: 'test@test.com',
        password: '123',
        first_name: 'John',
        last_name: 'Doe'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      testHelpers.expectValidationError(response, 'password');
    });

    test('should reject registration with missing required fields', async () => {
      const userData = {
        email: 'test@test.com',
        password: 'ValidPass123!'
        // Missing first_name and last_name
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      testHelpers.expectValidationError(response);
      expect(response.body.errors).toHaveLength(2);
    });

    test('should reject registration with duplicate email', async () => {
      const userData = {
        email: 'duplicate@test.com',
        password: 'ValidPass123!',
        first_name: 'John',
        last_name: 'Doe'
      };

      // Create first user
      await testHelpers.createTestUser(userData);

      // Try to register with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      testHelpers.expectErrorResponse(response, 400, 'already exists');
    });

    test('should normalize email to lowercase', async () => {
      const userData = {
        email: 'UPPERCASE@TEST.COM',
        password: 'ValidPass123!',
        first_name: 'John',
        last_name: 'Doe'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      testHelpers.expectSuccessResponse(response, 201);
      expect(response.body.data.user.email).toBe('uppercase@test.com');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await testHelpers.createTestUser({
        email: 'login@test.com',
        password: 'LoginPass123!'
      });
    });

    test('should login with valid credentials', async () => {
      const loginData = {
        email: 'login@test.com',
        password: 'LoginPass123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      testHelpers.expectSuccessResponse(response, 200);
      
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.user).not.toHaveProperty('password_hash');

      // Verify tokens are valid JWTs
      const decoded = jwt.verify(response.body.data.tokens.accessToken, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.type).toBe('access');
    });

    test('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'LoginPass123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      testHelpers.expectErrorResponse(response, 401, 'Invalid email or password');
    });

    test('should reject login with invalid password', async () => {
      const loginData = {
        email: 'login@test.com',
        password: 'WrongPassword'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      testHelpers.expectErrorResponse(response, 401, 'Invalid email or password');
    });

    test('should reject login for inactive user', async () => {
      const inactiveUser = await testHelpers.createTestUser({
        email: 'inactive@test.com',
        password: 'InactivePass123!',
        status: 'inactive'
      });

      const loginData = {
        email: 'inactive@test.com',
        password: 'InactivePass123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      testHelpers.expectErrorResponse(response, 401, 'not active');
    });

    test('should update last_login timestamp on successful login', async () => {
      const loginData = {
        email: 'login@test.com',
        password: 'LoginPass123!'
      };

      const beforeLogin = new Date();
      
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      testHelpers.expectSuccessResponse(response, 200);

      const updatedUser = await db('users').where('id', testUser.id).first();
      expect(new Date(updatedUser.last_login)).toBeInstanceOf(Date);
      expect(new Date(updatedUser.last_login).getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });

    test('should reject login with malformed email', async () => {
      const loginData = {
        email: 'not-an-email',
        password: 'LoginPass123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      testHelpers.expectValidationError(response, 'email');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let testUser;
    let refreshToken;

    beforeEach(async () => {
      testUser = await testHelpers.createTestUser();
      refreshToken = jwt.sign(
        { userId: testUser.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );
    });

    test('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      testHelpers.expectSuccessResponse(response, 200);
      
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');

      // Verify new tokens are valid
      const decodedAccess = jwt.verify(response.body.data.tokens.accessToken, process.env.JWT_SECRET);
      expect(decodedAccess.userId).toBe(testUser.id);
      expect(decodedAccess.type).toBe('access');
    });

    test('should reject refresh with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      testHelpers.expectErrorResponse(response, 400, 'Refresh token is required');
    });

    test('should reject refresh with invalid token format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      testHelpers.expectErrorResponse(response, 401, 'Invalid or expired refresh token');
    });

    test('should reject refresh with access token instead of refresh token', async () => {
      const accessToken = jwt.sign(
        { userId: testUser.id, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: accessToken });

      testHelpers.expectErrorResponse(response, 401, 'Invalid token type');
    });

    test('should reject refresh for deleted user', async () => {
      // Soft delete the user
      await db('users').where('id', testUser.id).update({ deleted_at: db.fn.now() });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      testHelpers.expectErrorResponse(response, 401, 'User not found or inactive');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await testHelpers.createTestUser();
    });

    test('should return current user profile with valid token', async () => {
      const response = await testHelpers.authenticatedRequest('get', '/api/v1/auth/me', testUser);

      testHelpers.expectSuccessResponse(response, 200);
      
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    test('should reject request without authentication', async () => {
      const response = await testHelpers.unauthenticatedRequest('get', '/api/v1/auth/me');
      testHelpers.expectAuthenticationError(response);
    });

    test('should reject request with expired token', async () => {
      const response = await testHelpers.expiredTokenRequest('get', '/api/v1/auth/me');
      testHelpers.expectAuthenticationError(response);
    });

    test('should reject request with invalid token', async () => {
      const response = await testHelpers.invalidTokenRequest('get', '/api/v1/auth/me');
      testHelpers.expectAuthenticationError(response);
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await testHelpers.createTestUser();
    });

    test('should update user profile with valid data', async () => {
      const updateData = {
        first_name: 'Updated',
        last_name: 'Name',
        phone: '+9876543210',
        preferences: { theme: 'dark', notifications: true }
      };

      const response = await testHelpers.authenticatedRequest('put', '/api/v1/auth/profile', testUser)
        .send(updateData);

      testHelpers.expectSuccessResponse(response, 200);
      
      expect(response.body.data.user.first_name).toBe(updateData.first_name);
      expect(response.body.data.user.last_name).toBe(updateData.last_name);
      expect(response.body.data.user.phone).toBe(updateData.phone);

      // Verify database was updated
      const updatedUser = await db('users').where('id', testUser.id).first();
      expect(updatedUser.first_name).toBe(updateData.first_name);
      expect(JSON.parse(updatedUser.preferences)).toEqual(updateData.preferences);
    });

    test('should reject update with no fields', async () => {
      const response = await testHelpers.authenticatedRequest('put', '/api/v1/auth/profile', testUser)
        .send({});

      testHelpers.expectErrorResponse(response, 400, 'No valid fields to update');
    });

    test('should reject update with invalid phone number', async () => {
      const updateData = {
        phone: 'invalid-phone'
      };

      const response = await testHelpers.authenticatedRequest('put', '/api/v1/auth/profile', testUser)
        .send(updateData);

      testHelpers.expectValidationError(response, 'phone');
    });

    test('should not allow updating restricted fields', async () => {
      const updateData = {
        email: 'newemail@test.com',
        role: 'admin',
        status: 'inactive'
      };

      const response = await testHelpers.authenticatedRequest('put', '/api/v1/auth/profile', testUser)
        .send(updateData);

      testHelpers.expectErrorResponse(response, 400, 'No valid fields to update');

      // Verify restricted fields were not updated
      const unchangedUser = await db('users').where('id', testUser.id).first();
      expect(unchangedUser.email).toBe(testUser.email);
      expect(unchangedUser.role).toBe(testUser.role);
      expect(unchangedUser.status).toBe(testUser.status);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await testHelpers.createTestUser();
    });

    test('should logout successfully with valid token', async () => {
      const response = await testHelpers.authenticatedRequest('post', '/api/v1/auth/logout', testUser);

      testHelpers.expectSuccessResponse(response, 200);
      expect(response.body.message).toBe('Logged out successfully');
    });

    test('should reject logout without authentication', async () => {
      const response = await testHelpers.unauthenticatedRequest('post', '/api/v1/auth/logout');
      testHelpers.expectAuthenticationError(response);
    });
  });

  describe('JWT Token Generation', () => {
    test('should generate tokens with correct structure', () => {
      const userId = 123;
      const accessToken = jwt.sign(
        { userId, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      // Verify access token
      const decodedAccess = jwt.verify(accessToken, process.env.JWT_SECRET);
      expect(decodedAccess.userId).toBe(userId);
      expect(decodedAccess.type).toBe('access');
      expect(decodedAccess.exp).toBeDefined();

      // Verify refresh token
      const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
      expect(decodedRefresh.userId).toBe(userId);
      expect(decodedRefresh.type).toBe('refresh');
      expect(decodedRefresh.exp).toBeDefined();
    });
  });
});