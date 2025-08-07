#!/bin/bash

# ACE CRM Deployment Testing Script
# This script performs comprehensive testing of the deployed ACE CRM system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:5000"
FRONTEND_URL="http://localhost:3000"
CLIENT_PORTAL_URL="http://localhost:3001"
TIMEOUT=10
TEST_RESULTS_FILE="/tmp/ace-crm-test-results.json"

echo -e "${PURPLE}🧪 Starting ACE CRM Deployment Tests...${NC}"

# Initialize test results
cat > "$TEST_RESULTS_FILE" << EOF
{
  "testRun": {
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "environment": "${NODE_ENV:-production}",
    "version": "1.0.0"
  },
  "results": {}
}
EOF

# Function to update test results
update_test_result() {
    local test_name=$1
    local status=$2
    local message=$3
    local response_time=${4:-0}
    
    jq --arg name "$test_name" \
       --arg status "$status" \
       --arg message "$message" \
       --arg response_time "$response_time" \
       '.results[$name] = {
         "status": $status,
         "message": $message,
         "responseTime": ($response_time | tonumber),
         "timestamp": now | strftime("%Y-%m-%dT%H:%M:%SZ")
       }' "$TEST_RESULTS_FILE" > "/tmp/test_results_temp.json" && mv "/tmp/test_results_temp.json" "$TEST_RESULTS_FILE"
}

# Function to test HTTP endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    local expected_content=${4:-""}
    
    echo -e "${BLUE}🔍 Testing $name...${NC}"
    
    local start_time=$(date +%s%N)
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}|TIME:%{time_total}" --max-time $TIMEOUT "$url" || echo "HTTPSTATUS:000|TIME:$TIMEOUT")
    local end_time=$(date +%s%N)
    
    local http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local response_time=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*\|TIME:[0-9.]*$//')
    
    if [ "$http_status" = "$expected_status" ]; then
        if [ -n "$expected_content" ] && ! echo "$body" | grep -q "$expected_content"; then
            echo -e "${YELLOW}⚠️  $name: Status OK but content mismatch${NC}"
            update_test_result "$name" "warning" "Status OK but expected content not found" "$response_time"
            return 1
        else
            echo -e "${GREEN}✅ $name: OK (${response_time}s)${NC}"
            update_test_result "$name" "pass" "Endpoint responding correctly" "$response_time"
            return 0
        fi
    else
        echo -e "${RED}❌ $name: HTTP $http_status (expected $expected_status)${NC}"
        update_test_result "$name" "fail" "HTTP $http_status (expected $expected_status)" "$response_time"
        return 1
    fi
}

# Function to test JSON API endpoint
test_json_endpoint() {
    local name=$1
    local url=$2
    local expected_field=$3
    local expected_value=$4
    
    echo -e "${BLUE}🔍 Testing $name...${NC}"
    
    local start_time=$(date +%s%N)
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}|TIME:%{time_total}" \
                    -H "Content-Type: application/json" \
                    --max-time $TIMEOUT "$url" || echo "HTTPSTATUS:000|TIME:$TIMEOUT")
    
    local http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local response_time=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*\|TIME:[0-9.]*$//')
    
    if [ "$http_status" = "200" ] || [ "$http_status" = "201" ]; then
        if echo "$body" | jq -e ".$expected_field" >/dev/null 2>&1; then
            local actual_value=$(echo "$body" | jq -r ".$expected_field")
            if [ "$actual_value" = "$expected_value" ]; then
                echo -e "${GREEN}✅ $name: OK (${response_time}s)${NC}"
                update_test_result "$name" "pass" "JSON endpoint responding correctly" "$response_time"
                return 0
            else
                echo -e "${YELLOW}⚠️  $name: Field value mismatch (got: $actual_value, expected: $expected_value)${NC}"
                update_test_result "$name" "warning" "Field value mismatch" "$response_time"
                return 1
            fi
        else
            echo -e "${YELLOW}⚠️  $name: Expected field '$expected_field' not found${NC}"
            update_test_result "$name" "warning" "Expected field not found" "$response_time"
            return 1
        fi
    else
        echo -e "${RED}❌ $name: HTTP $http_status${NC}"
        update_test_result "$name" "fail" "HTTP $http_status" "$response_time"
        return 1
    fi
}

