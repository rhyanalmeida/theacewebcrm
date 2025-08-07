# 🚀 Quick Deploy to Render

## Your Render API Key
```
rnd_xjlZYC6KzvaCC8om8AkF8NPUPrgb
```

## Option 1: Manual Deployment (Recommended for First Time)

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create new repository called `ace-crm`
3. Push your code:

```bash
cd "/mnt/c/Users/rhyan/Downloads/THE ACE CRM"
git init
git add .
git commit -m "Initial deployment to Render"
git remote add origin https://github.com/YOUR_USERNAME/ace-crm.git
git push -u origin main
```

### Step 2: Deploy Using Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub account
4. Select the `ace-crm` repository
5. Render will detect `render.yaml` automatically
6. Click **"Apply"**

All services will be created automatically!

## Option 2: Using Render CLI

### Install Render CLI
```bash
# On Windows (using npm)
npm install -g @render/cli

# Or download from
# https://github.com/render-oss/cli/releases
```

### Deploy with CLI
```bash
# Login to Render
render login --api-key rnd_xjlZYC6KzvaCC8om8AkF8NPUPrgb

# Deploy blueprint
render blueprint deploy
```

## Option 3: Direct API Deployment

Run the automated script:
```bash
chmod +x deploy-to-render.sh
./deploy-to-render.sh
```

## 🔗 Service URLs (After Deployment)

- **Backend API**: https://ace-crm-backend.onrender.com
- **Frontend**: https://ace-crm-frontend.onrender.com  
- **Client Portal**: https://ace-crm-portal.onrender.com

## ⚙️ Environment Variables to Add

In Render Dashboard, add these for the backend service:

### Required Secrets
```
STRIPE_WEBHOOK_SECRET=whsec_[get from Stripe after adding webhook]
STRIPE_PUBLISHABLE_KEY=pk_live_[get from Stripe dashboard]
```

### Optional (if you want to change)
```
JWT_SECRET=[generate a secure random string]
JWT_REFRESH_SECRET=[generate another secure random string]
SESSION_SECRET=[generate another secure random string]
```

## 🔧 Post-Deployment Setup

### 1. Configure Stripe Webhook
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Add webhook endpoint: `https://ace-crm-backend.onrender.com/api/payments/stripe/webhook`
3. Copy webhook signing secret
4. Update `STRIPE_WEBHOOK_SECRET` in Render

### 2. Run Database Migrations
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Open SQL Editor
3. Run contents of `setup-supabase.sql`

### 3. Test Your Deployment
- Backend Health: https://ace-crm-backend.onrender.com/api/health
- Frontend: https://ace-crm-frontend.onrender.com
- Portal: https://ace-crm-portal.onrender.com

## 📱 Mobile Access
Your CRM will work on mobile devices automatically with responsive design!

## 🎉 That's It!
Your ACE CRM is now live on Render! Access it from anywhere in the world.

## Need Help?
- Check logs in Render Dashboard
- Review `RENDER_DEPLOYMENT.md` for detailed instructions
- Contact Render support at support@render.com