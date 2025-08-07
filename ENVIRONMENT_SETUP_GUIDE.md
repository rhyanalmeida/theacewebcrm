# 🔧 ACE CRM Environment Configuration Guide

This guide walks you through setting up all environment variables for the ACE CRM system across all components.

## 📁 Environment Files Overview

The ACE CRM system uses multiple environment files for different components:

```
.env                        # Root environment (development/production)
.env.example               # Template for root environment
.env.render                # Production deployment on Render.com
src/.env                   # Backend API server environment
src/.env.example           # Backend template
frontend/.env              # Frontend production environment  
frontend/.env.local        # Frontend development environment
frontend/.env.example      # Frontend template
client-portal/.env.local   # Client portal development
client-portal/.env.example # Client portal template
```

## 🚨 Security Best Practices

### ⚠️ NEVER commit these files to git:
- `.env` (production secrets)
- `src/.env` (backend secrets)  
- `frontend/.env.local` (frontend development)
- `client-portal/.env.local` (portal development)

### ✅ Safe to commit:
- `.env.example` files (templates only)
- `.env.render` (no real secrets, just templates)

## 🗄️ Supabase Configuration

### Required Supabase Variables

Get these from your Supabase dashboard at `https://app.supabase.com`:

```bash
# Project Settings > General > Project URL
SUPABASE_URL=https://your-project-ref.supabase.co

# Project Settings > API > Project API Keys > anon public
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Project Settings > API > Project API Keys > service_role (keep secret!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 🔧 Setup Instructions

1. **Create Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and API keys

2. **Configure Database:**
   - Run the SQL files in `/supabase/migrations/`
   - Set up Row Level Security (RLS) policies
   - Configure authentication providers

## 🔐 JWT & Authentication

### Generate Secure JWT Secrets

Use these commands to generate strong secrets:

```bash
# Generate JWT secret (64 characters recommended)
openssl rand -base64 64

# Generate refresh secret
openssl rand -base64 64

# Generate session secret
openssl rand -base64 64
```

### Required JWT Variables

```bash
JWT_SECRET=your-super-secure-64-char-jwt-secret-here
JWT_REFRESH_SECRET=your-super-secure-64-char-refresh-secret-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=30d
SESSION_SECRET=your-super-secure-64-char-session-secret-here
```

## 💳 Stripe Payment Configuration

### Development (Test Keys)

1. **Get Test Keys:**
   - Go to [dashboard.stripe.com](https://dashboard.stripe.com)
   - Switch to "Test mode"
   - Go to Developers > API Keys

```bash
# Frontend/Client Portal (public keys only)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key_here

# Backend (secret keys)
STRIPE_SECRET_KEY=sk_test_your_test_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Production (Live Keys)

⚠️ **Critical**: Only use live keys in production environment!

```bash
# Frontend/Client Portal
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key_here

# Backend
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret_here
```

### Webhook Configuration

1. **Create Webhook Endpoint:**
   - Go to Stripe Dashboard > Developers > Webhooks
   - Add endpoint: `https://your-api-domain.com/api/webhooks/stripe`
   - Select events: `payment_intent.succeeded`, `invoice.payment_succeeded`

## 📧 Email Configuration

### Gmail Setup (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Google Account > Security > App Passwords
   - Select "Mail" and generate password

```bash
EMAIL_SERVICE=gmail
EMAIL_USER=your-business-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Company CRM
```

### Production Email Options

#### Option 1: Gmail SMTP
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### Option 2: SendGrid
```bash
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.your-api-key-here
```

#### Option 3: Resend (Recommended)
```bash
RESEND_API_KEY=re_your-resend-api-key
```

## 🌐 URL & CORS Configuration

### Development URLs
```bash
# API endpoints
NEXT_PUBLIC_API_URL=http://localhost:5000/api
API_BASE_URL=http://localhost:5000

# Frontend applications
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
CLIENT_PORTAL_URL=http://localhost:3001
NEXT_PUBLIC_CLIENT_PORTAL_URL=http://localhost:3001

# WebSocket
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# CORS origins (no spaces!)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:5173
```

### Production URLs
```bash
# Update these with your actual domains
PRODUCTION_FRONTEND_URL=https://your-frontend-domain.com
PRODUCTION_CLIENT_PORTAL_URL=https://your-portal-domain.com
PRODUCTION_API_URL=https://your-api-domain.com

# CORS for production
CORS_ORIGIN=https://your-frontend-domain.com,https://your-portal-domain.com
```

## 🚀 Feature Flags

Control features without code changes:

