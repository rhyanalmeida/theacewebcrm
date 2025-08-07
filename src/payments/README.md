# Payment System - Ace CRM

A comprehensive payment processing system with invoicing, quotes, subscriptions, and customer portal functionality.

## 🚀 Features

### Core Payment Processing
- ✅ **Stripe Integration** - Complete Stripe payment processing with webhooks
- ✅ **Payment Methods** - Credit cards, debit cards, bank transfers
- ✅ **Refund Processing** - Full and partial refunds with tracking
- ✅ **Payment Status Tracking** - Real-time payment status updates

### Invoice Management
- ✅ **Invoice Generation** - Professional invoice creation and management
- ✅ **PDF Generation** - Automated PDF invoice generation
- ✅ **Email Delivery** - Automated invoice sending with templates
- ✅ **Payment Reminders** - Automated reminder system for overdue invoices
- ✅ **Multi-currency Support** - Support for different currencies

### Quote & Estimate System
- ✅ **Quote Creation** - Professional quotes with expiration dates
- ✅ **Quote to Invoice** - Seamless conversion from accepted quotes
- ✅ **Digital Acceptance** - Customer portal for quote acceptance/rejection
- ✅ **PDF Export** - Professional quote PDFs

### Subscription Management
- ✅ **Recurring Billing** - Automated subscription billing
- ✅ **Plan Management** - Flexible subscription plans
- ✅ **Proration Calculations** - Automatic proration for plan changes
- ✅ **Subscription Analytics** - Detailed subscription metrics

### Customer Portal
- ✅ **Public Invoice Views** - Secure invoice viewing without login
- ✅ **Online Payments** - Customer payment processing
- ✅ **Quote Management** - Accept/reject quotes online
- ✅ **Payment History** - Customer payment tracking

### Financial Reporting
- ✅ **Revenue Reports** - Comprehensive revenue analytics
- ✅ **Outstanding Invoices** - Accounts receivable tracking
- ✅ **Payment Analytics** - Payment method and trend analysis
- ✅ **Tax Reporting** - Tax calculation and reporting

### Automation
- ✅ **Payment Reminders** - Scheduled reminder system
- ✅ **Overdue Notifications** - Automated overdue invoice handling
- ✅ **Webhook Processing** - Real-time payment event processing
- ✅ **Status Synchronization** - Automatic payment status updates

## 🏗️ System Architecture

### Models
- **Invoice** - Invoice management with line items and tax calculation
- **Payment** - Payment tracking with refund support
- **Quote** - Quote/estimate management with conversion
- **Subscription** - Recurring billing and subscription management
- **PaymentMethod** - Customer payment method storage
- **Refund** - Refund processing and tracking
- **TaxRate** - Tax calculation and management

### Services
- **InvoiceService** - Invoice creation, PDF generation, email sending
- **PaymentService** - Payment processing, refunds, analytics
- **StripeService** - Stripe API integration and webhook handling
- **QuoteService** - Quote management and conversion
- **SubscriptionService** - Subscription billing and management
- **PDFService** - PDF generation for invoices and quotes
- **EmailService** - Email templates and delivery

### Controllers
- **InvoiceController** - Invoice API endpoints
- **PaymentController** - Payment processing endpoints
- **QuoteController** - Quote management endpoints
- **SubscriptionController** - Subscription management endpoints

### Utilities
- **ReminderScheduler** - Automated payment reminder system
- **PaymentPortal** - Customer portal functionality

## 🛠️ Setup & Configuration

### 1. Environment Variables

Copy `.env.payments.example` and configure:

```bash
# Required: Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Required: Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Required: Company Information
COMPANY_NAME=Your Company
COMPANY_EMAIL=billing@company.com
```

### 2. Database Models

The payment system automatically creates the following MongoDB collections:
- `invoices` - Invoice documents with line items
- `payments` - Payment transactions and refunds
- `quotes` - Quotes and estimates
- `subscriptions` - Recurring billing subscriptions
- `paymentmethods` - Customer payment methods
- `refunds` - Refund records
- `taxrates` - Tax calculation rates

### 3. Stripe Webhook Setup

1. **Create Webhook Endpoint** in Stripe Dashboard:
   ```
   Endpoint URL: https://your-domain.com/api/payments/webhook
   ```

2. **Select Events**:
   ```
   payment_intent.succeeded
   payment_intent.payment_failed
   customer.subscription.updated
   invoice.payment_succeeded
   invoice.payment_failed
   ```

