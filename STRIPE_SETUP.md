# Stripe Configuration Guide for ACE CRM

## 🔐 Your Stripe API Key Has Been Configured

Your Stripe Secret Key has been added to the environment configuration:
```
[Stripe Secret Key - Stored securely in .env file]
```

## ⚠️ IMPORTANT SECURITY NOTES

1. **NEVER commit the .env file to version control**
2. **Keep your secret key secure** - anyone with this key can charge your customers
3. **Use environment variables** in production, not hardcoded values
4. **Rotate keys regularly** for security

## 📋 Next Steps to Complete Stripe Setup

### 1. Get Your Publishable Key
Log into your Stripe Dashboard and get your **Live Publishable Key** (starts with `pk_live_`).
Add it to your environment files:
- `.env` → `STRIPE_PUBLISHABLE_KEY=pk_live_...`
- `frontend/.env.local` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
- `client-portal/.env.local` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`

### 2. Configure Webhooks
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/payments/stripe/webhook`
3. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.failed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the **Webhook Secret** (starts with `whsec_`)
5. Add to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

### 3. Configure Products & Prices
Create your subscription plans in Stripe Dashboard:
1. Go to Products → Add Product
2. Create pricing tiers (e.g., Basic, Pro, Enterprise)
3. Note the Price IDs for your code

### 4. Test Your Integration

#### Test Payment Processing:
```bash
# Start your backend
cd "/mnt/c/Users/rhyan/Downloads/THE ACE CRM"
npm run dev

# In another terminal, test the payment endpoint
curl -X POST http://localhost:5000/api/payments/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "currency": "usd"}'
```

#### Test Webhook (using Stripe CLI):
```bash
# Install Stripe CLI
# Download from: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:5000/api/payments/stripe/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
```

## 🎯 Available Payment Features

### 1. **Payment Processing**
- One-time payments
- Recurring subscriptions
- Payment method management
- Refund processing

### 2. **Invoice Management**
- Create and send invoices
- Automatic payment collection
- Payment reminders
- PDF generation

### 3. **Subscription Management**
- Multiple pricing tiers
- Upgrade/downgrade plans
- Proration handling
- Trial periods

### 4. **Customer Portal**
- Self-service billing management
- Update payment methods
- Download invoices
- Cancel subscriptions

## 💻 Code Examples

### Create a Payment Intent:
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000, // $50.00 in cents
  currency: 'usd',
  customer: customerId,
  metadata: {
    orderId: '12345',
    userId: 'user_123'
  }
});
```

### Create a Subscription:
```javascript
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: 'price_1234567890' }],
  trial_period_days: 14,
  metadata: {
    userId: 'user_123'
  }
});
```

### Handle Webhooks:
```javascript
app.post('/api/payments/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        // Handle successful payment
        break;
      case 'invoice.paid':
        // Update invoice status
        break;
      // ... handle other events
    }

    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

## 🔧 Troubleshooting

### Common Issues:

1. **"Invalid API Key"**
   - Ensure you're using the correct key (test vs live)
   - Check for extra spaces or characters

2. **"No such customer"**
   - Create customer before charging
   - Verify customer ID is correct

3. **Webhook signature verification failing**
   - Use raw body for webhook verification
   - Ensure webhook secret is correct

4. **CORS errors**
   - Add your domain to allowed origins
   - Use server-side API calls for sensitive operations

## 📚 Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe.js Reference](https://stripe.com/docs/js)
- [Stripe Elements](https://stripe.com/docs/payments/elements)
- [Testing Cards](https://stripe.com/docs/testing)
- [Security Best Practices](https://stripe.com/docs/security)

## 🚀 Going Live Checklist

- [ ] Replace test keys with live keys
- [ ] Configure production webhook endpoints
- [ ] Set up proper error handling
- [ ] Implement fraud detection rules
- [ ] Configure receipt emails
- [ ] Set up proper logging
- [ ] Test refund flow
- [ ] Configure tax settings if needed
- [ ] Set up proper SSL/TLS
- [ ] Enable PCI compliance mode

## 💡 Tips

1. **Use Stripe's test mode** extensively before going live
2. **Implement idempotency keys** for safe retries
3. **Store Stripe IDs** in your database for reference
4. **Use webhooks** for reliable event handling
5. **Implement proper error handling** for all payment flows

Your Stripe integration is now configured and ready to process payments!