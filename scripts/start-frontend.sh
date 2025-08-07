#!/bin/bash

# ACE CRM Frontend Startup Script
# This script starts the frontend Next.js application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="/mnt/c/Users/rhyan/Downloads/THE ACE CRM/frontend"
PORT=3000
NODE_ENV=${NODE_ENV:-production}
LOG_DIR="/var/log/ace-crm"
PID_FILE="/var/run/ace-crm-frontend.pid"

echo -e "${BLUE}🚀 Starting ACE CRM Frontend...${NC}"

# Check if running as root for log directory creation
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Not running as root. Using local log directory...${NC}"
    LOG_DIR="$FRONTEND_DIR/logs"
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
    
    # Check for environment file
    if [ ! -f "$FRONTEND_DIR/.env.local" ] && [ ! -f "$FRONTEND_DIR/.env.production" ]; then
        echo -e "${YELLOW}⚠️  No environment file found. Creating default...${NC}"
        create_default_env
    fi
    
    # Load environment variables
    if [ -f "$FRONTEND_DIR/.env.local" ]; then
        source "$FRONTEND_DIR/.env.local"
    elif [ -f "$FRONTEND_DIR/.env.production" ]; then
        source "$FRONTEND_DIR/.env.production"
    fi
    
    echo -e "${GREEN}✅ Environment configuration loaded${NC}"
}

# Function to create default environment file
create_default_env() {
    cat > "$FRONTEND_DIR/.env.local" << EOF
# ACE CRM Frontend Environment Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
EOF
    echo -e "${YELLOW}⚠️  Default environment file created. Please update with your actual values.${NC}"
}

# Function to install dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    cd "$FRONTEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        npm ci
    else
        echo -e "${GREEN}✅ Dependencies already installed${NC}"
    fi
}

# Function to build application
build_application() {
    if [ "$NODE_ENV" = "production" ]; then
        echo -e "${BLUE}🔨 Building application for production...${NC}"
        cd "$FRONTEND_DIR"
        
        if [ ! -d ".next" ] || [ "src" -nt ".next" ]; then
            npm run build
            echo -e "${GREEN}✅ Application built successfully${NC}"
        else
            echo -e "${GREEN}✅ Application already built${NC}"
        fi
    fi
}

# Function to start server
start_server() {
    echo -e "${BLUE}🌟 Starting frontend server...${NC}"
    cd "$FRONTEND_DIR"
    
    # Export environment variables
    export NODE_ENV="$NODE_ENV"
    export PORT="$PORT"
    
    # Start the server
    if [ "$NODE_ENV" = "development" ]; then
        echo -e "${YELLOW}🔧 Starting in development mode...${NC}"
        npm run dev 2>&1 | tee "$LOG_DIR/frontend.log"
    else
        echo -e "${GREEN}🚀 Starting in production mode...${NC}"
        # Store PID for later use
        nohup npm start > "$LOG_DIR/frontend.log" 2>&1 &
        echo $! > "$PID_FILE"
        echo -e "${GREEN}✅ Frontend server started with PID $(cat $PID_FILE)${NC}"
        echo -e "${BLUE}📊 Server running on http://localhost:$PORT${NC}"
        echo -e "${BLUE}📝 Logs: $LOG_DIR/frontend.log${NC}"
        echo -e "${BLUE}📄 PID file: $PID_FILE${NC}"
    fi
}

# Function to show server status
show_status() {
    echo -e "\n${BLUE}📊 Frontend Server Status:${NC}"
    echo -e "  • Environment: $NODE_ENV"
    echo -e "  • Port: $PORT"
    echo -e "  • Frontend Directory: $FRONTEND_DIR"
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
    echo -e "${BLUE}🎨 ACE CRM Frontend Startup Script${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    
    check_port
    check_dependencies
    check_environment
    install_dependencies
    build_application
    show_status
    start_server
    
    echo -e "\n${GREEN}🎉 ACE CRM Frontend startup completed successfully!${NC}"
    echo -e "${BLUE}📚 Use 'scripts/stop-frontend.sh' to stop the server${NC}"
    echo -e "${BLUE}📊 Use 'scripts/status-frontend.sh' to check server status${NC}"
    
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
        echo -e "${BLUE}Use scripts/stop-frontend.sh to stop the server${NC}"
        ;;
    *)
        echo "Usage: $0 {start|status|stop}"
        echo "  start  - Start the frontend server (default)"
        echo "  status - Show server status"
        echo "  stop   - Use scripts/stop-frontend.sh"
        exit 1
        ;;
esac