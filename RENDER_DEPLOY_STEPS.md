# 🚀 Deploy to Render - Step by Step

## Your Render API Key
```
rnd_xjlZYC6KzvaCC8om8AkF8NPUPrgb
```

## Option 1: Deploy via Render Dashboard (Recommended)

### Step 1: Push to GitHub First
```bash
cd "/mnt/c/Users/rhyan/Downloads/THE ACE CRM"
git push -u origin main
```
(Use your GitHub Personal Access Token when prompted)

### Step 2: Go to Render Dashboard
1. Open: https://dashboard.render.com
2. Click: **"New +"** → **"Blueprint"**
3. Connect: Your GitHub account
4. Select: Repository `rhyanalmeida/theacewebcrm`
5. Click: **"Apply"**

Render will automatically:
- Read your `render.yaml` file
- Create all 3 services (backend, frontend, portal)
- Set up the build and start commands
- Configure the URLs

### Step 3: Add Secret Environment Variables
After blueprint creates services, for each service add:

**For Backend Service (ace-crm-backend):**
```
STRIPE_SECRET_KEY=[Your Stripe Secret Key from Dashboard]
SUPABASE_SERVICE_KEY=(Get from Supabase Dashboard → Settings → API → service_role)
```

**For Frontend & Portal Services:**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=(Get from Stripe Dashboard → Developers → API Keys)
```

## Option 2: Manual Service Creation

### Create Backend Service:
1. Go to: https://dashboard.render.com
2. Click: **"New +"** → **"Web Service"**
3. Connect repository: `rhyanalmeida/theacewebcrm`
4. Configure:
   - **Name**: ace-crm-backend
   - **Root Directory**: (leave empty)
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add Environment Variables:
```
NODE_ENV=production
PORT=5000
STRIPE_SECRET_KEY=[Your Stripe Secret Key from Dashboard]
SUPABASE_URL=https://hxcrjwrinexiyeyyyhfa.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Y3Jqd3JpbmV4aXlleXl5aGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDcyMTQsImV4cCI6MjA3MDA4MzIxNH0.UgHQzFICQqj5AAJty3PXqsEqL9s2NPRXyxIss1515M4
CORS_ORIGIN=https://ace-crm-frontend.onrender.com,https://ace-crm-portal.onrender.com
```

### Create Frontend Service:
1. Click: **"New +"** → **"Web Service"**
2. Same repository
3. Configure:
   - **Name**: ace-crm-frontend
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variables:
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://ace-crm-backend.onrender.com/api
NEXT_PUBLIC_APP_URL=https://ace-crm-frontend.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://hxcrjwrinexiyeyyyhfa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Y3Jqd3JpbmV4aXlleXl5aGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDcyMTQsImV4cCI6MjA3MDA4MzIxNH0.UgHQzFICQqj5AAJty3PXqsEqL9s2NPRXyxIss1515M4
```

### Create Client Portal Service:
1. Click: **"New +"** → **"Web Service"**
2. Same repository
3. Configure:
   - **Name**: ace-crm-portal
   - **Root Directory**: `client-portal`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add same environment variables as Frontend

## 🎯 After Deployment

### 1. Run Database Setup in Supabase:
1. Go to: https://supabase.com/dashboard/project/hxcrjwrinexiyeyyyhfa/sql
2. Click: **"New query"**
3. Paste contents of `setup-supabase.sql`
4. Click: **"Run"**

### 2. Configure Stripe Webhook:
1. Go to: https://dashboard.stripe.com/webhooks
2. Click: **"Add endpoint"**
3. Endpoint URL: `https://ace-crm-backend.onrender.com/api/stripe/webhook`
4. Select events: All events (or select specific ones)
5. Copy the signing secret
6. Add to Backend service environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### 3. Get Missing Keys:

**Stripe Publishable Key:**
- Go to: https://dashboard.stripe.com/apikeys
- Copy the "Publishable key"
- Add to Frontend and Portal services

**Supabase Service Key:**
- Go to: https://supabase.com/dashboard/project/hxcrjwrinexiyeyyyhfa/settings/api
- Copy the "service_role" key (under Project API keys)
- Add to Backend service only

## 📱 Your Live URLs

Once deployed, your services will be available at:

- **Admin Dashboard**: https://ace-crm-frontend.onrender.com
- **Client Portal**: https://ace-crm-portal.onrender.com
- **API**: https://ace-crm-backend.onrender.com/api
- **Health Check**: https://ace-crm-backend.onrender.com/api/health

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Services created on Render
- [ ] Environment variables added
- [ ] Database tables created in Supabase
- [ ] Stripe webhook configured
- [ ] All services showing "Live" status

## 🔧 Troubleshooting

### Build Fails:
- Check Node version (needs 18+)
- Verify all dependencies in package.json
- Check build logs for specific errors

### Service Won't Start:
- Verify start command is `npm start`
- Check environment variables are set
- Look at service logs for errors

### Database Connection Issues:
- Verify Supabase URL and keys
- Run database setup SQL
- Check RLS policies

### CORS Errors:
- Update CORS_ORIGIN in backend
- Include all frontend URLs

## 🎉 Success!

Your ACE CRM will be live and ready to use! Default admin credentials will be created on first run.