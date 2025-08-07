# ACE CRM Security Suite

A comprehensive security and monitoring system for the ACE CRM platform, implementing production-ready security features, monitoring, alerting, and automated backup systems.

## 🛡️ Security Components

### 1. SSL/TLS Configuration
- **Let's Encrypt SSL certificates** with automated renewal
- **Enhanced Nginx configuration** with security headers
- **HSTS, CSP, and security headers** implementation
- **SSL certificate monitoring** and expiration alerts

### 2. Error Tracking & Monitoring
- **Sentry integration** for error tracking and performance monitoring
- **DataDog metrics** collection and custom dashboards  
- **New Relic APM** with detailed transaction tracing
- **Real-time alerting** and incident management

### 3. Security Headers & Middleware
- **Comprehensive security headers** (HSTS, CSP, X-Frame-Options)
- **Advanced rate limiting** with progressive delays
- **Request size validation** and content type filtering
- **IP whitelisting/blacklisting** capabilities

### 4. Automated Backup System
- **Daily Supabase backups** (schema, data, storage manifest)
- **Encrypted backup storage** in AWS S3
- **Automated cleanup** of old backups
- **Backup verification** and integrity checks

### 5. DDoS Protection (Cloudflare)
- **Cloudflare security rules** and firewall configuration
- **WAF (Web Application Firewall)** managed rulesets
- **Bot management** and challenge mechanisms
- **Rate limiting** at the edge

### 6. Audit Logging System
- **Comprehensive event logging** (auth, data access, security events)
- **Structured logging** with Winston and Supabase storage
- **Audit trail queries** and reporting capabilities
- **Security incident tracking**

### 7. Vulnerability Scanning
- **Dependency vulnerability scanning** with npm audit
- **SSL certificate analysis** and weakness detection
- **Security headers assessment** 
- **File system security checks**
- **Automated reporting** and recommendations

### 8. Uptime Monitoring & Alerting
- **Multi-service health checks** (frontend, backend, database)
- **Multi-channel alerting** (Email, Discord, Slack, SMS)
- **Response time tracking** and SLA monitoring
- **Daily uptime reports** and analytics

## 🚀 Quick Setup

### 1. Environment Configuration

```bash
# Core Configuration
NODE_ENV=production
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Monitoring Services
SENTRY_DSN=your_sentry_dsn
DD_API_KEY=your_datadog_api_key
NEW_RELIC_LICENSE_KEY=your_newrelic_key

# Cloudflare Protection
CLOUDFLARE_API_TOKEN=your_cloudflare_token
CLOUDFLARE_ZONE_ID=your_zone_id

# Backup Configuration
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
BACKUP_S3_BUCKET=ace-crm-backups
BACKUP_ENCRYPTION_KEY=your_encryption_key

# Alert Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@acecrm.com
SMTP_PASS=your_email_password
ALERT_EMAILS=admin@acecrm.com,security@acecrm.com
DISCORD_WEBHOOK_URL=your_discord_webhook
SLACK_WEBHOOK_URL=your_slack_webhook
```

### 2. Install Dependencies

```bash
cd security/
npm install
```

### 3. Initialize Security System

```bash
# Automatic initialization (production)
npm run security-init

# Manual vulnerability scan
npm run vulnerability-scan

# Manual backup
npm run backup-now

# Test monitoring
npm run test-monitoring

# Setup Cloudflare protection
npm run cloudflare-setup
```

## 📊 Usage Examples

### Express.js Integration

```javascript
const express = require('express');
const { securityOrchestrator } = require('./security/security-integration');

const app = express();

// Initialize security system
await securityOrchestrator.initializeSecurity();

// Apply security middleware
const middleware = securityOrchestrator.getSecurityMiddleware();
app.use(middleware.headers);
app.use(middleware.audit);

// Health check endpoint
app.get('/health', securityOrchestrator.handleHealthCheck.bind(securityOrchestrator));

// Start server
app.listen(5000, () => {
  console.log('✅ Server started with full security protection');
});
```

### Next.js Integration (Frontend)

```javascript
// pages/_app.js
import { initSentryFrontend } from '../security/monitoring/sentry-frontend';

// Initialize Sentry for frontend
initSentryFrontend();

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
```

### Manual Operations