# Function to test database connectivity
test_database_connection() {
    echo -e "${BLUE}🔍 Testing database connectivity...${NC}"
    
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        echo -e "${YELLOW}⚠️  Database test skipped (credentials not configured)${NC}"
        update_test_result "database_connection" "skip" "Database credentials not configured"
        return 0
    fi
    
    local start_time=$(date +%s%N)
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}|TIME:%{time_total}" \
                    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
                    --max-time $TIMEOUT \
                    "$SUPABASE_URL/rest/v1/users?select=count" || echo "HTTPSTATUS:000|TIME:$TIMEOUT")
    
    local http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local response_time=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    
    if [ "$http_status" = "200" ]; then
        echo -e "${GREEN}✅ Database connection: OK (${response_time}s)${NC}"
        update_test_result "database_connection" "pass" "Supabase connection successful" "$response_time"
        return 0
    else
        echo -e "${RED}❌ Database connection: HTTP $http_status${NC}"
        update_test_result "database_connection" "fail" "Supabase connection failed (HTTP $http_status)" "$response_time"
        return 1
    fi
}

# Function to test process status
test_process_status() {
    echo -e "${BLUE}🔍 Testing process status...${NC}"
    
    local services=("ace-crm-backend" "ace-crm-frontend" "ace-crm-client-portal")
    local all_running=true
    
    for service in "${services[@]}"; do
        if pm2 describe "$service" >/dev/null 2>&1; then
            local status=$(pm2 describe "$service" | grep -o "status.*online" || echo "status: stopped")
            if echo "$status" | grep -q "online"; then
                echo -e "${GREEN}✅ $service: Running${NC}"
                update_test_result "process_${service}" "pass" "Process running correctly"
            else
                echo -e "${RED}❌ $service: Not running${NC}"
                update_test_result "process_${service}" "fail" "Process not running"
                all_running=false
            fi
        else
            echo -e "${RED}❌ $service: Not found${NC}"
            update_test_result "process_${service}" "fail" "Process not found"
            all_running=false
        fi
    done
    
    if [ "$all_running" = true ]; then
        update_test_result "all_processes" "pass" "All processes running correctly"
        return 0
    else
        update_test_result "all_processes" "fail" "Some processes not running"
        return 1
    fi
}

# Function to test resource usage
test_resource_usage() {
    echo -e "${BLUE}🔍 Testing resource usage...${NC}"
    
    # Check CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d',' -f1)
    if (( $(echo "$cpu_usage < 80" | bc -l) )); then
        echo -e "${GREEN}✅ CPU usage: ${cpu_usage}%${NC}"
        update_test_result "cpu_usage" "pass" "CPU usage within acceptable limits (${cpu_usage}%)"
    else
        echo -e "${RED}❌ CPU usage: ${cpu_usage}% (high)${NC}"
        update_test_result "cpu_usage" "fail" "CPU usage too high (${cpu_usage}%)"
    fi
    
    # Check memory usage
    local memory_usage=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
    if (( $(echo "$memory_usage < 85" | bc -l) )); then
        echo -e "${GREEN}✅ Memory usage: ${memory_usage}%${NC}"
        update_test_result "memory_usage" "pass" "Memory usage within acceptable limits (${memory_usage}%)"
    else
        echo -e "${RED}❌ Memory usage: ${memory_usage}% (high)${NC}"
        update_test_result "memory_usage" "fail" "Memory usage too high (${memory_usage}%)"
    fi
    
    # Check disk usage
    local disk_usage=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 85 ]; then
        echo -e "${GREEN}✅ Disk usage: ${disk_usage}%${NC}"
        update_test_result "disk_usage" "pass" "Disk usage within acceptable limits (${disk_usage}%)"
    else
        echo -e "${RED}❌ Disk usage: ${disk_usage}% (high)${NC}"
        update_test_result "disk_usage" "fail" "Disk usage too high (${disk_usage}%)"
    fi
}

