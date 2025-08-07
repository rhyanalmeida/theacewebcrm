# 🚀 ACE CRM Production Deployment Guide

## ✅ Fixed Issues Summary

The following deployment issues have been resolved:

### 1. **Render.yaml Configuration Fixed**
- ✅ Backend `rootDir` corrected to `src/`
- ✅ Build commands updated to use proper TypeScript compilation
- ✅ Start commands fixed with correct entry points
- ✅ Health check paths aligned with actual endpoints
- ✅ CORS origins updated to match Render service URLs
- ✅ Port configuration standardized

### 2. **Package.json Scripts Fixed**
- ✅ Backend build script includes TypeScript compilation and asset copying
- ✅ Start commands properly reference compiled JavaScript files
- ✅ Port environment variable handling standardized across services
- ✅ Development vs production script differentiation

### 3. **Next.js Configuration Enhanced**
- ✅ Frontend and client portal configs optimized for production
- ✅ Standalone output enabled for smaller container deployment
- ✅ Security headers added for production hardening
- ✅ Image domains configured for Supabase and external assets
- ✅ Environment variable handling improved

### 4. **CORS and Security Configuration**
- ✅ Dynamic CORS origin configuration using environment variables
- ✅ Production-specific CORS origins for Render URLs
- ✅ Security headers (X-Frame-Options, CSP, etc.) configured
- ✅ Rate limiting and request validation maintained

### 5. **Health Check Endpoints**
- ✅ Comprehensive health checks with dependency validation
- ✅ Backend provides both `/health` and `/api/health` endpoints
- ✅ Frontend and client portal health checks include service validation
- ✅ Readiness and liveness probes for container orchestration

### 6. **Environment Variable Management**
- ✅ Production environment template created
- ✅ Secure secret management with Render auto-generation
- ✅ Clear separation of public and private environment variables

## 🎯 Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ACE CRM Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Frontend      │    │  Client Portal  │                │
│  │   Dashboard     │    │   (Customer)    │                │
│  │                 │    │                 │                │
│  │ Next.js App     │    │ Next.js App     │                │
│  │ Port: $PORT     │    │ Port: $PORT     │                │
│  └─────────┬───────┘    └─────────┬───────┘                │
│            │                      │                        │
│            │                      │                        │
│            └──────────┬───────────┘                        │
│                       │                                    │
│                       ▼                                    │
│            ┌─────────────────┐                             │
│            │  Backend API    │                             │
│            │                 │                             │
│            │  Express.js     │                             │
│            │  TypeScript     │                             │
│            │  Port: 5000     │                             │
│            └─────────┬───────┘                             │
│                      │                                     │
│                      ▼                                     │
│            ┌─────────────────┐                             │
│            │   Supabase      │                             │
│            │   Database      │                             │
│            │   Auth & Storage│                             │
│            └─────────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Environment Variables Setup

### Backend Service (ace-crm-backend)

**Auto-configured in render.yaml:**
```bash
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://hxcrjwrinexiyeyyyhfa.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
CORS_ORIGIN=https://ace-crm-frontend.onrender.com,https://ace-crm-portal.onrender.com
JWT_SECRET=auto_generated_by_render
JWT_REFRESH_SECRET=auto_generated_by_render
SESSION_SECRET=auto_generated_by_render
```

**Configure manually in Render dashboard:**
```bash
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Frontend Service (ace-crm-frontend)

**Auto-configured in render.yaml:**
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://ace-crm-backend.onrender.com/api
NEXT_PUBLIC_APP_URL=https://ace-crm-frontend.onrender.com
NEXT_PUBLIC_CLIENT_PORTAL_URL=https://ace-crm-portal.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://hxcrjwrinexiyeyyyhfa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Configure manually in Render dashboard:**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
```

### Client Portal Service (ace-crm-portal)

**Auto-configured in render.yaml:**
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://ace-crm-backend.onrender.com/api
NEXT_PUBLIC_APP_URL=https://ace-crm-portal.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://hxcrjwrinexiyeyyyhfa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Configure manually in Render dashboard:**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
```

## 🚀 Deployment Steps

### Step 1: Prepare Repository
```bash
# Make sure you're on the correct branch
git checkout main

# Verify all configurations
node verify-deployment.js

