// New Relic Monitoring Setup for ACE CRM
const newrelic = require('newrelic');

// Custom New Relic metrics and events
class NewRelicMetrics {
  
  // Record custom metrics
  static recordMetric(name, value, unit = 'count') {
    try {
      newrelic.recordMetric(`Custom/${name}`, value);
    } catch (error) {
      console.error('Failed to record New Relic metric:', error);
    }
  }

  // Record custom events
  static recordEvent(eventType, attributes = {}) {
    try {
      newrelic.recordCustomEvent(eventType, {
        timestamp: Date.now(),
        service: 'ace-crm',
        environment: process.env.NODE_ENV,
        ...attributes
      });
    } catch (error) {
      console.error('Failed to record New Relic event:', error);
    }
  }

  // Business transaction tracking
  static trackUserAction(action, userId, success, metadata = {}) {
    this.recordEvent('UserAction', {
      action,
      userId,
      success,
      ...metadata
    });
    
    this.recordMetric(`UserAction/${action}`, 1);
    if (success) {
      this.recordMetric(`UserAction/${action}/Success`, 1);
    } else {
      this.recordMetric(`UserAction/${action}/Failure`, 1);
    }
  }

  // Payment transaction tracking
  static trackPayment(transactionId, amount, method, success) {
    this.recordEvent('PaymentTransaction', {
      transactionId,
      amount,
      method,
      success
    });
    
    this.recordMetric('Payment/Transactions', 1);
    if (success) {
      this.recordMetric('Payment/Success', 1);
      this.recordMetric('Payment/Amount', amount);
    } else {
      this.recordMetric('Payment/Failure', 1);
    }
  }

  // API performance tracking
  static trackAPIPerformance(endpoint, method, duration, statusCode) {
    this.recordEvent('APIPerformance', {
      endpoint,
      method,
      duration,
      statusCode,
      statusClass: Math.floor(statusCode / 100) + 'xx'
    });
    
    this.recordMetric(`API/${endpoint}/ResponseTime`, duration);
    this.recordMetric(`API/${endpoint}/Requests`, 1);
    
    if (statusCode >= 400) {
      this.recordMetric(`API/${endpoint}/Errors`, 1);
    }
  }

  // Database performance tracking
  static trackDatabaseQuery(query, duration, rowCount, success) {
    this.recordEvent('DatabaseQuery', {
      queryType: this.extractQueryType(query),
      duration,
      rowCount,
      success
    });
    
    this.recordMetric('Database/Queries', 1);
    this.recordMetric('Database/QueryTime', duration);
    
    if (success) {
      this.recordMetric('Database/RowsAffected', rowCount);
    } else {
      this.recordMetric('Database/Errors', 1);
    }
  }

  // Cache performance tracking
  static trackCacheOperation(operation, key, hit, duration) {
    this.recordEvent('CacheOperation', {
      operation,
      key: this.sanitizeKey(key),
      hit,
      duration
    });
    
    this.recordMetric(`Cache/${operation}`, 1);
    if (hit) {
      this.recordMetric('Cache/Hits', 1);
    } else {
      this.recordMetric('Cache/Misses', 1);
    }
  }

  // File upload tracking
  static trackFileUpload(filename, size, type, success, duration) {
    this.recordEvent('FileUpload', {
      filename: this.sanitizeFilename(filename),
      size,
      type,
      success,
      duration
    });
    
    this.recordMetric('FileUpload/Attempts', 1);
    if (success) {
      this.recordMetric('FileUpload/Success', 1);
      this.recordMetric('FileUpload/Size', size);
    } else {
      this.recordMetric('FileUpload/Failure', 1);
    }
  }

  // Security event tracking
  static trackSecurityEvent(eventType, severity, details = {}) {
    this.recordEvent('SecurityEvent', {
      eventType,
      severity,
      ...details
    });
    
    this.recordMetric(`Security/${eventType}`, 1);
    this.recordMetric(`Security/Events`, 1);
  }

  // Email tracking
  static trackEmailEvent(template, recipient, success, bounced = false) {
    this.recordEvent('EmailEvent', {
      template,
      recipient: this.sanitizeEmail(recipient),
      success,
      bounced
    });
    
    this.recordMetric(`Email/${template}`, 1);
    if (success && !bounced) {
      this.recordMetric('Email/Delivered', 1);
    } else if (bounced) {
      this.recordMetric('Email/Bounced', 1);
    } else {
      this.recordMetric('Email/Failed', 1);
    }
  }

