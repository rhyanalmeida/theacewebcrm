#!/bin/bash

echo "🚀 Preparing ACE CRM for Render Deployment"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if git is initialized
if [ ! -d .git ]; then
    echo -e "${YELLOW}Initializing Git repository...${NC}"
    git init
    echo -e "${GREEN}✅ Git initialized${NC}"
else
    echo -e "${GREEN}✅ Git repository exists${NC}"
fi

# Create production build script for backend
echo -e "${YELLOW}Creating production build configuration...${NC}"

# Update backend start script
cat > src/server.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ace-crm-backend',
    version: '1.0.0'
  });
});

// Basic API endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'ACE CRM API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      contacts: '/api/contacts',
      leads: '/api/leads',
      deals: '/api/deals',
      projects: '/api/projects',
      invoices: '/api/invoices'
    }
  });
});

// Import routes (add your routes here)
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// etc...

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ACE CRM Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

export default app;
EOF

echo -e "${GREEN}✅ Server configuration created${NC}"

# Create frontend health check API
echo -e "${YELLOW}Adding health check to frontend...${NC}"

mkdir -p frontend/src/app/api/health
cat > frontend/src/app/api/health/route.ts << 'EOF'
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ace-crm-frontend',
    version: '1.0.0'
  });
}
EOF

echo -e "${GREEN}✅ Frontend health check added${NC}"

# Create .gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
    echo -e "${YELLOW}Creating .gitignore...${NC}"
    cp .gitignore.example .gitignore 2>/dev/null || echo "node_modules
.env
.env.local
dist
.next
out
*.log" > .gitignore
    echo -e "${GREEN}✅ .gitignore created${NC}"
fi

# Create README for GitHub
echo -e "${YELLOW}Creating GitHub README...${NC}"

cat > README.md << 'EOF'
# ACE CRM - Enterprise Customer Relationship Management System

A comprehensive CRM system built for web design agencies with modern technologies.

## Features

- 📊 Complete CRM functionality (Contacts, Leads, Deals, Projects)
- 💳 Stripe payment processing
- 📧 Email campaign management
- 📅 Calendar and scheduling
- 📈 Analytics and reporting
- 🔐 Secure authentication with JWT
- 🌐 Client portal
- 📱 Mobile responsive

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Deployment**: Render

## Deployment

This project is configured for deployment on Render using the `render.yaml` blueprint.

## License

Private - All rights reserved

## Support

For support, please contact support@acecrm.com
EOF

echo -e "${GREEN}✅ README created${NC}"

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "=============="
echo ""
echo "1. Create a GitHub repository:"
echo "   - Go to https://github.com/new"
echo "   - Create a new repository named 'ace-crm'"
echo "   - Make it private if desired"
echo ""
echo "2. Push your code to GitHub:"
echo -e "${YELLOW}   git add ."
echo "   git commit -m \"Initial commit - ACE CRM\""
echo "   git remote add origin https://github.com/YOUR_USERNAME/ace-crm.git"
echo "   git branch -M main"
echo -e "   git push -u origin main${NC}"
echo ""
echo "3. Update render.yaml:"
echo "   - Replace YOUR_USERNAME with your GitHub username"
echo ""
echo "4. Deploy on Render:"
echo "   - Go to https://dashboard.render.com"
echo "   - Click 'New +' → 'Blueprint'"
echo "   - Connect your GitHub repository"
echo "   - Render will automatically detect render.yaml"
echo ""
echo "5. Add these secret environment variables in Render Dashboard:"
echo "   - SUPABASE_SERVICE_KEY"
echo "   - STRIPE_SECRET_KEY"
echo "   - STRIPE_WEBHOOK_SECRET"
echo "   - STRIPE_PUBLISHABLE_KEY"
echo ""
echo -e "${GREEN}✅ Your project is ready for Render deployment!${NC}"