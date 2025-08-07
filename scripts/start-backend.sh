#!/bin/bash

# ACE CRM Backend Startup Script
# This script starts the backend server with proper environment setup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="/mnt/c/Users/rhyan/Downloads/THE ACE CRM/ace-crm/backend"
PORT=5000
NODE_ENV=${NODE_ENV:-production}
LOG_DIR="/var/log/ace-crm"
PID_FILE="/var/run/ace-crm-backend.pid"

echo -e "${BLUE}🚀 Starting ACE CRM Backend Server...${NC}"

# Check if running as root for log directory creation
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Not running as root. Using local log directory...${NC}"
    LOG_DIR="$BACKEND_DIR/logs"
fi

# Create log directory if it doesn't exist
sudo mkdir -p "$LOG_DIR" 2>/dev/null || mkdir -p "$LOG_DIR"
sudo chown $(whoami):$(whoami) "$LOG_DIR" 2>/dev/null || true

# Function to check if port is available
check_port() {
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}❌ Port $PORT is already in use${NC}"
        echo "Process using port $PORT:"
        lsof -Pi :$PORT -sTCP:LISTEN
        exit 1
    fi
}

# Function to check dependencies
check_dependencies() {
    echo -e "${BLUE}📋 Checking dependencies...${NC}"
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
        echo -e "${RED}❌ Node.js version $NODE_VERSION < $REQUIRED_VERSION${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Node.js version $NODE_VERSION${NC}"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ npm $(npm --version)${NC}"
}

# Function to check environment variables
check_environment() {
    echo -e "${BLUE}🔐 Checking environment configuration...${NC}"
    
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        echo -e "${RED}❌ .env file not found at $BACKEND_DIR/.env${NC}"
        exit 1
    fi
    
    # Load environment variables
    source "$BACKEND_DIR/.env"
    
    # Check required environment variables
    REQUIRED_VARS=(
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "JWT_SECRET"
        "STRIPE_SECRET_KEY"
        "STRIPE_WEBHOOK_SECRET"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}❌ Required environment variable $var is not set${NC}"
            exit 1
        fi
        echo -e "${GREEN}✅ $var configured${NC}"
    done
}

# Function to check database connectivity
check_database() {
    echo -e "${BLUE}🗄️  Checking database connectivity...${NC}"
    
    # Test Supabase connection
    if [ -n "$SUPABASE_URL" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_ANON_KEY" || echo "000")
        if [ "$response" = "200" ]; then
            echo -e "${GREEN}✅ Supabase connection successful${NC}"
        else
            echo -e "${RED}❌ Supabase connection failed (HTTP $response)${NC}"
            exit 1
        fi
    fi
}

# Function to install dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    cd "$BACKEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        npm ci --production
    else
        echo -e "${GREEN}✅ Dependencies already installed${NC}"
    fi
}

# Function to build application
build_application() {
    echo -e "${BLUE}🔨 Building application...${NC}"
    cd "$BACKEND_DIR"
    
    if [ ! -d "dist" ] || [ "src" -nt "dist" ]; then
        npm run build
        echo -e "${GREEN}✅ Application built successfully${NC}"
    else
        echo -e "${GREEN}✅ Application already built${NC}"
    fi
}

# Function to start server
start_server() {
    echo -e "${BLUE}🌟 Starting server...${NC}"
    cd "$BACKEND_DIR"
    
    # Export environment variables
    export NODE_ENV="$NODE_ENV"
    export PORT="$PORT"
    export LOG_LEVEL=${LOG_LEVEL:-info}
    
    # Start the server
    if [ "$NODE_ENV" = "development" ]; then
        echo -e "${YELLOW}🔧 Starting in development mode...${NC}"
        npm run dev 2>&1 | tee "$LOG_DIR/backend.log"
    else
        echo -e "${GREEN}🚀 Starting in production mode...${NC}"
        # Store PID for later use
        nohup npm start > "$LOG_DIR/backend.log" 2>&1 &
        echo $! > "$PID_FILE"
        echo -e "${GREEN}✅ Backend server started with PID $(cat $PID_FILE)${NC}"
        echo -e "${BLUE}📊 Server running on http://localhost:$PORT${NC}"
        echo -e "${BLUE}📝 Logs: $LOG_DIR/backend.log${NC}"
        echo -e "${BLUE}📄 PID file: $PID_FILE${NC}"
    fi
}

# Function to show server status
show_status() {
    echo -e "\n${BLUE}📊 Server Status:${NC}"
    echo -e "  • Environment: $NODE_ENV"
    echo -e "  • Port: $PORT"
    echo -e "  • Backend Directory: $BACKEND_DIR"
    echo -e "  • Log Directory: $LOG_DIR"
    echo -e "  • PID File: $PID_FILE"
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "  • Status: ${GREEN}Running (PID: $PID)${NC}"
        else
            echo -e "  • Status: ${RED}Not running (stale PID file)${NC}"
            rm -f "$PID_FILE"
        fi
    else
        echo -e "  • Status: ${YELLOW}Unknown (no PID file)${NC}"
    fi
}

# Function to clean up on exit
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "${BLUE}🛑 Stopping server (PID: $PID)...${NC}"
            kill "$PID" 2>/dev/null || true
            sleep 2
            if ps -p "$PID" > /dev/null 2>&1; then
                echo -e "${RED}🔨 Force killing server...${NC}"
                kill -9 "$PID" 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Set trap for cleanup on script exit
trap cleanup EXIT INT TERM

# Main execution
main() {
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}🏢 ACE CRM Backend Startup Script${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    
    check_port
    check_dependencies
    check_environment
    check_database
    install_dependencies
    build_application
    show_status
    start_server
    
    echo -e "\n${GREEN}🎉 ACE CRM Backend startup completed successfully!${NC}"
    echo -e "${BLUE}📚 Use 'scripts/stop-backend.sh' to stop the server${NC}"
    echo -e "${BLUE}📊 Use 'scripts/status-backend.sh' to check server status${NC}"
    
    # If running in production mode, wait for interrupt
    if [ "$NODE_ENV" != "development" ]; then
        echo -e "\n${BLUE}Press Ctrl+C to stop the server...${NC}"
        # Keep script running to handle cleanup
        while true; do
            sleep 1
            # Check if process is still running
            if [ -f "$PID_FILE" ]; then
                PID=$(cat "$PID_FILE")
                if ! ps -p "$PID" > /dev/null 2>&1; then
                    echo -e "${RED}❌ Server process died unexpectedly${NC}"
                    break
                fi
            fi
        done
    fi
}

# Handle script arguments
case "${1:-start}" in
    start)
        main
        ;;
    status)
        show_status
        ;;
    stop)
        echo -e "${BLUE}Use scripts/stop-backend.sh to stop the server${NC}"
        ;;
    *)
        echo "Usage: $0 {start|status|stop}"
        echo "  start  - Start the backend server (default)"
        echo "  status - Show server status"
        echo "  stop   - Use scripts/stop-backend.sh"
        exit 1
        ;;
esac