// Stripe configuration and setup
export interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  apiVersion: string;
  environment: 'development' | 'production';
}

export const getStripeConfig = (): StripeConfig => {
  const config: StripeConfig = {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    apiVersion: '2024-06-20',
    environment: (process.env.NODE_ENV as 'development' | 'production') || 'development'
  };

  // Validate required configuration
  if (!config.secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }

  if (!config.publishableKey) {
    console.warn('Warning: STRIPE_PUBLISHABLE_KEY not configured - frontend integration may not work');
  }

  if (!config.webhookSecret && config.environment === 'production') {
    console.warn('Warning: STRIPE_WEBHOOK_SECRET not configured - webhook validation disabled');
  }

  return config;
};

export const validateStripeConfiguration = (): boolean => {
  try {
    const config = getStripeConfig();
    
    // Check if keys are in correct format
    if (config.environment === 'production') {
      if (!config.secretKey.startsWith('sk_live_')) {
        throw new Error('Production environment requires live Stripe secret key');
      }
      if (config.publishableKey && !config.publishableKey.startsWith('pk_live_')) {
        throw new Error('Production environment requires live Stripe publishable key');
      }
    } else {
      if (!config.secretKey.startsWith('sk_test_')) {
        throw new Error('Development environment requires test Stripe secret key');
      }
      if (config.publishableKey && !config.publishableKey.startsWith('pk_test_')) {
        throw new Error('Development environment requires test Stripe publishable key');
      }
    }

    return true;
  } catch (error) {
    console.error('Stripe configuration validation failed:', error);
    return false;
  }
};

// Stripe webhook event types we handle
export const STRIPE_WEBHOOK_EVENTS = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'payment_method.attached',
  'customer.created',
  'customer.updated',
  'customer.deleted',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.created',
  'invoice.updated',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.finalized',
  'charge.succeeded',
  'charge.failed',
  'charge.dispute.created'
] as const;

export type StripeWebhookEvent = typeof STRIPE_WEBHOOK_EVENTS[number];

// Default Stripe configuration for different environments
export const DEFAULT_STRIPE_CONFIG = {
  development: {
    currency: 'usd',
    automaticPaymentMethods: {
      enabled: true
    },
    paymentMethodTypes: ['card'],
    setupFutureUsage: 'off_session'
  },
  production: {
    currency: 'usd',
    automaticPaymentMethods: {
      enabled: true
    },
    paymentMethodTypes: ['card', 'bank_account'],
    setupFutureUsage: 'off_session',
    statementDescriptor: process.env.COMPANY_NAME?.substring(0, 22) || 'Ace CRM Payment'
  }
} as const;