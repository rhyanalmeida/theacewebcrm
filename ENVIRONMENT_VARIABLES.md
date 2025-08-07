# 🔐 ACE CRM - COMPLETE ENVIRONMENT VARIABLES REFERENCE

## 📋 OVERVIEW

This document contains ALL environment variables needed for the ACE CRM deployment across all three services.

---

## 🔧 BACKEND SERVICE (ace-crm-backend)

### Required for Render.yaml Deployment

| Variable | Example Value | Source | Security Level |
|----------|---------------|---------|----------------|
| `NODE_ENV` | `production` | Pre-configured | ✅ Public |
| `PORT` | `5000` | Pre-configured | ✅ Public |
| `SUPABASE_URL` | `https://hxcrjwrinexiyeyyyhfa.supabase.co` | Pre-configured | ✅ Public |
| `SUPABASE_ANON_KEY` | `sync: false` | **Manual Setup** | 🔒 Secret |
| `SUPABASE_SERVICE_KEY` | `sync: false` | **Manual Setup** | 🔒 Secret |
| `STRIPE_SECRET_KEY` | `sync: false` | **Manual Setup** | 🔒 Secret |
| `STRIPE_WEBHOOK_SECRET` | `sync: false` | **Manual Setup** | 🔒 Secret |
| `JWT_SECRET` | `generateValue: true` | Auto-generated | 🔒 Secret |
| `JWT_REFRESH_SECRET` | `generateValue: true` | Auto-generated | 🔒 Secret |
| `SESSION_SECRET` | `generateValue: true` | Auto-generated | 🔒 Secret |
| `CORS_ORIGIN` | `https://ace-crm-frontend.onrender.com,https://ace-crm-portal.onrender.com` | Pre-configured | ✅ Public |

### Additional Backend Variables (from .env.example)

| Category | Variable | Required | Description |
|----------|----------|----------|-------------|
| **JWT** | `JWT_EXPIRES_IN` | No | Token expiry (default: 24h) |
| **JWT** | `JWT_REFRESH_EXPIRES_IN` | No | Refresh token expiry (default: 30d) |
| **Email** | `EMAIL_SERVICE` | Optional | Email service provider |
| **Email** | `EMAIL_USER` | Optional | SMTP username |
| **Email** | `EMAIL_PASSWORD` | Optional | SMTP password |
| **Email** | `EMAIL_FROM` | Optional | From email address |
| **Email** | `EMAIL_FROM_NAME` | Optional | From display name |
| **Upload** | `MAX_FILE_SIZE` | No | Max file upload size (default: 10MB) |
| **Upload** | `UPLOAD_DIR` | No | Upload directory (default: uploads/) |
| **Upload** | `ALLOWED_FILE_TYPES` | No | Allowed file extensions |
| **Security** | `RATE_LIMIT_WINDOW` | No | Rate limit window (default: 15min) |
| **Security** | `RATE_LIMIT_MAX` | No | Max requests per window |
| **Security** | `AUTH_RATE_LIMIT` | No | Auth endpoint rate limit |
| **Security** | `API_RATE_LIMIT` | No | API endpoint rate limit |
| **Security** | `UPLOAD_RATE_LIMIT` | No | Upload endpoint rate limit |
| **Security** | `TRUST_PROXY` | No | Trust proxy headers |
| **Logging** | `LOG_LEVEL` | No | Logging level (default: info) |
| **Logging** | `LOG_FORMAT` | No | Log format (default: combined) |
| **Debug** | `DEBUG` | No | Debug namespace |
| **Features** | `ENABLE_STRIPE_PAYMENTS` | No | Enable Stripe integration |
| **Features** | `ENABLE_EMAIL_NOTIFICATIONS` | No | Enable email notifications |
| **Features** | `ENABLE_FILE_UPLOADS` | No | Enable file upload features |
| **Features** | `ENABLE_ANALYTICS` | No | Enable analytics features |
| **Features** | `ENABLE_WEBSOCKETS` | No | Enable WebSocket features |

---

## 🌐 FRONTEND SERVICE (ace-crm-frontend)

### Required for Render.yaml Deployment

