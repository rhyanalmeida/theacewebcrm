# ACE CRM Deployment Checklist

## Pre-Deployment Checklist

### 🔧 System Requirements
- [ ] Node.js 18+ installed on target server
- [ ] npm 8+ installed on target server
- [ ] PM2 installed globally (`npm install -g pm2`)
- [ ] Docker and Docker Compose installed (if using containers)
- [ ] Nginx installed and configured (if using reverse proxy)
- [ ] SSL certificates obtained and configured
- [ ] Domain name configured with DNS
- [ ] Firewall rules configured (ports 80, 443, 5000, 3000, 3001)

### 🔐 Environment Configuration
- [ ] Supabase project created and configured
- [ ] Supabase URL and keys obtained
- [ ] Stripe account setup with keys obtained
- [ ] JWT secret generated (min 256 bits)
- [ ] Redis password generated (if using Redis)
- [ ] Environment files created (.env.production)
- [ ] Environment variables validated
- [ ] Database schema deployed to Supabase
- [ ] RLS policies configured in Supabase

### 📋 Code Preparation
- [ ] All code committed to version control
- [ ] Production branch created and tested
- [ ] Build process tested locally
- [ ] All tests passing
- [ ] Code linted and formatted
- [ ] Dependencies updated and security-scanned
- [ ] Build artifacts verified

## Deployment Process

### 🏗️ Phase 1: Infrastructure Setup

#### 1.1 Server Preparation
- [ ] Server provisioned (minimum 2GB RAM, 20GB storage)
- [ ] Operating system updated
- [ ] Required software installed
- [ ] User accounts created
- [ ] SSH keys configured
- [ ] Log directories created (`/var/log/ace-crm/`)
- [ ] Data directories created (`/var/lib/ace-crm/`)

#### 1.2 Network Configuration
- [ ] Firewall configured
  ```bash
  # Allow HTTP/HTTPS
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  
  # Allow SSH (adjust port as needed)
  sudo ufw allow 22/tcp
  
  # Enable firewall
  sudo ufw enable
  ```
- [ ] Load balancer configured (if applicable)
- [ ] CDN configured (if applicable)
- [ ] DNS records updated

