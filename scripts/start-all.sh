#!/bin/bash

# ACE CRM Complete System Startup Script
# This script starts all services: Backend API, Frontend, and Client Portal

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NODE_ENV=${NODE_ENV:-production}
STARTUP_DELAY=5  # Seconds to wait between starting services

echo -e "${PURPLE}🚀 Starting ACE CRM Complete System...${NC}"

# Function to check system requirements
check_system_requirements() {
    echo -e "${BLUE}🔍 Checking system requirements...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found. Please install Node.js 18+ first.${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    echo -e "${GREEN}✅ Node.js version $NODE_VERSION${NC}"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ npm $(npm --version)${NC}"
    
    # Check if ports are available
    PORTS=(5000 3000 3001)
    PORT_NAMES=("Backend API" "Frontend" "Client Portal")
    
    for i in "${!PORTS[@]}"; do
        PORT=${PORTS[$i]}
        NAME=${PORT_NAMES[$i]}
        
        if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${RED}❌ Port $PORT is already in use (needed for $NAME)${NC}"
            echo "Process using port $PORT:"
            lsof -Pi :$PORT -sTCP:LISTEN
            exit 1
        else
            echo -e "${GREEN}✅ Port $PORT available for $NAME${NC}"
        fi
    done
}

# Function to create log directories
create_log_directories() {
    echo -e "${BLUE}📁 Creating log directories...${NC}"
    
    LOG_DIRS=(
        "/var/log/ace-crm"
        "$PROJECT_ROOT/logs"
        "$PROJECT_ROOT/ace-crm/backend/logs"
        "$PROJECT_ROOT/frontend/logs"
        "$PROJECT_ROOT/client-portal/logs"
    )
    
    for dir in "${LOG_DIRS[@]}"; do
        if [ "$EUID" -eq 0 ] || [ "$dir" = "/var/log/ace-crm" ]; then
            sudo mkdir -p "$dir" 2>/dev/null || mkdir -p "$dir"
            sudo chown $(whoami):$(whoami) "$dir" 2>/dev/null || true
        else
            mkdir -p "$dir"
        fi
    done
    
    echo -e "${GREEN}✅ Log directories created${NC}"
}

# Function to check service health
check_service_health() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=0
    
    echo -e "${BLUE}🔍 Waiting for $service_name to be ready on port $port...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port" | grep -q "200\|401\|404"; then
            echo -e "${GREEN}✅ $service_name is ready${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service_name failed to start within $((max_attempts * 2)) seconds${NC}"
    return 1
}

# Function to start backend service
start_backend() {
    echo -e "${BLUE}🏗️ Starting Backend API Server...${NC}"
    
    if [ -x "$SCRIPT_DIR/start-backend.sh" ]; then
        # Start backend in background
        nohup bash "$SCRIPT_DIR/start-backend.sh" > /var/log/ace-crm/startup-backend.log 2>&1 &
        
        # Wait for backend to be ready
        sleep $STARTUP_DELAY
        if check_service_health "Backend API" 5000; then
            echo -e "${GREEN}✅ Backend API started successfully${NC}"
        else
            echo -e "${RED}❌ Backend API failed to start${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Backend startup script not found or not executable${NC}"
        return 1
    fi
}

# Function to start frontend service
start_frontend() {
    echo -e "${BLUE}🎨 Starting Frontend Application...${NC}"
    
    if [ -x "$SCRIPT_DIR/start-frontend.sh" ]; then
        # Start frontend in background
        nohup bash "$SCRIPT_DIR/start-frontend.sh" > /var/log/ace-crm/startup-frontend.log 2>&1 &
        
        # Wait for frontend to be ready
        sleep $STARTUP_DELAY
        if check_service_health "Frontend" 3000; then
            echo -e "${GREEN}✅ Frontend started successfully${NC}"
        else
            echo -e "${RED}❌ Frontend failed to start${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Frontend startup script not found or not executable${NC}"
        return 1
    fi
}

# Function to start client portal service
start_client_portal() {
    echo -e "${BLUE}💼 Starting Client Portal...${NC}"
    
    if [ -x "$SCRIPT_DIR/start-client-portal.sh" ]; then
        # Start client portal in background
        nohup bash "$SCRIPT_DIR/start-client-portal.sh" > /var/log/ace-crm/startup-client-portal.log 2>&1 &
        
        # Wait for client portal to be ready
        sleep $STARTUP_DELAY
        if check_service_health "Client Portal" 3001; then
            echo -e "${GREEN}✅ Client Portal started successfully${NC}"
        else
            echo -e "${RED}❌ Client Portal failed to start${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Client Portal startup script not found or not executable${NC}"
        return 1
    fi
}