# Function to test log files
test_log_files() {
    echo -e "${BLUE}🔍 Testing log files...${NC}"
    
    local log_dirs=("/var/log/ace-crm" "$(dirname "$0")/../logs")
    local logs_found=false
    
    for log_dir in "${log_dirs[@]}"; do
        if [ -d "$log_dir" ]; then
            local log_count=$(find "$log_dir" -name "*.log" -type f | wc -l)
            if [ "$log_count" -gt 0 ]; then
                echo -e "${GREEN}✅ Found $log_count log files in $log_dir${NC}"
                logs_found=true
                
                # Check for recent log entries
                local recent_logs=$(find "$log_dir" -name "*.log" -type f -mmin -10 | wc -l)
                if [ "$recent_logs" -gt 0 ]; then
                    echo -e "${GREEN}✅ Recent log activity detected${NC}"
                    update_test_result "log_activity" "pass" "Recent log activity found"
                else
                    echo -e "${YELLOW}⚠️  No recent log activity${NC}"
                    update_test_result "log_activity" "warning" "No recent log activity"
                fi
            fi
        fi
    done
    
    if [ "$logs_found" = true ]; then
        update_test_result "log_files" "pass" "Log files found and accessible"
    else
        echo -e "${RED}❌ No log files found${NC}"
        update_test_result "log_files" "fail" "No log files found"
    fi
}

