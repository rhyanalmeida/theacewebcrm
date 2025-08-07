# ACE CRM Rollback Procedures

## 🚨 Emergency Rollback Guide

This document provides step-by-step procedures for rolling back ACE CRM deployments in case of critical issues.

## 🎯 When to Rollback

### Immediate Rollback Triggers
- **Critical security vulnerability** exposed
- **Data corruption** or loss detected
- **System completely unavailable** (>5 minutes)
- **Performance degradation** >50% from baseline
- **Error rate** >10% of total requests
- **Payment processing failures**
- **Authentication system failures**

### Assessment Criteria
Before initiating rollback, assess:
- **Impact severity**: Critical, High, Medium, Low
- **Affected user percentage**: >75% = Critical
- **Business function impact**: Payment, Authentication, Core Features
- **Recovery time**: Can issue be fixed faster than rollback?

## ⚡ Quick Rollback (5-10 minutes)

### Step 1: Immediate Service Shutdown
```bash
# Stop all ACE CRM services immediately
sudo ./scripts/stop-all.sh force

# OR using PM2
pm2 stop all
```

### Step 2: Revert to Previous Version
```bash
# Navigate to backup directory
cd /var/backups/ace-crm/previous

# Copy previous version
cp -r * /var/www/ace-crm/

# Restore previous environment file
cp .env.production.backup /var/www/ace-crm/.env.production
```

### Step 3: Start Previous Version
```bash
cd /var/www/ace-crm
./scripts/start-all.sh
```

### Step 4: Verify Rollback
```bash
# Quick health check
./scripts/test-deployment.sh health-only

# Check services
curl http://localhost:5000/api/health
curl http://localhost:3000/api/health
curl http://localhost:3001/api/health
```

## 🔄 Detailed Rollback Procedures

### Database Rollback

#### Using Supabase (Cloud)
```bash
# Supabase handles database backups automatically
# Contact Supabase support for point-in-time recovery if needed

# Check recent migrations
supabase db diff

# If migrations need to be reverted
supabase migration revert --version [migration_version]
```

#### Local Database Backup Restoration
```bash
# Restore from backup (if using local PostgreSQL)
pg_restore -h localhost -U postgres -d ace_crm_prod /backups/ace_crm_$(date -d "yesterday" +%Y%m%d).sql

# Verify restoration
psql -h localhost -U postgres -d ace_crm_prod -c "SELECT COUNT(*) FROM users;"
```

### Application Code Rollback

#### Git-based Rollback
```bash
# Check current version
git log --oneline -n 5

# Identify previous stable version
git tag -l | grep -E "v[0-9]+\.[0-9]+\.[0-9]+" | tail -5

# Rollback to previous tag
git checkout tags/v1.0.0  # Replace with actual previous version
git checkout -b rollback-$(date +%Y%m%d-%H%M%S)
```

#### File-based Rollback
```bash
# Create rollback directory structure
mkdir -p /tmp/ace-crm-rollback
cd /tmp/ace-crm-rollback

# Stop current services
sudo systemctl stop ace-crm-backend
sudo systemctl stop ace-crm-frontend
sudo systemctl stop ace-crm-client-portal

# Backup current deployment (in case rollback fails)
cp -r /var/www/ace-crm /var/backups/ace-crm/failed-deployment-$(date +%Y%m%d-%H%M%S)

# Restore from previous backup
BACKUP_DIR="/var/backups/ace-crm/$(ls -1t /var/backups/ace-crm/ | head -n 2 | tail -n 1)"
cp -r "$BACKUP_DIR"/* /var/www/ace-crm/

# Restore configuration files
cp "$BACKUP_DIR"/.env.production /var/www/ace-crm/.env.production
cp "$BACKUP_DIR"/nginx.conf /etc/nginx/sites-available/ace-crm
```

### Configuration Rollback

#### Environment Variables
```bash
# Backup current environment
cp /var/www/ace-crm/.env.production /tmp/env.production.failed

# Restore previous environment
cp /var/backups/ace-crm/previous/.env.production /var/www/ace-crm/

# Verify critical variables are set
grep -E "SUPABASE_URL|JWT_SECRET|STRIPE" /var/www/ace-crm/.env.production
```