| Variable | Example Value | Source | Security Level |
|----------|---------------|---------|----------------|
| `NODE_ENV` | `production` | Pre-configured | ✅ Public |
| `NEXT_PUBLIC_API_URL` | `https://ace-crm-backend.onrender.com/api` | Pre-configured | ✅ Public |
| `NEXT_PUBLIC_APP_URL` | `https://ace-crm-frontend.onrender.com` | Pre-configured | ✅ Public |
| `NEXT_PUBLIC_CLIENT_PORTAL_URL` | `https://ace-crm-portal.onrender.com` | Pre-configured | ✅ Public |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hxcrjwrinexiyeyyyhfa.supabase.co` | Pre-configured | ✅ Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Pre-configured | ✅ Public |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `sync: false` | **Manual Setup** | 🔒 Secret |

### Additional Frontend Variables (from .env.example)

| Category | Variable | Required | Description |
|----------|----------|----------|-------------|
| **Analytics** | `NEXT_PUBLIC_GA_ID` | No | Google Analytics ID |
| **Analytics** | `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry error tracking DSN |
| **Analytics** | `NEXT_PUBLIC_MIXPANEL_TOKEN` | No | Mixpanel analytics token |
| **Features** | `NEXT_PUBLIC_ENABLE_CHAT` | No | Enable chat features |
| **Features** | `NEXT_PUBLIC_ENABLE_ANALYTICS` | No | Enable analytics features |
| **Features** | `NEXT_PUBLIC_ENABLE_PAYMENTS` | No | Enable payment features |
| **Features** | `NEXT_PUBLIC_ENABLE_NOTIFICATIONS` | No | Enable notifications |
| **Features** | `NEXT_PUBLIC_ENABLE_PWA` | No | Enable PWA features |
| **Features** | `NEXT_PUBLIC_ENABLE_DARK_MODE` | No | Enable dark mode |
| **WebSocket** | `NEXT_PUBLIC_WS_URL` | No | WebSocket server URL |
| **Branding** | `NEXT_PUBLIC_APP_NAME` | No | Application name |
| **Branding** | `NEXT_PUBLIC_APP_DESCRIPTION` | No | Application description |
| **Branding** | `NEXT_PUBLIC_SUPPORT_EMAIL` | No | Support email |
| **Branding** | `NEXT_PUBLIC_COMPANY_NAME` | No | Company name |
| **Branding** | `NEXT_PUBLIC_VERSION` | No | Application version |
| **SEO** | `NEXT_PUBLIC_APP_KEYWORDS` | No | SEO keywords |
| **SEO** | `NEXT_PUBLIC_APP_AUTHOR` | No | SEO author |
| **Theming** | `NEXT_PUBLIC_PRIMARY_COLOR` | No | Primary brand color |
| **Theming** | `NEXT_PUBLIC_SECONDARY_COLOR` | No | Secondary brand color |
| **Theming** | `NEXT_PUBLIC_ACCENT_COLOR` | No | Accent color |
| **Theming** | `NEXT_PUBLIC_LOGO_URL` | No | Logo URL |
| **Theming** | `NEXT_PUBLIC_FAVICON_URL` | No | Favicon URL |
| **Development** | `NEXT_PUBLIC_DEV_MODE` | No | Development mode flag |
| **Development** | `NEXT_PUBLIC_DEBUG_API` | No | API debug mode |
| **Development** | `NEXT_PUBLIC_SHOW_DEBUG_INFO` | No | Show debug info |
| **Contact** | `NEXT_PUBLIC_CONTACT_EMAIL` | No | Contact email |
| **Contact** | `NEXT_PUBLIC_SALES_EMAIL` | No | Sales email |
| **Contact** | `NEXT_PUBLIC_PHONE` | No | Contact phone |
| **Social** | `NEXT_PUBLIC_TWITTER_URL` | No | Twitter profile URL |
| **Social** | `NEXT_PUBLIC_LINKEDIN_URL` | No | LinkedIn profile URL |
| **Social** | `NEXT_PUBLIC_FACEBOOK_URL` | No | Facebook profile URL |
| **Security** | `NEXT_PUBLIC_CSP_ENABLED` | No | Content Security Policy |
| **Security** | `NEXT_PUBLIC_RATE_LIMIT_ENABLED` | No | Rate limiting display |
| **i18n** | `NEXT_PUBLIC_DEFAULT_LOCALE` | No | Default language |
| **i18n** | `NEXT_PUBLIC_SUPPORTED_LOCALES` | No | Supported languages |