```javascript
const { VulnerabilityScanner } = require('./security/scanning/vulnerability-scanner');
const { backupSystem } = require('./security/backup/supabase-backup');
const { uptimeMonitor } = require('./security/monitoring/uptime-monitoring');

// Run vulnerability scan
const scanner = new VulnerabilityScanner();
const results = await scanner.performCompleteScan();

// Trigger manual backup
const backup = await backupSystem.triggerManualBackup('full');

// Get uptime status
const status = uptimeMonitor.getStatusSummary();
```

## 🔧 Configuration Options

### Security Headers Customization

```javascript
const { createSecurityMiddleware } = require('./security/headers/security-headers');

// Custom middleware with specific rate limits
const customMiddleware = createSecurityMiddleware({
  rateLimit: 'auth',  // Use auth-specific rate limiting
  slowDown: 'api',    // Apply API slow down
  helmet: {           // Custom helmet options
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", "'unsafe-inline'", "https://trusted.com"]
      }
    }
  }
});
```

### Monitoring Configuration

```javascript
const { DataDogMetrics } = require('./security/monitoring/datadog-setup');

// Custom business metrics
DataDogMetrics.trackUserLogin(true, 'oauth');
DataDogMetrics.trackPaymentTransaction(99.99, true, 'stripe');
DataDogMetrics.trackSecurityEvent('failed_login_attempt', 'medium');
```

### Audit Logging

```javascript
const { auditLoggerInstance } = require('./security/audit/audit-logging');

// Log custom events
await auditLoggerInstance.logUserLogin(user, req, true);
await auditLoggerInstance.logDataModification(user, 'contacts', 'update', contactId, oldData, newData, req);
await auditLoggerInstance.logSecurityEvent('unauthorized_access', user, req);
```

## 📈 Monitoring & Dashboards

### Available Metrics
- **Response times** and **error rates** for all endpoints
- **User authentication** success/failure rates
- **Database query performance** and connection health
- **File upload/download** statistics
- **Security event** frequency and severity
- **System resource usage** (CPU, memory, disk)

### Alert Channels
- **Email notifications** with HTML formatting
- **Discord webhooks** with rich embeds
- **Slack integration** with custom attachments
- **SMS alerts** via Twilio for critical issues

### Report Generation
- **Daily uptime reports** with service availability
- **Weekly vulnerability scan** summaries
- **Monthly security audit** reports
- **Backup status** and integrity reports

## 🔒 Security Best Practices

### 1. Environment Variables
- Store all secrets in environment variables
- Use different keys for development/production
- Regularly rotate API keys and tokens

### 2. SSL/TLS
- Use strong TLS versions (1.2+)
- Implement HSTS with preload
- Monitor certificate expiration

### 3. Access Control
- Implement proper authentication and authorization
- Use principle of least privilege
- Regular access reviews and cleanup

### 4. Data Protection
- Encrypt sensitive data at rest and in transit
- Implement proper data retention policies
- Regular backup testing and restoration

### 5. Monitoring
- Set up alerting for all critical components
- Monitor for unusual patterns and anomalies
- Regular security assessment and penetration testing

## 🚨 Incident Response

### Automated Response
- **Rate limiting** automatically blocks suspicious traffic
- **DDoS protection** via Cloudflare shields against attacks  
- **Health checks** restart failed services
- **Backup restoration** available for data recovery

### Manual Response
- **Security incident playbooks** for common scenarios
- **Alert escalation** procedures for critical issues
- **Communication templates** for user notifications
- **Post-incident review** and improvement processes

## 📝 Maintenance

### Regular Tasks
- **Certificate renewal** (automated via Let's Encrypt)
- **Dependency updates** and vulnerability patching
- **Backup verification** and restoration testing  
- **Security configuration** reviews and updates

### Scheduled Operations
- **Daily backups** at 2 AM UTC
- **Weekly vulnerability scans** on Sundays at 3 AM UTC
- **Monthly security reports** generated automatically
- **Quarterly access reviews** and cleanup

## 🤝 Support

For security-related issues or questions:
- **Emergency**: security@acecrm.com
- **General**: support@acecrm.com  
- **Documentation**: [Security Wiki](https://github.com/ace-crm/security/wiki)
- **Issues**: [GitHub Issues](https://github.com/ace-crm/security/issues)

## 📚 Additional Resources

- [OWASP Security Guidelines](https://owasp.org/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Cloudflare Security Center](https://developers.cloudflare.com/security/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

**⚠️ Security Notice**: This system implements comprehensive security measures, but security is an ongoing process. Regular updates, monitoring, and security assessments are essential for maintaining a secure environment.