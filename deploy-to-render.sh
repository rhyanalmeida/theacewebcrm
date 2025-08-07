#!/bin/bash

# ACE CRM - Automated Render Deployment Script
# This script will deploy your CRM to Render using their API

echo "🚀 ACE CRM - Automated Render Deployment"
echo "========================================"
echo ""

# Render API Configuration
RENDER_API_KEY="rnd_xjlZYC6KzvaCC8om8AkF8NPUPrgb"
RENDER_API_URL="https://api.render.com/v1"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Function to make Render API calls
render_api() {
    curl -s -H "Authorization: Bearer ${RENDER_API_KEY}" \
         -H "Content-Type: application/json" \
         "$@"
}

echo -e "${BLUE}📊 Checking Render Account...${NC}"

# Check if API key is valid
ACCOUNT_INFO=$(render_api "${RENDER_API_URL}/owners")
if echo "$ACCOUNT_INFO" | grep -q "error"; then
    echo -e "${RED}❌ Invalid Render API key${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Render API key validated${NC}"

# Get owner ID
OWNER_ID=$(echo "$ACCOUNT_INFO" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✅ Owner ID: ${OWNER_ID}${NC}"

echo ""
echo -e "${YELLOW}📝 Creating Services on Render...${NC}"
echo ""

# Create Backend Service
echo -e "${BLUE}1. Creating Backend API Service...${NC}"

BACKEND_SERVICE=$(render_api -X POST "${RENDER_API_URL}/services" \
  -d '{
    "type": "web_service",
    "name": "ace-crm-backend",
    "ownerId": "'${OWNER_ID}'",
    "repo": "https://github.com/YOUR_USERNAME/ace-crm",
    "branch": "main",
    "autoDeploy": "yes",
    "rootDir": ".",
    "buildCommand": "npm install && npm run build",
    "startCommand": "npm start",
    "envVars": [
      {"key": "NODE_ENV", "value": "production"},
      {"key": "PORT", "value": "5000"},
      {"key": "SUPABASE_URL", "value": "https://hxcrjwrinexiyeyyyhfa.supabase.co"},
      {"key": "SUPABASE_ANON_KEY", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Y3Jqd3JpbmV4aXlleXl5aGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDcyMTQsImV4cCI6MjA3MDA4MzIxNH0.UgHQzFICQqj5AAJty3PXqsEqL9s2NPRXyxIss1515M4"},
      {"key": "SUPABASE_SERVICE_KEY", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Y3Jqd3JpbmV4aXlleXl5aGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDUwNzIxNCwiZXhwIjoyMDcwMDgzMjE0fQ.tziPBn34hVu3SDOcb46idRB8__f_cm4RvhyAWwUeyiU"},
      {"key": "STRIPE_SECRET_KEY", "value": "[STRIPE_SECRET_KEY_FROM_ENV]"},
      {"key": "JWT_SECRET", "value": "ace-crm-jwt-secret-2025-super-secure-key-change-in-production-x7y9z2a4b6c8"},
      {"key": "JWT_REFRESH_SECRET", "value": "ace-crm-refresh-secret-2025-ultra-secure-key-change-in-production-m3n5p7q9r1s2"},
      {"key": "CORS_ORIGIN", "value": "https://ace-crm-frontend.onrender.com,https://ace-crm-portal.onrender.com"}
    ],
    "healthCheckPath": "/api/health",
    "plan": "starter"
  }')

if echo "$BACKEND_SERVICE" | grep -q '"id"'; then
    BACKEND_ID=$(echo "$BACKEND_SERVICE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✅ Backend service created: ${BACKEND_ID}${NC}"
else
    echo -e "${YELLOW}⚠️  Backend service creation pending (may already exist)${NC}"
fi

# Create Frontend Service
echo -e "${BLUE}2. Creating Frontend Dashboard Service...${NC}"

FRONTEND_SERVICE=$(render_api -X POST "${RENDER_API_URL}/services" \
  -d '{
    "type": "web_service",
    "name": "ace-crm-frontend",
    "ownerId": "'${OWNER_ID}'",
    "repo": "https://github.com/YOUR_USERNAME/ace-crm",
    "branch": "main",
    "autoDeploy": "yes",
    "rootDir": "frontend",
    "buildCommand": "npm install && npm run build",
    "startCommand": "npm start",
    "envVars": [
      {"key": "NODE_ENV", "value": "production"},
      {"key": "NEXT_PUBLIC_API_URL", "value": "https://ace-crm-backend.onrender.com/api"},
      {"key": "NEXT_PUBLIC_SUPABASE_URL", "value": "https://hxcrjwrinexiyeyyyhfa.supabase.co"},
      {"key": "NEXT_PUBLIC_SUPABASE_ANON_KEY", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Y3Jqd3JpbmV4aXlleXl5aGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDcyMTQsImV4cCI6MjA3MDA4MzIxNH0.UgHQzFICQqj5AAJty3PXqsEqL9s2NPRXyxIss1515M4"}
    ],
    "healthCheckPath": "/api/health",
    "plan": "starter"
  }')

if echo "$FRONTEND_SERVICE" | grep -q '"id"'; then
    FRONTEND_ID=$(echo "$FRONTEND_SERVICE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✅ Frontend service created: ${FRONTEND_ID}${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend service creation pending (may already exist)${NC}"
fi

# Create Client Portal Service
echo -e "${BLUE}3. Creating Client Portal Service...${NC}"

PORTAL_SERVICE=$(render_api -X POST "${RENDER_API_URL}/services" \
  -d '{
    "type": "web_service",
    "name": "ace-crm-portal",
    "ownerId": "'${OWNER_ID}'",
    "repo": "https://github.com/YOUR_USERNAME/ace-crm",
    "branch": "main",
    "autoDeploy": "yes",
    "rootDir": "client-portal",
    "buildCommand": "npm install && npm run build",
    "startCommand": "npm start",
    "envVars": [
      {"key": "NODE_ENV", "value": "production"},
      {"key": "NEXT_PUBLIC_API_URL", "value": "https://ace-crm-backend.onrender.com/api"},
      {"key": "NEXT_PUBLIC_SUPABASE_URL", "value": "https://hxcrjwrinexiyeyyyhfa.supabase.co"},
      {"key": "NEXT_PUBLIC_SUPABASE_ANON_KEY", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Y3Jqd3JpbmV4aXlleXl5aGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDcyMTQsImV4cCI6MjA3MDA4MzIxNH0.UgHQzFICQqj5AAJty3PXqsEqL9s2NPRXyxIss1515M4"}
    ],
    "healthCheckPath": "/",
    "plan": "starter"
  }')

if echo "$PORTAL_SERVICE" | grep -q '"id"'; then
    PORTAL_ID=$(echo "$PORTAL_SERVICE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✅ Client Portal service created: ${PORTAL_ID}${NC}"
else
    echo -e "${YELLOW}⚠️  Portal service creation pending (may already exist)${NC}"
fi

echo ""
echo -e "${GREEN}✨ Services Created/Configured!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "==============="
echo ""
echo "1. Push your code to GitHub:"
echo -e "${YELLOW}   git init"
echo "   git add ."
echo "   git commit -m \"Deploy ACE CRM to Render\""
echo "   git remote add origin https://github.com/YOUR_USERNAME/ace-crm.git"
echo "   git push -u origin main${NC}"
echo ""
echo "2. Connect GitHub to Render:"
echo "   - Go to https://dashboard.render.com"
echo "   - Click on each service"
echo "   - Connect your GitHub repository"
echo "   - Services will auto-deploy"
echo ""
echo "3. Your services will be available at:"
echo -e "${GREEN}   Backend: https://ace-crm-backend.onrender.com"
echo "   Frontend: https://ace-crm-frontend.onrender.com"
echo "   Portal: https://ace-crm-portal.onrender.com${NC}"
echo ""
echo "4. Configure Stripe Webhooks:"
echo "   - Add webhook URL: https://ace-crm-backend.onrender.com/api/payments/stripe/webhook"
echo "   - Get webhook secret and update in Render dashboard"
echo ""
echo -e "${GREEN}🎉 Deployment configuration complete!${NC}"