#### 1.3 SSL/TLS Setup
- [ ] SSL certificates obtained (Let's Encrypt or commercial)
- [ ] Certificates installed
- [ ] Auto-renewal configured
- [ ] SSL configuration tested

### 🚀 Phase 2: Application Deployment

#### 2.1 Code Deployment
- [ ] Source code downloaded/cloned to server
- [ ] Correct branch/tag checked out
- [ ] File permissions set correctly
- [ ] Ownership set correctly

#### 2.2 Dependencies Installation
- [ ] Backend dependencies installed
  ```bash
  cd ace-crm/backend
  npm ci --only=production
  ```
- [ ] Frontend dependencies installed
  ```bash
  cd frontend
  npm ci --only=production
  ```
- [ ] Client portal dependencies installed
  ```bash
  cd client-portal
  npm ci --only=production
  ```

#### 2.3 Build Process
- [ ] TypeScript compilation completed
  ```bash
  cd ace-crm/backend
  npm run build
  ```
- [ ] Frontend build completed
  ```bash
  cd frontend
  npm run build
  ```
- [ ] Client portal build completed
  ```bash
  cd client-portal
  npm run build
  ```
- [ ] Build artifacts verified

#### 2.4 Environment Configuration
- [ ] Production environment file created
  ```bash
  cp .env.example .env.production
  # Edit with production values
  ```
- [ ] Environment variables validated
- [ ] Secrets properly secured
- [ ] Configuration tested

### 🔧 Phase 3: Service Configuration

#### 3.1 Process Manager Setup (PM2)
- [ ] PM2 ecosystem file configured
- [ ] PM2 services started
  ```bash
  pm2 start scripts/pm2.ecosystem.config.js --env production
  ```
- [ ] PM2 startup script configured
  ```bash
  pm2 startup
  pm2 save
  ```
- [ ] Process monitoring verified

#### 3.2 Reverse Proxy Setup (Nginx)
- [ ] Nginx configuration file created
- [ ] SSL configuration added
- [ ] Upstream servers configured
- [ ] Rate limiting configured
- [ ] Security headers configured
- [ ] Nginx configuration tested
  ```bash
  sudo nginx -t
  sudo systemctl reload nginx
  ```

#### 3.3 Database Setup
- [ ] Supabase connection tested
- [ ] Database migrations executed
- [ ] Initial data seeded (if applicable)
- [ ] Backup schedule configured
- [ ] Connection pooling configured

### 📊 Phase 4: Monitoring and Logging

#### 4.1 Health Checks
- [ ] Health check endpoints tested
  ```bash
  curl http://localhost:5000/api/health
  curl http://localhost:3000/api/health
  curl http://localhost:3001/api/health
  ```
- [ ] External monitoring configured
- [ ] Alerting rules configured
- [ ] Uptime monitoring setup

#### 4.2 Logging Setup
- [ ] Log directories created and configured
- [ ] Log rotation configured
- [ ] Log aggregation setup (if applicable)
- [ ] Error tracking configured (Sentry, etc.)

#### 4.3 Performance Monitoring
- [ ] Performance monitoring tools installed
- [ ] Metrics collection configured
- [ ] Dashboards created
- [ ] Performance baselines established

## Post-Deployment Verification

### 🔍 Phase 5: Testing and Validation

#### 5.1 Functional Testing
- [ ] All services starting successfully
- [ ] Health endpoints responding
- [ ] API endpoints functioning
- [ ] Frontend applications loading
- [ ] Authentication working
- [ ] Database operations successful
- [ ] File uploads working
- [ ] Email notifications working
- [ ] Payment processing working (test mode)

#### 5.2 Performance Testing
- [ ] Load testing performed
- [ ] Response times acceptable
- [ ] Memory usage within limits
- [ ] CPU usage within limits
- [ ] Database performance acceptable

#### 5.3 Security Testing
- [ ] SSL/TLS configuration verified
- [ ] Security headers present
- [ ] Rate limiting working
- [ ] Authentication/authorization working
- [ ] Data validation working
- [ ] SQL injection protection verified
- [ ] XSS protection verified

#### 5.4 Integration Testing
- [ ] Supabase integration working
- [ ] Stripe integration working
- [ ] Email service working
- [ ] File storage working
- [ ] External APIs working

### 📋 Phase 6: Documentation and Handover

#### 6.1 Documentation
- [ ] Deployment documentation updated
- [ ] Runbook created for operations
- [ ] Troubleshooting guide created
- [ ] Emergency procedures documented
- [ ] Contact information updated

#### 6.2 Backup and Recovery
- [ ] Backup procedures tested
- [ ] Recovery procedures tested
- [ ] Data retention policies configured
- [ ] Disaster recovery plan created

#### 6.3 Team Training
- [ ] Operations team trained
- [ ] Support team trained
- [ ] Documentation reviewed
- [ ] Emergency contacts updated

## Go-Live Checklist

### 🎯 Final Pre-Launch Steps
- [ ] All previous phases completed
- [ ] Final smoke test passed
- [ ] Rollback plan prepared
- [ ] Team standing by for support
- [ ] Monitoring dashboards ready
- [ ] Communication plan activated

### 🚀 Launch Steps
1. [ ] Switch DNS to production servers
2. [ ] Monitor system health for 1 hour
3. [ ] Verify all functionality working
4. [ ] Enable production payment processing
5. [ ] Send go-live notification to stakeholders
6. [ ] Begin post-launch monitoring period

### 📊 Post-Launch Monitoring (First 24 Hours)
- [ ] System stability confirmed
- [ ] Performance within acceptable ranges
- [ ] No critical errors detected
- [ ] User access confirmed
- [ ] All integrations working
- [ ] Backup schedule verified

## Rollback Procedures

### 🔄 Emergency Rollback Steps
1. [ ] Switch DNS back to previous environment
2. [ ] Stop new services
3. [ ] Restore previous application version
4. [ ] Verify rollback successful
5. [ ] Communicate rollback to stakeholders
6. [ ] Document rollback reasons

### 📝 Post-Rollback Actions
- [ ] Analyze failure root cause
- [ ] Fix identified issues
- [ ] Update deployment procedures
- [ ] Schedule new deployment attempt
- [ ] Update team on lessons learned

## Sign-Off

### ✅ Deployment Approval
- [ ] Technical Lead Approval: _________________ Date: _______
- [ ] DevOps Approval: _________________ Date: _______
- [ ] QA Approval: _________________ Date: _______
- [ ] Product Owner Approval: _________________ Date: _______
- [ ] Operations Approval: _________________ Date: _______

### 📅 Deployment Schedule
- **Planned Start Time:** _________________
- **Planned Completion Time:** _________________
- **Actual Start Time:** _________________
- **Actual Completion Time:** _________________
- **Go-Live Time:** _________________

### 📞 Emergency Contacts
- **Technical Lead:** _________________
- **DevOps Engineer:** _________________
- **On-Call Support:** _________________
- **Product Owner:** _________________

---

**Note:** This checklist should be customized based on your specific infrastructure, requirements, and organizational processes. Always test deployment procedures in a staging environment before production deployment.