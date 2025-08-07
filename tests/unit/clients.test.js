const request = require('supertest');
const path = require('path');

// Load the main CRM application from the adjacent directory
const app = require(path.join(__dirname, '../../../ace crm/server.js'));
const { db } = require(path.join(__dirname, '../../../ace crm/src/config/database.js'));
const TestHelpers = require('../helpers/testHelpers');
const { testClients, generateRandomClient } = require('../fixtures/testData');

describe('Clients Unit Tests', () => {
  let testHelpers;
  let testUser;
  let adminUser;

  beforeAll(async () => {
    testHelpers = new TestHelpers(app, db);
  });

  beforeEach(async () => {
    testUser = await testHelpers.createTestUser({ role: 'user' });
    adminUser = await testHelpers.createTestUser({ role: 'admin' });
  });

  afterEach(async () => {
    await testHelpers.cleanupTestData();
  });

  afterAll(async () => {
    await testHelpers.resetDatabase();
    await db.destroy();
  });

  describe('GET /api/v1/clients', () => {
    let testClient1, testClient2, testClient3;

    beforeEach(async () => {
      testClient1 = await testHelpers.createTestClient({ 
        ...testClients.prospect,
        email: 'client1@test.com',
        status: 'prospect'
      }, testUser.id);
      
      testClient2 = await testHelpers.createTestClient({ 
        ...testClients.qualified,
        email: 'client2@test.com',
        status: 'qualified'
      }, testUser.id);
      
      testClient3 = await testHelpers.createTestClient({ 
        ...testClients.client,
        email: 'client3@test.com',
        status: 'client'
      }, adminUser.id);
    });

    test('should get all clients for admin user', async () => {
      const response = await testHelpers.authenticatedRequest('get', '/api/v1/clients', adminUser);

      testHelpers.expectSuccessResponse(response, 200);
      expect(response.body.data.clients).toHaveLength(3);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.totalItems).toBe(3);
    });

    test('should get only assigned clients for regular user', async () => {
      const response = await testHelpers.authenticatedRequest('get', '/api/v1/clients', testUser);

      testHelpers.expectSuccessResponse(response, 200);
      expect(response.body.data.clients).toHaveLength(2);
      
      // Verify only assigned clients are returned
      response.body.data.clients.forEach(client => {
        expect(client.assigned_to).toBe(testUser.id);
      });
    });

    test('should filter clients by status', async () => {
      const response = await testHelpers.authenticatedRequest('get', '/api/v1/clients?status=prospect', testUser);

      testHelpers.expectSuccessResponse(response, 200);
      expect(response.body.data.clients).toHaveLength(1);
      expect(response.body.data.clients[0].status).toBe('prospect');
    });

    test('should search clients by name', async () => {
      const response = await testHelpers.authenticatedRequest('get', '/api/v1/clients?search=John', testUser);

      testHelpers.expectSuccessResponse(response, 200);
      expect(response.body.data.clients).toHaveLength(1);
      expect(response.body.data.clients[0].first_name).toBe('John');
    });

    test('should search clients by company', async () => {
      const response = await testHelpers.authenticatedRequest('get', '/api/v1/clients?search=Prospect', testUser);

      testHelpers.expectSuccessResponse(response, 200);
      expect(response.body.data.clients).toHaveLength(1);
      expect(response.body.data.clients[0].company).toContain('Prospect');
    });

    test('should paginate results', async () => {
      const response = await testHelpers.authenticatedRequest('get', '/api/v1/clients?page=1&limit=1', testUser);

      testHelpers.expectSuccessResponse(response, 200);
      expect(response.body.data.clients).toHaveLength(1);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalPages).toBe(2);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });

    test('should sort clients', async () => {
      const response = await testHelpers.authenticatedRequest('get', '/api/v1/clients?sort_by=first_name&sort_order=asc', testUser);

      testHelpers.expectSuccessResponse(response, 200);
      expect(response.body.data.clients[0].first_name).toBe('John'); // Alphabetically first
    });

    test('should reject request without authentication', async () => {
      const response = await testHelpers.unauthenticatedRequest('get', '/api/v1/clients');
      testHelpers.expectAuthenticationError(response);
    });

    test('should validate query parameters', async () => {
      const response = await testHelpers.authenticatedRequest('get', '/api/v1/clients?page=0&limit=101', testUser);

      testHelpers.expectValidationError(response);
    });

    test('should filter by engagement level', async () => {
      const response = await testHelpers.authenticatedRequest('get', '/api/v1/clients?engagement_level=hot', adminUser);

      testHelpers.expectSuccessResponse(response, 200);
      response.body.data.clients.forEach(client => {
        expect(client.engagement_level).toBe('hot');
      });
    });
  });

  describe('GET /api/v1/clients/:id', () => {
    let testClient;

    beforeEach(async () => {
      testClient = await testHelpers.createTestClient(testClients.prospect, testUser.id);
    });

    test('should get client details with related data', async () => {
      const response = await testHelpers.authenticatedRequest('get', `/api/v1/clients/${testClient.id}`, testUser);

      testHelpers.expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('client');
      expect(response.body.data).toHaveProperty('projects');
      expect(response.body.data).toHaveProperty('communications');
      expect(response.body.data).toHaveProperty('automations');
      
      expect(response.body.data.client.id).toBe(testClient.id);
      expect(response.body.data.client.email).toBe(testClient.email);
    });

    test('should reject access to unassigned client for regular user', async () => {
      const otherUserClient = await testHelpers.createTestClient(testClients.qualified, adminUser.id);
      
      const response = await testHelpers.authenticatedRequest('get', `/api/v1/clients/${otherUserClient.id}`, testUser);

      testHelpers.expectAuthorizationError(response);
    });

    test('should allow admin access to any client', async () => {
      const response = await testHelpers.authenticatedRequest('get', `/api/v1/clients/${testClient.id}`, adminUser);

      testHelpers.expectSuccessResponse(response, 200);
    });

    test('should return 404 for non-existent client', async () => {
      const response = await testHelpers.authenticatedRequest('get', '/api/v1/clients/99999', testUser);

      testHelpers.expectNotFoundError(response);
    });

    test('should return 404 for deleted client', async () => {
      await db('clients').where('id', testClient.id).update({ deleted_at: db.fn.now() });
      
      const response = await testHelpers.authenticatedRequest('get', `/api/v1/clients/${testClient.id}`, testUser);

      testHelpers.expectNotFoundError(response);
    });
  });

  describe('POST /api/v1/clients', () => {
    test('should create new client with valid data', async () => {
      const clientData = {
        email: 'newclient@test.com',
        first_name: 'New',
        last_name: 'Client',
        company: 'New Company',
        phone: '+1555000000',
        industry: 'Technology',
        lead_source: 'website',
        budget_min: 5000,
        budget_max: 15000,
        notes: 'Test client creation',
        tags: ['test', 'automation']
      };

      const response = await testHelpers.authenticatedRequest('post', '/api/v1/clients', testUser)
        .send(clientData);

      testHelpers.expectSuccessResponse(response, 201);
      
      expect(response.body.data.client.email).toBe(clientData.email);
      expect(response.body.data.client.client_code).toMatch(/^ACE\d{3}$/);
      expect(response.body.data.client.assigned_to).toBe(testUser.id);
      expect(response.body.data.client.created_by).toBe(testUser.id);
      expect(response.body.data.client.status).toBe('prospect');

      // Verify client was created in database
      const dbClient = await db('clients').where('id', response.body.data.client.id).first();
      expect(dbClient).toBeDefined();
      expect(JSON.parse(dbClient.tags)).toEqual(clientData.tags);
    });

    test('should assign client to specified user', async () => {
      const clientData = {
        email: 'assigned@test.com',
        first_name: 'Assigned',
        last_name: 'Client',
        assigned_to: adminUser.id
      };

      const response = await testHelpers.authenticatedRequest('post', '/api/v1/clients', testUser)
        .send(clientData);

      testHelpers.expectSuccessResponse(response, 201);
      expect(response.body.data.client.assigned_to).toBe(adminUser.id);
    });

    test('should reject creation with duplicate email', async () => {
      const clientData = {
        email: 'duplicate@test.com',
        first_name: 'Duplicate',
        last_name: 'Client'
      };

      // Create first client
      await testHelpers.createTestClient(clientData, testUser.id);

      // Try to create duplicate
      const response = await testHelpers.authenticatedRequest('post', '/api/v1/clients', testUser)
        .send(clientData);

      testHelpers.expectErrorResponse(response, 400, 'already exists');
    });

    test('should reject creation with invalid email', async () => {
      const clientData = {
        email: 'invalid-email',
        first_name: 'Test',
        last_name: 'Client'
      };

      const response = await testHelpers.authenticatedRequest('post', '/api/v1/clients', testUser)
        .send(clientData);

      testHelpers.expectValidationError(response, 'email');
    });

    test('should reject creation with missing required fields', async () => {
      const clientData = {
        email: 'incomplete@test.com'
        // Missing first_name and last_name
      };

      const response = await testHelpers.authenticatedRequest('post', '/api/v1/clients', testUser)
        .send(clientData);

      testHelpers.expectValidationError(response);
    });

    test('should reject creation with invalid assigned user', async () => {
      const clientData = {
        email: 'test@test.com',
        first_name: 'Test',
        last_name: 'Client',
        assigned_to: 99999
      };

      const response = await testHelpers.authenticatedRequest('post', '/api/v1/clients', testUser)
        .send(clientData);

      testHelpers.expectErrorResponse(response, 400, 'not found or inactive');
    });

    test('should generate unique client codes', async () => {
      const clients = [];
      
      for (let i = 0; i < 3; i++) {
        const clientData = {
          email: `client${i}@test.com`,
          first_name: 'Test',
          last_name: `Client${i}`
        };

        const response = await testHelpers.authenticatedRequest('post', '/api/v1/clients', testUser)
          .send(clientData);

        testHelpers.expectSuccessResponse(response, 201);
        clients.push(response.body.data.client.client_code);
      }

      // Verify all client codes are unique
      const uniqueCodes = new Set(clients);
      expect(uniqueCodes.size).toBe(3);
    });
  });

  describe('PUT /api/v1/clients/:id', () => {
    let testClient;

    beforeEach(async () => {
      testClient = await testHelpers.createTestClient(testClients.prospect, testUser.id);
    });

    test('should update client with valid data', async () => {
      const updateData = {
        first_name: 'Updated',
        last_name: 'Name',
        company: 'Updated Company',
        status: 'qualified',
        lead_score: 85,
        engagement_level: 'hot',
        notes: 'Updated notes',
        tags: ['updated', 'qualified']
      };

      const response = await testHelpers.authenticatedRequest('put', `/api/v1/clients/${testClient.id}`, testUser)
        .send(updateData);

      testHelpers.expectSuccessResponse(response, 200);
      
      expect(response.body.data.client.first_name).toBe(updateData.first_name);
      expect(response.body.data.client.status).toBe(updateData.status);
      expect(response.body.data.client.lead_score).toBe(updateData.lead_score);

      // Verify database was updated
      const dbClient = await db('clients').where('id', testClient.id).first();
      expect(JSON.parse(dbClient.tags)).toEqual(updateData.tags);
    });

    test('should reject update with duplicate email', async () => {
      const existingClient = await testHelpers.createTestClient({
        email: 'existing@test.com',
        first_name: 'Existing',
        last_name: 'Client'
      }, testUser.id);

      const updateData = {
        email: 'existing@test.com'
      };

      const response = await testHelpers.authenticatedRequest('put', `/api/v1/clients/${testClient.id}`, testUser)
        .send(updateData);

      testHelpers.expectErrorResponse(response, 400, 'already exists');
    });

    test('should reject update from unauthorized user', async () => {
      const otherUser = await testHelpers.createTestUser({ role: 'user' });
      
      const updateData = {
        first_name: 'Unauthorized Update'
      };

      const response = await testHelpers.authenticatedRequest('put', `/api/v1/clients/${testClient.id}`, otherUser)
        .send(updateData);

      testHelpers.expectAuthorizationError(response);
    });

    test('should allow admin to update any client', async () => {
      const updateData = {
        first_name: 'Admin Updated'
      };

      const response = await testHelpers.authenticatedRequest('put', `/api/v1/clients/${testClient.id}`, adminUser)
        .send(updateData);

      testHelpers.expectSuccessResponse(response, 200);
      expect(response.body.data.client.first_name).toBe(updateData.first_name);
    });

    test('should reject update with no valid fields', async () => {
      const response = await testHelpers.authenticatedRequest('put', `/api/v1/clients/${testClient.id}`, testUser)
        .send({});

      testHelpers.expectErrorResponse(response, 400, 'No valid fields to update');
    });

    test('should validate updated fields', async () => {
      const updateData = {
        email: 'invalid-email',
        lead_score: 150 // Invalid score > 100
      };

      const response = await testHelpers.authenticatedRequest('put', `/api/v1/clients/${testClient.id}`, testUser)
        .send(updateData);

      testHelpers.expectValidationError(response);
    });

    test('should return 404 for non-existent client', async () => {
      const updateData = {
        first_name: 'Update'
      };

      const response = await testHelpers.authenticatedRequest('put', '/api/v1/clients/99999', testUser)
        .send(updateData);

      testHelpers.expectNotFoundError(response);
    });
  });

  describe('DELETE /api/v1/clients/:id', () => {
    let testClient;

    beforeEach(async () => {
      testClient = await testHelpers.createTestClient(testClients.prospect, testUser.id);
    });

    test('should soft delete client', async () => {
      const response = await testHelpers.authenticatedRequest('delete', `/api/v1/clients/${testClient.id}`, testUser);

      testHelpers.expectSuccessResponse(response, 200);
      expect(response.body.message).toBe('Client deleted successfully');

      // Verify client was soft deleted
      const dbClient = await db('clients').where('id', testClient.id).first();
      expect(dbClient.deleted_at).not.toBeNull();
    });

    test('should reject deletion from unauthorized user', async () => {
      const otherUser = await testHelpers.createTestUser({ role: 'user' });
      
      const response = await testHelpers.authenticatedRequest('delete', `/api/v1/clients/${testClient.id}`, otherUser);

      testHelpers.expectAuthorizationError(response);
    });

    test('should allow admin to delete any client', async () => {
      const response = await testHelpers.authenticatedRequest('delete', `/api/v1/clients/${testClient.id}`, adminUser);

      testHelpers.expectSuccessResponse(response, 200);
    });

    test('should return 404 for non-existent client', async () => {
      const response = await testHelpers.authenticatedRequest('delete', '/api/v1/clients/99999', testUser);

      testHelpers.expectNotFoundError(response);
    });

    test('should return 404 for already deleted client', async () => {
      await db('clients').where('id', testClient.id).update({ deleted_at: db.fn.now() });
      
      const response = await testHelpers.authenticatedRequest('delete', `/api/v1/clients/${testClient.id}`, testUser);

      testHelpers.expectNotFoundError(response);
    });
  });

  describe('POST /api/v1/clients/:id/notes', () => {
    let testClient;

    beforeEach(async () => {
      testClient = await testHelpers.createTestClient(testClients.prospect, testUser.id);
    });

    test('should add note to client', async () => {
      const noteData = {
        content: 'This is a test note for the client'
      };

      const response = await testHelpers.authenticatedRequest('post', `/api/v1/clients/${testClient.id}/notes`, testUser)
        .send(noteData);

      testHelpers.expectSuccessResponse(response, 201);
      expect(response.body.message).toBe('Note added successfully');

      // Verify note was added to communication log
      const dbNote = await db('communication_log')
        .where('client_id', testClient.id)
        .where('type', 'note')
        .first();
      
      expect(dbNote).toBeDefined();
      expect(dbNote.content).toBe(noteData.content);
      expect(dbNote.user_id).toBe(testUser.id);
    });

    test('should reject note with empty content', async () => {
      const noteData = {
        content: ''
      };

      const response = await testHelpers.authenticatedRequest('post', `/api/v1/clients/${testClient.id}/notes`, testUser)
        .send(noteData);

      testHelpers.expectValidationError(response, 'content');
    });

    test('should reject note for unauthorized client', async () => {
      const otherUser = await testHelpers.createTestUser({ role: 'user' });
      
      const noteData = {
        content: 'Unauthorized note'
      };

      const response = await testHelpers.authenticatedRequest('post', `/api/v1/clients/${testClient.id}/notes`, otherUser)
        .send(noteData);

      testHelpers.expectAuthorizationError(response);
    });

    test('should return 404 for non-existent client', async () => {
      const noteData = {
        content: 'Note for non-existent client'
      };

      const response = await testHelpers.authenticatedRequest('post', '/api/v1/clients/99999/notes', testUser)
        .send(noteData);

      testHelpers.expectNotFoundError(response);
    });
  });

  describe('GET /api/v1/clients/stats/summary', () => {
    beforeEach(async () => {
      // Create test clients with different statuses
      await testHelpers.createTestClient({ ...testClients.prospect, email: 'p1@test.com' }, testUser.id);
      await testHelpers.createTestClient({ ...testClients.qualified, email: 'q1@test.com' }, testUser.id);
      await testHelpers.createTestClient({ ...testClients.client, email: 'c1@test.com' }, testUser.id);
    });

    test('should return client statistics for user', async () => {
      const response = await testHelpers.authenticatedRequest('get', '/api/v1/clients/stats/summary', testUser);

      testHelpers.expectSuccessResponse(response, 200);
      
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data.stats).toHaveProperty('totalClients');
      expect(response.body.data.stats).toHaveProperty('prospects');
      expect(response.body.data.stats).toHaveProperty('qualified');
      expect(response.body.data.stats).toHaveProperty('activeClients');
      expect(response.body.data.stats).toHaveProperty('hotLeads');
      expect(response.body.data.stats).toHaveProperty('avgLeadScore');
      expect(response.body.data.stats).toHaveProperty('newThisMonth');

      expect(response.body.data.stats.totalClients).toBe(3);
      expect(response.body.data.stats.prospects).toBe(1);
      expect(response.body.data.stats.qualified).toBe(1);
      expect(response.body.data.stats.activeClients).toBe(1);
    });

    test('should return comprehensive statistics for admin', async () => {
      // Create additional client for admin
      await testHelpers.createTestClient({ ...testClients.prospect, email: 'admin1@test.com' }, adminUser.id);

      const response = await testHelpers.authenticatedRequest('get', '/api/v1/clients/stats/summary', adminUser);

      testHelpers.expectSuccessResponse(response, 200);
      expect(response.body.data.stats.totalClients).toBe(4); // Admin sees all clients
    });

    test('should reject request without authentication', async () => {
      const response = await testHelpers.unauthenticatedRequest('get', '/api/v1/clients/stats/summary');
      testHelpers.expectAuthenticationError(response);
    });
  });
});