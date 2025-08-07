// Comprehensive Audit Logging System for ACE CRM
const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');
const crypto = require('crypto');
const os = require('os');

// Initialize Supabase client for audit logs
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Winston logger configuration for audit trails
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  transports: [
    // File transport for audit logs
    new winston.transports.File({
      filename: 'logs/audit.log',
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 10,
      tailable: true
    }),
    // Console transport for development
    ...(process.env.NODE_ENV === 'development' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ] : [])
  ]
});

// Audit event types
const AUDIT_EVENTS = {
  // Authentication events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_LOGIN_FAILED: 'user_login_failed',
  PASSWORD_CHANGED: 'password_changed',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'password_reset_completed',
  
  // User management events
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_PERMISSIONS_CHANGED: 'user_permissions_changed',
  
  // Data access events
  DATA_ACCESSED: 'data_accessed',
  DATA_CREATED: 'data_created',
  DATA_UPDATED: 'data_updated',
  DATA_DELETED: 'data_deleted',
  DATA_EXPORTED: 'data_exported',
  
  // System events
  SYSTEM_STARTUP: 'system_startup',
  SYSTEM_SHUTDOWN: 'system_shutdown',
  CONFIG_CHANGED: 'config_changed',
  BACKUP_CREATED: 'backup_created',
  BACKUP_RESTORED: 'backup_restored',
  
  // Security events
  UNAUTHORIZED_ACCESS_ATTEMPT: 'unauthorized_access_attempt',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  SECURITY_POLICY_VIOLATION: 'security_policy_violation',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  
  // Payment events
  PAYMENT_PROCESSED: 'payment_processed',
  PAYMENT_FAILED: 'payment_failed',
  REFUND_PROCESSED: 'refund_processed',
  INVOICE_GENERATED: 'invoice_generated',
  
  // File events
  FILE_UPLOADED: 'file_uploaded',
  FILE_DOWNLOADED: 'file_downloaded',
  FILE_DELETED: 'file_deleted',
  
  // API events
  API_CALLED: 'api_called',
  API_KEY_CREATED: 'api_key_created',
  API_KEY_REVOKED: 'api_key_revoked'
};

// Audit severity levels
const AUDIT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

