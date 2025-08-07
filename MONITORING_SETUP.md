# ACE CRM Monitoring Setup Guide

## 📊 Overview

This guide provides comprehensive monitoring setup for the ACE CRM system, including health checks, performance monitoring, log management, and alerting.

## 🔍 Health Monitoring

### Built-in Health Checks

The ACE CRM system includes built-in health check endpoints for all services:

#### Backend API Health Check
```bash
# Basic health check
curl http://localhost:5000/api/health

# Detailed health check
curl http://localhost:5000/api/health/detailed

# Kubernetes-style probes
curl http://localhost:5000/api/health/ready
curl http://localhost:5000/api/health/live
```

#### Frontend Health Check
```bash
# Next.js health check
curl http://localhost:3000/api/health

# Quick readiness check
curl -I http://localhost:3000/api/health
```

#### Client Portal Health Check
```bash
# Client portal health check
curl http://localhost:3001/api/health

# Liveness probe
curl -X OPTIONS http://localhost:3001/api/health
```

### Health Check Response Format
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 45
    },
    "redis": {
      "status": "healthy",
      "responseTime": 12
    },
    "stripe": {
      "status": "configured"
    }
  },
  "responseTime": 58
}
```

## 📈 Performance Monitoring

### System Metrics to Monitor

#### Application Metrics
- Response time (95th percentile < 500ms)
- Throughput (requests per second)
- Error rate (< 1%)
- Memory usage (< 80% of allocated)
- CPU usage (< 70%)

#### Database Metrics (Supabase)
- Query response time
- Connection pool usage
- Active connections
- Slow queries

#### Infrastructure Metrics
- Disk usage (< 85%)
- Network I/O
- Load average
- Process count

### PM2 Monitoring

```bash
# View real-time process monitoring
pm2 monit

# Get process status
pm2 status

# View logs
pm2 logs

# View metrics
pm2 describe ace-crm-backend
```

### Custom Metrics Collection

Create a metrics collection script:

```bash
# scripts/collect-metrics.sh
#!/bin/bash

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
METRICS_FILE="/var/log/ace-crm/metrics.log"

# Collect system metrics
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}')
DISK_USAGE=$(df -h / | awk 'NR==2{printf("%s", $5)}' | sed 's/%//')

# Collect application metrics
BACKEND_HEALTH=$(curl -s http://localhost:5000/api/health | jq -r '.status // "unknown"')
FRONTEND_HEALTH=$(curl -s http://localhost:3000/api/health | jq -r '.status // "unknown"')
PORTAL_HEALTH=$(curl -s http://localhost:3001/api/health | jq -r '.status // "unknown"')

# Log metrics
echo "{
  \"timestamp\": \"$TIMESTAMP\",
  \"system\": {
    \"cpu\": $CPU_USAGE,
    \"memory\": $MEMORY_USAGE,
    \"disk\": $DISK_USAGE
  },
  \"services\": {
    \"backend\": \"$BACKEND_HEALTH\",
    \"frontend\": \"$FRONTEND_HEALTH\",
    \"portal\": \"$PORTAL_HEALTH\"
  }
}" >> "$METRICS_FILE"
```

Add to crontab for regular collection:
```bash
# Run every 5 minutes
*/5 * * * * /path/to/scripts/collect-metrics.sh
```

## 📊 Third-Party Monitoring Solutions

### 1. Datadog Setup

Install Datadog agent:
```bash
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=<YOUR_API_KEY> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"
```

Configure Node.js monitoring:
```javascript
// In your backend server.js
const tracer = require('dd-trace').init({
  service: 'ace-crm-backend',
  env: process.env.NODE_ENV,
  version: process.env.npm_package_version
});
```

### 2. New Relic Setup

Install New Relic agent:
```bash
npm install newrelic --save
```

Add to application start:
```javascript
// First line in server.js
require('newrelic');
```

### 3. Prometheus + Grafana

Install Prometheus metrics:
```bash
npm install prom-client --save
```

Add metrics endpoint:
```javascript
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

## 📝 Log Management

