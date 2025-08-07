// Frontend Sentry Configuration for Next.js
import * as Sentry from '@sentry/nextjs';

// Initialize Sentry for frontend
export const initSentryFrontend = () => {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    debug: process.env.NODE_ENV === 'development',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
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
      
      // Filter out network errors for offline scenarios
      if (event.exception) {
        const error = hint.originalException;
        if (error && error.message) {
          if (error.message.includes('NetworkError') || 
              error.message.includes('fetch')) {
            return null;
          }
        }
      }
      
      return event;
    },
  });
  
  console.log('✅ Sentry frontend initialized');
};

// Frontend error reporting
export const reportFrontendError = (error, context = {}) => {
  Sentry.setContext('error_context', {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    ...context
  });
  
  Sentry.captureException(error);
};

// User interaction tracking
export const reportUserInteraction = (action, element, user = null) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email
    });
  }
  
  Sentry.addBreadcrumb({
    message: `User Interaction: ${action}`,
    category: 'ui',
    level: 'info',
    data: {
      element,
      timestamp: new Date().toISOString()
    }
  });
};

// Frontend performance monitoring
export const reportPerformanceMetric = (metric, value) => {
  Sentry.setContext('performance', {
    metric,
    value,
    timestamp: new Date().toISOString()
  });
  
  if (value > 3000) { // Report slow operations > 3 seconds
    Sentry.captureMessage(`Slow Performance: ${metric} took ${value}ms`, 'warning');
  }
};

// API request monitoring
export const reportAPICall = (endpoint, method, status, duration) => {
  Sentry.addBreadcrumb({
    message: `API Call: ${method} ${endpoint}`,
    category: 'http',
    level: status >= 400 ? 'error' : 'info',
    data: {
      endpoint,
      method,
      status_code: status,
      duration,
      timestamp: new Date().toISOString()
    }
  });
  
  if (status >= 400) {
    Sentry.captureMessage(`API Error: ${method} ${endpoint} returned ${status}`, 'error');
  }
};

// Authentication event tracking
export const reportAuthEvent = (eventType, success, error = null) => {
  Sentry.addBreadcrumb({
    message: `Auth Event: ${eventType}`,
    category: 'auth',
    level: success ? 'info' : 'error',
    data: {
      event_type: eventType,
      success,
      error_message: error?.message,
      timestamp: new Date().toISOString()
    }
  });
  
  if (!success && error) {
    reportFrontendError(error, { operation: 'authentication', event_type: eventType });
  }
};

// Form validation errors
export const reportFormError = (formName, field, error) => {
  Sentry.addBreadcrumb({
    message: `Form Validation Error: ${formName}`,
    category: 'validation',
    level: 'warning',
    data: {
      form: formName,
      field,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  });
};

// File upload progress and errors
export const reportFileUpload = (filename, progress, success, error = null) => {
  if (success) {
    Sentry.addBreadcrumb({
      message: `File Upload Success: ${filename}`,
      category: 'upload',
      level: 'info',
      data: {
        filename,
        progress,
        timestamp: new Date().toISOString()
      }
    });
  } else if (error) {
    reportFrontendError(error, { 
      operation: 'file_upload', 
      filename, 
      progress 
    });
  }
};

export default {
  initSentryFrontend,
  reportFrontendError,
  reportUserInteraction,
  reportPerformanceMetric,
  reportAPICall,
  reportAuthEvent,
  reportFormError,
  reportFileUpload
};