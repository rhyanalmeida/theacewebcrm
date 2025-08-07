# 🚀 Deploying ACE CRM to Render

## Prerequisites

### 1. Create GitHub Repository
```bash
# Initialize git repository
cd "/mnt/c/Users/rhyan/Downloads/THE ACE CRM"
git init
git add .
git commit -m "Initial commit - ACE CRM"

# Create repository on GitHub and push
# Go to https://github.com/new
# Create a new repository named 'ace-crm'
# Then run:
git remote add origin https://github.com/YOUR_USERNAME/ace-crm.git
git branch -M main
git push -u origin main
```

### 2. Sign Up for Render
- Go to [https://render.com](https://render.com)
- Sign up with your GitHub account
- Authorize Render to access your repositories

## 🎯 Deployment Steps

### Method 1: Using Render Blueprint (Recommended)

1. **Update render.yaml**
   - Edit `render.yaml` in your project
   - Replace `YOUR_USERNAME` with your GitHub username

2. **Deploy with Blueprint**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select the `ace-crm` repository
   - Render will detect `render.yaml` automatically
   - Click "Apply" to create all services

### Method 2: Manual Service Creation

#### Step 1: Deploy Backend API

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   ```
   Name: ace-crm-backend
   Root Directory: .
   Environment: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   Plan: Starter ($7/month) or Free
   ```

5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=5000
   SUPABASE_URL=https://hxcrjwrinexiyeyyyhfa.supabase.co
   SUPABASE_ANON_KEY=[Your Supabase Anon Key]
   SUPABASE_SERVICE_KEY=[Your Supabase Service Key]
   STRIPE_SECRET_KEY=[Your Stripe Secret Key from Dashboard]
   STRIPE_WEBHOOK_SECRET=[Get from Stripe Dashboard]
   JWT_SECRET=[Generate a secure random string]
   JWT_REFRESH_SECRET=[Generate another secure random string]
   CORS_ORIGIN=https://your-frontend-url.onrender.com
   ```

6. Click "Create Web Service"

#### Step 2: Deploy Frontend

1. Click "New +" → "Web Service"
2. Connect same repository
3. Configure:
   ```
   Name: ace-crm-frontend
   Root Directory: frontend
   Environment: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

4. Add Environment Variables:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://ace-crm-backend.onrender.com/api
   NEXT_PUBLIC_SUPABASE_URL=https://hxcrjwrinexiyeyyyhfa.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Y3Jqd3JpbmV4aXlleXl5aGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDcyMTQsImV4cCI6MjA3MDA4MzIxNH0.UgHQzFICQqj5AAJty3PXqsEqL9s2NPRXyxIss1515M4
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[Your Stripe Publishable Key]
   ```

#### Step 3: Deploy Client Portal

1. Click "New +" → "Web Service"
2. Configure:
   ```
   Name: ace-crm-portal
   Root Directory: client-portal
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

3. Add similar environment variables as frontend

## 🔧 Post-Deployment Configuration

### 1. Update Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → Webhooks
3. Add endpoint:
   ```
   https://ace-crm-backend.onrender.com/api/payments/stripe/webhook
   ```
4. Select events to listen for
5. Copy the webhook signing secret
6. Update the `STRIPE_WEBHOOK_SECRET` environment variable in Render

### 2. Configure CORS

Update the backend's `CORS_ORIGIN` environment variable:
```
https://ace-crm-frontend.onrender.com,https://ace-crm-portal.onrender.com
```

### 3. Set Up Custom Domains (Optional)

1. In Render Dashboard, go to each service
2. Click "Settings" → "Custom Domains"
3. Add your domain (e.g., `app.yourdomain.com`)
4. Follow DNS configuration instructions

### 4. Database Migration

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Open SQL Editor
3. Run the contents of `setup-supabase.sql`

## 📊 Service URLs

After deployment, your services will be available at:

- **Backend API**: `https://ace-crm-backend.onrender.com`
- **Frontend**: `https://ace-crm-frontend.onrender.com`
- **Client Portal**: `https://ace-crm-portal.onrender.com`

## 🔍 Monitoring & Logs

### View Logs
1. Go to Render Dashboard
2. Click on any service
3. Navigate to "Logs" tab

### Monitor Performance
1. Check "Metrics" tab for each service
2. Set up alerts in "Settings" → "Notifications"

## 💰 Pricing

### Render Pricing (as of 2024)
- **Free Tier**: 
  - 750 hours/month
  - Services spin down after 15 min of inactivity
  - Good for testing

- **Starter Plan** ($7/service/month):
  - Always-on services
  - Custom domains
  - More resources
  - Recommended for production

- **Professional Plan** ($25/service/month):
  - More CPU/RAM
  - Autoscaling
  - Priority support

## 🚨 Troubleshooting

### Build Failures
- Check build logs in Render Dashboard
- Ensure all dependencies are in `package.json`
- Verify Node version compatibility

### Environment Variables
- Double-check all required variables are set
- Use Render's secret files for sensitive data
- Restart service after changing variables

### Database Connection
- Verify Supabase URL and keys
- Check if tables are created
- Review RLS policies

### CORS Issues
- Update `CORS_ORIGIN` with correct URLs
- Include both frontend and portal URLs
- Restart backend after changes

## 🔒 Security Best Practices

1. **Use Environment Variables**
   - Never commit secrets to Git
   - Use Render's environment variable management

2. **Enable HTTPS**
   - Render provides free SSL certificates
   - Enforced automatically

3. **Set Up Health Checks**
   - Configure in service settings
   - Helps with auto-restart on failures

4. **Regular Backups**
   - Set up Supabase backups
   - Export data regularly

## 📝 Deployment Checklist

- [ ] Push code to GitHub
- [ ] Create Render account
- [ ] Deploy backend service
- [ ] Deploy frontend service
- [ ] Deploy client portal
- [ ] Configure environment variables
- [ ] Update Stripe webhooks
- [ ] Run database migrations
- [ ] Test all services
- [ ] Set up custom domains (optional)
- [ ] Configure monitoring alerts
- [ ] Document service URLs

## 🎉 Success!

Once deployed, your ACE CRM will be live and accessible worldwide! 

Access your services at:
- Main App: `https://ace-crm-frontend.onrender.com`
- Client Portal: `https://ace-crm-portal.onrender.com`
- API: `https://ace-crm-backend.onrender.com/api`

For additional help, refer to:
- [Render Documentation](https://render.com/docs)
- [Render Blueprint Spec](https://render.com/docs/blueprint-spec)
- [Render Support](https://render.com/support)