### Log Structure

All services use structured logging:
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "service": "ace-crm-backend",
  "message": "User authenticated successfully",
  "userId": "123",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "requestId": "req-uuid-123"
}
```

### Log Locations

- **Backend logs:** `/var/log/ace-crm/backend-*.log`
- **Frontend logs:** `/var/log/ace-crm/frontend-*.log`
- **Client Portal logs:** `/var/log/ace-crm/client-portal-*.log`
- **Nginx logs:** `/var/log/nginx/ace-crm-*.log`
- **System logs:** `/var/log/ace-crm/system.log`

### Log Rotation

Configure logrotate:
```bash
# /etc/logrotate.d/ace-crm
/var/log/ace-crm/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
        pm2 reload all > /dev/null 2>&1 || true
    endscript
}
```

### Log Aggregation with ELK Stack

#### 1. Install Elasticsearch
```bash
curl -fsSL https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb https://artifacts.elastic.co/packages/7.x/apt stable main" | sudo tee -a /etc/apt/sources.list.d/elastic-7.x.list
sudo apt update && sudo apt install elasticsearch
```

#### 2. Install Logstash
```bash
sudo apt install logstash
```

Logstash configuration:
```ruby
# /etc/logstash/conf.d/ace-crm.conf
input {
  file {
    path => "/var/log/ace-crm/*.log"
    start_position => "beginning"
  }
}

filter {
  if [message] =~ /^\{.*\}$/ {
    json {
      source => "message"
    }
  }
  
  date {
    match => [ "timestamp", "ISO8601" ]
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "ace-crm-logs-%{+YYYY.MM.dd}"
  }
}
```

#### 3. Install Kibana
```bash
sudo apt install kibana
```

## 🚨 Alerting Setup

### Health Check Monitoring Script

```bash
#!/bin/bash
# scripts/health-monitor.sh

WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
ALERT_THRESHOLD=3  # Number of failed checks before alerting

check_service() {
    local service_name=$1
    local health_url=$2
    local status_file="/tmp/ace-crm-${service_name}-status"
    
    # Get current status
    if curl -s --max-time 10 "$health_url" | jq -r '.status' | grep -q "healthy"; then
        # Service is healthy, reset counter
        echo "0" > "$status_file"
        return 0
    else
        # Service is unhealthy, increment counter
        local failures=$(cat "$status_file" 2>/dev/null || echo "0")
        failures=$((failures + 1))
        echo "$failures" > "$status_file"
        
        if [ "$failures" -ge "$ALERT_THRESHOLD" ]; then
            send_alert "$service_name" "Service unhealthy for $failures consecutive checks"
        fi
        return 1
    fi
}

send_alert() {
    local service=$1
    local message=$2
    
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚨 ACE CRM Alert: $service - $message\"}" \
        "$WEBHOOK_URL"
}

# Check all services
check_service "backend" "http://localhost:5000/api/health"
check_service "frontend" "http://localhost:3000/api/health"
check_service "client-portal" "http://localhost:3001/api/health"
```

Run every minute:
```bash
# Add to crontab
* * * * * /path/to/scripts/health-monitor.sh
```

### Disk Space Monitoring

```bash
#!/bin/bash
# scripts/disk-monitor.sh

THRESHOLD=85
CURRENT=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')