# Function to display system status
show_system_status() {
    echo -e "\n${PURPLE}📊 ACE CRM System Status:${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    
    # Check each service
    services=(
        "Backend API:http://localhost:5000:/var/run/ace-crm-backend.pid"
        "Frontend:http://localhost:3000:/var/run/ace-crm-frontend.pid"
        "Client Portal:http://localhost:3001:/var/run/ace-crm-client-portal.pid"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -r name url pid_file <<< "$service"
        
        # Check if service is responding
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|401\|404"; then
            status="${GREEN}🟢 Running${NC}"
        else
            status="${RED}🔴 Not responding${NC}"
        fi
        
        # Get PID if available
        pid_info=""
        if [ -f "$pid_file" ]; then
            pid=$(cat "$pid_file")
            if ps -p "$pid" > /dev/null 2>&1; then
                pid_info=" (PID: $pid)"
            fi
        fi
        
        echo -e "  • $name: $status$pid_info"
        echo -e "    URL: ${CYAN}$url${NC}"
    done
    
    echo -e "\n${BLUE}📋 Useful Commands:${NC}"
    echo -e "  • View all logs: tail -f /var/log/ace-crm/*.log"
    echo -e "  • Stop all services: scripts/stop-all.sh"
    echo -e "  • Check status: scripts/status-all.sh"
    echo -e "  • Restart system: scripts/restart-all.sh"
    
    echo -e "\n${BLUE}🌐 Access Points:${NC}"
    echo -e "  • Admin Dashboard: ${CYAN}http://localhost:3000${NC}"
    echo -e "  • Client Portal: ${CYAN}http://localhost:3001${NC}"
    echo -e "  • API Documentation: ${CYAN}http://localhost:5000/api/docs${NC}"
}

# Function to create PID files for tracking
create_system_pid() {
    echo $$ > /var/run/ace-crm-system.pid 2>/dev/null || echo $$ > "$PROJECT_ROOT/ace-crm-system.pid"
}

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🧹 System startup interrupted. Cleaning up...${NC}"
    
    # Remove system PID file
    rm -f /var/run/ace-crm-system.pid 2>/dev/null || rm -f "$PROJECT_ROOT/ace-crm-system.pid"
    
    echo -e "${YELLOW}⚠️  Services may still be running. Use 'scripts/stop-all.sh' to stop all services.${NC}"
    exit 1
}

# Set trap for cleanup on script exit
trap cleanup INT TERM

# Main execution
main() {
    echo -e "${PURPLE}═════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}🚀 ACE CRM Complete System Startup${NC}"
    echo -e "${PURPLE}═════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Environment: $NODE_ENV${NC}"
    echo -e "${BLUE}Started at: $(date)${NC}"
    echo -e "${PURPLE}═════════════════════════════════════════════════════════════${NC}\n"
    
    # Create system PID
    create_system_pid
    
    # Run checks and setup
    check_system_requirements
    create_log_directories
    
    # Make startup scripts executable
    chmod +x "$SCRIPT_DIR"/*.sh
    
    echo -e "\n${BLUE}🔄 Starting services in order...${NC}\n"
    
    # Start services with error handling
    if start_backend; then
        echo -e "${GREEN}Backend API service started successfully${NC}\n"
    else
        echo -e "${RED}Failed to start Backend API service${NC}"
        exit 1
    fi
    
    if start_frontend; then
        echo -e "${GREEN}Frontend service started successfully${NC}\n"
    else
        echo -e "${RED}Failed to start Frontend service${NC}"
        exit 1
    fi
    
    if start_client_portal; then
        echo -e "${GREEN}Client Portal service started successfully${NC}\n"
    else
        echo -e "${RED}Failed to start Client Portal service${NC}"
        exit 1
    fi
    
    # Show final status
    echo -e "${GREEN}🎉 All services started successfully!${NC}\n"
    show_system_status
    
    echo -e "\n${GREEN}✨ ACE CRM system is now ready for use!${NC}"
    echo -e "${BLUE}Press Ctrl+C to stop monitoring (services will continue running)${NC}\n"
    
    # Monitor services (optional - keeps script running)
    while true; do
        sleep 10
        
        # Quick health check
        failed_services=0
        
        if ! curl -s -o /dev/null "http://localhost:5000"; then
            echo -e "${RED}⚠️  Backend API not responding${NC}"
            ((failed_services++))
        fi
        
        if ! curl -s -o /dev/null "http://localhost:3000"; then
            echo -e "${RED}⚠️  Frontend not responding${NC}"
            ((failed_services++))
        fi
        
        if ! curl -s -o /dev/null "http://localhost:3001"; then
            echo -e "${RED}⚠️  Client Portal not responding${NC}"
            ((failed_services++))
        fi
        
        if [ $failed_services -gt 0 ]; then
            echo -e "${YELLOW}⚠️  $failed_services service(s) not responding. Check logs for details.${NC}"
        fi
    done
}

# Handle script arguments
case "${1:-start}" in
    start)
        main
        ;;
    status)
        show_system_status
        ;;
    *) 
        echo "Usage: $0 {start|status}"
        echo "  start  - Start all ACE CRM services (default)"
        echo "  status - Show system status"
        exit 1
        ;;
esac