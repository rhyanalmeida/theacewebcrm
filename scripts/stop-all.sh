#!/bin/bash

# ACE CRM Complete System Stop Script
# This script stops all ACE CRM services gracefully

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🛑 Stopping ACE CRM System...${NC}"

# Function to stop service by PID file
stop_service() {
    local service_name=$1
    local pid_file=$2
    local graceful_timeout=10
    local force_timeout=5
    
    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")
        
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "${BLUE}🛑 Stopping $service_name (PID: $PID)...${NC}"
            
            # Try graceful shutdown first
            kill "$PID" 2>/dev/null || true
            
            # Wait for graceful shutdown
            timeout=0
            while [ $timeout -lt $graceful_timeout ] && ps -p "$PID" > /dev/null 2>&1; do
                sleep 1
                ((timeout++))
            done
            
            # Force kill if still running
            if ps -p "$PID" > /dev/null 2>&1; then
                echo -e "${YELLOW}⚡ Force stopping $service_name...${NC}"
                kill -9 "$PID" 2>/dev/null || true
                
                # Wait for force kill
                timeout=0
                while [ $timeout -lt $force_timeout ] && ps -p "$PID" > /dev/null 2>&1; do
                    sleep 1
                    ((timeout++))
                done
            fi
            
            if ps -p "$PID" > /dev/null 2>&1; then
                echo -e "${RED}❌ Failed to stop $service_name${NC}"
                return 1
            else
                echo -e "${GREEN}✅ $service_name stopped successfully${NC}"
                rm -f "$pid_file"
                return 0
            fi
        else
            echo -e "${YELLOW}⚠️  $service_name PID file exists but process not running${NC}"
            rm -f "$pid_file"
            return 0
        fi
    else
        echo -e "${YELLOW}⚠️  $service_name PID file not found${NC}"
        return 0
    fi
}

# Function to stop service by port
stop_service_by_port() {
    local service_name=$1
    local port=$2
    
    echo -e "${BLUE}🔍 Checking for $service_name on port $port...${NC}"
    
    local pids=$(lsof -ti:$port 2>/dev/null || echo "")
    
    if [ -n "$pids" ]; then
        echo -e "${BLUE}🛑 Stopping $service_name processes on port $port...${NC}"
        
        for pid in $pids; do
            echo -e "${BLUE}  Stopping PID $pid...${NC}"
            kill "$pid" 2>/dev/null || true
            
            # Wait a moment
            sleep 2
            
            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                echo -e "${YELLOW}  ⚡ Force stopping PID $pid...${NC}"
                kill -9 "$pid" 2>/dev/null || true
            fi
        done
        
        # Verify port is free
        if lsof -ti:$port > /dev/null 2>&1; then
            echo -e "${RED}❌ Failed to free port $port${NC}"
            return 1
        else
            echo -e "${GREEN}✅ Port $port freed${NC}"
            return 0
        fi
    else
        echo -e "${GREEN}✅ No processes found on port $port${NC}"
        return 0
    fi
}

