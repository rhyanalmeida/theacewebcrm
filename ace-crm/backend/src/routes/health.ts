import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {}
    };

    // Check database connectivity (Supabase)
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        const { error } = await supabase
          .from('users')
          .select('count')
          .limit(1);
        
        health.checks.database = {
          status: error ? 'unhealthy' : 'healthy',
          responseTime: Date.now() - startTime,
          error: error?.message
        };
      } else {
        health.checks.database = {
          status: 'not_configured',
          message: 'Supabase credentials not provided'
        };
      }
    } catch (dbError) {
      health.checks.database = {
        status: 'unhealthy',
        error: dbError instanceof Error ? dbError.message : 'Database connection failed',
        responseTime: Date.now() - startTime
      };
    }

    // Check Redis connectivity (if configured)
    try {
      if (process.env.REDIS_URL) {
        // Redis check would go here if implemented
        health.checks.redis = {
          status: 'not_implemented',
          message: 'Redis health check not implemented'
        };
      } else {
        health.checks.redis = {
          status: 'not_configured',
          message: 'Redis not configured'
        };
      }
    } catch (redisError) {
      health.checks.redis = {
        status: 'unhealthy',
        error: redisError instanceof Error ? redisError.message : 'Redis connection failed'
      };
    }

    // Check external service connectivity (Stripe)
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        // Simple check - just verify the key format
        const keyFormat = process.env.STRIPE_SECRET_KEY.startsWith('sk_');
        health.checks.stripe = {
          status: keyFormat ? 'configured' : 'misconfigured',
          message: keyFormat ? 'Stripe key format valid' : 'Invalid Stripe key format'
        };
      } else {
        health.checks.stripe = {
          status: 'not_configured',
          message: 'Stripe not configured'
        };
      }
    } catch (stripeError) {
      health.checks.stripe = {
        status: 'unhealthy',
        error: stripeError instanceof Error ? stripeError.message : 'Stripe check failed'
      };
    }

    // Overall health status
    const unhealthyChecks = Object.values(health.checks).filter(
      (check: any) => check.status === 'unhealthy'
    );

    if (unhealthyChecks.length > 0) {
      health.status = 'degraded';
    }

    health.responseTime = Date.now() - startTime;

    res.status(health.status === 'healthy' ? 200 : 503).json(health);

  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown health check error',
      responseTime: Date.now() - startTime
    });
  }
});

// Detailed health check endpoint
router.get('/detailed', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        version: process.env.npm_package_version || '1.0.0'
      },
      services: {},
      metrics: {
        requestsTotal: 0, // Would be tracked in middleware
        requestsPerSecond: 0,
        averageResponseTime: 0
      }
    };

    // Enhanced database check
    if (process.env.SUPABASE_URL) {
      const dbStart = Date.now();
      try {
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );
        
        const { data, error } = await supabase
          .from('users')
          .select('count')
          .limit(1);
        
        detailedHealth.services.database = {
          status: error ? 'unhealthy' : 'healthy',
          responseTime: Date.now() - dbStart,
          url: process.env.SUPABASE_URL,
          error: error?.message,
          lastCheck: new Date().toISOString()
        };
      } catch (dbError) {
        detailedHealth.services.database = {
          status: 'unhealthy',
          responseTime: Date.now() - dbStart,
          error: dbError instanceof Error ? dbError.message : 'Database connection failed',
          lastCheck: new Date().toISOString()
        };
      }
    }

    detailedHealth.responseTime = Date.now() - startTime;

    res.json(detailedHealth);

  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Detailed health check failed',
      responseTime: Date.now() - startTime
    });
  }
});

// Readiness probe endpoint (for Kubernetes/Docker)
router.get('/ready', async (req, res) => {
  try {
    // Check if application is ready to serve requests
    let ready = true;
    const checks = [];

    // Check database connection
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        await supabase.from('users').select('count').limit(1);
        checks.push({ service: 'database', ready: true });
      } catch (error) {
        checks.push({ 
          service: 'database', 
          ready: false, 
          error: error instanceof Error ? error.message : 'Database not ready'
        });
        ready = false;
      }
    }

    // Check critical environment variables
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'JWT_SECRET'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        checks.push({
          service: `env_${envVar.toLowerCase()}`,
          ready: false,
          error: `${envVar} not configured`
        });
        ready = false;
      } else {
        checks.push({
          service: `env_${envVar.toLowerCase()}`,
          ready: true
        });
      }
    }

    res.status(ready ? 200 : 503).json({
      ready,
      timestamp: new Date().toISOString(),
      checks
    });

  } catch (error) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Readiness check failed'
    });
  }
});

// Liveness probe endpoint (for Kubernetes/Docker)
router.get('/live', (req, res) => {
  // Simple liveness check - if this endpoint responds, the app is alive
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid
  });
});

export default router;