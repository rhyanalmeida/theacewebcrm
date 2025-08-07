// Sentry Configuration for ACE CRM
const { init, captureException, captureMessage, setUser, setTag, setContext } = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

// Initialize Sentry with comprehensive configuration
const initSentry = (environment = process.env.NODE_ENV) => {
  init({
    dsn: process.env.SENTRY_DSN,
    environment,
    debug: environment === 'development',
    
    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Release and version tracking
    release: process.env.npm_package_version || '1.0.0',
    
    integrations: [
      new ProfilingIntegration(),
    ],
    
    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive information
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      
      // Filter out expected errors
      if (event.exception) {
        const error = hint.originalException;
        if (error && error.message) {
          // Don't send validation errors
          if (error.message.includes('Validation error')) {
            return null;
          }
          // Don't send 404 errors
          if (error.message.includes('Not found')) {
            return null;
          }
        }
      }
      
      return event;
    },
    
    // Sample rate for capturing user interactions
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
  
  console.log(`✅ Sentry initialized for ${environment} environment`);
};

// Enhanced error reporting with context
const reportError = (error, context = {}) => {
  setContext('error_context', {
    timestamp: new Date().toISOString(),
    ...context
  });
  
  captureException(error);
};

// Security incident reporting
const reportSecurityIncident = (incident, user, severity = 'error') => {
  setTag('incident_type', 'security');
  setTag('severity', severity);
  
  if (user) {
    setUser({
      id: user.id,
      email: user.email,
      ip_address: user.ip_address
    });
  }
  
  setContext('security_incident', {
    type: incident.type,
    details: incident.details,
    timestamp: new Date().toISOString(),
    user_agent: incident.user_agent,
    ip_address: incident.ip_address
  });
  
  captureMessage(`Security Incident: ${incident.type}`, severity);
};

// Performance monitoring
const reportPerformanceIssue = (metric, value, threshold) => {
  if (value > threshold) {
    setTag('performance_issue', true);
    setContext('performance', {
      metric,
      value,
      threshold,
      timestamp: new Date().toISOString()
    });
    
    captureMessage(`Performance Issue: ${metric} (${value}ms > ${threshold}ms)`, 'warning');
  }
};

// Database operation monitoring
const reportDatabaseError = (operation, error, query = null) => {
  setTag('database_error', true);
  setContext('database_operation', {
    operation,
    query: query ? query.substring(0, 500) : null,
    error_message: error.message,
    timestamp: new Date().toISOString()
  });
  
  reportError(error, { operation: 'database', type: operation });
};

// API endpoint monitoring
const reportAPIError = (endpoint, method, error, statusCode) => {
  setTag('api_error', true);
  setContext('api_request', {
    endpoint,
    method,
    status_code: statusCode,
    error_message: error.message,
    timestamp: new Date().toISOString()
  });
  
  reportError(error, { operation: 'api', endpoint, method });
};

// User authentication monitoring
const reportAuthEvent = (event_type, user, success, details = {}) => {
  setTag('auth_event', true);
  setTag('auth_success', success);
  
  if (user) {
    setUser({
      id: user.id,
      email: user.email
    });
  }
  
  setContext('authentication', {
    event_type,
    success,
    details,
    timestamp: new Date().toISOString()
  });
  
  const message = `Auth Event: ${event_type} - ${success ? 'Success' : 'Failed'}`;
  captureMessage(message, success ? 'info' : 'warning');
};

// File upload monitoring
const reportFileUploadEvent = (filename, size, user, success, error = null) => {
  setTag('file_upload', true);
  setUser({ id: user.id, email: user.email });
  
  setContext('file_upload', {
    filename,
    size,
    success,
    error_message: error?.message,
    timestamp: new Date().toISOString()
  });
  
  if (!success && error) {
    reportError(error, { operation: 'file_upload', filename, size });
  } else {
    captureMessage(`File Upload: ${filename} (${size} bytes)`, 'info');
  }
};

// Payment processing monitoring
const reportPaymentEvent = (transaction_id, amount, success, error = null, user = null) => {
  setTag('payment_event', true);
  
  if (user) {
    setUser({ id: user.id, email: user.email });
  }
  
  setContext('payment', {
    transaction_id,
    amount,
    success,
    error_message: error?.message,
    timestamp: new Date().toISOString()
  });
  
  if (!success && error) {
    reportError(error, { operation: 'payment', transaction_id, amount });
  } else {
    captureMessage(`Payment Processed: ${transaction_id} - $${amount}`, 'info');
  }
};

module.exports = {
  initSentry,
  reportError,
  reportSecurityIncident,
  reportPerformanceIssue,
  reportDatabaseError,
  reportAPIError,
  reportAuthEvent,
  reportFileUploadEvent,
  reportPaymentEvent
};