---

## 🏢 CLIENT PORTAL SERVICE (ace-crm-portal)

### Required for Render.yaml Deployment

| Variable | Example Value | Source | Security Level |
|----------|---------------|---------|----------------|
| `NODE_ENV` | `production` | Pre-configured | ✅ Public |
| `NEXT_PUBLIC_API_URL` | `https://ace-crm-backend.onrender.com/api` | Pre-configured | ✅ Public |
| `NEXT_PUBLIC_APP_URL` | `https://ace-crm-portal.onrender.com` | Pre-configured | ✅ Public |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hxcrjwrinexiyeyyyhfa.supabase.co` | Pre-configured | ✅ Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Pre-configured | ✅ Public |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `sync: false` | **Manual Setup** | 🔒 Secret |

### Additional Client Portal Variables (from .env.example)

| Category | Variable | Required | Description |
|----------|----------|----------|-------------|
| **Supabase** | `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server-side Supabase key |
| **Stripe** | `STRIPE_WEBHOOK_SECRET` | Optional | Webhook secret for payments |
| **URLs** | `NEXT_PUBLIC_MAIN_APP_URL` | No | Main app URL |
| **WebSocket** | `NEXT_PUBLIC_SOCKET_URL` | No | Socket.io server URL |
| **WebSocket** | `NEXT_PUBLIC_ENABLE_REAL_TIME` | No | Enable real-time features |
| **Branding** | `NEXT_PUBLIC_BRAND_NAME` | No | Brand name for portal |
| **Branding** | `NEXT_PUBLIC_BRAND_LOGO` | No | Brand logo URL |
| **Branding** | `NEXT_PUBLIC_PRIMARY_COLOR` | No | Primary brand color |
| **Branding** | `NEXT_PUBLIC_SECONDARY_COLOR` | No | Secondary color |
| **Branding** | `NEXT_PUBLIC_ACCENT_COLOR` | No | Accent color |
| **Features** | `NEXT_PUBLIC_ENABLE_CHAT` | No | Enable chat in portal |
| **Features** | `NEXT_PUBLIC_ENABLE_FILE_UPLOADS` | No | Enable file uploads |
| **Features** | `NEXT_PUBLIC_ENABLE_INVOICES` | No | Enable invoice features |
| **Features** | `NEXT_PUBLIC_ENABLE_PROJECTS` | No | Enable project features |
| **Features** | `NEXT_PUBLIC_ENABLE_SUPPORT` | No | Enable support system |
| **Features** | `NEXT_PUBLIC_ENABLE_NOTIFICATIONS` | No | Enable notifications |
| **Features** | `NEXT_PUBLIC_ENABLE_CALENDAR` | No | Enable calendar features |
| **Company** | `NEXT_PUBLIC_COMPANY_NAME` | No | Company name |
| **Company** | `NEXT_PUBLIC_SUPPORT_EMAIL` | No | Support email |
| **Company** | `NEXT_PUBLIC_CLIENT_PORTAL_NAME` | No | Portal name |
| **Company** | `NEXT_PUBLIC_PORTAL_DESCRIPTION` | No | Portal description |
| **Company** | `NEXT_PUBLIC_CONTACT_PHONE` | No | Contact phone |
| **Company** | `NEXT_PUBLIC_CONTACT_ADDRESS` | No | Contact address |
| **Analytics** | `NEXT_PUBLIC_GA_ID` | No | Google Analytics ID |
| **Analytics** | `NEXT_PUBLIC_ENABLE_ANALYTICS` | No | Enable analytics |
| **Analytics** | `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry error tracking |
| **Security** | `NEXT_PUBLIC_SESSION_TIMEOUT` | No | Session timeout |
| **Security** | `NEXT_PUBLIC_MAX_FILE_SIZE` | No | Max file upload size |
| **Security** | `NEXT_PUBLIC_ALLOWED_FILE_TYPES` | No | Allowed file types |
| **Email** | `NEXT_PUBLIC_FROM_EMAIL` | No | From email address |
| **Development** | `NEXT_PUBLIC_DEV_MODE` | No | Development mode |
| **Development** | `NEXT_PUBLIC_DEBUG_MODE` | No | Debug mode |
| **Development** | `NEXT_PUBLIC_MOCK_DATA` | No | Use mock data |

---

## 🔒 SECRET VARIABLES SETUP GUIDE

### Where to Get Secret Values

#### 1. Supabase Keys
```
Location: https://app.supabase.com/project/hxcrjwrinexiyeyyyhfa/settings/api