  // System resource tracking
  static trackSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.recordMetric('System/Memory/HeapUsed', memUsage.heapUsed);
    this.recordMetric('System/Memory/HeapTotal', memUsage.heapTotal);
    this.recordMetric('System/Memory/External', memUsage.external);
    this.recordMetric('System/Memory/RSS', memUsage.rss);
    
    this.recordMetric('System/CPU/User', cpuUsage.user);
    this.recordMetric('System/CPU/System', cpuUsage.system);
  }

  // Helper methods
  static extractQueryType(query) {
    const match = query.trim().match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i);
    return match ? match[1].toUpperCase() : 'UNKNOWN';
  }

  static sanitizeKey(key) {
    return key.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  static sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?*]/g, '');
  }

  static sanitizeEmail(email) {
    // Return domain only for privacy
    const domain = email.split('@')[1];
    return domain || 'unknown';
  }
}

// Express middleware for automatic transaction tracking
const newRelicMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Set transaction name
  const transactionName = `${req.method} ${req.route ? req.route.path : req.path}`;
  newrelic.setTransactionName('web', transactionName);
  
  // Add custom attributes
  newrelic.addCustomAttributes({
    httpMethod: req.method,
    httpUrl: req.url,
    httpUserAgent: req.get('User-Agent'),
    httpReferer: req.get('Referer')
  });
  
  // Track response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    NewRelicMetrics.trackAPIPerformance(
      req.route ? req.route.path : req.path,
      req.method,
      duration,
      res.statusCode
    );
  });
  
  next();
};

// Database query wrapper with New Relic tracking
const trackDatabaseQuery = (queryText) => {
  return (target, propertyName, descriptor) => {
    const method = descriptor.value;
    
    descriptor.value = async function(...args) {
      const startTime = Date.now();
      let success = true;
      let rowCount = 0;
      
      try {
        const result = await method.apply(this, args);
        rowCount = Array.isArray(result) ? result.length : (result?.rowCount || 0);
        return result;
      } catch (error) {
        success = false;
        newrelic.noticeError(error, {
          query: queryText,
          operation: 'database'
        });
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        NewRelicMetrics.trackDatabaseQuery(queryText, duration, rowCount, success);
      }
    };
    
    return descriptor;
  };
};

// Error handler with New Relic integration
const errorHandler = (error, req, res, next) => {
  // Report error to New Relic
  newrelic.noticeError(error, {
    httpMethod: req.method,
    httpUrl: req.url,
    httpStatusCode: res.statusCode,
    userAgent: req.get('User-Agent')
  });
  
  // Record custom error metric
  NewRelicMetrics.recordEvent('Error', {
    message: error.message,
    stack: error.stack,
    httpMethod: req.method,
    httpUrl: req.url,
    statusCode: res.statusCode
  });
  
  next(error);
};

// Background job tracking
const trackBackgroundJob = (jobName, jobData = {}) => {
  return newrelic.createBackgroundTransaction(jobName, () => {
    const startTime = Date.now();
    
    return {
      finish: (success, result = {}) => {
        const duration = Date.now() - startTime;
        
        NewRelicMetrics.recordEvent('BackgroundJob', {
          jobName,
          success,
          duration,
          ...jobData,
          ...result
        });
        
        NewRelicMetrics.recordMetric(`BackgroundJob/${jobName}`, 1);
        NewRelicMetrics.recordMetric(`BackgroundJob/${jobName}/Duration`, duration);
        
        if (success) {
          NewRelicMetrics.recordMetric(`BackgroundJob/${jobName}/Success`, 1);
        } else {
          NewRelicMetrics.recordMetric(`BackgroundJob/${jobName}/Failure`, 1);
        }
      }
    };
  });
};

// System metrics collection
const startSystemMetricsCollection = () => {
  setInterval(() => {
    NewRelicMetrics.trackSystemMetrics();
  }, 60000); // Every minute
};

// Initialize New Relic monitoring
const initializeNewRelic = () => {
  console.log('✅ New Relic monitoring initialized');
  
  // Start system metrics collection
  startSystemMetricsCollection();
  
  // Set application info
  newrelic.addCustomAttributes({
    serviceName: 'ace-crm',
    serviceVersion: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV
  });
  
  return {
    NewRelicMetrics,
    newRelicMiddleware,
    trackDatabaseQuery,
    errorHandler,
    trackBackgroundJob
  };
};

module.exports = {
  initializeNewRelic,
  NewRelicMetrics,
  newRelicMiddleware,
  trackDatabaseQuery,
  errorHandler,
  trackBackgroundJob,
  startSystemMetricsCollection
};