```bash
# Core features
ENABLE_STRIPE_PAYMENTS=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_FILE_UPLOADS=true
ENABLE_WEBSOCKETS=true

# Frontend features
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_ENABLE_DARK_MODE=true

# Client portal features
NEXT_PUBLIC_ENABLE_INVOICES=true
NEXT_PUBLIC_ENABLE_PROJECTS=true
NEXT_PUBLIC_ENABLE_SUPPORT=true
```

## 📊 Analytics & Monitoring

### Google Analytics 4
```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Error Tracking (Sentry)
```bash
SENTRY_DSN=https://your-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

### Performance Monitoring
```bash
NEW_RELIC_LICENSE_KEY=your-license-key
DATADOG_API_KEY=your-datadog-key
```

## 🛡️ Security Configuration

### Rate Limiting
```bash
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=1000       # requests per window
AUTH_RATE_LIMIT=10        # login attempts
API_RATE_LIMIT=100        # API calls
UPLOAD_RATE_LIMIT=5       # file uploads
```

### Security Headers
```bash
TRUST_PROXY=true          # if behind proxy (Render, etc.)
SECURE_COOKIES=true       # HTTPS only cookies
SAME_SITE_COOKIES=strict  # CSRF protection
```

## 🏗️ Environment Setup Steps

### 1. Development Setup

```bash
# 1. Copy template files
cp .env.example .env
cp src/.env.example src/.env
cp frontend/.env.example frontend/.env.local
cp client-portal/.env.example client-portal/.env.local

# 2. Generate JWT secrets
openssl rand -base64 64  # Use for JWT_SECRET
openssl rand -base64 64  # Use for JWT_REFRESH_SECRET  
openssl rand -base64 64  # Use for SESSION_SECRET

# 3. Configure Supabase
# - Add your Supabase URL and keys to all env files

# 4. Configure Stripe (test mode)
# - Add test publishable key to frontend files
# - Add test secret key to backend files

# 5. Configure email
# - Set up Gmail app password
# - Add email credentials to backend env

# 6. Start development servers
npm run dev  # Backend API
cd frontend && npm run dev    # Frontend
cd client-portal && npm run dev  # Client Portal
```

### 2. Production Deployment (Render.com)

```bash
# 1. Create three services on Render:
# - ace-crm-api (backend)
# - ace-crm-frontend (frontend) 
# - ace-crm-portal (client portal)

# 2. Environment Variables for Backend:
# Add all variables from .env.render to Render dashboard
# Generate strong production JWT secrets
# Use live Stripe keys
# Configure production email credentials

# 3. Environment Variables for Frontend:
# NEXT_PUBLIC_API_URL=https://your-api-service.onrender.com/api
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key

# 4. Environment Variables for Client Portal:
# Same as frontend plus portal-specific variables
```

## 🔍 Environment Validation

Create this script to validate your environment:

```bash
# scripts/validate-env.js
const requiredVars = {
  backend: [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY', 
    'JWT_SECRET',
    'STRIPE_SECRET_KEY'
  ],
  frontend: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_API_URL'
  ]
};

// Validation logic here...
```

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Check CORS_ORIGIN has no spaces
   - Verify frontend URL matches exactly
   - Ensure protocol (http/https) matches

2. **Stripe Webhook Errors:**
   - Verify webhook URL is accessible
   - Check webhook secret matches
   - Ensure endpoint handles POST requests

3. **Authentication Issues:**
   - Verify Supabase keys are correct
   - Check JWT secrets are set
   - Ensure RLS policies are configured

4. **Email Not Sending:**
   - Verify Gmail app password
   - Check email credentials
   - Test SMTP connection

### Debug Commands

```bash
# Test database connection
npm run test:db

# Validate environment variables
npm run validate:env

# Test API endpoints
npm run test:api

# Check email configuration
npm run test:email
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Stripe API Documentation](https://stripe.com/docs)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Render.com Deployment Guide](https://render.com/docs)

---

## 🚨 Security Checklist

Before going to production:

- [ ] All JWT secrets are 64+ characters and randomly generated
- [ ] Stripe test keys replaced with live keys  
- [ ] Production email credentials configured
- [ ] CORS origins set to production domains only
- [ ] Rate limiting configured appropriately
- [ ] Supabase RLS policies enabled
- [ ] Error tracking (Sentry) configured
- [ ] Analytics tracking configured
- [ ] All `.env` files added to `.gitignore`
- [ ] Secrets managed through deployment platform (not code)

---

**Need help?** Contact support at `support@acewebdesigners.com`