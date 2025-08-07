const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { testUsers, hashTestPasswords } = require('../fixtures/testData');

class TestHelpers {
  constructor(app, db) {
    this.app = app;
    this.db = db;
    this.createdRecords = {
      users: [],
      clients: [],
      projects: [],
      communication_logs: []
    };
  }

  // Authentication helpers
  async createTestUser(userData = {}) {
    const hashedUsers = await hashTestPasswords();
    const defaultUser = hashedUsers.user;
    
    const user = {
      ...defaultUser,
      ...userData,
      password_hash: userData.password ? 
        await bcrypt.hash(userData.password, 10) : 
        defaultUser.password_hash
    };

    const [createdUser] = await this.db('users').insert(user).returning('*');
    this.createdRecords.users.push(createdUser.id);
    return createdUser;
  }

  async createTestClient(clientData = {}, userId = null) {
    const { testClients } = require('../fixtures/testData');
    let assignedTo = userId;
    
    if (!assignedTo) {
      const testUser = await this.createTestUser();
      assignedTo = testUser.id;
    }

    const client = {
      client_code: `TEST${Math.floor(Math.random() * 9999).toString().padStart(3, '0')}`,
      ...testClients.prospect,
      ...clientData,
      assigned_to: assignedTo,
      created_by: assignedTo,
      unsubscribe_token: require('crypto').randomBytes(32).toString('hex')
    };

    const [createdClient] = await this.db('clients').insert(client).returning('*');
    this.createdRecords.clients.push(createdClient.id);
    return createdClient;
  }

  async createTestProject(projectData = {}, clientId = null, userId = null) {
    const { testProjects } = require('../fixtures/testData');
    
    let assignedClientId = clientId;
    let assignedUserId = userId;
    
    if (!assignedClientId) {
      const testClient = await this.createTestClient();
      assignedClientId = testClient.id;
      assignedUserId = testClient.assigned_to;
    }
    
    if (!assignedUserId) {
      const testUser = await this.createTestUser();
      assignedUserId = testUser.id;
    }

    const project = {
      ...testProjects.website,
      ...projectData,
      client_id: assignedClientId,
      assigned_to: assignedUserId,
      created_by: assignedUserId
    };

    const [createdProject] = await this.db('projects').insert(project).returning('*');
    this.createdRecords.projects.push(createdProject.id);
    return createdProject;
  }

  generateAuthToken(userId, role = 'user', type = 'access') {
    return jwt.sign(
      { userId, role, type },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  generateExpiredToken(userId, role = 'user') {
    return jwt.sign(
      { userId, role, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '0s' }
    );
  }

  generateInvalidToken() {
    return 'invalid-token-format';
  }

  // API request helpers
  async authenticatedRequest(method = 'get', url = '/', user = null) {
    let testUser = user;
    if (!testUser) {
      testUser = await this.createTestUser();
    }
    
    const token = this.generateAuthToken(testUser.id, testUser.role);
    
    return request(this.app)
      [method](url)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json');
  }

  async adminRequest(method = 'get', url = '/') {
    const adminUser = await this.createTestUser({ role: 'admin' });
    return this.authenticatedRequest(method, url, adminUser);
  }

  async unauthenticatedRequest(method = 'get', url = '/') {
    return request(this.app)
      [method](url)
      .set('Accept', 'application/json');
  }

  async expiredTokenRequest(method = 'get', url = '/') {
    const testUser = await this.createTestUser();
    const expiredToken = this.generateExpiredToken(testUser.id, testUser.role);
    
    return request(this.app)
      [method](url)
      .set('Authorization', `Bearer ${expiredToken}`)
      .set('Accept', 'application/json');
  }

  async invalidTokenRequest(method = 'get', url = '/') {
    const invalidToken = this.generateInvalidToken();
    
    return request(this.app)
      [method](url)
      .set('Authorization', `Bearer ${invalidToken}`)
      .set('Accept', 'application/json');
  }

  // Database helpers
  async cleanupTestData() {
    try {
      // Clean up in reverse order of dependencies
      for (const projectId of this.createdRecords.projects) {
        await this.db('projects').where('id', projectId).del();
      }
      
      for (const clientId of this.createdRecords.clients) {
        await this.db('clients').where('id', clientId).del();
      }
      
      for (const userId of this.createdRecords.users) {
        await this.db('users').where('id', userId).del();
      }

      // Reset tracking arrays
      this.createdRecords = {
        users: [],
        clients: [],
        projects: [],
        communication_logs: []
      };
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  }

  async resetDatabase() {
    const tables = [
      'communication_log',
      'automation_executions', 
      'projects',
      'clients',
      'users'
    ];

    for (const table of tables) {
      try {
        await this.db(table).del();
      } catch (error) {
        // Table might not exist, ignore error
        console.warn(`Warning: Could not clean table ${table}:`, error.message);
      }
    }
  }

  // Assertion helpers
  expectSuccessResponse(response, expectedStatus = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('status', 'success');
    return response.body;
  }

  expectErrorResponse(response, expectedStatus, expectedMessage = null) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('status', 'fail');
    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
    return response.body;
  }

  expectValidationError(response, fieldName = null) {
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('status', 'fail');
    expect(response.body).toHaveProperty('errors');
    
    if (fieldName) {
      const fieldError = response.body.errors.find(error => 
        error.path === fieldName || error.param === fieldName
      );
      expect(fieldError).toBeDefined();
    }
    
    return response.body;
  }

  expectAuthenticationError(response) {
    return this.expectErrorResponse(response, 401);
  }

  expectAuthorizationError(response) {
    return this.expectErrorResponse(response, 403);
  }

  expectNotFoundError(response) {
    return this.expectErrorResponse(response, 404);
  }

  // Utility helpers
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateRandomEmail() {
    return `test-${Date.now()}-${Math.random().toString(36).substring(2)}@example.com`;
  }

  generateRandomString(length = 10) {
    return Math.random().toString(36).substring(2, length + 2);
  }

  sanitizeDbResult(result) {
    // Remove or format database-specific fields for testing
    if (Array.isArray(result)) {
      return result.map(this.sanitizeDbResult);
    }
    
    if (result && typeof result === 'object') {
      const sanitized = { ...result };
      
      // Convert dates to ISO strings for comparison
      ['created_at', 'updated_at', 'deleted_at', 'last_login'].forEach(field => {
        if (sanitized[field]) {
          sanitized[field] = new Date(sanitized[field]).toISOString();
        }
      });
      
      return sanitized;
    }
    
    return result;
  }
}

module.exports = TestHelpers;