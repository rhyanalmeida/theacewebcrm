# ACE CRM Production Deployment Guide

[![Production Ready](https://img.shields.io/badge/Production-Ready-green.svg)](https://github.com/your-repo/ace-crm)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 🚀 Overview

ACE CRM is a comprehensive Customer Relationship Management system designed specifically for web design agencies. This production-ready system includes:

- **Backend API**: Node.js/Express with TypeScript
- **Frontend Dashboard**: Next.js admin interface
- **Client Portal**: Next.js client-facing portal
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe integration
- **Authentication**: Supabase Auth with JWT

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Client Portal  │    │     Nginx       │
│   Next.js       │    │    Next.js      │    │ Reverse Proxy   │
│   Port: 3000    │    │   Port: 3001    │    │   Port: 80/443  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴───────────┐
                    │    Backend API          │
                    │   Node.js/Express       │
                    │    Port: 5000           │
                    └─────────┬───────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
    ┌──────┴──────┐   ┌──────┴──────┐   ┌──────┴──────┐
    │  Supabase   │   │   Stripe    │   │    Redis    │
    │ PostgreSQL  │   │  Payments   │   │   Cache     │
    │   Database  │   │             │   │             │
    └─────────────┘   └─────────────┘   └─────────────┘
```

## 📋 Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / macOS 10.15+ / Windows 11 with WSL2
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB minimum, 50GB recommended
- **Network**: Stable internet connection

### Software Dependencies
- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **PM2**: Latest version (for process management)
- **Docker** (optional): Latest version
- **Nginx** (optional): For reverse proxy

### External Services
- **Supabase Account**: For database and authentication
- **Stripe Account**: For payment processing
- **Domain Name**: With SSL certificate
- **SMTP Service**: For email notifications (optional)

## 🛠️ Quick Start

### 1. Clone and Setup
```bash
# Clone the repository
git clone https://github.com/your-username/ace-crm.git
cd ace-crm

# Make scripts executable
chmod +x scripts/*.sh

# Run the complete setup
./scripts/setup-production.sh
```

### 2. Configure Environment
```bash
# Copy and edit environment files
cp .env.example .env.production
nano .env.production

# Required variables (replace with your actual values):
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_super_secure_jwt_secret_256_bits_minimum
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
```

### 3. Build and Deploy
```bash
# Build all components
./scripts/build-all.sh

# Start all services
./scripts/start-all.sh

# Verify deployment
./scripts/test-deployment.sh
```

### 4. Access Your System
- **Admin Dashboard**: http://localhost:3000
- **Client Portal**: http://localhost:3001
- **API Documentation**: http://localhost:5000/api/docs

## 📖 Detailed Setup Instructions

### Step 1: Environment Setup

#### 1.1 Install Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs npm

# Verify installation
node --version  # Should be 18.0.0+
npm --version   # Should be 8.0.0+
```

#### 1.2 Install PM2 (Process Manager)
```bash
npm install -g pm2
pm2 startup  # Follow the instructions to enable auto-start
```

#### 1.3 Install Additional Tools
```bash
# Install jq for JSON processing
sudo apt-get install jq

# Install curl if not present
sudo apt-get install curl

# Install bc for calculations
sudo apt-get install bc
```

### Step 2: Supabase Configuration

#### 2.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and API keys
4. Navigate to Settings > API to get your keys

#### 2.2 Setup Database Schema
```bash
# Run the database setup script
./scripts/setup-supabase.sql
```

#### 2.3 Configure Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies (see supabase/migrations for complete setup)
```

### Step 3: Stripe Configuration

#### 3.1 Stripe Account Setup
1. Create account at [stripe.com](https://stripe.com)
2. Complete business verification
3. Obtain API keys from Dashboard > Developers > API keys
4. Set up webhooks endpoint: `https://yourdomain.com/api/webhooks/stripe`

#### 3.2 Configure Stripe Webhooks
Required webhook events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### Step 4: Build Process

#### 4.1 Install Dependencies
```bash
# Backend dependencies
cd ace-crm/backend
npm ci --only=production

# Frontend dependencies  
cd ../../frontend
npm ci --only=production

# Client Portal dependencies
cd ../client-portal
npm ci --only=production
```

#### 4.2 Build Applications
```bash
# Build backend (TypeScript compilation)
cd ../ace-crm/backend
npm run build

# Build frontend (Next.js)
cd ../../frontend
npm run build

# Build client portal (Next.js)
cd ../client-portal
npm run build
```

### Step 5: Service Configuration

#### 5.1 PM2 Configuration
```bash
# Start services with PM2
pm2 start scripts/pm2.ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 monit
```

#### 5.2 Nginx Configuration (Optional)
```bash
# Install Nginx
sudo apt-get install nginx

# Copy configuration
sudo cp nginx/nginx.prod.conf /etc/nginx/sites-available/ace-crm
sudo ln -s /etc/nginx/sites-available/ace-crm /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### 5.3 SSL Certificate Setup
```bash
# Using Certbot (Let's Encrypt)
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 🐳 Docker Deployment

### Option A: Docker Compose (Recommended)
```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=2
```

### Option B: Individual Containers
```bash
# Build images
docker build -t ace-crm-backend ./ace-crm/backend
docker build -t ace-crm-frontend ./frontend  
docker build -t ace-crm-client-portal ./client-portal

# Run containers
docker run -d --name ace-backend -p 5000:5000 ace-crm-backend
docker run -d --name ace-frontend -p 3000:3000 ace-crm-frontend
docker run -d --name ace-portal -p 3001:3001 ace-crm-client-portal
```

## 📊 Monitoring and Maintenance

### Health Checks
```bash
# Built-in health check endpoints
curl http://localhost:5000/api/health    # Backend
curl http://localhost:3000/api/health    # Frontend  
curl http://localhost:3001/api/health    # Client Portal

# Comprehensive system test
./scripts/test-deployment.sh

# Load testing
./scripts/test-deployment.sh load-test 50
```

### Log Management
```bash
# View logs
pm2 logs

# Log locations
ls -la /var/log/ace-crm/

# Rotate logs
sudo logrotate -f /etc/logrotate.d/ace-crm
```

### Performance Monitoring
```bash
# Monitor system resources
pm2 monit

# Check system metrics
./scripts/collect-metrics.sh

# Performance benchmarking
./scripts/benchmark.sh
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -ti:5000
lsof -ti:3000
lsof -ti:3001

# Kill process
kill $(lsof -ti:5000)
```

#### Memory Issues
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Restart services with more memory
export NODE_OPTIONS="--max-old-space-size=4096"
pm2 restart all
```

#### Database Connection Issues
```bash
# Test Supabase connection
curl -H "apikey: $SUPABASE_ANON_KEY" "$SUPABASE_URL/rest/v1/"

# Check environment variables
env | grep SUPABASE
```

#### Build Failures
```bash
# Clean and rebuild
./scripts/build-all.sh --clean-deps

# Check Node.js version
node --version

# Clear npm cache
npm cache clean --force
```

### Getting Help
1. Check the logs: `pm2 logs`
2. Review error messages in `/var/log/ace-crm/`
3. Run diagnostics: `./scripts/test-deployment.sh`
4. Check system resources: `pm2 monit`

## 🔄 Updates and Rollbacks

### Updating the System
```bash
# Backup current version
./scripts/backup-system.sh

# Pull latest changes
git pull origin main

# Build and deploy
./scripts/build-all.sh
./scripts/restart-all.sh

# Verify update
./scripts/test-deployment.sh
```

### Rollback Procedures
```bash
# Emergency rollback
./scripts/rollback.sh --emergency

# Planned rollback to specific version
./scripts/rollback.sh --version v1.0.0

# Verify rollback
./scripts/test-deployment.sh
```

See [ROLLBACK_PROCEDURES.md](ROLLBACK_PROCEDURES.md) for detailed rollback instructions.

## 📈 Scaling and Performance

### Horizontal Scaling
```bash
# Scale backend with PM2
pm2 scale ace-crm-backend 4  # Run 4 instances

# Scale with Docker
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Load balancer configuration (Nginx)
upstream backend {
    server localhost:5000;
    server localhost:5001;
    server localhost:5002;
}
```

### Performance Optimization
- Enable Redis caching
- Configure CDN for static assets
- Implement database connection pooling
- Use compression middleware
- Enable HTTP/2 in Nginx

### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_deals_status ON deals(status);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM contacts WHERE company_id = $1;
```

## 🔒 Security Checklist

### Application Security
- [ ] Environment variables secured
- [ ] JWT secrets are 256+ bits
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] SQL injection protection
- [ ] XSS protection headers
- [ ] CORS properly configured

### Infrastructure Security
- [ ] SSL certificates configured
- [ ] Firewall rules applied
- [ ] Regular security updates
- [ ] Access logs monitored
- [ ] Intrusion detection setup
- [ ] Backup encryption enabled

### Compliance
- [ ] GDPR compliance (EU users)
- [ ] PCI DSS compliance (payment data)
- [ ] Data retention policies
- [ ] Privacy policy updated
- [ ] Terms of service current

## 💾 Backup and Recovery

### Automated Backups
```bash
# Setup automated backups
crontab -e

# Add backup jobs
0 2 * * * /path/to/scripts/backup-database.sh
0 3 * * * /path/to/scripts/backup-files.sh
0 4 * * * /path/to/scripts/cleanup-old-backups.sh
```

### Manual Backup
```bash
# Create complete system backup
./scripts/backup-system.sh --full

# Backup specific components
./scripts/backup-database.sh
./scripts/backup-uploads.sh
./scripts/backup-config.sh
```

### Recovery Testing
```bash
# Test backup restoration (on staging)
./scripts/restore-backup.sh --test-mode

# Verify recovery
./scripts/test-deployment.sh
```

## 📞 Support and Maintenance

### Regular Maintenance Tasks

#### Daily
- [ ] Check service health
- [ ] Monitor error logs
- [ ] Verify backup completion
- [ ] Check disk space

#### Weekly  
- [ ] Review performance metrics
- [ ] Update security patches
- [ ] Analyze user feedback
- [ ] Test monitoring alerts

#### Monthly
- [ ] Full system backup test
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Capacity planning assessment

### Emergency Contacts
- **Technical Lead**: [email/phone]
- **DevOps Engineer**: [email/phone]  
- **On-call Support**: [phone]
- **Emergency Escalation**: [phone]

### Support Channels
- **Documentation**: This README and related docs
- **Issue Tracking**: GitHub Issues
- **Team Chat**: Slack #ace-crm-support
- **Emergency**: Call emergency hotline

## 📚 Additional Resources

### Documentation
- [API Documentation](docs/api/API_SPECIFICATION.md)
- [System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)
- [Monitoring Setup](MONITORING_SETUP.md)
- [Rollback Procedures](ROLLBACK_PROCEDURES.md)

### Scripts Reference
- `scripts/start-all.sh` - Start all services
- `scripts/stop-all.sh` - Stop all services
- `scripts/build-all.sh` - Build all components
- `scripts/test-deployment.sh` - Test deployment
- `scripts/backup-system.sh` - Backup system
- `scripts/rollback.sh` - Rollback deployment

### Environment Variables Reference
```bash
# Database
SUPABASE_URL=                    # Supabase project URL
SUPABASE_ANON_KEY=              # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=      # Supabase service role key

# Authentication
JWT_SECRET=                      # JWT signing secret (256+ bits)
NEXTAUTH_SECRET=                 # NextAuth.js secret
NEXTAUTH_URL=                    # Application URL

# Payment Processing
STRIPE_SECRET_KEY=               # Stripe secret key
STRIPE_PUBLISHABLE_KEY=          # Stripe publishable key
STRIPE_WEBHOOK_SECRET=           # Stripe webhook secret

# Application
NODE_ENV=production              # Environment mode
LOG_LEVEL=info                   # Logging level
API_URL=                         # Backend API URL

# Optional Services
REDIS_URL=                       # Redis connection string
SMTP_HOST=                       # Email server host
SMTP_USER=                       # Email username
SMTP_PASS=                       # Email password
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting pull requests.

---

**🎉 Congratulations! Your ACE CRM system is now production-ready!**

For technical support or questions, please contact the development team or refer to the documentation links above.

**Remember to**:
- Monitor your system regularly
- Keep backups current
- Update security patches promptly  
- Test rollback procedures periodically
- Review performance metrics weekly

**Happy CRM managing! 🚀**