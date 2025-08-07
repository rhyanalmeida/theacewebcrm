# ACE CRM - Third-Party Integrations

## Overview

The ACE CRM Integration Hub provides seamless connectivity with popular third-party services, enabling automated workflows, data synchronization, and enhanced productivity.

## 🚀 Available Integrations

### ✅ Implemented

1. **Zapier** - Webhook-based automation with 20+ CRM triggers
2. **Slack** - Real-time notifications and team collaboration
3. **Google Workspace** - Drive, Calendar, Gmail, Sheets, Docs integration
4. **Mailchimp** - Email marketing and campaign management
5. **HubSpot** - CRM data synchronization
6. **Stripe** - Payment processing (via payments module)
7. **Twilio** - SMS and voice communications
8. **QuickBooks** - Accounting and invoicing sync
9. **Microsoft 365** - Outlook, Teams, OneDrive integration
10. **Social Media** - LinkedIn, Twitter posting

## 📦 Installation

```bash
cd src/integrations
npm install
```

## ⚙️ Configuration

Create a `.env` file with your integration credentials:

```env
# Zapier
ZAPIER_API_KEY=your_zapier_api_key

# Slack
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_DEFAULT_CHANNEL=#general

# Google Workspace
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback

# Mailchimp
MAILCHIMP_API_KEY=your_mailchimp_api_key
MAILCHIMP_SERVER=us1

# HubSpot
HUBSPOT_API_KEY=your_hubspot_api_key

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890

# QuickBooks
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_ENVIRONMENT=sandbox
```

## 🔧 Usage

### Initialize Integration Hub

```typescript
import { IntegrationHub } from './integrations';

const integrations = new IntegrationHub({
  zapier: {
    apiKey: process.env.ZAPIER_API_KEY,
    webhooks: [
      {
        name: 'Deal Won',
        url: 'https://hooks.zapier.com/hooks/catch/123456/abcdef/',
        events: ['deal.won'],
        active: true
      }
    ]
  },
  slack: {
    token: process.env.SLACK_BOT_TOKEN,
    defaultChannel: '#crm-notifications'
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI
  }
});
```

### Trigger Events Across Integrations

```typescript
// Trigger event to all configured integrations
await integrations.triggerEvent('deal.won', {
  name: 'Enterprise Package',
  value: 50000,
  client: 'Acme Corp',
  owner: 'John Doe',
  url: 'https://crm.example.com/deals/123'
});
```

## 📋 Zapier Integration

### Available Triggers

```typescript
// Contact triggers
CONTACT_CREATED: 'contact.created'
CONTACT_UPDATED: 'contact.updated'
CONTACT_DELETED: 'contact.deleted'

// Lead triggers
LEAD_CREATED: 'lead.created'
LEAD_CONVERTED: 'lead.converted'
LEAD_UPDATED: 'lead.updated'

// Deal triggers
DEAL_CREATED: 'deal.created'
DEAL_WON: 'deal.won'
DEAL_LOST: 'deal.lost'
DEAL_UPDATED: 'deal.updated'

// Project triggers
PROJECT_CREATED: 'project.created'
PROJECT_COMPLETED: 'project.completed'
PROJECT_UPDATED: 'project.updated'

// Invoice triggers
INVOICE_CREATED: 'invoice.created'
INVOICE_PAID: 'invoice.paid'
INVOICE_OVERDUE: 'invoice.overdue'

// Task triggers
TASK_CREATED: 'task.created'
TASK_COMPLETED: 'task.completed'
TASK_ASSIGNED: 'task.assigned'
```

### Register Webhook

```typescript
const zapier = integrations.getIntegration('zapier');

const webhook = await zapier.registerWebhook({
  name: 'New Lead Alert',
  url: 'https://hooks.zapier.com/...',
  events: ['lead.created'],
  active: true
});
```

## 💬 Slack Integration

### Send Notifications

```typescript
const slack = integrations.getIntegration('slack');

// Simple message
await slack.sendMessage('#sales', '🎉 New deal closed!');

// Rich message with blocks
await slack.sendRichMessage({
  channel: '#sales',
  blocks: [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🎉 Deal Won!'
      }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: '*Deal:* Enterprise Package' },
        { type: 'mrkdwn', text: '*Value:* $50,000' }
      ]
    }
  ]
});
```

### Configure Notifications

```typescript
slack.configureNotifications({
  channel: '#sales',
  events: ['deal.won', 'deal.lost'],
  template: 'detailed',
  enabled: true
});
```

## 📁 Google Workspace Integration

### Google Drive

```typescript
const google = integrations.getIntegration('google');

// Upload file
const file = await google.uploadFile(
  'contract.pdf',
  'application/pdf',
  fileBuffer
);

// Create folder
const folder = await google.createFolder('Client Documents');

// List files
const files = await google.listDriveFiles('mimeType="application/pdf"');
```

### Google Calendar