#### Nginx Configuration
```bash
# Backup current nginx config
cp /etc/nginx/sites-available/ace-crm /tmp/nginx-ace-crm.failed

# Restore previous nginx config
cp /var/backups/nginx/ace-crm.conf.backup /etc/nginx/sites-available/ace-crm

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Service Rollback

#### PM2 Process Manager
```bash
# Stop current processes
pm2 stop all

# Remove current processes
pm2 delete all

# Start with previous ecosystem file
pm2 start /var/backups/ace-crm/previous/scripts/pm2.ecosystem.config.js

# Save PM2 configuration
pm2 save
```

#### Systemd Services
```bash
# If using systemd services
sudo systemctl stop ace-crm-backend
sudo systemctl stop ace-crm-frontend
sudo systemctl stop ace-crm-client-portal

# Update service files if needed
sudo cp /var/backups/systemd/ace-crm-*.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Start services
sudo systemctl start ace-crm-backend
sudo systemctl start ace-crm-frontend
sudo systemctl start ace-crm-client-portal
```

## 🐳 Docker Rollback Procedures

### Container Rollback
```bash
# Stop current containers
docker-compose down

# Pull previous image versions
docker pull ace-crm-backend:previous
docker pull ace-crm-frontend:previous
docker pull ace-crm-client-portal:previous

# Update docker-compose to use previous versions
sed -i 's/:latest/:previous/g' docker-compose.yml

# Start with previous versions
docker-compose up -d

# Monitor containers
docker-compose logs -f
```

### Volume Rollback
```bash
# Stop services
docker-compose down

# Restore data volumes from backup
docker run --rm -v ace-crm_backend_data:/data -v /var/backups/docker:/backup alpine tar xzf /backup/backend_data_backup.tar.gz -C /data

docker run --rm -v ace-crm_frontend_data:/data -v /var/backups/docker:/backup alpine tar xzf /backup/frontend_data_backup.tar.gz -C /data

# Restart services
docker-compose up -d
```

## ☁️ Cloud Deployment Rollback

### AWS ECS Rollback
```bash
# Rollback to previous task definition
aws ecs update-service --cluster ace-crm-cluster --service ace-crm-backend --task-definition ace-crm-backend:previous

# Monitor deployment
aws ecs describe-services --cluster ace-crm-cluster --services ace-crm-backend
```

### Kubernetes Rollback
```bash
# Check rollout history
kubectl rollout history deployment/ace-crm-backend

# Rollback to previous revision
kubectl rollout undo deployment/ace-crm-backend

# Monitor rollback
kubectl rollout status deployment/ace-crm-backend
```

### Heroku Rollback
```bash
# List recent releases
heroku releases --app ace-crm-backend

# Rollback to previous release
heroku rollback v123 --app ace-crm-backend

# Check application logs
heroku logs --tail --app ace-crm-backend
```

## 🔍 Post-Rollback Verification

### Comprehensive Health Check
```bash
#!/bin/bash
# scripts/post-rollback-verification.sh

echo "🔍 Starting post-rollback verification..."

# Check all services are running
services=("backend:5000" "frontend:3000" "client-portal:3001")
for service in "${services[@]}"; do
    name=${service%:*}
    port=${service#*:}
    
    if curl -s --max-time 10 "http://localhost:$port/api/health" | jq -r '.status' | grep -q "healthy"; then
        echo "✅ $name: Healthy"
    else
        echo "❌ $name: Unhealthy"
        exit 1
    fi
done

echo "✅ All services healthy after rollback"
```

### Database Integrity Check
```bash
# Run database integrity checks
./scripts/test-deployment.sh health-only

# Verify user authentication works
curl -X POST http://localhost:5000/api/auth/test \
  -H "Content-Type: application/json" \
  -d '{"test": "true"}'

# Check critical business functions
curl -X GET http://localhost:5000/api/users/me \
  -H "Authorization: Bearer $TEST_TOKEN"
```

### Performance Verification
```bash
# Run performance tests
./scripts/test-deployment.sh load-test 20

# Check response times
for i in {1..10}; do
    curl -w "%{time_total}\n" -o /dev/null -s http://localhost:5000/api/health
done | awk '{sum+=$1} END {print "Average response time:", sum/NR, "seconds"}'
```

## 📱 Communication During Rollback

### Internal Communication
```bash
# Notify team of rollback initiation
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-type: application/json' \
  -d '{"text":"🚨 ACE CRM ROLLBACK INITIATED - Issue: [REASON] - ETA: [TIME]"}'
```

### Customer Communication
```bash
# Update status page
curl -X POST https://api.statuspage.io/v1/pages/YOUR_PAGE/incidents \
  -H "Authorization: OAuth YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "incident": {
      "name": "ACE CRM Service Rollback",
      "status": "investigating",
      "impact": "minor",
      "body": "We are performing a system rollback to resolve recent issues. Service will be restored shortly."
    }
  }'