Required:
- SUPABASE_ANON_KEY (anon/public role) - Already in render.yaml
- SUPABASE_SERVICE_KEY (service_role) - SECURE: Add manually
```

#### 2. Stripe Keys  
```
Location: https://dashboard.stripe.com/apikeys

Test Mode:
- STRIPE_SECRET_KEY: sk_test_...
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_...

Live Mode:
- STRIPE_SECRET_KEY: sk_live_...  
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_live_...
```

#### 3. Stripe Webhook Secret
```
Location: https://dashboard.stripe.com/webhooks

1. Create webhook endpoint: https://ace-crm-backend.onrender.com/api/webhooks/stripe
2. Select events: payment_intent.succeeded, invoice.payment_succeeded
3. Copy webhook secret: whsec_...
```

---

## 🔧 RENDER.COM SETUP INSTRUCTIONS

### Manual Environment Variable Configuration

For each service in Render dashboard:

1. Go to service → Settings → Environment
2. Add variables marked as `sync: false`
3. Use "Add from .env" for bulk upload if available

#### Backend Service Variables to Add:
```env
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Y3Jqd3JpbmV4aXlleXl5aGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDcyMTQsImV4cCI6MjA3MDA4MzIxNH0.UgHQzFICQqj5AAJty3PXqsEqL9s2NPRXyxIss1515M4
SUPABASE_SERVICE_KEY=[YOUR_SERVICE_ROLE_KEY]
STRIPE_SECRET_KEY=[YOUR_STRIPE_SECRET_KEY]
STRIPE_WEBHOOK_SECRET=[YOUR_WEBHOOK_SECRET]
```

#### Frontend Service Variables to Add:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[YOUR_STRIPE_PUBLISHABLE_KEY]
```

#### Client Portal Variables to Add:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[YOUR_STRIPE_PUBLISHABLE_KEY]
```

---

## ⚡ QUICK DEPLOYMENT CHECKLIST

### Before Deployment:
- [ ] Obtain Supabase service role key
- [ ] Obtain Stripe secret & publishable keys  
- [ ] Create Stripe webhook and get secret
- [ ] Fix backend TypeScript compilation errors
- [ ] Test all builds locally

### During Deployment:
- [ ] Deploy via Render Blueprint (render.yaml)
- [ ] Add secret environment variables in Render dashboard
- [ ] Monitor build logs for each service
- [ ] Verify health check endpoints

### After Deployment:
- [ ] Test login functionality
- [ ] Verify Supabase connection
- [ ] Test Stripe payment flow
- [ ] Check real-time features
- [ ] Monitor error logs

---

## 🚨 SECURITY NOTES

1. **Never commit secrets to Git**
2. **Use Render's built-in secret management**
3. **Rotate keys periodically**
4. **Use test keys for development**
5. **Monitor for leaked keys in logs**
6. **Use environment-specific keys**

---

## 📞 TROUBLESHOOTING ENVIRONMENT ISSUES

### Missing Variables:
```bash
# Check service logs for:
# "Environment variable X is not defined"
# "Cannot read property of undefined"
```

### Wrong Variable Names:
```bash
# Next.js variables must start with NEXT_PUBLIC_
# Backend variables should not have NEXT_PUBLIC_
```

### Variable Not Loading:
```bash  
# Restart service after adding variables
# Check variable name spelling
# Verify no extra spaces in values
```