class AuditLogger {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.hostname = os.hostname();
    this.processId = process.pid;
  }

  // Generate unique session ID
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Create audit log entry
  async createAuditLog(eventData) {
    const auditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      hostname: this.hostname,
      process_id: this.processId,
      event_type: eventData.eventType,
      severity: eventData.severity || AUDIT_SEVERITY.MEDIUM,
      user_id: eventData.userId || null,
      user_email: eventData.userEmail || null,
      ip_address: eventData.ipAddress || null,
      user_agent: eventData.userAgent || null,
      resource: eventData.resource || null,
      action: eventData.action || null,
      resource_id: eventData.resourceId || null,
      old_values: eventData.oldValues ? JSON.stringify(eventData.oldValues) : null,
      new_values: eventData.newValues ? JSON.stringify(eventData.newValues) : null,
      metadata: eventData.metadata ? JSON.stringify(eventData.metadata) : null,
      success: eventData.success !== undefined ? eventData.success : true,
      error_message: eventData.errorMessage || null,
      request_id: eventData.requestId || null,
      correlation_id: eventData.correlationId || null,
      additional_context: eventData.additionalContext ? JSON.stringify(eventData.additionalContext) : null
    };

    try {
      // Store in database
      const { error: dbError } = await supabase
        .from('audit_logs')
        .insert([auditEntry]);

      if (dbError) {
        console.error('Failed to store audit log in database:', dbError);
      }

      // Log to file system
      auditLogger.info('Audit Event', auditEntry);

      return auditEntry;

    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Fallback to file logging only
      auditLogger.error('Audit logging failed', { 
        error: error.message, 
        originalEvent: auditEntry 
      });
      throw error;
    }
  }

  // Authentication event logging
  async logUserLogin(user, request, success = true, errorMessage = null) {
    return await this.createAuditLog({
      eventType: success ? AUDIT_EVENTS.USER_LOGIN : AUDIT_EVENTS.USER_LOGIN_FAILED,
      severity: success ? AUDIT_SEVERITY.LOW : AUDIT_SEVERITY.MEDIUM,
      userId: user?.id,
      userEmail: user?.email,
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      success,
      errorMessage,
      metadata: {
        loginMethod: user?.loginMethod || 'password',
        timestamp: new Date().toISOString()
      }
    });
  }

  async logUserLogout(user, request) {
    return await this.createAuditLog({
      eventType: AUDIT_EVENTS.USER_LOGOUT,
      severity: AUDIT_SEVERITY.LOW,
      userId: user.id,
      userEmail: user.email,
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent')
    });
  }

  async logPasswordChange(user, request) {
    return await this.createAuditLog({
      eventType: AUDIT_EVENTS.PASSWORD_CHANGED,
      severity: AUDIT_SEVERITY.MEDIUM,
      userId: user.id,
      userEmail: user.email,
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent')
    });
  }

  // Data access event logging
  async logDataAccess(user, resource, action, resourceId = null, request = null) {
    return await this.createAuditLog({
      eventType: AUDIT_EVENTS.DATA_ACCESSED,
      severity: AUDIT_SEVERITY.LOW,
      userId: user?.id,
      userEmail: user?.email,
      resource,
      action,
      resourceId,
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      requestId: request?.id
    });
  }

  async logDataModification(user, resource, action, resourceId, oldValues = null, newValues = null, request = null) {
    let eventType;
    switch (action.toLowerCase()) {
      case 'create':
        eventType = AUDIT_EVENTS.DATA_CREATED;
        break;
      case 'update':
        eventType = AUDIT_EVENTS.DATA_UPDATED;
        break;
      case 'delete':
        eventType = AUDIT_EVENTS.DATA_DELETED;
        break;
      default:
        eventType = AUDIT_EVENTS.DATA_ACCESSED;
    }

    return await this.createAuditLog({
      eventType,
      severity: action === 'delete' ? AUDIT_SEVERITY.HIGH : AUDIT_SEVERITY.MEDIUM,
      userId: user?.id,
      userEmail: user?.email,
      resource,
      action,
      resourceId,
      oldValues,
      newValues,
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      requestId: request?.id
    });
  }

  // Security event logging
  async logSecurityEvent(eventType, user = null, request = null, details = {}) {
    const severity = this.getSecurityEventSeverity(eventType);

    return await this.createAuditLog({
      eventType,
      severity,
      userId: user?.id,
      userEmail: user?.email,
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      success: false,
      metadata: details
    });
  }

  async logUnauthorizedAccess(user, resource, action, request) {
    return await this.logSecurityEvent(
      AUDIT_EVENTS.UNAUTHORIZED_ACCESS_ATTEMPT,
      user,
      request,
      { attemptedResource: resource, attemptedAction: action }
    );
  }

  async logSuspiciousActivity(user, request, activity) {
    return await this.logSecurityEvent(
      AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
      user,
      request,
      { activityType: activity.type, details: activity.details }
    );
  }

  async logRateLimitExceeded(request, endpoint) {
    return await this.createAuditLog({
      eventType: AUDIT_EVENTS.RATE_LIMIT_EXCEEDED,
      severity: AUDIT_SEVERITY.MEDIUM,
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      resource: endpoint,
      success: false,
      metadata: {
        endpoint,
        requestCount: request?.rateLimit?.current,
        rateLimitMax: request?.rateLimit?.max
      }
    });
  }

  // Payment event logging
  async logPaymentEvent(eventType, user, paymentData, success = true, errorMessage = null) {
    return await this.createAuditLog({
      eventType,
      severity: success ? AUDIT_SEVERITY.MEDIUM : AUDIT_SEVERITY.HIGH,
      userId: user?.id,
      userEmail: user?.email,
      resource: 'payment',
      resourceId: paymentData?.transactionId,
      success,
      errorMessage,
      metadata: {
        amount: paymentData?.amount,
        currency: paymentData?.currency,
        paymentMethod: paymentData?.method,
        customerId: paymentData?.customerId
      }
    });
  }

  // File event logging
  async logFileEvent(eventType, user, filename, fileSize = null, request = null) {
    return await this.createAuditLog({
      eventType,
      severity: AUDIT_SEVERITY.LOW,
      userId: user?.id,
      userEmail: user?.email,
      resource: 'file',
      action: eventType.replace('file_', ''),
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      metadata: {
        filename,
        fileSize,
        uploadPath: request?.file?.path
      }
    });
  }

  // API event logging
  async logAPICall(request, response, user = null, duration = null) {
    const success = response.statusCode < 400;
    
    return await this.createAuditLog({
      eventType: AUDIT_EVENTS.API_CALLED,
      severity: success ? AUDIT_SEVERITY.LOW : AUDIT_SEVERITY.MEDIUM,
      userId: user?.id,
      userEmail: user?.email,
      resource: 'api',
      action: `${request.method} ${request.path}`,
      ipAddress: request.ip,
      userAgent: request.get('User-Agent'),
      success,
      requestId: request.id,
      metadata: {
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        duration,
        requestSize: request.get('content-length'),
        responseSize: response.get('content-length')
      }
    });
  }

  // System event logging
  async logSystemEvent(eventType, details = {}) {
    return await this.createAuditLog({
      eventType,
      severity: AUDIT_SEVERITY.MEDIUM,
      metadata: {
        ...details,
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime()
      }
    });
  }

  // Helper method to determine security event severity
  getSecurityEventSeverity(eventType) {
    const highSeverityEvents = [
      AUDIT_EVENTS.UNAUTHORIZED_ACCESS_ATTEMPT,
      AUDIT_EVENTS.SECURITY_POLICY_VIOLATION
    ];

    const criticalEvents = [
      AUDIT_EVENTS.SUSPICIOUS_ACTIVITY
    ];

    if (criticalEvents.includes(eventType)) {
      return AUDIT_SEVERITY.CRITICAL;
    } else if (highSeverityEvents.includes(eventType)) {
      return AUDIT_SEVERITY.HIGH;
    } else {
      return AUDIT_SEVERITY.MEDIUM;
    }
  }

  // Batch audit log creation for high-volume events
  async batchCreateAuditLogs(events) {
    const auditEntries = events.map(eventData => ({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      hostname: this.hostname,
      process_id: this.processId,
      ...eventData
    }));

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert(auditEntries);

      if (error) {
        console.error('Batch audit log creation failed:', error);
        throw error;
      }

      // Log to file system
      auditEntries.forEach(entry => {
        auditLogger.info('Audit Event (Batch)', entry);
      });

      return auditEntries;

    } catch (error) {
      console.error('Batch audit logging failed:', error);
      throw error;
    }
  }

  // Query audit logs with filtering
  async queryAuditLogs(filters = {}, limit = 100, offset = 0) {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.resource) {
        query = query.eq('resource', filters.resource);
      }
      if (filters.success !== undefined) {
        query = query.eq('success', filters.success);
      }
      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      console.error('Audit log query failed:', error);
      throw error;
    }
  }
}

// Express middleware for automatic audit logging
const auditMiddleware = (auditLogger) => {
  return (req, res, next) => {
    const start = Date.now();
    
    // Store original end function
    const originalEnd = res.end;
    
    // Override end function to log after response
    res.end = function(chunk, encoding) {
      res.end = originalEnd;
      res.end(chunk, encoding);
      
      const duration = Date.now() - start;
      
      // Log API call (async, don't block response)
      setImmediate(() => {
        auditLogger.logAPICall(req, res, req.user, duration)
          .catch(error => console.error('Audit logging failed:', error));
      });
    };
    
    next();
  };
};

// Initialize audit logger instance
const auditLoggerInstance = new AuditLogger();

// Export audit logger and utilities
module.exports = {
  AuditLogger,
  auditLoggerInstance,
  auditMiddleware,
  AUDIT_EVENTS,
  AUDIT_SEVERITY
};