# Function to stop all Node.js processes related to ACE CRM
stop_ace_crm_processes() {
    echo -e "${BLUE}🔍 Looking for ACE CRM Node.js processes...${NC}"
    
    # Find processes by command line containing ACE CRM paths
    local ace_crm_pids=$(ps aux | grep -i "ace.*crm" | grep -E "(node|npm)" | grep -v grep | awk '{print $2}' || echo "")\n    \n    if [ -n "$ace_crm_pids" ]; then\n        echo -e "${BLUE}🛑 Found ACE CRM processes:${NC}"\n        ps aux | grep -i "ace.*crm" | grep -E "(node|npm)" | grep -v grep\n        \n        for pid in $ace_crm_pids; do\n            echo -e "${BLUE}  Stopping PID $pid...${NC}"\n            kill "$pid" 2>/dev/null || true\n        done\n        \n        # Wait and force kill if needed\n        sleep 3\n        \n        for pid in $ace_crm_pids; do\n            if ps -p "$pid" > /dev/null 2>&1; then\n                echo -e "${YELLOW}  ⚡ Force stopping PID $pid...${NC}"\n                kill -9 "$pid" 2>/dev/null || true\n            fi\n        done\n        \n        echo -e "${GREEN}✅ ACE CRM processes stopped${NC}"\n    else\n        echo -e "${GREEN}✅ No ACE CRM processes found${NC}"\n    fi\n}\n\n# Main execution\nmain() {\n    echo -e "${PURPLE}═══════════════════════════════════════════════════${NC}"\n    echo -e "${PURPLE}🛑 ACE CRM System Shutdown${NC}"\n    echo -e "${PURPLE}═══════════════════════════════════════════════════${NC}"\n    echo -e "${BLUE}Started at: $(date)${NC}"\n    echo -e "${PURPLE}═══════════════════════════════════════════════════${NC}\\n"\n    \n    # Stop services by PID files first (cleanest method)\n    echo -e "${BLUE}Phase 1: Stopping services by PID files...${NC}\\n"\n    \n    stop_service "Backend API" "/var/run/ace-crm-backend.pid"\n    stop_service "Frontend" "/var/run/ace-crm-frontend.pid" \n    stop_service "Client Portal" "/var/run/ace-crm-client-portal.pid"\n    stop_service "System Monitor" "/var/run/ace-crm-system.pid"\n    \n    # Also check local PID files\n    PROJECT_ROOT="$(dirname "$(dirname "${BASH_SOURCE[0]}")")"n    stop_service "Backend API (local)" "$PROJECT_ROOT/ace-crm-backend.pid"\n    stop_service "Frontend (local)" "$PROJECT_ROOT/ace-crm-frontend.pid"\n    stop_service "Client Portal (local)" "$PROJECT_ROOT/ace-crm-client-portal.pid"\n    stop_service "System Monitor (local)" "$PROJECT_ROOT/ace-crm-system.pid"\n    \n    echo -e "\\n${BLUE}Phase 2: Stopping services by port...${NC}\\n"\n    \n    # Stop services by port (backup method)\n    stop_service_by_port "Backend API" 5000\n    stop_service_by_port "Frontend" 3000\n    stop_service_by_port "Client Portal" 3001\n    \n    echo -e "\\n${BLUE}Phase 3: Cleanup remaining processes...${NC}\\n"\n    \n    # Find and stop any remaining ACE CRM processes\n    stop_ace_crm_processes\n    \n    # Final verification\n    echo -e "\\n${BLUE}🔍 Final verification...${NC}"\n    \n    local remaining_processes=0\n    \n    # Check ports\n    for port in 5000 3000 3001; do\n        if lsof -ti:$port > /dev/null 2>&1; then\n            echo -e "${RED}⚠️  Port $port still in use${NC}"\n            ((remaining_processes++))\n        else\n            echo -e "${GREEN}✅ Port $port free${NC}"\n        fi\n    done\n    \n    # Clean up log files (optional)\n    echo -e "\\n${BLUE}🧹 Cleaning up temporary files...${NC}"\n    \n    # Remove PID files\n    rm -f /var/run/ace-crm-*.pid 2>/dev/null || true\n    rm -f "$PROJECT_ROOT"/ace-crm-*.pid 2>/dev/null || true\n    \n    echo -e "${GREEN}✅ Cleanup completed${NC}"\n    \n    # Final status\n    if [ $remaining_processes -eq 0 ]; then\n        echo -e "\\n${GREEN}🎉 ACE CRM system stopped successfully!${NC}"\n        echo -e "${BLUE}All services are now offline.${NC}"\n    else\n        echo -e "\\n${YELLOW}⚠️  System mostly stopped, but $remaining_processes port(s) still in use.${NC}"\n        echo -e "${BLUE}You may need to manually stop remaining processes.${NC}"\n    fi\n    \n    echo -e "\\n${BLUE}📋 Next steps:${NC}"\n    echo -e "  • Start system: scripts/start-all.sh"\n    echo -e "  • Check status: scripts/status-all.sh"\n    echo -e "  • View logs: ls -la /var/log/ace-crm/"\n}\n\n# Handle script arguments\ncase "${1:-stop}" in\n    stop)\n        main\n        ;;\n    force)\n        echo -e "${RED}🔥 Force stopping all ACE CRM processes...${NC}"\n        # Force kill all Node processes with ACE CRM in path\n        pkill -9 -f "ace.*crm" 2>/dev/null || true\n        \n        # Kill processes on our ports\n        for port in 5000 3000 3001; do\n            fuser -k $port/tcp 2>/dev/null || true\n        done\n        \n        # Clean up PID files\n        rm -f /var/run/ace-crm-*.pid 2>/dev/null || true\n        rm -f "$(dirname "$(dirname "${BASH_SOURCE[0]}")")"/ace-crm-*.pid 2>/dev/null || true\n        \n        echo -e "${GREEN}✅ Force stop completed${NC}"\n        ;;\n    *)\n        echo "Usage: $0 {stop|force}"\n        echo "  stop  - Gracefully stop all services (default)"\n        echo "  force - Force stop all services immediately"\n        exit 1\n        ;;\nesac