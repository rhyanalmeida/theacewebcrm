# ACE CRM Email System

A comprehensive email management system with campaigns, workflows, tracking, analytics, and more.

## Features

### ✅ Complete Email Infrastructure
- **Multi-provider support** (Resend, SendGrid, SMTP)
- **HTML email templates** (Welcome, Password Reset, Notifications, Invoices)
- **Transactional email API** with rate limiting and authentication
- **Email validation** with typo detection and suggestions
- **Queue system** with retry logic and priority handling

### ✅ Campaign Management
- **Visual campaign builder** with segmentation
- **A/B testing** with statistical significance
- **Scheduled sending** with optimal timing
- **Performance tracking** and optimization
- **Template management** with variable support

### ✅ Automated Workflows
- **Trigger-based automation** (signup, purchase, behavior)
- **Multi-step sequences** with conditions and branching
- **Dynamic content** based on user data
- **Real-time execution** with monitoring
- **Workflow analytics** and optimization

### ✅ Email Tracking & Analytics
- **Open and click tracking** with detailed metrics
- **Geolocation tracking** and device detection
- **Real-time analytics** dashboard
- **Cohort analysis** and retention metrics
- **Revenue attribution** and ROI tracking

### ✅ Compliance & Management
- **One-click unsubscribe** (RFC-compliant)
- **Preference center** with granular controls
- **Suppression list** management
- **GDPR compliance** features
- **Bounce and complaint handling**

## Quick Start

```typescript
import { EmailSystem } from './src/email';

// Initialize the email system
const emailSystem = new EmailSystem();

// Send a simple email
await emailSystem.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to ACE CRM!',
  html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
  trackOpens: true,
  trackClicks: true
});

// Send using a template
await emailSystem.sendTemplate('welcome', {
  to: 'user@example.com',
  templateData: {
    firstName: 'John',
    companyName: 'ACE CRM'
  }
});

// Create a campaign
const campaign = await emailSystem.createCampaign({
  name: 'Monthly Newsletter',
  subject: 'What\'s new this month?',
  templateId: 'newsletter',
  segmentId: 'active-users',
  settings: {
    fromEmail: 'news@acecrm.com',
    fromName: 'ACE CRM Team',
    trackOpens: true,
    trackClicks: true,
    enableUnsubscribe: true,
    tags: ['newsletter', 'monthly']
  }
});

// Send the campaign
await emailSystem.sendCampaign(campaign.id);
```

## API Server

Start the REST API server:

```typescript
import { EmailAPI } from './src/email';

const api = new EmailAPI({
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },
  authentication: {
    required: true,
    apiKeyHeader: 'x-api-key'
  }
});

await api.start(3001);
```

### API Endpoints

```bash
# Send email
POST /api/email/send
{
  "to": "user@example.com",
  "subject": "Test Email",
  "html": "<p>Hello World</p>"
}

# Create campaign
POST /api/email/campaigns
{
  "name": "Summer Sale",
  "subject": "50% off everything!",
  "templateId": "sale",
  "segmentId": "all-users"
}

# Get analytics
GET /api/email/analytics/stats?startDate=2024-01-01&endDate=2024-01-31

# Track email open (automatic via pixel)
GET /api/email/track/open/{trackingId}

# Unsubscribe (one-click)
GET /api/email/unsubscribe/{token}
```

## Templates

### Available Templates
- **welcome.html** - User onboarding email
- **password-reset.html** - Secure password reset
- **notification.html** - System notifications
- **invoice.html** - Professional invoices

### Template Variables
Templates support Handlebars-style variables:

```html
<h1>Welcome {{firstName}}!</h1>
<p>Your account at {{companyName}} is ready.</p>

{{#if isPremium}}
  <p>Welcome to Premium! You have access to advanced features.</p>
{{/if}}

<a href="{{loginUrl}}">Get Started</a>
```

## Workflows

Create automated email sequences:

```typescript
const workflow = await emailSystem.createWorkflow({
  name: 'Welcome Series',
  trigger: {
    type: 'user_signup',
    schedule: { type: 'immediate' }
  },
  steps: [
    {
      id: 'welcome-email',
      type: 'send_email',
      order: 1,
      config: {
        templateId: 'welcome',
        subject: 'Welcome to {{companyName}}!'
      },
      nextSteps: ['wait-3-days']
    },
    {
      id: 'wait-3-days',
      type: 'wait',
      order: 2,
      config: { waitDuration: 3 * 24 * 60 }, // 3 days
      nextSteps: ['tips-email']
    },
    {
      id: 'tips-email',
      type: 'send_email',
      order: 3,
      config: {
        templateId: 'pro-tips',
        subject: 'Getting started tips'
      },
      nextSteps: []
    }
  ]
});

// Trigger the workflow
await emailSystem.triggerWorkflow({
  type: 'user_signup',
  contactId: 'user-123',
  data: { firstName: 'John', plan: 'pro' },
  timestamp: new Date()
});
```

## Analytics Dashboard

Get comprehensive email analytics:

```typescript
const dashboard = await emailSystem.getDashboard({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  campaignId: 'optional-campaign-filter'
});

console.log(dashboard.overview);
// {
//   totalSent: 10000,
//   delivered: 9800,
//   opened: 4200,
//   clicked: 840,
//   openRate: 42.86,
//   clickRate: 8.57,
//   deliveryRate: 98.0
// }
```