# Commit deployment fixes (already done)
git add .
git commit -m "Fix deployment configurations for production"
git push origin main
```

### Step 2: Create Render Services

1. **Go to Render Dashboard**: https://render.com/dashboard
2. **Create New Blueprint**: Click "New" → "Blueprint"
3. **Connect Repository**: Select your GitHub repository
4. **Use Blueprint**: Render will detect the `render.yaml` file automatically
5. **Review Services**: Confirm the 3 services will be created:
   - ace-crm-backend
   - ace-crm-frontend
   - ace-crm-portal

### Step 3: Configure Environment Variables

**For ace-crm-backend service:**
1. Go to service settings
2. Add environment variables:
   ```
   SUPABASE_SERVICE_KEY=<your_service_role_key>
   STRIPE_SECRET_KEY=<your_stripe_secret_key>
   STRIPE_WEBHOOK_SECRET=<your_stripe_webhook_secret>
   ```

**For frontend and portal services:**
1. Go to each service settings
2. Add environment variables:
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your_stripe_publishable_key>
   ```

### Step 4: Deploy and Verify

1. **Trigger Deployment**: Services will auto-deploy after environment variables are set
2. **Monitor Logs**: Check deployment logs for any issues
3. **Test Health Endpoints**:
   ```bash
   curl https://ace-crm-backend.onrender.com/health
   curl https://ace-crm-frontend.onrender.com/api/health
   curl https://ace-crm-portal.onrender.com/api/health
   ```

## 🏥 Health Check Endpoints

All services include comprehensive health checks:

### Backend (`/health` and `/api/health`)
- Server status and uptime
- Environment configuration
- Supabase connectivity
- Service version information

### Frontend (`/api/health`)
- Service status and build information
- Environment variable validation
- Backend API connectivity test
- Supabase connection verification

### Client Portal (`/api/health`)
- Service status and configuration
- Supabase authentication test
- Stripe configuration validation
- File upload capability check
- Calendar integration status

## 🔒 Security Features

### Backend Security
- Helmet security headers
- CORS with environment-specific origins
- Rate limiting (1000 requests per 15 minutes per IP)
- Input validation with Joi
- JWT token authentication
- Request logging and monitoring

### Frontend Security
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy for camera/microphone/geolocation

### Client Portal Security
- Same security headers as frontend
- Stripe PCI compliance configuration
- Secure file upload handling
- Authentication state management

## 📊 Performance Optimizations

### Build Optimizations
- Next.js standalone output (smaller containers)
- TypeScript compilation with asset copying
- Static asset optimization
- Image optimization for Supabase storage

### Runtime Optimizations
- Gzip compression enabled
- Express.js with compression middleware
- CDN-ready static file serving
- Efficient memory management

## 🎯 Service URLs (Post-Deployment)

- **Backend API**: https://ace-crm-backend.onrender.com
  - Health: https://ace-crm-backend.onrender.com/health
  - API: https://ace-crm-backend.onrender.com/api
  
- **Frontend Dashboard**: https://ace-crm-frontend.onrender.com
  - Health: https://ace-crm-frontend.onrender.com/api/health
  
- **Client Portal**: https://ace-crm-portal.onrender.com
  - Health: https://ace-crm-portal.onrender.com/api/health

## 🛠️ Troubleshooting

### Common Issues

**Build Failures:**
- Check that all dependencies are listed in package.json
- Verify TypeScript compilation succeeds locally
- Ensure environment variables are properly configured

**Health Check Failures:**
- Verify Supabase URL and keys are correct
- Check that backend service is running
- Confirm CORS origins match actual service URLs

**Connection Issues:**
- Verify CORS configuration includes all frontend domains
- Check that API URLs in frontend point to correct backend service
- Ensure Stripe keys match (test vs live environment)

### Debug Commands
```bash
# Check service logs
render logs <service-name>

# Verify health endpoints
curl -v https://your-service.onrender.com/health

# Test CORS
curl -H "Origin: https://ace-crm-frontend.onrender.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://ace-crm-backend.onrender.com/api/health
```

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Integration](https://stripe.com/docs/api)

---

✅ **All deployment configurations are now fixed and ready for production!**

The project has been thoroughly tested and verified. You can now deploy with confidence using the Render blueprint.