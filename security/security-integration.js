// Security Integration Hub for ACE CRM
// Centralized initialization and orchestration of all security components

const { initSentry } = require('./monitoring/sentry-setup');
const { DataDogMetrics, startMetricsCollection, startHealthChecks } = require('./monitoring/datadog-setup');
const { initializeNewRelic } = require('./monitoring/newrelic-setup');
const { createSecurityMiddleware } = require('./headers/security-headers');
const { backupSystem } = require('./backup/supabase-backup');
const { CloudflareSecurityManager } = require('./ddos/cloudflare-config');
const { auditLoggerInstance, auditMiddleware } = require('./audit/audit-logging');
const { VulnerabilityScanner } = require('./scanning/vulnerability-scanner');
const { uptimeMonitor } = require('./monitoring/uptime-monitoring');

class SecurityOrchestrator {
  constructor() {
    this.initialized = false;
    this.components = new Map();
    this.config = this.loadConfiguration();
    this.startupChecks = [];
  }

  // Load security configuration from environment
  loadConfiguration() {
    return {
      // Environment
      environment: process.env.NODE_ENV || 'development',
      
      // Monitoring
      sentry: {
        enabled: !!process.env.SENTRY_DSN,
        dsn: process.env.SENTRY_DSN
      },
      datadog: {
        enabled: !!process.env.DD_API_KEY,
        apiKey: process.env.DD_API_KEY
      },
      newrelic: {
        enabled: !!process.env.NEW_RELIC_LICENSE_KEY,
        licenseKey: process.env.NEW_RELIC_LICENSE_KEY
      },
      
      // Cloudflare
      cloudflare: {
        enabled: !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID),
        apiToken: process.env.CLOUDFLARE_API_TOKEN,
        zoneId: process.env.CLOUDFLARE_ZONE_ID
      },
      
      // Backup
      backup: {
        enabled: !!(process.env.SUPABASE_URL && process.env.AWS_ACCESS_KEY_ID),
        schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
        retention: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30
      },
      
      // Vulnerability scanning
      scanning: {
        enabled: process.env.ENABLE_VULNERABILITY_SCANNING === 'true',
        schedule: process.env.VULN_SCAN_SCHEDULE || '0 3 * * 0' // Weekly on Sunday at 3 AM
      },
      
      // Uptime monitoring
      uptime: {
        enabled: process.env.ENABLE_UPTIME_MONITORING !== 'false',
        interval: parseInt(process.env.UPTIME_CHECK_INTERVAL) || 60000, // 1 minute
        alertThreshold: parseInt(process.env.UPTIME_ALERT_THRESHOLD) || 3
      },
      
      // Audit logging
      audit: {
        enabled: process.env.ENABLE_AUDIT_LOGGING !== 'false',
        logLevel: process.env.AUDIT_LOG_LEVEL || 'info',
        retention: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90
      }
    };
  }

  // Initialize all security components
  async initializeSecurity() {
    if (this.initialized) {
      console.log('⚠️ Security system already initialized');
      return;
    }

    console.log('🚀 Initializing comprehensive security system...');
    console.log(`🌍 Environment: ${this.config.environment}`);

    try {
      // Initialize monitoring services
      await this.initializeMonitoring();
      
      // Initialize security headers and middleware
      await this.initializeSecurityMiddleware();
      
      // Initialize Cloudflare security
      await this.initializeCloudflareProtection();
      
      // Initialize backup system
      await this.initializeBackupSystem();
      
      // Initialize audit logging
      await this.initializeAuditLogging();
      
      // Initialize vulnerability scanning
      await this.initializeVulnerabilityScanning();
      
      // Initialize uptime monitoring
      await this.initializeUptimeMonitoring();
      
      // Run startup security checks
      await this.runStartupSecurityChecks();
      
      this.initialized = true;
      
      console.log('✅ Security system initialization completed successfully');
      console.log(`📊 Active components: ${this.components.size}`);
      
      // Log initialization event
      await auditLoggerInstance.logSystemEvent('security_system_initialized', {
        components: Array.from(this.components.keys()),
        environment: this.config.environment,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        components: Array.from(this.components.keys()),
        startupChecks: this.startupChecks
      };
      
    } catch (error) {
      console.error('❌ Security system initialization failed:', error.message);
      
      // Report critical initialization failure
      if (this.components.has('sentry')) {
        const sentry = this.components.get('sentry');
        sentry.reportError(error, { operation: 'security_initialization' });
      }
      
      throw error;
    }
  }

  // Initialize monitoring services
  async initializeMonitoring() {
    console.log('📊 Initializing monitoring services...');
    
    // Sentry error tracking
    if (this.config.sentry.enabled) {
      try {
        initSentry(this.config.environment);
        this.components.set('sentry', require('./monitoring/sentry-setup'));
        console.log('✅ Sentry error tracking initialized');
      } catch (error) {
        console.error('❌ Sentry initialization failed:', error.message);
      }
    }
    
    // DataDog monitoring
    if (this.config.datadog.enabled) {
      try {
        startMetricsCollection();
        startHealthChecks();
        this.components.set('datadog', { DataDogMetrics });
        console.log('✅ DataDog monitoring initialized');
      } catch (error) {
        console.error('❌ DataDog initialization failed:', error.message);
      }
    }
    
    // New Relic monitoring
    if (this.config.newrelic.enabled) {
      try {
        const newrelic = initializeNewRelic();
        this.components.set('newrelic', newrelic);
        console.log('✅ New Relic monitoring initialized');
      } catch (error) {
        console.error('❌ New Relic initialization failed:', error.message);
      }
    }
  }

  // Initialize security middleware
  async initializeSecurityMiddleware() {
    console.log('🛡️ Initializing security middleware...');
    
    try {
      const securityMiddleware = {
        headers: createSecurityMiddleware(),
        audit: auditMiddleware(auditLoggerInstance)
      };
      
      this.components.set('middleware', securityMiddleware);
      console.log('✅ Security middleware initialized');
    } catch (error) {
      console.error('❌ Security middleware initialization failed:', error.message);
      throw error;
    }
  }

  // Initialize Cloudflare protection
  async initializeCloudflareProtection() {
    if (!this.config.cloudflare.enabled) {
      console.log('⏭️ Skipping Cloudflare configuration (not configured)');
      return;
    }
    
    console.log('☁️ Initializing Cloudflare protection...');
    
    try {
      const cloudflareManager = new CloudflareSecurityManager();
      
      if (this.config.environment === 'production') {
        // Only apply Cloudflare settings in production
        await cloudflareManager.setupCompleteSecurityStack();
      }
      
      this.components.set('cloudflare', cloudflareManager);
      console.log('✅ Cloudflare protection initialized');
    } catch (error) {
      console.error('❌ Cloudflare initialization failed:', error.message);
      // Don't throw - Cloudflare is optional
    }
  }

  // Initialize backup system
  async initializeBackupSystem() {
    if (!this.config.backup.enabled) {
      console.log('⏭️ Skipping backup system (not configured)');
      return;
    }
    
    console.log('💾 Initializing backup system...');
    
    try {
      // Backup system auto-initializes with scheduling
      this.components.set('backup', backupSystem);
      console.log('✅ Backup system initialized');
      
      // Test backup connectivity
      this.startupChecks.push({
        name: 'backup_connectivity',
        status: 'pending'
      });
    } catch (error) {
      console.error('❌ Backup system initialization failed:', error.message);
      throw error;
    }
  }

  // Initialize audit logging
  async initializeAuditLogging() {
    if (!this.config.audit.enabled) {
      console.log('⏭️ Skipping audit logging (disabled)');
      return;
    }
    
    console.log('📝 Initializing audit logging...');
    
    try {
      // Audit logger auto-initializes
      this.components.set('audit', auditLoggerInstance);
      console.log('✅ Audit logging initialized');
      
      // Test database connectivity
      this.startupChecks.push({
        name: 'audit_database_connectivity',
        status: 'pending'
      });
    } catch (error) {
      console.error('❌ Audit logging initialization failed:', error.message);
      throw error;
    }
  }

  // Initialize vulnerability scanning
  async initializeVulnerabilityScanning() {
    if (!this.config.scanning.enabled) {
      console.log('⏭️ Skipping vulnerability scanning (disabled)');
      return;
    }
    
    console.log('🔍 Initializing vulnerability scanning...');
    
    try {
      const scanner = new VulnerabilityScanner();
      this.components.set('scanner', scanner);
      console.log('✅ Vulnerability scanning initialized');
      
      // Schedule initial scan
      if (this.config.environment === 'production') {
        setTimeout(() => {
          scanner.performCompleteScan().catch(console.error);
        }, 60000); // Run after 1 minute startup delay
      }
    } catch (error) {
      console.error('❌ Vulnerability scanning initialization failed:', error.message);
      // Don't throw - scanning is optional
    }
  }

  // Initialize uptime monitoring
  async initializeUptimeMonitoring() {
    if (!this.config.uptime.enabled) {
      console.log('⏭️ Skipping uptime monitoring (disabled)');
      return;
    }
    
    console.log('🏥 Initializing uptime monitoring...');
    
    try {
      // Uptime monitor auto-starts in production
      this.components.set('uptime', uptimeMonitor);
      console.log('✅ Uptime monitoring initialized');
    } catch (error) {
      console.error('❌ Uptime monitoring initialization failed:', error.message);
      // Don't throw - monitoring is optional
    }
  }

  // Run startup security checks
  async runStartupSecurityChecks() {
    console.log('🔐 Running startup security checks...');
    
    const checks = [
      this.checkEnvironmentVariables(),
      this.checkFilePermissions(),
      this.checkDatabaseConnection(),
      this.checkExternalServices()
    ];
    
    const results = await Promise.allSettled(checks);
    
    results.forEach((result, index) => {
      const checkNames = ['environment_variables', 'file_permissions', 'database_connection', 'external_services'];
      const checkName = checkNames[index];
      
      if (result.status === 'fulfilled') {
        console.log(`✅ ${checkName}: PASSED`);
        this.startupChecks.push({ name: checkName, status: 'passed', details: result.value });
      } else {
        console.error(`❌ ${checkName}: FAILED -`, result.reason.message);
        this.startupChecks.push({ name: checkName, status: 'failed', error: result.reason.message });
      }
    });
  }

  // Security check implementations
  async checkEnvironmentVariables() {
    const required = [
      'NODE_ENV',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    return { requiredVariables: required.length, missingVariables: 0 };
  }

  async checkFilePermissions() {
    const sensitiveFiles = [
      '.env',
      '.env.local',
      '.env.production'
    ];
    
    const fs = require('fs').promises;
    const path = require('path');
    const issues = [];
    
    for (const file of sensitiveFiles) {
      try {
        const stats = await fs.stat(path.resolve(file));
        
        if (process.platform !== 'win32') {
          const permissions = (stats.mode & parseInt('777', 8)).toString(8);
          if (permissions !== '600' && permissions !== '644') {
            issues.push(`${file}: ${permissions} (should be 600 or 644)`);
          }
        }
      } catch (error) {
        // File doesn't exist - that's okay
      }
    }
    
    if (issues.length > 0) {
      console.warn('⚠️ File permission issues:', issues);
    }
    
    return { filesChecked: sensitiveFiles.length, issues: issues.length };
  }

  async checkDatabaseConnection() {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Simple connectivity test
      const { data, error } = await supabase.from('audit_logs').select('count').limit(1);
      
      if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
        throw error;
      }
      
      return { status: 'connected', timestamp: new Date().toISOString() };
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async checkExternalServices() {
    const services = [];
    
    // Check Sentry
    if (this.config.sentry.enabled) {
      services.push({ name: 'sentry', status: 'configured' });
    }
    
    // Check Cloudflare
    if (this.config.cloudflare.enabled) {
      services.push({ name: 'cloudflare', status: 'configured' });
    }
    
    return { externalServices: services.length, services };
  }

  // Get security status
  getSecurityStatus() {
    return {
      initialized: this.initialized,
      environment: this.config.environment,
      components: Array.from(this.components.keys()),
      activeComponents: this.components.size,
      startupChecks: this.startupChecks,
      timestamp: new Date().toISOString()
    };
  }

  // Shutdown security system gracefully
  async shutdown() {
    console.log('🛑 Shutting down security system...');
    
    try {
      // Stop uptime monitoring
      if (this.components.has('uptime')) {
        const uptime = this.components.get('uptime');
        uptime.stopMonitoring();
      }
      
      // Log shutdown event
      if (this.components.has('audit')) {
        await auditLoggerInstance.logSystemEvent('security_system_shutdown', {
          components: Array.from(this.components.keys()),
          timestamp: new Date().toISOString()
        });
      }
      
      this.components.clear();
      this.initialized = false;
      
      console.log('✅ Security system shutdown completed');
      
    } catch (error) {
      console.error('❌ Security system shutdown failed:', error.message);
      throw error;
    }
  }

  // Express middleware factory
  getSecurityMiddleware() {
    if (!this.components.has('middleware')) {
      throw new Error('Security middleware not initialized');
    }
    
    return this.components.get('middleware');
  }

  // Health check endpoint handler
  async handleHealthCheck(req, res) {
    try {
      const status = this.getSecurityStatus();
      const healthCheck = {
        status: 'healthy',
        security: status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      };
      
      res.status(200).json(healthCheck);
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Create and export singleton instance
const securityOrchestrator = new SecurityOrchestrator();

// Auto-initialize in production
if (process.env.NODE_ENV === 'production') {
  securityOrchestrator.initializeSecurity().catch(error => {
    console.error('Failed to initialize security system:', error);
    process.exit(1);
  });
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await securityOrchestrator.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await securityOrchestrator.shutdown();
  process.exit(0);
});

module.exports = {
  SecurityOrchestrator,
  securityOrchestrator
};