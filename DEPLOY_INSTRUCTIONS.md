# 🚀 Deployment Instructions for Render

## Your Repository
✅ Code successfully pushed to: https://github.com/rhyanalmeida/theacewebcrm

## In Render Dashboard

### 1. Update Service Settings
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment**: Node (not Python)

### 2. Add Environment Variables
Go to Environment tab and add:
- `NODE_ENV` = `production`
- `PORT` = `5000`
- `SUPABASE_URL` = `https://hxcrjwrinexiyeyyyhfa.supabase.co`
- `SUPABASE_ANON_KEY` = Check .env.render file for the key
- `STRIPE_SECRET_KEY` = Add your Stripe key from Dashboard
- `JWT_SECRET` = Click "Generate" button
- `CORS_ORIGIN` = `https://theacewebcrm.onrender.com`

### 3. Deploy
Click "Manual Deploy" → "Deploy latest commit"

## Service URLs
- Main: https://theacewebcrm.onrender.com
- Health: https://theacewebcrm.onrender.com/api/health

## Next Steps
1. Wait for build to complete (5-10 minutes)
2. Test health endpoint
3. Add remaining services (frontend, portal)
4. Configure Stripe webhooks
5. Run Supabase migrations

## Creating Additional Services
For complete CRM, create 3 services:
1. **Backend** (current) - API server
2. **Frontend** - Admin dashboard (root: `frontend`)
3. **Portal** - Client portal (root: `client-portal`)

Each service needs its own environment variables and build commands.