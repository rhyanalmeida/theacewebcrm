// Payment system environment configuration
export interface PaymentEnvironmentConfig {
  // Stripe Configuration
  stripe: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
  };

  // Email Configuration
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
  };

  // Company Information
  company: {
    name: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };

  // Application URLs
  urls: {
    frontendUrl: string;
    backendUrl: string;
  };

  // File Storage
  storage: {
    pdfStoragePath: string;
    maxFileSize: number;
  };

  // Security
  security: {
    webhookAuthToken?: string;
    encryptionKey?: string;
  };

  // Features
  features: {
    enableReminders: boolean;
    enablePortal: boolean;
    enableSubscriptions: boolean;
    enableTaxCalculation: boolean;
  };
}

export const getPaymentEnvironmentConfig = (): PaymentEnvironmentConfig => {
  return {
    stripe: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
    },

    email: {
      smtpHost: process.env.SMTP_HOST || 'localhost',
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpSecure: process.env.SMTP_SECURE === 'true',
      smtpUser: process.env.SMTP_USER || '',
      smtpPassword: process.env.SMTP_PASSWORD || '',
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || ''
    },

    company: {
      name: process.env.COMPANY_NAME || 'Ace CRM',
      email: process.env.COMPANY_EMAIL || 'info@acecrm.com',
      phone: process.env.COMPANY_PHONE || '(555) 123-4567',
      website: process.env.COMPANY_WEBSITE || 'www.acecrm.com',
      address: process.env.COMPANY_ADDRESS || '123 Business St',
      city: process.env.COMPANY_CITY || 'Business City',
      state: process.env.COMPANY_STATE || 'BC',
      zip: process.env.COMPANY_ZIP || '12345',
      country: process.env.COMPANY_COUNTRY || 'USA'
    },

    urls: {
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      backendUrl: process.env.BACKEND_URL || 'http://localhost:5000'
    },

    storage: {
      pdfStoragePath: process.env.PDF_STORAGE_PATH || './uploads/pdfs',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
    },

    security: {
      webhookAuthToken: process.env.WEBHOOK_AUTH_TOKEN,
      encryptionKey: process.env.ENCRYPTION_KEY
    },

    features: {
      enableReminders: process.env.ENABLE_PAYMENT_REMINDERS !== 'false',
      enablePortal: process.env.ENABLE_PAYMENT_PORTAL !== 'false',
      enableSubscriptions: process.env.ENABLE_SUBSCRIPTIONS !== 'false',
      enableTaxCalculation: process.env.ENABLE_TAX_CALCULATION !== 'false'
    }
  };
};

export const validatePaymentEnvironment = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const config = getPaymentEnvironmentConfig();

  // Required Stripe configuration
  if (!config.stripe.secretKey) {
    errors.push('STRIPE_SECRET_KEY is required');
  }

  // Validate Stripe key format
  const isProduction = process.env.NODE_ENV === 'production';
  if (config.stripe.secretKey) {
    if (isProduction && !config.stripe.secretKey.startsWith('sk_live_')) {
      errors.push('Production environment requires live Stripe secret key (sk_live_...)');
    }
    if (!isProduction && !config.stripe.secretKey.startsWith('sk_test_')) {
      errors.push('Development environment should use test Stripe secret key (sk_test_...)');
    }
  }

  // Email configuration validation
  if (config.features.enableReminders) {
    if (!config.email.smtpHost) {
      errors.push('SMTP_HOST is required when payment reminders are enabled');
    }
    if (!config.email.smtpUser) {
      errors.push('SMTP_USER is required when payment reminders are enabled');
    }
    if (!config.email.smtpPassword) {
      errors.push('SMTP_PASSWORD is required when payment reminders are enabled');
    }
  }

  // Company information validation
  if (!config.company.name) {
    errors.push('COMPANY_NAME is required for invoices and quotes');
  }
  if (!config.company.email) {
    errors.push('COMPANY_EMAIL is required for customer communications');
  }

  // URL validation
  try {
    new URL(config.urls.frontendUrl);
  } catch {
    errors.push('FRONTEND_URL must be a valid URL');
  }

  try {
    new URL(config.urls.backendUrl);
  } catch {
    errors.push('BACKEND_URL must be a valid URL');
  }

  // Storage validation
  if (config.storage.maxFileSize < 1024) {
    errors.push('MAX_FILE_SIZE should be at least 1KB');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Generate example .env configuration
export const generateExampleEnvConfig = (): string => {
  return `
# Payment System Environment Configuration

# Stripe Configuration (Required)
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Email Configuration (Required for reminders)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com

# Company Information (Required for invoices/quotes)
COMPANY_NAME=Ace CRM
COMPANY_EMAIL=info@acecrm.com
COMPANY_PHONE=(555) 123-4567
COMPANY_WEBSITE=www.acecrm.com
COMPANY_ADDRESS=123 Business St
COMPANY_CITY=Business City
COMPANY_STATE=BC
COMPANY_ZIP=12345
COMPANY_COUNTRY=USA

# Application URLs (Required)
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# File Storage Configuration
PDF_STORAGE_PATH=./uploads/pdfs
MAX_FILE_SIZE=10485760

# Security (Optional)
WEBHOOK_AUTH_TOKEN=your-secure-webhook-token
ENCRYPTION_KEY=your-32-character-encryption-key

# Feature Flags (Optional - defaults to enabled)
ENABLE_PAYMENT_REMINDERS=true
ENABLE_PAYMENT_PORTAL=true
ENABLE_SUBSCRIPTIONS=true
ENABLE_TAX_CALCULATION=true

# Timezone for scheduled tasks
TIMEZONE=UTC
`.trim();
};

// Initialize payment environment with validation
export const initializePaymentEnvironment = (): boolean => {
  console.log('🔧 Initializing payment system environment...');
  
  const validation = validatePaymentEnvironment();
  
  if (!validation.valid) {
    console.error('❌ Payment system environment validation failed:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
    console.log('\n📋 Example .env configuration:');
    console.log(generateExampleEnvConfig());
    return false;
  }

  const config = getPaymentEnvironmentConfig();
  
  console.log('✅ Payment system environment validated successfully');
  console.log(`   - Stripe: ${config.stripe.secretKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   - Email: ${config.email.smtpHost ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   - Company: ${config.company.name}`);
  console.log(`   - Features: Reminders ${config.features.enableReminders ? '✅' : '❌'}, Portal ${config.features.enablePortal ? '✅' : '❌'}, Subscriptions ${config.features.enableSubscriptions ? '✅' : '❌'}`);
  
  return true;
};

export default getPaymentEnvironmentConfig;