# Main test execution
main() {
    echo -e "${PURPLE}═════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}🧪 ACE CRM Deployment Test Suite${NC}"
    echo -e "${PURPLE}═════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Test started at: $(date)${NC}"
    echo -e "${BLUE}Environment: ${NODE_ENV:-production}${NC}"
    echo -e "${PURPLE}═════════════════════════════════════════════════════════════${NC}\\n"
    
    local passed=0
    local failed=0
    local warnings=0
    
    echo -e "${CYAN}Phase 1: Health Check Tests${NC}"
    echo "----------------------------------------"
    
    # Health check tests
    test_json_endpoint "Backend Health" "$BACKEND_URL/api/health" "status" "healthy" && ((passed++)) || ((failed++))
    test_json_endpoint "Frontend Health" "$FRONTEND_URL/api/health" "status" "healthy" && ((passed++)) || ((failed++))
    test_json_endpoint "Client Portal Health" "$CLIENT_PORTAL_URL/api/health" "status" "healthy" && ((passed++)) || ((failed++))
    
    echo -e "\\n${CYAN}Phase 2: Service Availability Tests${NC}"
    echo "----------------------------------------"
    
    # Basic connectivity tests
    test_endpoint "Backend API Root" "$BACKEND_URL/api" 404 && ((passed++)) || ((failed++))
    test_endpoint "Frontend Root" "$FRONTEND_URL" 200 && ((passed++)) || ((failed++))
    test_endpoint "Client Portal Root" "$CLIENT_PORTAL_URL" 200 && ((passed++)) || ((failed++))
    
    echo -e "\\n${CYAN}Phase 3: Database Connectivity${NC}"
    echo "----------------------------------------"
    
    test_database_connection && ((passed++)) || ((failed++))
    
    echo -e "\\n${CYAN}Phase 4: Process Status${NC}"
    echo "----------------------------------------"
    
    test_process_status && ((passed++)) || ((failed++))
    
    echo -e "\\n${CYAN}Phase 5: Resource Usage${NC}"
    echo "----------------------------------------"
    
    test_resource_usage
    
    echo -e "\\n${CYAN}Phase 6: Log Files${NC}"
    echo "----------------------------------------"
    
    test_log_files
    
    echo -e "\\n${CYAN}Phase 7: Performance Tests${NC}"
    echo "----------------------------------------"
    
    # Load test (basic)
    echo -e "${BLUE}🔍 Running basic load test...${NC}"
    local load_start=$(date +%s)
    for i in {1..10}; do
        curl -s "$BACKEND_URL/api/health" >/dev/null &
    done
    wait
    local load_end=$(date +%s)
    local load_duration=$((load_end - load_start))
    
    if [ "$load_duration" -lt 5 ]; then
        echo -e "${GREEN}✅ Load test: ${load_duration}s for 10 concurrent requests${NC}"
        update_test_result "load_test" "pass" "Load test completed in ${load_duration}s"
        ((passed++))
    else
        echo -e "${YELLOW}⚠️  Load test: ${load_duration}s (slower than expected)${NC}"
        update_test_result "load_test" "warning" "Load test took ${load_duration}s"
        ((warnings++))
    fi
    
    # Generate final test report
    echo -e "\\n${PURPLE}═════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}📊 Test Summary${NC}"
    echo -e "${PURPLE}═════════════════════════════════════════════════════════════${NC}"
    
    local total=$((passed + failed + warnings))
    echo -e "${GREEN}✅ Passed: $passed${NC}"
    echo -e "${RED}❌ Failed: $failed${NC}"
    echo -e "${YELLOW}⚠️  Warnings: $warnings${NC}"
    echo -e "${BLUE}📝 Total: $total${NC}"
    
    # Calculate success rate
    local success_rate=$(( (passed * 100) / total ))
    echo -e "${BLUE}📊 Success Rate: ${success_rate}%${NC}"
    
    # Update final results
    jq --arg passed "$passed" \
       --arg failed "$failed" \
       --arg warnings "$warnings" \
       --arg success_rate "$success_rate" \
       '.testRun.summary = {
         "passed": ($passed | tonumber),
         "failed": ($failed | tonumber),
         "warnings": ($warnings | tonumber),
         "total": (($passed | tonumber) + ($failed | tonumber) + ($warnings | tonumber)),
         "successRate": ($success_rate | tonumber),
         "completedAt": (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
       }' "$TEST_RESULTS_FILE" > "/tmp/test_results_final.json" && mv "/tmp/test_results_final.json" "$TEST_RESULTS_FILE"
    
    echo -e "\\n${BLUE}📄 Detailed results saved to: $TEST_RESULTS_FILE${NC}"
    
    # Show detailed failures if any
    if [ "$failed" -gt 0 ]; then
        echo -e "\\n${RED}❌ Failed Tests Details:${NC}"
        jq -r '.results | to_entries[] | select(.value.status == "fail") | "  • " + .key + ": " + .value.message' "$TEST_RESULTS_FILE"
    fi
    
    if [ "$warnings" -gt 0 ]; then
        echo -e "\\n${YELLOW}⚠️  Warnings Details:${NC}"
        jq -r '.results | to_entries[] | select(.value.status == "warning") | "  • " + .key + ": " + .value.message' "$TEST_RESULTS_FILE"
    fi
    
    echo -e "\\n${BLUE}🔧 Recommendations:${NC}"
    if [ "$failed" -gt 0 ]; then
        echo -e "${RED}  • Fix failed tests before proceeding to production${NC}"
        echo -e "${BLUE}  • Check service logs for error details${NC}"
        echo -e "${BLUE}  • Verify configuration and dependencies${NC}"
    fi
    
    if [ "$warnings" -gt 0 ]; then
        echo -e "${YELLOW}  • Review warnings and optimize if needed${NC}"
    fi
    
    if [ "$success_rate" -ge 90 ]; then
        echo -e "${GREEN}  • System ready for production deployment! 🎉${NC}"
    elif [ "$success_rate" -ge 75 ]; then
        echo -e "${YELLOW}  • System mostly ready, address issues before production${NC}"
    else
        echo -e "${RED}  • System not ready for production, significant issues found${NC}"
    fi
    
    echo -e "\\n${BLUE}📋 Next Steps:${NC}"
    echo -e "${BLUE}  1. Review test results: cat $TEST_RESULTS_FILE | jq${NC}"
    echo -e "${BLUE}  2. Fix any failed tests${NC}"
    echo -e "${BLUE}  3. Monitor system performance${NC}"
    echo -e "${BLUE}  4. Set up production monitoring${NC}"
    echo -e "${BLUE}  5. Create backup and recovery procedures${NC}"
    
    # Exit with appropriate code
    if [ "$failed" -gt 0 ]; then
        exit 1
    elif [ "$warnings" -gt 0 ]; then
        exit 2
    else
        exit 0
    fi
}

# Handle script arguments
case "${1:-test}" in
    test)
        main
        ;;
    health-only)
        echo -e "${BLUE}Running health checks only...${NC}"
        test_json_endpoint "Backend Health" "$BACKEND_URL/api/health" "status" "healthy"
        test_json_endpoint "Frontend Health" "$FRONTEND_URL/api/health" "status" "healthy"
        test_json_endpoint "Client Portal Health" "$CLIENT_PORTAL_URL/api/health" "status" "healthy"
        ;;
    load-test)
        echo -e "${BLUE}Running extended load test...${NC}"
        echo "Testing $2 concurrent requests..."
        REQUESTS=${2:-50}
        for i in $(seq 1 $REQUESTS); do
            curl -s "$BACKEND_URL/api/health" >/dev/null &
        done
        wait
        echo "Load test completed"
        ;;
    *) 
        echo "Usage: $0 {test|health-only|load-test [requests]}"
        echo "  test       - Run full test suite (default)"
        echo "  health-only - Run only health checks"
        echo "  load-test  - Run load test with specified requests"
        exit 1
        ;;
esac