```typescript
// Create event
const event = await google.createCalendarEvent('primary', {
  summary: 'Client Meeting',
  start: { dateTime: '2024-01-15T10:00:00' },
  end: { dateTime: '2024-01-15T11:00:00' },
  attendees: [{ email: 'client@example.com' }]
});

// List events
const events = await google.listEvents(
  'primary',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

### Google Sheets

```typescript
// Export CRM data to Sheets
const sheetUrl = await google.exportToSheets(
  contactsData,
  'CRM Contacts Export'
);

// Read from spreadsheet
const data = await google.readSpreadsheet(spreadsheetId, 'A1:Z100');
```

## 📧 Email Marketing (Mailchimp)

```typescript
const mailchimp = integrations.getIntegration('mailchimp');

// Add subscriber
await mailchimp.addSubscriber(listId, {
  email: 'customer@example.com',
  firstName: 'John',
  lastName: 'Doe',
  tags: ['customer', 'premium']
});

// Create campaign
const campaign = await mailchimp.createCampaign({
  type: 'regular',
  recipients: { listId },
  settings: {
    subject: 'Monthly Newsletter',
    from_name: 'ACE CRM',
    reply_to: 'hello@acecrm.com'
  }
});
```

## 📱 SMS Integration (Twilio)

```typescript
const twilio = integrations.getIntegration('twilio');

// Send SMS
await twilio.sendSMS('+1234567890', 'Your invoice is ready!');

// Send WhatsApp message
await twilio.sendWhatsApp('+1234567890', 'Thanks for your payment!');
```

## 💼 Accounting (QuickBooks)

```typescript
const quickbooks = integrations.getIntegration('quickbooks');

// Create invoice
const invoice = await quickbooks.createInvoice({
  customer: customerId,
  lineItems: [
    { description: 'Web Design', amount: 5000 }
  ],
  dueDate: '2024-02-01'
});

// Record payment
await quickbooks.recordPayment({
  invoiceId: invoice.id,
  amount: 5000,
  paymentMethod: 'Credit Card'
});
```

## 🔄 Data Synchronization

### Sync Single Record

```typescript
// Sync contact to HubSpot
await integrations.syncData('hubspot', 'contact:create', {
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  company: 'Acme Corp'
});
```

### Bulk Sync

```typescript
// Sync multiple contacts
const results = await integrations.bulkSync(
  'hubspot',
  'contact:create',
  contactsArray
);
```

## 🏥 Health Monitoring

```typescript
// Check all integrations
const health = await integrations.healthCheck();
console.log(health);
// { zapier: true, slack: true, google: true, ... }
```

## 🎯 Event Listeners

```typescript
// Listen for integration events
integrations.on('webhook:success', (data) => {
  console.log('Webhook triggered successfully:', data);
});

integrations.on('error', (error) => {
  console.error('Integration error:', error);
});

integrations.on('file:uploaded', (file) => {
  console.log('File uploaded to Google Drive:', file);
});
```

## 🛠️ Advanced Configuration

### Custom Webhook Security

```typescript
// Validate incoming webhook
const isValid = zapier.validateWebhookRequest(
  request.headers,
  request.body,
  webhook.secret
);
```

### Rate Limiting

```typescript
// Configure rate limits
integrations.setRateLimit('slack', {
  messagesPerMinute: 20,
  burstLimit: 5
});
```

### Retry Configuration

```typescript
// Set retry policy
integrations.setRetryPolicy({
  maxAttempts: 3,
  backoffMultiplier: 2,
  maxDelay: 10000
});
```

## 📊 Integration Analytics

```typescript
// Get integration usage stats
const stats = await integrations.getUsageStats();
console.log(stats);
// { 
//   zapier: { webhooks: 150, success: 148, failed: 2 },
//   slack: { messages: 500, channels: 5 },
//   ...
// }
```

## 🔒 Security Considerations

1. **API Keys**: Store all API keys in environment variables
2. **Webhook Signatures**: Always validate webhook signatures
3. **OAuth Tokens**: Implement token refresh for OAuth integrations
4. **Rate Limiting**: Respect third-party API rate limits
5. **Error Handling**: Implement proper error handling and logging
6. **Data Privacy**: Ensure GDPR compliance when syncing data

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify API keys are correct
   - Check OAuth token expiration
   - Ensure proper scopes are requested

2. **Webhook Failures**
   - Verify webhook URL is accessible
   - Check webhook signature validation
   - Ensure proper event filtering

3. **Rate Limiting**
   - Implement exponential backoff
   - Use bulk operations where available
   - Cache frequently accessed data

## 📚 Additional Resources

- [Zapier Platform Docs](https://platform.zapier.com/docs)
- [Slack API Docs](https://api.slack.com/)
- [Google Workspace APIs](https://developers.google.com/workspace)
- [Mailchimp API](https://mailchimp.com/developer/)
- [HubSpot API](https://developers.hubspot.com/)
- [Twilio Docs](https://www.twilio.com/docs)
- [QuickBooks API](https://developer.intuit.com/)

## 📝 License

MIT License - See LICENSE file for details