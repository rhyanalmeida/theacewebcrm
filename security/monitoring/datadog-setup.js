// DataDog Monitoring Setup for ACE CRM
const StatsD = require('hot-shots');
const tracer = require('dd-trace').init({
  service: 'ace-crm',
  env: process.env.NODE_ENV,
  version: process.env.npm_package_version || '1.0.0',
  logInjection: true,
  profiling: true,
  runtimeMetrics: true
});

// Initialize StatsD client
const statsD = new StatsD({
  host: process.env.DD_AGENT_HOST || 'localhost',
  port: process.env.DD_DOGSTATSD_PORT || 8125,
  prefix: 'acecrm.',
  tags: [
    `env:${process.env.NODE_ENV}`,
    `service:ace-crm`,
    `version:${process.env.npm_package_version || '1.0.0'}`
  ]
});

// Custom metrics tracking
class DataDogMetrics {
  static increment(metric, value = 1, tags = []) {
    statsD.increment(metric, value, tags);
  }

  static gauge(metric, value, tags = []) {
    statsD.gauge(metric, value, tags);
  }

  static histogram(metric, value, tags = []) {
    statsD.histogram(metric, value, tags);
  }

  static timing(metric, duration, tags = []) {
    statsD.timing(metric, duration, tags);
  }

  // Business metrics
  static trackUserLogin(success, method = 'password') {
    this.increment('user.login.attempts', 1, [`method:${method}`, `success:${success}`]);
  }

  static trackAPICall(endpoint, method, statusCode, duration) {
    const tags = [
      `endpoint:${endpoint}`,
      `method:${method}`,
      `status:${statusCode}`,
      `status_class:${Math.floor(statusCode / 100)}xx`
    ];
    
    this.increment('api.requests', 1, tags);
    this.timing('api.response_time', duration, tags);
  }

  static trackDatabaseQuery(operation, table, duration, success) {
    const tags = [
      `operation:${operation}`,
      `table:${table}`,
      `success:${success}`
    ];
    
    this.increment('database.queries', 1, tags);
    this.timing('database.query_time', duration, tags);
  }

  static trackPaymentTransaction(amount, success, method) {
    const tags = [`method:${method}`, `success:${success}`];
    
    this.increment('payment.transactions', 1, tags);
    if (success) {
      this.gauge('payment.amount', amount, tags);
    }
  }

  static trackFileUpload(size, success, type) {
    const tags = [`type:${type}`, `success:${success}`];
    
    this.increment('file.uploads', 1, tags);
    if (success) {
      this.gauge('file.size', size, tags);
    }
  }

  static trackCacheHit(key, hit) {
    this.increment('cache.requests', 1, [`key:${key}`, `hit:${hit}`]);
  }

  static trackEmailSent(template, success) {
    this.increment('email.sent', 1, [`template:${template}`, `success:${success}`]);
  }

  static trackSecurityEvent(eventType, severity) {
    this.increment('security.events', 1, [`type:${eventType}`, `severity:${severity}`]);
  }

  // Performance metrics
  static trackMemoryUsage() {
    const memUsage = process.memoryUsage();
    this.gauge('system.memory.used', memUsage.heapUsed);
    this.gauge('system.memory.total', memUsage.heapTotal);
    this.gauge('system.memory.external', memUsage.external);
  }

  static trackCPUUsage() {
    const cpuUsage = process.cpuUsage();
    this.gauge('system.cpu.user', cpuUsage.user);
    this.gauge('system.cpu.system', cpuUsage.system);
  }

  // Error tracking
  static trackError(error, context = {}) {
    const tags = [
      `error_type:${error.constructor.name}`,
      `severity:error`
    ];
    
    if (context.operation) {
      tags.push(`operation:${context.operation}`);
    }
    
    this.increment('errors.count', 1, tags);
  }
}

// Middleware for Express.js to automatically track requests
const dataDogMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const endpoint = req.route ? req.route.path : req.path;
    
    DataDogMetrics.trackAPICall(
      endpoint,
      req.method,
      res.statusCode,
      duration
    );
  });
  
  next();
};

// Database query tracking wrapper
const trackDatabaseQuery = (operation, table) => {
  return (target, propertyName, descriptor) => {
    const method = descriptor.value;
    
    descriptor.value = async function(...args) {
      const start = Date.now();
      let success = true;
      
      try {
        const result = await method.apply(this, args);
        return result;
      } catch (error) {
        success = false;
        throw error;
      } finally {
        const duration = Date.now() - start;
        DataDogMetrics.trackDatabaseQuery(operation, table, duration, success);
      }
    };
    
    return descriptor;
  };
};

// System metrics collection interval
const startMetricsCollection = () => {
  setInterval(() => {
    DataDogMetrics.trackMemoryUsage();
    DataDogMetrics.trackCPUUsage();
  }, 30000); // Every 30 seconds
};

// Log custom events
const logCustomEvent = (title, text, tags = []) => {
  const event = {
    title,
    text,
    date_happened: Math.floor(Date.now() / 1000),
    hostname: require('os').hostname(),
    tags: [
      ...tags,
      `env:${process.env.NODE_ENV}`,
      `service:ace-crm`
    ]
  };
  
  // Send event to DataDog (would require DataDog API)
  console.log('DataDog Event:', event);
};

// Health check metrics
const healthCheck = {
  async database() {
    const start = Date.now();
    try {
      // Implement your database health check here
      const duration = Date.now() - start;
      DataDogMetrics.timing('health.database', duration, ['status:healthy']);
      return true;
    } catch (error) {
      const duration = Date.now() - start;
      DataDogMetrics.timing('health.database', duration, ['status:unhealthy']);
      return false;
    }
  },

  async cache() {
    const start = Date.now();
    try {
      // Implement your cache health check here
      const duration = Date.now() - start;
      DataDogMetrics.timing('health.cache', duration, ['status:healthy']);
      return true;
    } catch (error) {
      const duration = Date.now() - start;
      DataDogMetrics.timing('health.cache', duration, ['status:unhealthy']);
      return false;
    }
  },

  async external() {
    const start = Date.now();
    try {
      // Check external services (Supabase, Stripe, etc.)
      const duration = Date.now() - start;
      DataDogMetrics.timing('health.external', duration, ['status:healthy']);
      return true;
    } catch (error) {
      const duration = Date.now() - start;
      DataDogMetrics.timing('health.external', duration, ['status:unhealthy']);
      return false;
    }
  }
};

// Run health checks periodically
const startHealthChecks = () => {
  setInterval(async () => {
    const dbHealth = await healthCheck.database();
    const cacheHealth = await healthCheck.cache();
    const externalHealth = await healthCheck.external();
    
    DataDogMetrics.gauge('health.database', dbHealth ? 1 : 0);
    DataDogMetrics.gauge('health.cache', cacheHealth ? 1 : 0);
    DataDogMetrics.gauge('health.external', externalHealth ? 1 : 0);
    
    const overallHealth = dbHealth && cacheHealth && externalHealth ? 1 : 0;
    DataDogMetrics.gauge('health.overall', overallHealth);
  }, 60000); // Every minute
};

module.exports = {
  tracer,
  DataDogMetrics,
  dataDogMiddleware,
  trackDatabaseQuery,
  startMetricsCollection,
  startHealthChecks,
  logCustomEvent,
  healthCheck
};