3. **Copy Webhook Secret** to `STRIPE_WEBHOOK_SECRET`

### 4. PDF Storage Setup

Create directory for PDF storage:
```bash
mkdir -p uploads/pdfs
chmod 755 uploads/pdfs
```

## 📡 API Endpoints

### Invoice Management
```
POST   /api/payments/invoices              - Create invoice
GET    /api/payments/invoices              - List invoices
GET    /api/payments/invoices/:id          - Get invoice
PUT    /api/payments/invoices/:id          - Update invoice
POST   /api/payments/invoices/:id/send     - Send invoice email
POST   /api/payments/invoices/:id/pdf      - Generate PDF
GET    /api/payments/invoices/:id/pdf      - Download PDF
```

### Payment Processing
```
POST   /api/payments/payments              - Process payment
GET    /api/payments/payments/:paymentId   - Get payment
POST   /api/payments/payments/:id/refund   - Process refund
GET    /api/payments/payments/metrics      - Payment analytics
```

### Quote Management
```
POST   /api/payments/quotes                - Create quote
GET    /api/payments/quotes                - List quotes
POST   /api/payments/quotes/:id/send       - Send quote
POST   /api/payments/quotes/:id/accept     - Accept quote
POST   /api/payments/quotes/:id/convert    - Convert to invoice
```

### Subscriptions
```
POST   /api/payments/subscriptions         - Create subscription
GET    /api/payments/subscriptions         - List subscriptions
POST   /api/payments/subscriptions/:id/cancel - Cancel subscription
GET    /api/payments/subscriptions/metrics - Subscription analytics
```

### Customer Portal
```
GET    /api/payments/portal/invoice/:id    - Public invoice view
GET    /api/payments/portal/invoice/:id/pay - Payment form
POST   /api/payments/portal/invoice/:id/pay - Process payment
GET    /api/payments/portal/quote/:id      - Public quote view
POST   /api/payments/portal/quote/:id/accept - Accept quote
```

## 🔒 Security Features

- **Webhook Signature Verification** - All Stripe webhooks are verified
- **Rate Limiting** - Protection against abuse
- **Input Validation** - Comprehensive request validation
- **Secure Payment Processing** - PCI-compliant payment handling
- **Access Control** - Authentication required for admin endpoints

## 📊 Analytics & Reporting

### Financial Reports
- Revenue by time period
- Outstanding invoices
- Overdue invoice tracking
- Payment method analytics
- Tax reporting

### Subscription Metrics
- Active subscriptions
- Churn rate
- Monthly recurring revenue (MRR)
- Customer lifetime value

### Usage Examples

```javascript
// Create invoice
const invoice = await InvoiceService.createInvoice({
  customerId: 'customer_123',
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  lineItems: [
    { description: 'Web Development', quantity: 1, unitPrice: 2500 }
  ]
}, 'user_456');

// Process payment
const payment = await PaymentService.processPayment({
  invoiceId: invoice._id,
  customerId: 'customer_123',
  amount: 2500,
  paymentMethodId: 'pm_stripe_123'
}, 'user_456');

// Send reminder
await InvoiceService.sendReminder(invoice._id, 'first_reminder');
```

## 🚀 Deployment

The payment system is fully integrated with the main ACE CRM application and requires:
1. MongoDB database
2. Stripe account with API keys
3. SMTP server for email delivery
4. SSL certificate for webhook endpoints

## 🧪 Testing

Run payment system tests:
```bash
npm run test:payments
```

## 📈 Performance

- **Database Indexing** - Optimized queries for invoices, payments
- **PDF Caching** - Generated PDFs are cached
- **Email Queuing** - Bulk email operations are queued
- **Webhook Processing** - Async webhook event handling

## 🔄 Integration

The payment system integrates seamlessly with:
- **Contact Management** - Link invoices to CRM contacts
- **Deal Pipeline** - Convert deals to invoices
- **Project Management** - Invoice for project milestones
- **Reporting** - Financial data in CRM reports

## 📞 Support

For payment system support:
- Check logs in `/logs/payments.log`
- Monitor Stripe dashboard for payment issues
- Review webhook delivery status
- Test email delivery configuration

---

**Payment System Status**: ✅ **Production Ready**

All core features implemented and tested. Ready for production deployment with proper environment configuration.