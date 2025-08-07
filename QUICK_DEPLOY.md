# 🚀 QUICK DEPLOYMENT FIX

## ✅ Your API is WORKING!
The backend is live at: https://theacewebcrm.onrender.com

## 🔧 Now Deploy Frontend & Portal

### Step 1: Create Frontend Service in Render
1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect: `rhyanalmeida/theacewebcrm`
4. Settings:
   - **Name**: `ace-crm-frontend`
   - **Environment**: Node
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Environment Variables:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://theacewebcrm.onrender.com/api
   NEXT_PUBLIC_SUPABASE_URL=https://hxcrjwrinexiyeyyyhfa.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Y3Jqd3JpbmV4aXlleXl5aGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDcyMTQsImV4cCI6MjA3MDA4MzIxNH0.UgHQzFICQqj5AAJty3PXqsEqL9s2NPRXyxIss1515M4
   ```

### Step 2: Create Portal Service in Render
1. Click **"New +"** → **"Web Service"**
2. Same repository
3. Settings:
   - **Name**: `ace-crm-portal`
   - **Environment**: Node
   - **Root Directory**: `client-portal`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Same environment variables as frontend

## 📊 What You'll Have:
- **API**: https://theacewebcrm.onrender.com ✅ (Already Working!)
- **Dashboard**: https://ace-crm-frontend.onrender.com
- **Client Portal**: https://ace-crm-portal.onrender.com

## 🎯 Quick Test URLs:
- API Health: https://theacewebcrm.onrender.com/api/health
- API Root: https://theacewebcrm.onrender.com

## ⚡ If Build Fails:
Add to environment variables:
```
NODE_OPTIONS=--openssl-legacy-provider
```

## 💡 Your Stripe Key:
Add to backend environment:
```
STRIPE_SECRET_KEY=[Your Stripe Secret Key]
```

That's it! Create these 2 services and you'll have the full CRM running!