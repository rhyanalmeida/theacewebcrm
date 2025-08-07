#!/bin/bash

# ACE CRM - Quick Start Script
# This script will help you get the system running quickly

echo "🚀 ACE CRM - Quick Start Setup"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not installed${NC}"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✅ npm installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm not installed${NC}"
    exit 1
fi

echo ""
echo "📦 Installing dependencies..."
echo "=============================="

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
npm install --silent

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd frontend && npm install --silent && cd ..

# Install client portal dependencies
echo -e "${YELLOW}Installing client portal dependencies...${NC}"
cd client-portal && npm install --silent && cd ..

echo -e "${GREEN}✅ All dependencies installed${NC}"

echo ""
echo "🔍 Running connection tests..."
echo "=============================="

# Run connection test
node test-connections.js

echo ""
echo "📋 Next Steps:"
echo "=============================="
echo ""
echo "1. Set up your Supabase database:"
echo "   - Go to https://app.supabase.com"
echo "   - Open SQL Editor"
echo "   - Run the contents of setup-supabase.sql"
echo ""
echo "2. Configure Stripe:"
echo "   - Add your publishable key to .env files"
echo "   - Set up webhooks in Stripe Dashboard"
echo ""
echo "3. Start the services:"
echo ""
echo "   Terminal 1 - Backend:"
echo "   npm run dev"
echo ""
echo "   Terminal 2 - Frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "   Terminal 3 - Client Portal:"
echo "   cd client-portal && npm run dev"
echo ""
echo "4. Access the application:"
echo "   - Main CRM: http://localhost:3000"
echo "   - Admin Panel: http://localhost:3000/admin"
echo "   - Client Portal: http://localhost:3001"
echo "   - API: http://localhost:5000/api"
echo ""
echo -e "${GREEN}🎉 Setup complete! Your ACE CRM is ready to use.${NC}"
echo ""
echo "For detailed instructions, see SETUP_GUIDE.md"