Real-time statistics:

```typescript
const realtime = await emailSystem.getRealtimeStats();
console.log(realtime);
// {
//   activeCampaigns: 3,
//   emailsInQueue: 150,
//   emailsSentToday: 1250,
//   openRateToday: 38.4,
//   systemHealth: { status: 'healthy' }
// }
```

## Email Validation

Validate emails with comprehensive checks:

```typescript
const result = await emailSystem.validateEmail('user@gmail.co', {
  checkMx: true,
  checkDisposable: true,
  checkRole: true
});

console.log(result);
// {
//   isValid: true,
//   email: 'user@gmail.co',
//   warnings: ['Possible typo in domain'],
//   suggestions: ['Did you mean user@gmail.com?'],
//   metadata: {
//     domain: 'gmail.co',
//     isDisposable: false,
//     hasValidMx: true,
//     riskScore: 25
//   }
// }

// Bulk validation
const bulkResult = await emailSystem.validateBulk([
  'user@gmail.com',
  'test@10minutemail.com',
  'admin@company.com'
]);
```

## Unsubscribe Management

Handle unsubscribes and preferences:

```typescript
// Generate unsubscribe URL
const unsubscribeUrl = await emailSystem.generateUnsubscribeUrl(
  'user@example.com',
  'campaign-id'
);

// Check if user is unsubscribed
const isUnsubscribed = await emailSystem.isUnsubscribed(
  'user@example.com',
  'marketing'
);

// Process unsubscribe
const result = await emailSystem.processUnsubscribe('unsubscribe-token');
```

## Configuration

### Environment Variables

```bash
# Email Providers
RESEND_API_KEY=your-resend-key
SENDGRID_API_KEY=your-sendgrid-key
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password

# Default Settings
DEFAULT_FROM_EMAIL=noreply@acecrm.com
APP_URL=https://your-domain.com

# API Security
EMAIL_API_KEYS=key1,key2,key3
UNSUBSCRIBE_SECRET=your-secret-key

# Database (if using)
DATABASE_URL=postgresql://user:pass@localhost:5432/acecrm
```

### Provider Priority

The system will use providers in this order:
1. Resend (if configured)
2. SendGrid (if configured) 
3. SMTP (if configured)

## Queue Management

Monitor and manage the email queue:

```typescript
// Get queue statistics
const stats = await emailSystem.getQueueStats();
console.log(stats);
// {
//   pending: 150,
//   processing: 5,
//   completed: 1200,
//   failed: 23,
//   averageProcessingTime: 1250
// }

// Check queue health
const health = await emailSystem.getQueueHealth();
if (health.status === 'critical') {
  console.log('Issues:', health.issues);
  console.log('Recommendations:', health.recommendations);
}
```

## System Health

Monitor overall system health:

```typescript
const health = await emailSystem.getSystemHealth();
console.log(health);
// {
//   status: 'healthy',
//   components: {
//     emailProviders: { status: 'healthy', providers: [...] },
//     queue: { status: 'healthy', ... },
//     validation: { status: 'healthy', ... }
//   }
// }
```

## Maintenance

Perform system cleanup:

```typescript
const maintenance = await emailSystem.performMaintenance();
console.log(maintenance);
// {
//   success: true,
//   results: {
//     queueCleaned: 450,
//     validationCacheCleaned: 120,
//     analyticsCacheCleaned: 80,
//     trackingDataCleaned: 15000,
//     unsubscribeTokensCleaned: 25
//   },
//   totalItemsCleaned: 15675
// }
```

## Advanced Features

### Custom Validation Rules

```typescript
const validator = new EmailValidator();

// Add custom disposable domains
await validator.addDisposableDomain('temporary-emails.com');

// Add custom role prefixes
await validator.addRolePrefix('donotreply');

// Add typo corrections
await validator.addTypoSuggestion('gmial.com', 'gmail.com');
```

### Webhook Handling

The system automatically handles webhooks from email providers:

```typescript
// Resend webhook endpoint: /api/email/webhook/resend
// SendGrid webhook endpoint: /api/email/webhook/sendgrid
```

### Custom Templates

Add your own email templates by placing HTML files in:
```
src/email/templates/html/your-template.html
```

Templates support variables and can include CSS styling.

## Error Handling

The system includes comprehensive error handling:

```typescript
try {
  await emailSystem.sendEmail({ /* options */ });
} catch (error) {
  if (error.code === 'INVALID_EMAIL') {
    // Handle invalid email
  } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Handle rate limiting
  } else if (error.code === 'PROVIDER_ERROR') {
    // Handle provider issues
  }
}
```

## Performance

- **Queue-based processing** for high-volume sending
- **Intelligent caching** for validation and analytics
- **Batch operations** for bulk email validation
- **Rate limiting** to respect provider limits
- **Connection pooling** for database operations

## Security

- **API key authentication** for secure access
- **Rate limiting** to prevent abuse
- **Input validation** and sanitization
- **HTTPS enforcement** for webhooks
- **Token-based unsubscribe** links
- **SQL injection prevention**

## Testing

Run the test suite:

```bash
npm test
```

Test email configuration:

```typescript
const results = await emailSystem.getSystemHealth();
console.log(results.components.emailProviders);
```

## License

MIT License - see LICENSE file for details.

## Support

For questions and support, please contact the development team or check the documentation in the `/docs` directory.