if [ "$CURRENT" -gt "$THRESHOLD" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚨 ACE CRM Alert: Disk usage is ${CURRENT}% (threshold: ${THRESHOLD}%)\"}" \
        "$WEBHOOK_URL"
fi
```

### Memory Monitoring

```bash
#!/bin/bash
# scripts/memory-monitor.sh

THRESHOLD=90
CURRENT=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')

if [ "$CURRENT" -gt "$THRESHOLD" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚨 ACE CRM Alert: Memory usage is ${CURRENT}% (threshold: ${THRESHOLD}%)\"}" \
        "$WEBHOOK_URL"
fi
```

## 🔔 Notification Channels

### Slack Integration

1. Create a Slack app and webhook
2. Configure webhook URL in monitoring scripts
3. Test alerts:

```bash
curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"🟢 ACE CRM monitoring setup complete!"}' \
    "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

### Email Alerts

Configure with sendmail or SMTP:
```bash
#!/bin/bash
# scripts/send-email-alert.sh

SUBJECT="ACE CRM Alert: $1"
MESSAGE="$2"
TO="admin@yourcompany.com"

echo "$MESSAGE" | mail -s "$SUBJECT" "$TO"
```

### PagerDuty Integration

```javascript
// In your monitoring scripts
const https = require('https');

function sendPagerDutyAlert(message, severity = 'error') {
  const data = JSON.stringify({
    routing_key: 'YOUR_ROUTING_KEY',
    event_action: 'trigger',
    payload: {
      summary: message,
      severity: severity,
      source: 'ace-crm-monitoring'
    }
  });

  const options = {
    hostname: 'events.pagerduty.com',
    port: 443,
    path: '/v2/enqueue',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options);
  req.write(data);
  req.end();
}
```

## 📱 Monitoring Dashboard

### Grafana Dashboard Setup

1. **Install Grafana:**
```bash
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
curl https://packages.grafana.com/gpg.key | sudo apt-key add -
sudo apt-get update && sudo apt-get install grafana
```

2. **Configure Data Sources:**
   - Prometheus for metrics
   - Elasticsearch for logs
   - InfluxDB for time series data (optional)

3. **Import Dashboard Templates:**
   - Node.js application metrics
   - System resource monitoring
   - Custom business metrics

### Sample Dashboard Queries

```promql
# Response time 95th percentile
histogram_quantile(0.95, http_request_duration_seconds_bucket{service="ace-crm-backend"})

# Error rate
rate(http_requests_total{service="ace-crm-backend",status=~"5.."}[5m]) / 
rate(http_requests_total{service="ace-crm-backend"}[5m])

# Memory usage
process_resident_memory_bytes{service="ace-crm-backend"} / 1024 / 1024

# Active connections
supabase_active_connections
```

## 🔧 Troubleshooting Common Issues

### High Memory Usage
```bash
# Check process memory usage
ps aux --sort=-%mem | head -10

# Check for memory leaks in Node.js
node --inspect server.js
# Connect Chrome DevTools to analyze heap
```

### High CPU Usage
```bash
# Check CPU usage by process
top -o %CPU

# Profile Node.js application
npm install -g clinic
clinic doctor -- node server.js
```

### Database Connection Issues
```bash
# Test Supabase connectivity
curl -H "apikey: YOUR_ANON_KEY" "https://your-project.supabase.co/rest/v1/"

# Check connection pool status
# (Implementation depends on your connection pool library)
```

### Network Issues
```bash
# Check network connectivity
nc -zv supabase.com 443
nc -zv api.stripe.com 443

# Check DNS resolution
nslookup your-domain.com
```

## 📋 Monitoring Checklist

### Daily Checks
- [ ] All services healthy
- [ ] Response times within SLA
- [ ] Error rates acceptable
- [ ] Disk space sufficient
- [ ] Memory usage normal
- [ ] No critical alerts

### Weekly Reviews
- [ ] Performance trends analysis
- [ ] Capacity planning review
- [ ] Alert effectiveness review
- [ ] Log analysis for patterns
- [ ] Security monitoring review

### Monthly Tasks
- [ ] Monitoring system updates
- [ ] Dashboard optimization
- [ ] Alert tuning
- [ ] Performance baseline updates
- [ ] Incident postmortem reviews

## 🎯 Best Practices

1. **Set up monitoring before deployment**
2. **Use multiple monitoring layers** (infrastructure, application, business)
3. **Implement meaningful alerting** (avoid alert fatigue)
4. **Monitor user-facing metrics** (not just system metrics)
5. **Regular monitoring system maintenance**
6. **Document runbooks** for common issues
7. **Practice incident response** procedures
8. **Use monitoring for capacity planning**

---

This monitoring setup provides comprehensive visibility into your ACE CRM system. Customize alerts and thresholds based on your specific requirements and SLA commitments.