```

## 📊 Rollback Testing

### Regular Rollback Drills
Create a schedule to practice rollback procedures:

```bash
#!/bin/bash
# scripts/rollback-drill.sh

echo "🎭 Starting rollback drill..."

# Create test deployment
./scripts/deploy-test.sh

# Simulate issue detection
sleep 30

# Execute rollback procedure
./scripts/rollback.sh --test-mode

# Verify rollback success
./scripts/post-rollback-verification.sh

echo "✅ Rollback drill completed successfully"
```

### Automated Rollback Triggers
```bash
#!/bin/bash
# scripts/auto-rollback.sh

# Monitor error rate
ERROR_RATE=$(curl -s http://localhost:5000/api/health | jq -r '.errorRate // 0')

if (( $(echo "$ERROR_RATE > 0.1" | bc -l) )); then
    echo "🚨 High error rate detected: $ERROR_RATE"
    echo "Initiating automatic rollback..."
    ./scripts/rollback.sh --auto
fi
```

## 📋 Rollback Checklist

### Pre-Rollback
- [ ] Incident severity assessed
- [ ] Rollback decision approved by team lead
- [ ] Current state backed up
- [ ] Team notified of rollback initiation
- [ ] Customer communication prepared

### During Rollback
- [ ] All services stopped gracefully
- [ ] Previous version files restored
- [ ] Configuration files restored
- [ ] Database rollback completed (if needed)
- [ ] Services restarted
- [ ] Health checks passed

### Post-Rollback
- [ ] Full system functionality verified
- [ ] Performance metrics normal
- [ ] User acceptance testing passed
- [ ] Monitoring alerts cleared
- [ ] Team and customers notified of resolution
- [ ] Incident documentation completed

## 🎯 Prevention Strategies

### Blue-Green Deployment
```bash
# Maintain two identical production environments
# Switch traffic between them for zero-downtime deployments

# scripts/blue-green-switch.sh
if [ "$CURRENT_ENV" = "blue" ]; then
    ./scripts/deploy-to-green.sh
    ./scripts/switch-traffic-to-green.sh
else
    ./scripts/deploy-to-blue.sh
    ./scripts/switch-traffic-to-blue.sh
fi
```

### Canary Deployments
```bash
# Gradually roll out changes to a subset of users
# Monitor metrics and rollback if issues detected

# Deploy to 5% of traffic first
./scripts/deploy-canary.sh --traffic-percent 5
sleep 600  # Monitor for 10 minutes

# If healthy, increase to 50%
if ./scripts/health-check.sh; then
    ./scripts/deploy-canary.sh --traffic-percent 50
fi
```

### Feature Flags
```javascript
// Use feature flags to enable/disable features without deployment
const featureFlags = {
    newPaymentFlow: process.env.ENABLE_NEW_PAYMENT_FLOW === 'true',
    enhancedDashboard: process.env.ENABLE_ENHANCED_DASHBOARD === 'true'
};

// Instantly disable problematic features
if (!featureFlags.newPaymentFlow) {
    // Use old payment flow
}
```

## 📞 Emergency Contacts

### Escalation Matrix
1. **Level 1**: On-call Engineer
2. **Level 2**: Technical Lead
3. **Level 3**: Engineering Manager
4. **Level 4**: CTO/VP Engineering

### Contact Information
- **Emergency Hotline**: [Your emergency number]
- **Slack Channel**: #ace-crm-incidents
- **Email Distribution**: incidents@yourcompany.com
- **Status Page**: status.yourcompany.com

---

**Remember**: Practice rollback procedures regularly in staging environments. The goal is to make rollbacks routine, fast, and reliable operations that minimize customer impact.