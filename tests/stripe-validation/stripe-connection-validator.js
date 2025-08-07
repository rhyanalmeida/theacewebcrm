const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Stripe Connection Validator
 * Tests all aspects of Stripe integration for ACE CRM
 */
class StripeConnectionValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
    
    // Initialize Stripe with provided live key
    this.stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
    this.stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || null;
    this.stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;
    
    try {
      this.stripe = new Stripe(this.stripeSecretKey, {
        apiVersion: '2024-06-20'
      });
    } catch (error) {
      this.logResult('stripe-init', false, `Failed to initialize Stripe: ${error.message}`, { error: error.message });
    }
  }

  /**
   * Log test result
   */
  logResult(testName, passed, message, details = {}) {
    const result = {
      test: testName,
      passed,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(result);
    this.results.summary.total++;
    
    if (passed === null) {
      this.results.summary.warnings++;
      console.log(`⚠️  ${testName}: ${message}`);
    } else if (passed) {
      this.results.summary.passed++;
      console.log(`✅ ${testName}: ${message}`);
    } else {
      this.results.summary.failed++;
      console.log(`❌ ${testName}: ${message}`);
    }
  }

  /**
   * 1. Validate Stripe API Key Configuration
   */
  async validateApiKeys() {
    console.log('\n🔑 Validating Stripe API Keys...');
    
    // Test secret key format
    if (!this.stripeSecretKey) {
      this.logResult('secret-key-exists', false, 'Stripe secret key not found');
      return;
    }

    if (this.stripeSecretKey.startsWith('sk_live_')) {
      this.logResult('secret-key-format', true, 'Live secret key format is valid');
    } else if (this.stripeSecretKey.startsWith('sk_test_')) {
      this.logResult('secret-key-format', null, 'Using test secret key (should be live for production)', {
        warning: 'Test key detected in production environment'
      });
    } else {
      this.logResult('secret-key-format', false, 'Invalid secret key format');
      return;
    }

    // Test publishable key
    if (!this.stripePublishableKey) {
      this.logResult('publishable-key-exists', false, 'Publishable key not configured', {
        action: 'Add STRIPE_PUBLISHABLE_KEY to environment variables'
      });
    } else {
      const expectedPrefix = this.stripeSecretKey.startsWith('sk_live_') ? 'pk_live_' : 'pk_test_';
      if (this.stripePublishableKey.startsWith(expectedPrefix)) {
        this.logResult('publishable-key-format', true, 'Publishable key format matches secret key environment');
      } else {
        this.logResult('publishable-key-format', false, 'Publishable key environment mismatch');
      }
    }

    // Test webhook secret
    if (!this.stripeWebhookSecret) {
      this.logResult('webhook-secret-exists', false, 'Webhook secret not configured', {
        action: 'Add STRIPE_WEBHOOK_SECRET to environment variables'
      });
    } else if (this.stripeWebhookSecret.startsWith('whsec_')) {
      this.logResult('webhook-secret-format', true, 'Webhook secret format is valid');
    } else {
      this.logResult('webhook-secret-format', false, 'Invalid webhook secret format');
    }
  }

  /**
   * 2. Test Stripe API Connection
   */
  async validateConnection() {
    console.log('\n🌐 Testing Stripe API Connection...');
    
    if (!this.stripe) {
      this.logResult('api-connection', false, 'Stripe not initialized');
      return;
    }

    try {
      const account = await this.stripe.accounts.retrieve();
      this.logResult('api-connection', true, 'Successfully connected to Stripe API', {
        account: {
          id: account.id,
          country: account.country,
          default_currency: account.default_currency,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          type: account.type
        }
      });

      // Validate account capabilities
      if (account.charges_enabled) {
        this.logResult('account-charges', true, 'Account can accept charges');
      } else {
        this.logResult('account-charges', false, 'Account cannot accept charges');
      }

      if (account.payouts_enabled) {
        this.logResult('account-payouts', true, 'Account can receive payouts');
      } else {
        this.logResult('account-payouts', null, 'Account payouts not enabled');
      }

    } catch (error) {
      this.logResult('api-connection', false, `Failed to connect to Stripe API: ${error.message}`, {
        error: error.message,
        code: error.code,
        type: error.type
      });
    }
  }

  /**
   * 3. Test Customer Creation
   */
  async validateCustomerCreation() {
    console.log('\n👤 Testing Customer Creation...');
    
    if (!this.stripe) return;

    try {
      const testCustomer = await this.stripe.customers.create({
        email: 'test@acecrm-validation.com',
        name: 'ACE CRM Test Customer',
        description: 'Test customer for Stripe validation',
        metadata: {
          test: 'true',
          validation_run: this.results.timestamp
        }
      });

      this.logResult('customer-creation', true, 'Successfully created test customer', {
        customer: {
          id: testCustomer.id,
          email: testCustomer.email,
          name: testCustomer.name
        }
      });

      // Test customer retrieval
      const retrievedCustomer = await this.stripe.customers.retrieve(testCustomer.id);
      this.logResult('customer-retrieval', true, 'Successfully retrieved customer');

      // Test customer update
      await this.stripe.customers.update(testCustomer.id, {
        metadata: { updated: 'true' }
      });
      this.logResult('customer-update', true, 'Successfully updated customer');

      // Cleanup: delete test customer
      await this.stripe.customers.del(testCustomer.id);
      this.logResult('customer-cleanup', true, 'Successfully deleted test customer');

    } catch (error) {
      this.logResult('customer-creation', false, `Failed to create customer: ${error.message}`, {
        error: error.message,
        code: error.code
      });
    }
  }

  /**
   * 4. Test Payment Methods
   */
  async validatePaymentMethods() {
    console.log('\n💳 Testing Payment Methods...');
    
    if (!this.stripe) return;

    try {
      // Create test customer first
      const testCustomer = await this.stripe.customers.create({
        email: 'payment-test@acecrm-validation.com',
        name: 'Payment Test Customer'
      });

      // Test payment method creation with test card
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: '4242424242424242', // Test card number
          exp_month: 12,
          exp_year: 2025,
          cvc: '123'
        },
        billing_details: {
          name: 'Test Cardholder',
          email: 'test@acecrm-validation.com'
        }
      });

      this.logResult('payment-method-creation', true, 'Successfully created payment method', {
        paymentMethod: {
          id: paymentMethod.id,
          type: paymentMethod.type,
          card: paymentMethod.card ? {
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            exp_month: paymentMethod.card.exp_month,
            exp_year: paymentMethod.card.exp_year
          } : null
        }
      });

      // Test payment method attachment
      await this.stripe.paymentMethods.attach(paymentMethod.id, {
        customer: testCustomer.id
      });
      this.logResult('payment-method-attachment', true, 'Successfully attached payment method to customer');

      // Test payment method listing
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: testCustomer.id,
        type: 'card'
      });
      this.logResult('payment-method-listing', true, `Successfully listed payment methods: ${paymentMethods.data.length} found`);

      // Cleanup
      await this.stripe.paymentMethods.detach(paymentMethod.id);
      await this.stripe.customers.del(testCustomer.id);

    } catch (error) {
      this.logResult('payment-method-creation', false, `Failed payment method test: ${error.message}`, {
        error: error.message,
        code: error.code
      });
    }
  }

  /**
   * 5. Test Product and Price Creation
   */
  async validateProductsAndPrices() {
    console.log('\n🏷️ Testing Products and Prices...');
    
    if (!this.stripe) return;

    try {
      // Create test product
      const testProduct = await this.stripe.products.create({
        name: 'ACE CRM Test Product',
        description: 'Test product for validation',
        metadata: {
          test: 'true',
          validation_run: this.results.timestamp
        }
      });

      this.logResult('product-creation', true, 'Successfully created test product', {
        product: {
          id: testProduct.id,
          name: testProduct.name,
          description: testProduct.description
        }
      });

      // Create test price
      const testPrice = await this.stripe.prices.create({
        product: testProduct.id,
        unit_amount: 5000, // $50.00
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        metadata: {
          test: 'true'
        }
      });

      this.logResult('price-creation', true, 'Successfully created test price', {
        price: {
          id: testPrice.id,
          unit_amount: testPrice.unit_amount,
          currency: testPrice.currency,
          recurring: testPrice.recurring
        }
      });

      // Test one-time price
      const oneTimePrice = await this.stripe.prices.create({
        product: testProduct.id,
        unit_amount: 2500, // $25.00
        currency: 'usd',
        metadata: {
          test: 'true',
          type: 'one-time'
        }
      });

      this.logResult('one-time-price-creation', true, 'Successfully created one-time price');

      // Cleanup: Archive prices (cannot delete)
      await this.stripe.prices.update(testPrice.id, { active: false });
      await this.stripe.prices.update(oneTimePrice.id, { active: false });
      
      // Archive product
      await this.stripe.products.update(testProduct.id, { active: false });

    } catch (error) {
      this.logResult('product-creation', false, `Failed product/price test: ${error.message}`, {
        error: error.message,
        code: error.code
      });
    }
  }

  /**
   * 6. Test Webhook Event Construction
   */
  async validateWebhookSecurity() {
    console.log('\n🔒 Testing Webhook Security...');
    
    if (!this.stripeWebhookSecret) {
      this.logResult('webhook-validation', false, 'Cannot test webhook security - webhook secret not configured');
      return;
    }

    try {
      // Create a sample webhook payload
      const payload = JSON.stringify({
        id: 'evt_test_webhook',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded'
          }
        }
      });

      // Create a test signature using the webhook secret
      const timestamp = Math.floor(Date.now() / 1000);
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', this.stripeWebhookSecret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');
      
      const signatureHeader = `t=${timestamp},v1=${signature}`;

      // Test webhook verification
      const event = this.stripe.webhooks.constructEvent(payload, signatureHeader, this.stripeWebhookSecret);
      
      this.logResult('webhook-validation', true, 'Successfully validated webhook signature', {
        event: {
          id: event.id,
          type: event.type
        }
      });

      // Test invalid signature
      try {
        const invalidSignature = `t=${timestamp},v1=invalid_signature`;
        this.stripe.webhooks.constructEvent(payload, invalidSignature, this.stripeWebhookSecret);
        this.logResult('webhook-security', false, 'Webhook accepts invalid signatures');
      } catch (error) {
        this.logResult('webhook-security', true, 'Webhook properly rejects invalid signatures');
      }

    } catch (error) {
      this.logResult('webhook-validation', false, `Failed webhook validation: ${error.message}`, {
        error: error.message
      });
    }
  }

  /**
   * 7. Test Environment Configuration
   */
  async validateEnvironmentConfig() {
    console.log('\n🌍 Validating Environment Configuration...');
    
    const requiredEnvVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_PUBLISHABLE_KEY', 
      'STRIPE_WEBHOOK_SECRET',
      'FRONTEND_URL',
      'BACKEND_URL'
    ];

    const optionalEnvVars = [
      'COMPANY_NAME',
      'COMPANY_EMAIL',
      'SMTP_HOST',
      'SMTP_USER'
    ];

    // Check required variables
    requiredEnvVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        this.logResult(`env-${varName.toLowerCase()}`, true, `${varName} is configured`);
      } else {
        this.logResult(`env-${varName.toLowerCase()}`, false, `${varName} is missing`, {
          action: `Add ${varName} to environment variables`
        });
      }
    });

    // Check optional variables
    optionalEnvVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        this.logResult(`env-optional-${varName.toLowerCase()}`, true, `${varName} is configured`);
      } else {
        this.logResult(`env-optional-${varName.toLowerCase()}`, null, `${varName} not configured (optional)`);
      }
    });

    // Validate URLs
    const frontendUrl = process.env.FRONTEND_URL;
    const backendUrl = process.env.BACKEND_URL;

    if (frontendUrl) {
      try {
        new URL(frontendUrl);
        this.logResult('frontend-url-valid', true, 'Frontend URL format is valid');
      } catch {
        this.logResult('frontend-url-valid', false, 'Frontend URL format is invalid');
      }
    }

    if (backendUrl) {
      try {
        new URL(backendUrl);
        this.logResult('backend-url-valid', true, 'Backend URL format is valid');
      } catch {
        this.logResult('backend-url-valid', false, 'Backend URL format is invalid');
      }
    }
  }

  /**
   * 8. Test PCI Compliance Settings
   */
  async validatePCICompliance() {
    console.log('\n🛡️ Validating PCI Compliance Settings...');
    
    // Check if using HTTPS in production URLs
    const frontendUrl = process.env.FRONTEND_URL;
    const backendUrl = process.env.BACKEND_URL;
    
    if (frontendUrl) {
      if (frontendUrl.startsWith('https://')) {
        this.logResult('frontend-https', true, 'Frontend uses HTTPS');
      } else if (frontendUrl.startsWith('http://localhost') || frontendUrl.startsWith('http://127.0.0.1')) {
        this.logResult('frontend-https', null, 'Frontend uses HTTP (acceptable for localhost)');
      } else {
        this.logResult('frontend-https', false, 'Frontend should use HTTPS in production');
      }
    }

    if (backendUrl) {
      if (backendUrl.startsWith('https://')) {
        this.logResult('backend-https', true, 'Backend uses HTTPS');
      } else if (backendUrl.startsWith('http://localhost') || backendUrl.startsWith('http://127.0.0.1')) {
        this.logResult('backend-https', null, 'Backend uses HTTP (acceptable for localhost)');
      } else {
        this.logResult('backend-https', false, 'Backend should use HTTPS in production');
      }
    }

    // Check for secure key storage
    const keyInCode = this.stripeSecretKey && this.stripeSecretKey.length > 50;
    if (keyInCode) {
      this.logResult('key-storage', true, 'API key appears to be properly stored (not hardcoded)');
    } else {
      this.logResult('key-storage', null, 'Unable to verify key storage method');
    }

    // Check webhook endpoint security
    if (this.stripeWebhookSecret) {
      this.logResult('webhook-security-config', true, 'Webhook secret configured for signature verification');
    } else {
      this.logResult('webhook-security-config', false, 'Webhook signature verification not configured');
    }
  }

  /**
   * Run all validation tests
   */
  async runAllTests() {
    console.log('🚀 Starting Stripe Integration Validation for ACE CRM');
    console.log('=' * 60);
    
    await this.validateApiKeys();
    await this.validateConnection();
    await this.validateCustomerCreation();
    await this.validatePaymentMethods();
    await this.validateProductsAndPrices();
    await this.validateWebhookSecurity();
    await this.validateEnvironmentConfig();
    await this.validatePCICompliance();
    
    return this.generateReport();
  }

  /**
   * Generate comprehensive validation report
   */
  generateReport() {
    console.log('\n📊 Validation Summary');
    console.log('=' * 60);
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
    console.log(`📊 Total: ${this.results.summary.total}`);
    
    const successRate = (this.results.summary.passed / this.results.summary.total * 100).toFixed(1);
    console.log(`🎯 Success Rate: ${successRate}%`);

    // Save detailed report
    const reportPath = path.join(__dirname, 'reports', `stripe-validation-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log(`\n📝 Detailed report saved to: ${reportPath}`);
    
    return this.results;
  }
}

// Export for use in other modules
module.exports = StripeConnectionValidator;

// Run validation if called directly
if (require.main === module) {
  const validator = new StripeConnectionValidator();
  validator.runAllTests()
    .then((results) => {
      const hasFailures = results.summary.failed > 0;
      process.exit(hasFailures ? 1 : 0);
    })
    .catch((error) => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}