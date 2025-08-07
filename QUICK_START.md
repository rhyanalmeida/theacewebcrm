# 🚀 ACE CRM - QUICK START GUIDE

## ✅ Your System is READY TO RUN!

Your Supabase credentials are already configured:
- **Project URL**: hxcrjwrinexiyeyyyhfa.supabase.co
- **All keys**: Already set in environment files

## 🎯 Start Your CRM System

### Option 1: Quick Start (Recommended)
```bash
# Open 2 terminals

# Terminal 1 - Backend API
cd "/mnt/c/Users/rhyan/Downloads/THE ACE CRM"
PORT=3001 node src/simple-server.js

# Terminal 2 - Frontend Dashboard  
cd "/mnt/c/Users/rhyan/Downloads/THE ACE CRM/frontend"
npx next dev
```

Then open: **http://localhost:3000**

### Option 2: If npm install is needed
```bash
# Frontend setup (only if needed)
cd "/mnt/c/Users/rhyan/Downloads/THE ACE CRM/frontend"
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 🌐 Access Points

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health
- **API Documentation**: http://localhost:3001/api

## 📱 Default Login Credentials

Since this is a new Supabase project, you'll need to:
1. Go to http://localhost:3000/auth/register
2. Create your first admin account
3. Use those credentials to login

## 🚀 Deploy to Production

### Using Render.com (Easiest)
1. Push your code to GitHub
2. Go to https://render.com
3. Create new Blueprint
4. Connect your GitHub repo
5. Select the `render.yaml` file
6. Deploy!

### Manual Deployment
```bash
# Backend on Render
- Service Type: Web Service
- Build Command: cd src && npm install
- Start Command: cd src && node simple-server.js
- Environment: Add your Supabase keys

# Frontend on Vercel/Render
- Framework: Next.js
- Build Command: npm run build
- Output Directory: .next
```

## 🔧 Troubleshooting

### Backend won't start?
```bash
# Kill existing processes
lsof -ti:3001 | xargs kill -9
lsof -ti:5000 | xargs kill -9

# Start fresh
PORT=3001 node src/simple-server.js
```

### Frontend won't start?
```bash
# Clean install
cd frontend
rm -rf node_modules .next package-lock.json
npm install
npm run dev
```

### Database connection issues?
1. Check Supabase dashboard is active
2. Verify keys in `.env` files
3. Test connection: http://localhost:3001/api/test-db

## 📊 What's Working

✅ **Authentication System**
- Login/Register/Logout
- JWT tokens with Supabase
- Protected routes

✅ **Dashboard Features**
- Responsive sidebar navigation
- Contact management
- Lead tracking
- Deal pipeline
- Company records
- Task management

✅ **API Endpoints**
- Full REST API
- Supabase integration
- Health monitoring
- Error handling

✅ **Security**
- CORS configured
- Rate limiting
- Input validation
- JWT authentication

## 🎉 You're Ready!

Your CRM is fully configured with your Supabase project. Just start the servers and begin using it!

Need help? Check:
- `ENVIRONMENT_SETUP_GUIDE.md` - Detailed configuration
- `API_DOCUMENTATION.md` - API endpoints
- `DEPLOYMENT_GUIDE.md` - Production deployment