const request = require('supertest');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);

const app = require(path.join(__dirname, '../../ace-crm/server.js'));
const { db } = require(path.join(__dirname, '../../ace-crm/src/config/database.js'));
const TestHelpers = require('../helpers/testHelpers');

describe('Payment Processing End-to-End Tests', () => {
  let testHelpers;
  let testUser, testClient, testProject, testInvoice;
  let userToken, adminToken;

  beforeAll(async () => {
    testHelpers = new TestHelpers(app, db);
    await testHelpers.setupTestDatabase();
    
    // Setup test users
    testUser = await testHelpers.createTestUser({ role: 'admin' });
    adminToken = testHelpers.generateAuthToken(testUser.id, 'admin');
    
    testClient = await testHelpers.createTestUser({ role: 'client' });
    userToken = testHelpers.generateAuthToken(testClient.id, 'client');
  });

  afterAll(async () => {
    await testHelpers.resetDatabase();
    await db.destroy();
  });

  describe('Stripe Payment Integration', () => {
    test('PAYMENT: Complete invoice creation and payment flow', async () => {
      // Step 1: Create a project for billing
      const projectData = {
        name: 'Payment Test Project',
        description: 'Project for testing payment processing',
        client_id: testClient.id,
        status: 'active',
        budget: 5000,
        billing_type: 'milestone'
      };

      const projectResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(projectData);

      expect(projectResponse.status).toBe(201);
      testProject = projectResponse.body.data.project;

      // Step 2: Create an invoice
      const invoiceData = {
        project_id: testProject.id,
        client_id: testClient.id,
        invoice_number: `TEST-INV-${Date.now()}`,
        amount: 2500.00,
        tax_rate: 8.25,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        line_items: [
          {
            description: 'Website Design - Phase 1',
            quantity: 1,
            unit_price: 1500.00,
            total: 1500.00
          },
          {
            description: 'Frontend Development - Phase 1', 
            quantity: 20,
            unit_price: 50.00,
            total: 1000.00
          }
        ],
        notes: 'Payment due within 30 days'
      };

      const invoiceResponse = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invoiceData);

      expect(invoiceResponse.status).toBe(201);
      testInvoice = invoiceResponse.body.data.invoice;
      expect(testInvoice.status).toBe('draft');
      expect(testInvoice.total_amount).toBe(2706.25); // Including tax

      // Step 3: Send invoice to client
      const sendInvoiceResponse = await request(app)
        .post(`/api/v1/invoices/${testInvoice.id}/send`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(sendInvoiceResponse.status).toBe(200);

      // Verify invoice status updated
      const sentInvoiceResponse = await request(app)
        .get(`/api/v1/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(sentInvoiceResponse.body.data.invoice.status).toBe('sent');

      // Step 4: Client creates payment intent
      const paymentIntentData = {
        invoice_id: testInvoice.id,
        amount: Math.round(testInvoice.total_amount * 100), // Convert to cents
        currency: 'usd',
        payment_method_types: ['card'],
        metadata: {
          invoice_id: testInvoice.id,
          project_id: testProject.id,
          client_id: testClient.id
        }
      };

      const paymentIntentResponse = await request(app)
        .post('/api/v1/payments/create-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentIntentData);

      expect(paymentIntentResponse.status).toBe(201);
      expect(paymentIntentResponse.body.data.client_secret).toMatch(/^pi_.*_secret_.*/);
      
      const paymentIntentId = paymentIntentResponse.body.data.payment_intent_id;

      // Step 5: Simulate payment success via webhook
      const webhookPayload = {
        id: 'evt_test_webhook',
        object: 'event',
        api_version: '2024-06-20',
        created: Math.floor(Date.now() / 1000),
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            object: 'payment_intent',
            amount: Math.round(testInvoice.total_amount * 100),
            currency: 'usd',
            status: 'succeeded',
            payment_method: 'pm_card_visa',
            metadata: {
              invoice_id: testInvoice.id,
              project_id: testProject.id,
              client_id: testClient.id
            },
            charges: {
              data: [{
                id: 'ch_test_charge',
                amount: Math.round(testInvoice.total_amount * 100),
                currency: 'usd',
                status: 'succeeded',
                payment_method_details: {
                  card: {
                    brand: 'visa',
                    last4: '4242'
                  }
                }
              }]
            }
          }
        }
      };

      const webhookResponse = await request(app)
        .post('/api/v1/webhooks/stripe')
        .send(webhookPayload);

      expect(webhookResponse.status).toBe(200);

      // Step 6: Verify payment recorded and invoice status updated
      const paidInvoiceResponse = await request(app)
        .get(`/api/v1/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(paidInvoiceResponse.body.data.invoice.status).toBe('paid');
      expect(paidInvoiceResponse.body.data.invoice.paid_at).toBeDefined();

      // Step 7: Verify payment record created
      const paymentsResponse = await request(app)
        .get(`/api/v1/invoices/${testInvoice.id}/payments`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(paymentsResponse.status).toBe(200);
      expect(paymentsResponse.body.data.payments).toHaveLength(1);
      expect(paymentsResponse.body.data.payments[0].amount).toBe(testInvoice.total_amount);

      console.log('✅ PAYMENT FLOW TEST PASSED');
    }, 30000);

    test('PAYMENT: Failed payment handling and retry logic', async () => {
      // Create another invoice for failed payment testing
      const invoiceData = {
        project_id: testProject.id,
        client_id: testClient.id,
        invoice_number: `FAIL-INV-${Date.now()}`,
        amount: 1000.00,
        tax_rate: 0,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        line_items: [{
          description: 'Failed Payment Test',
          quantity: 1,
          unit_price: 1000.00,
          total: 1000.00
        }]
      };

      const invoiceResponse = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invoiceData);

      const failInvoice = invoiceResponse.body.data.invoice;

      // Create payment intent
      const paymentIntentResponse = await request(app)
        .post('/api/v1/payments/create-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          invoice_id: failInvoice.id,
          amount: 100000, // $1000 in cents
          currency: 'usd'
        });

      const paymentIntentId = paymentIntentResponse.body.data.payment_intent_id;

      // Simulate payment failure webhook
      const failureWebhook = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: paymentIntentId,
            amount: 100000,
            currency: 'usd',
            status: 'requires_payment_method',
            last_payment_error: {
              code: 'card_declined',
              decline_code: 'insufficient_funds',
              message: 'Your card has insufficient funds.'
            },
            metadata: {
              invoice_id: failInvoice.id,
              client_id: testClient.id
            }
          }
        }
      };

      const failureResponse = await request(app)
        .post('/api/v1/webhooks/stripe')
        .send(failureWebhook);

      expect(failureResponse.status).toBe(200);

      // Verify invoice status remains unpaid
      const unpaidInvoiceResponse = await request(app)
        .get(`/api/v1/invoices/${failInvoice.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(unpaidInvoiceResponse.body.data.invoice.status).toBe('overdue');

      // Verify payment attempt recorded
      const attemptsResponse = await request(app)
        .get(`/api/v1/invoices/${failInvoice.id}/payment-attempts`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(attemptsResponse.status).toBe(200);
      expect(attemptsResponse.body.data.attempts).toHaveLength(1);
      expect(attemptsResponse.body.data.attempts[0].status).toBe('failed');

      console.log('✅ FAILED PAYMENT HANDLING TEST PASSED');
    }, 20000);

    test('PAYMENT: Subscription and recurring billing', async () => {
      // Create subscription-based project
      const subscriptionProjectData = {
        name: 'Monthly Maintenance Subscription',
        description: 'Ongoing website maintenance and support',
        client_id: testClient.id,
        status: 'active',
        billing_type: 'subscription',
        subscription_plan: {
          name: 'Monthly Maintenance',
          amount: 299.00,
          interval: 'month',
          interval_count: 1
        }
      };

      const subscriptionResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(subscriptionProjectData);

      expect(subscriptionResponse.status).toBe(201);
      const subscriptionProject = subscriptionResponse.body.data.project;

      // Create Stripe subscription
      const createSubscriptionData = {
        project_id: subscriptionProject.id,
        client_id: testClient.id,
        price_amount: 29900, // $299 in cents
        interval: 'month',
        trial_period_days: 7
      };

      const stripeSubscriptionResponse = await request(app)
        .post('/api/v1/subscriptions/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createSubscriptionData);

      expect(stripeSubscriptionResponse.status).toBe(201);
      expect(stripeSubscriptionResponse.body.data.subscription.status).toBe('trialing');

      // Simulate subscription activation after trial
      const subscriptionActivatedWebhook = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: stripeSubscriptionResponse.body.data.subscription.stripe_subscription_id,
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
            metadata: {
              project_id: subscriptionProject.id,
              client_id: testClient.id
            }
          }
        }
      };

      const activationResponse = await request(app)
        .post('/api/v1/webhooks/stripe')
        .send(subscriptionActivatedWebhook);

      expect(activationResponse.status).toBe(200);

      // Verify subscription status updated
      const activeSubscriptionResponse = await request(app)
        .get(`/api/v1/subscriptions/${stripeSubscriptionResponse.body.data.subscription.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(activeSubscriptionResponse.body.data.subscription.status).toBe('active');

      console.log('✅ SUBSCRIPTION BILLING TEST PASSED');
    }, 25000);

    test('PAYMENT: Refund processing and dispute handling', async () => {
      // Use the previously paid invoice for refund testing
      const refundData = {
        invoice_id: testInvoice.id,
        amount: 1000.00, // Partial refund
        reason: 'requested_by_customer',
        notes: 'Client requested partial refund due to scope reduction'
      };

      const refundResponse = await request(app)
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(refundData);

      expect(refundResponse.status).toBe(201);
      expect(refundResponse.body.data.refund.amount).toBe(1000.00);
      expect(refundResponse.body.data.refund.status).toBe('pending');

      // Simulate successful refund webhook
      const refundWebhook = {
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_test_charge',
            amount_refunded: 100000, // $1000 in cents
            refunds: {
              data: [{
                id: 're_test_refund',
                amount: 100000,
                currency: 'usd',
                status: 'succeeded',
                reason: 'requested_by_customer'
              }]
            },
            metadata: {
              invoice_id: testInvoice.id
            }
          }
        }
      };

      const refundWebhookResponse = await request(app)
        .post('/api/v1/webhooks/stripe')
        .send(refundWebhook);

      expect(refundWebhookResponse.status).toBe(200);

      // Verify refund recorded
      const refundsResponse = await request(app)
        .get(`/api/v1/invoices/${testInvoice.id}/refunds`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(refundsResponse.status).toBe(200);
      expect(refundsResponse.body.data.refunds).toHaveLength(1);
      expect(refundsResponse.body.data.refunds[0].status).toBe('completed');

      console.log('✅ REFUND PROCESSING TEST PASSED');
    }, 20000);
  });

  describe('Payment Security and Validation', () => {
    test('SECURITY: PCI compliance and secure payment handling', async () => {
      // Test that sensitive payment data is never stored
      const paymentIntentResponse = await request(app)
        .post('/api/v1/payments/create-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          invoice_id: testInvoice.id,
          amount: 100000,
          currency: 'usd'
        });

      expect(paymentIntentResponse.status).toBe(201);
      
      // Verify response doesn't contain sensitive Stripe data
      expect(paymentIntentResponse.body.data.client_secret).toBeDefined();
      expect(paymentIntentResponse.body.data.stripe_secret_key).toBeUndefined();
      expect(paymentIntentResponse.body.data.raw_stripe_response).toBeUndefined();

      // Test webhook signature validation
      const invalidWebhook = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', 'invalid_signature')
        .send({ type: 'payment_intent.succeeded' });

      expect(invalidWebhook.status).toBe(400); // Bad request for invalid signature

      console.log('✅ PAYMENT SECURITY TEST PASSED');
    }, 15000);

    test('SECURITY: Payment authorization and access control', async () => {
      // Test that users can only access their own payment data
      const otherClient = await testHelpers.createTestUser({ role: 'client' });
      const otherToken = testHelpers.generateAuthToken(otherClient.id, 'client');

      // Try to access another client's invoice
      const unauthorizedAccessResponse = await request(app)
        .get(`/api/v1/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(unauthorizedAccessResponse.status).toBe(403);

      // Try to create payment intent for another client's invoice
      const unauthorizedPaymentResponse = await request(app)
        .post('/api/v1/payments/create-intent')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          invoice_id: testInvoice.id,
          amount: 100000,
          currency: 'usd'
        });

      expect(unauthorizedPaymentResponse.status).toBe(403);

      console.log('✅ PAYMENT AUTHORIZATION TEST PASSED');
    }, 15000);
  });

  describe('Payment Analytics and Reporting', () => {
    test('ANALYTICS: Payment metrics and financial reporting', async () => {
      // Get payment analytics
      const analyticsResponse = await request(app)
        .get('/api/v1/analytics/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString()
        });

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.data.metrics.total_revenue).toBeDefined();
      expect(analyticsResponse.body.data.metrics.successful_payments).toBeDefined();
      expect(analyticsResponse.body.data.metrics.failed_payments).toBeDefined();
      expect(analyticsResponse.body.data.metrics.refund_rate).toBeDefined();

      // Get invoice aging report
      const agingResponse = await request(app)
        .get('/api/v1/reports/invoice-aging')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(agingResponse.status).toBe(200);
      expect(agingResponse.body.data.aging_buckets).toBeDefined();
      expect(agingResponse.body.data.total_outstanding).toBeDefined();

      // Get payment trends
      const trendsResponse = await request(app)
        .get('/api/v1/analytics/payment-trends')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ period: 'monthly' });

      expect(trendsResponse.status).toBe(200);
      expect(trendsResponse.body.data.trends).toBeInstanceOf(Array);

      console.log('✅ PAYMENT ANALYTICS TEST PASSED');
    }, 15000);
  });
});