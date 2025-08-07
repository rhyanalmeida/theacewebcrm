const request = require('supertest');
const path = require('path');

// Load the main CRM application
const app = require(path.join(__dirname, '../../ace-crm/server.js'));
const { db } = require(path.join(__dirname, '../../ace-crm/src/config/database.js'));
const TestHelpers = require('../helpers/testHelpers');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

describe('End-to-End User Flows - Complete System Validation', () => {
  let testHelpers;
  let testCompany, testUser, testProject, testInvoice;
  let authToken;

  beforeAll(async () => {
    testHelpers = new TestHelpers(app, db);
    await testHelpers.setupTestDatabase();
  });

  afterAll(async () => {
    await testHelpers.resetDatabase();
    await db.destroy();
  });

  describe('Complete Business Workflow - Prospect to Paid Client', () => {
    test('CRITICAL: Full business cycle from prospect registration to project completion and payment', async () => {
      // ==========================================
      // PHASE 1: PROSPECT REGISTRATION & QUALIFICATION
      // ==========================================
      
      const prospectData = {
        email: 'prospect@completeworkflow.com',
        password: 'SecurePass123!',
        first_name: 'Complete',
        last_name: 'Workflow',
        company_name: 'Complete Workflow LLC',
        phone: '+1555000001',
        industry: 'Technology',
        project_type: 'website_redesign',
        budget_range: '15000-25000',
        timeline: 'Q2_2025',
        lead_source: 'website_form'
      };

      // Step 1: Prospect registers via client portal
      const registrationResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(prospectData);

      expect(registrationResponse.status).toBe(201);
      expect(registrationResponse.body.success).toBe(true);
      expect(registrationResponse.body.data.user.email).toBe(prospectData.email);
      
      const userId = registrationResponse.body.data.user.id;
      authToken = registrationResponse.body.data.tokens.accessToken;

      // Step 2: Prospect fills out detailed project requirements
      const projectRequirementsData = {
        project_name: 'Complete Website Redesign',
        project_description: 'Full website redesign with modern UI/UX, mobile-responsive design, and CMS integration',
        desired_features: [
          'responsive_design',
          'cms_integration', 
          'ecommerce',
          'seo_optimization',
          'analytics_integration'
        ],
        technical_requirements: {
          cms: 'WordPress',
          hosting: 'managed_hosting',
          third_party_integrations: ['Google Analytics', 'Mailchimp', 'Stripe']
        },
        content_migration: true,
        seo_requirements: true,
        performance_requirements: {
          page_load_speed: '< 3 seconds',
          lighthouse_score: '> 90'
        }
      };

      const requirementsResponse = await request(app)
        .post('/api/v1/projects/requirements')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectRequirementsData);

      expect(requirementsResponse.status).toBe(201);

      // ==========================================
      // PHASE 2: SALES PROCESS & PROPOSAL
      // ==========================================

      // Step 3: Sales team creates lead record
      const adminUser = await testHelpers.createTestUser({ role: 'admin' });
      const adminToken = testHelpers.generateAuthToken(adminUser.id, 'admin');

      const leadData = {
        client_id: userId,
        status: 'new',
        lead_source: 'website_form',
        lead_score: 75,
        assigned_to: adminUser.id,
        notes: 'High-quality lead with clear requirements and realistic budget',
        priority: 'high',
        follow_up_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const leadResponse = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(leadData);

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.data.lead.id;

      // Step 4: Generate and send proposal
      const proposalData = {
        lead_id: leadId,
        title: 'Website Redesign Proposal - Complete Workflow LLC',
        scope_of_work: [
          'Discovery and requirements analysis',
          'UI/UX design and prototyping', 
          'Frontend development with responsive design',
          'CMS setup and configuration',
          'Content migration and optimization',
          'SEO implementation',
          'Testing and quality assurance',
          'Training and documentation',
          'Launch and post-launch support'
        ],
        deliverables: [
          'Design mockups and prototypes',
          'Fully functional website',
          'Content management system',
          'SEO-optimized content',
          'Analytics setup',
          'Training materials',
          '30 days of support'
        ],
        timeline_weeks: 8,
        total_amount: 22500,
        payment_schedule: [
          { milestone: 'Project kickoff', percentage: 30, amount: 6750 },
          { milestone: 'Design approval', percentage: 30, amount: 6750 },
          { milestone: 'Development completion', percentage: 30, amount: 6750 },
          { milestone: 'Launch and final delivery', percentage: 10, amount: 2250 }
        ],
        terms_and_conditions: 'Standard terms apply with 30-day payment terms'
      };

      const proposalResponse = await request(app)
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(proposalData);

      expect(proposalResponse.status).toBe(201);
      const proposalId = proposalResponse.body.data.proposal.id;

      // Step 5: Client reviews and accepts proposal
      const acceptProposalResponse = await request(app)
        .post(`/api/v1/proposals/${proposalId}/accept`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          client_signature: 'Complete Workflow',
          acceptance_date: new Date().toISOString(),
          notes: 'Excited to move forward with this project!'
        });

      expect(acceptProposalResponse.status).toBe(200);

      // ==========================================
      // PHASE 3: PROJECT SETUP & CONTRACT
      // ==========================================

      // Step 6: Convert lead to deal and create project
      const dealData = {
        lead_id: leadId,
        name: 'Complete Workflow Website Redesign',
        value: 22500,
        stage: 'contract',
        probability: 90,
        expected_close_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        contract_signed: true,
        assigned_to: adminUser.id
      };

      const dealResponse = await request(app)
        .post('/api/v1/deals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dealData);

      expect(dealResponse.status).toBe(201);
      const dealId = dealResponse.body.data.deal.id;

      // Step 7: Create project from approved deal
      const projectData = {
        deal_id: dealId,
        name: 'Complete Workflow Website Redesign',
        description: 'Full website redesign with modern UI/UX and CMS integration',
        client_id: userId,
        project_manager_id: adminUser.id,
        status: 'planning',
        start_date: new Date().toISOString(),
        estimated_end_date: new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString(),
        budget: 22500,
        project_type: 'website_redesign',
        priority: 'high',
        billing_type: 'milestone'
      };

      const projectResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(projectData);

      expect(projectResponse.status).toBe(201);
      testProject = projectResponse.body.data.project;

      // ==========================================
      // PHASE 4: PAYMENT PROCESSING
      // ==========================================

      // Step 8: Create and send first milestone invoice
      const invoiceData = {
        project_id: testProject.id,
        client_id: userId,
        invoice_number: `INV-${Date.now()}`,
        milestone: 'Project kickoff - 30%',
        amount: 6750,
        tax_rate: 8.5,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        line_items: [
          {
            description: 'Project kickoff and discovery phase',
            quantity: 1,
            unit_price: 6750,
            total: 6750
          }
        ],
        payment_terms: 'Net 14 days',
        notes: 'Thank you for choosing our services!'
      };

      const invoiceResponse = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invoiceData);

      expect(invoiceResponse.status).toBe(201);
      testInvoice = invoiceResponse.body.data.invoice;

      // Step 9: Process payment via Stripe
      const paymentIntentData = {
        invoice_id: testInvoice.id,
        amount: Math.round((6750 + (6750 * 0.085)) * 100), // Amount in cents including tax
        currency: 'usd',
        payment_method_types: ['card'],
        metadata: {
          invoice_id: testInvoice.id,
          project_id: testProject.id,
          client_id: userId
        }
      };

      const paymentIntentResponse = await request(app)
        .post('/api/v1/payments/create-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentIntentData);

      expect(paymentIntentResponse.status).toBe(201);
      expect(paymentIntentResponse.body.data.client_secret).toBeDefined();

      // Simulate successful payment webhook
      const webhookData = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_' + Date.now(),
            amount: Math.round((6750 + (6750 * 0.085)) * 100),
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              invoice_id: testInvoice.id,
              project_id: testProject.id,
              client_id: userId
            }
          }
        }
      };

      const webhookResponse = await request(app)
        .post('/api/v1/webhooks/stripe')
        .send(webhookData);

      expect(webhookResponse.status).toBe(200);

      // ==========================================
      // PHASE 5: PROJECT EXECUTION & COLLABORATION
      // ==========================================

      // Step 10: Update project status and progress
      const progressUpdateData = {
        status: 'in_progress',
        progress_percentage: 25,
        current_phase: 'discovery',
        last_activity: new Date().toISOString(),
        notes: 'Kickoff meeting completed, moving into discovery phase'
      };

      const progressResponse = await request(app)
        .put(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(progressUpdateData);

      expect(progressResponse.status).toBe(200);

      // Step 11: Test real-time project collaboration features
      const projectChatData = {
        project_id: testProject.id,
        participants: [userId, adminUser.id],
        name: 'Complete Workflow Project Discussion'
      };

      const chatRoomResponse = await request(app)
        .post('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(projectChatData);

      expect(chatRoomResponse.status).toBe(201);

      // Step 12: File upload and sharing
      const mockFile = Buffer.from('Mock design document content');
      const fileUploadResponse = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', mockFile, 'design-mockup.pdf')
        .field('project_id', testProject.id)
        .field('file_type', 'document')
        .field('description', 'Initial design mockups for review');

      expect(fileUploadResponse.status).toBe(201);

      // ==========================================
      // PHASE 6: COMPLETION & FINAL BILLING
      // ==========================================

      // Step 13: Mark project as completed
      const completionData = {
        status: 'completed',
        progress_percentage: 100,
        completion_date: new Date().toISOString(),
        final_deliverables: [
          'Fully functional website',
          'Content management system',
          'SEO optimization',
          'Analytics setup',
          'Training documentation'
        ],
        client_approval: true,
        notes: 'Project successfully completed and delivered'
      };

      const completionResponse = await request(app)
        .put(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(completionData);

      expect(completionResponse.status).toBe(200);

      // Step 14: Generate final invoice
      const finalInvoiceData = {
        project_id: testProject.id,
        client_id: userId,
        invoice_number: `INV-FINAL-${Date.now()}`,
        milestone: 'Project completion - Final 10%',
        amount: 2250,
        tax_rate: 8.5,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        line_items: [
          {
            description: 'Final deliverables and project completion',
            quantity: 1,
            unit_price: 2250,
            total: 2250
          }
        ]
      };

      const finalInvoiceResponse = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(finalInvoiceData);

      expect(finalInvoiceResponse.status).toBe(201);

      // ==========================================
      // PHASE 7: ANALYTICS & REPORTING
      // ==========================================

      // Step 15: Verify analytics and reporting
      const analyticsResponse = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.data.projects.completed).toBeGreaterThanOrEqual(1);
      expect(analyticsResponse.body.data.revenue.total).toBeGreaterThanOrEqual(6750);

      // Step 16: Generate project completion report
      const reportResponse = await request(app)
        .get(`/api/v1/reports/project/${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(reportResponse.status).toBe(200);
      expect(reportResponse.body.data.report.project_id).toBe(testProject.id);
      expect(reportResponse.body.data.report.status).toBe('completed');

      // ==========================================
      // VERIFICATION & ASSERTIONS
      // ==========================================

      // Verify complete workflow data integrity
      const finalProjectResponse = await request(app)
        .get(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(finalProjectResponse.status).toBe(200);
      expect(finalProjectResponse.body.data.project.status).toBe('completed');
      expect(finalProjectResponse.body.data.project.progress_percentage).toBe(100);

      // Verify client satisfaction tracking
      const satisfactionData = {
        project_id: testProject.id,
        overall_rating: 5,
        communication_rating: 5,
        quality_rating: 5,
        timeline_rating: 4,
        value_rating: 5,
        comments: 'Excellent work! Very pleased with the final result.',
        would_recommend: true,
        would_work_again: true
      };

      const satisfactionResponse = await request(app)
        .post('/api/v1/feedback/project')
        .set('Authorization', `Bearer ${authToken}`)
        .send(satisfactionData);

      expect(satisfactionResponse.status).toBe(201);

      console.log('✅ COMPLETE BUSINESS WORKFLOW TEST PASSED');
      console.log('📊 Workflow completed successfully from prospect to paid client');
      console.log(`💰 Total revenue processed: $${6750 + 2250}`);
      console.log(`⭐ Client satisfaction rating: ${satisfactionData.overall_rating}/5`);
    }, 60000); // 60 second timeout for complete workflow
  });

  describe('Multi-User Role-Based Access Control', () => {
    test('SECURITY: Role-based permissions across all system features', async () => {
      // Create users with different roles
      const adminUser = await testHelpers.createTestUser({ 
        role: 'admin',
        email: 'admin@rbac.test.com',
        permissions: ['*'] // All permissions
      });

      const managerUser = await testHelpers.createTestUser({ 
        role: 'project_manager',
        email: 'manager@rbac.test.com',
        permissions: ['projects:*', 'clients:read', 'invoices:*']
      });

      const salesUser = await testHelpers.createTestUser({ 
        role: 'sales',
        email: 'sales@rbac.test.com',
        permissions: ['leads:*', 'deals:*', 'clients:*']
      });

      const clientUser = await testHelpers.createTestUser({ 
        role: 'client',
        email: 'client@rbac.test.com',
        permissions: ['projects:read', 'invoices:read', 'files:read']
      });

      const adminToken = testHelpers.generateAuthToken(adminUser.id, 'admin');
      const managerToken = testHelpers.generateAuthToken(managerUser.id, 'project_manager');
      const salesToken = testHelpers.generateAuthToken(salesUser.id, 'sales');
      const clientToken = testHelpers.generateAuthToken(clientUser.id, 'client');

      // Test admin access (should access everything)
      const adminProjectsResponse = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminProjectsResponse.status).toBe(200);

      const adminUsersResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminUsersResponse.status).toBe(200);

      // Test project manager access (should access projects but not user management)
      const managerProjectsResponse = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(managerProjectsResponse.status).toBe(200);

      const managerUsersResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(managerUsersResponse.status).toBe(403); // Forbidden

      // Test sales user access (should access leads/deals but not projects)
      const salesLeadsResponse = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${salesToken}`);
      expect(salesLeadsResponse.status).toBe(200);

      const salesProjectsResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ name: 'Test Project' });
      expect(salesProjectsResponse.status).toBe(403); // Forbidden

      // Test client access (read-only access to their own data)
      const clientInvoicesResponse = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${clientToken}`);
      expect(clientInvoicesResponse.status).toBe(200);

      const clientCreateProjectResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ name: 'Unauthorized Project' });
      expect(clientCreateProjectResponse.status).toBe(403); // Forbidden

      console.log('✅ ROLE-BASED ACCESS CONTROL TEST PASSED');
    }, 30000);
  });

  describe('Data Security and Validation', () => {
    test('SECURITY: Input sanitization and injection prevention', async () => {
      const testUser = await testHelpers.createTestUser({ role: 'user' });
      const token = testHelpers.generateAuthToken(testUser.id, 'user');

      // Test SQL injection attempts
      const sqlInjectionData = {
        email: 'test@example.com',
        first_name: "'; DROP TABLE users; --",
        last_name: "1' OR '1'='1",
        company: "${process.env.DATABASE_URL}",
        notes: "<script>alert('XSS')</script>"
      };

      const injectionResponse = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${token}`)
        .send(sqlInjectionData);

      expect(injectionResponse.status).toBe(201);
      
      // Verify data was sanitized
      const contactId = injectionResponse.body.data.contact.id;
      const contact = await db('contacts').where('id', contactId).first();
      
      expect(contact.first_name).not.toContain('DROP TABLE');
      expect(contact.last_name).not.toContain("1' OR '1'='1");
      expect(contact.company).not.toContain('${process.env');
      expect(contact.notes).not.toContain('<script>');

      console.log('✅ INPUT SANITIZATION TEST PASSED');
    }, 15000);

    test('SECURITY: Rate limiting and DDoS protection', async () => {
      const testUser = await testHelpers.createTestUser({ role: 'user' });
      const token = testHelpers.generateAuthToken(testUser.id, 'user');

      // Make rapid requests to test rate limiting
      const requests = Array(100).fill().map(() =>
        request(app)
          .get('/api/v1/contacts')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(responses[0].headers['x-ratelimit-limit']).toBeDefined();

      console.log('✅ RATE LIMITING TEST PASSED');
    }, 15000);
  });

  describe('Performance and Scalability', () => {
    test('PERFORMANCE: System handles large datasets efficiently', async () => {
      const testUser = await testHelpers.createTestUser({ role: 'admin' });
      const token = testHelpers.generateAuthToken(testUser.id, 'admin');

      // Create large dataset
      const contacts = Array(1000).fill().map((_, index) => ({
        email: `performance-test-${index}@example.com`,
        first_name: `Contact`,
        last_name: `${index}`,
        company: `Company ${index}`,
        created_at: new Date(),
        updated_at: new Date(),
        assigned_to: testUser.id
      }));

      await db('contacts').insert(contacts);

      // Test query performance
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/v1/contacts?limit=50&page=1')
        .set('Authorization', `Bearer ${token}`);
      const queryTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.contacts).toHaveLength(50);
      expect(queryTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`✅ PERFORMANCE TEST PASSED - Query time: ${queryTime}ms`);
    }, 30000);
  });
});