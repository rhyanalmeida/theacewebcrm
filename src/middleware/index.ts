import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from '../config';
import { logger, morganStream } from '../config/logger';
import { errorHandler, notFoundHandler } from './errorHandler';

/**
 * Configure security middleware
 */
export const configureSecurity = (app: Application): void => {
  // Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false
  }));

  // CORS configuration
  app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400 // 24 hours
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxRequests,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(config.rateLimitWindowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(config.rateLimitWindowMs / 1000)
      });
    }
  });

  app.use(limiter);

  // Trust proxy (for accurate IP addresses behind reverse proxy)
  app.set('trust proxy', 1);
};

/**
 * Configure parsing middleware
 */
export const configureParsing = (app: Application): void => {
  // Body parsing
  app.use(express.json({ 
    limit: '10mb',
    type: ['application/json', 'text/plain']
  }));
  
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
  }));

  // Compression
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));
};

/**
 * Configure logging middleware
 */
export const configureLogging = (app: Application): void => {
  // HTTP request logging
  if (config.nodeEnv === 'production') {
    app.use(morgan('combined', { stream: morganStream }));
  } else {
    app.use(morgan('dev', { stream: morganStream }));
  }

  // Custom request logging
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id || 'anonymous'
      };
      
      if (res.statusCode >= 400) {
        logger.warn('HTTP Error', logData);
      } else if (duration > 1000) {
        logger.warn('Slow Request', logData);
      } else {
        logger.info('HTTP Request', logData);
      }
    });
    
    next();
  });
};

/**
 * Configure health check endpoint
 */
export const configureHealthCheck = (app: Application): void => {
  app.get('/health', (req, res) => {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    };

    res.status(200).json(healthCheck);
  });

  // Readiness check
  app.get('/ready', (req, res) => {
    // Add database connectivity check here if needed
    res.status(200).json({ status: 'Ready', timestamp: new Date().toISOString() });
  });
};

/**
 * Configure API documentation endpoint
 */
export const configureApiDocs = (app: Application): void => {
  app.get('/api', (req, res) => {
    res.json({
      name: 'ACE CRM API',
      version: '1.0.0',
      description: 'Enterprise Web Design CRM System API',
      endpoints: {
        auth: {
          'POST /api/auth/register': 'Register new user',
          'POST /api/auth/login': 'User login',
          'POST /api/auth/refresh': 'Refresh access token',
          'POST /api/auth/logout': 'User logout',
          'GET /api/auth/profile': 'Get user profile',
          'PUT /api/auth/profile': 'Update user profile',
          'POST /api/auth/change-password': 'Change password'
        },
        users: {
          'GET /api/users': 'Get all users',
          'GET /api/users/:id': 'Get user by ID',
          'POST /api/users': 'Create user',
          'PUT /api/users/:id': 'Update user',
          'DELETE /api/users/:id': 'Delete user'
        },
        contacts: {
          'GET /api/contacts': 'Get all contacts',
          'GET /api/contacts/:id': 'Get contact by ID',
          'POST /api/contacts': 'Create contact',
          'PUT /api/contacts/:id': 'Update contact',
          'DELETE /api/contacts/:id': 'Delete contact'
        },
        leads: {
          'GET /api/leads': 'Get all leads',
          'GET /api/leads/:id': 'Get lead by ID',
          'POST /api/leads': 'Create lead',
          'PUT /api/leads/:id': 'Update lead',
          'DELETE /api/leads/:id': 'Delete lead',
          'POST /api/leads/:id/convert': 'Convert lead to deal'
        }
      },
      documentation: 'Visit /api/docs for detailed API documentation'
    });
  });
};

/**
 * Configure error handling
 */
export const configureErrorHandling = (app: Application): void => {
  // 404 handler
  app.use(notFoundHandler);
  
  // Global error handler
  app.use(errorHandler);
};

/**
 * Configure request context middleware
 */
export const configureRequestContext = (app: Application): void => {
  app.use((req, res, next) => {
    // Add request ID for tracing
    req.id = Math.random().toString(36).substring(2, 15);
    
    // Add timestamp
    req.timestamp = new Date().toISOString();
    
    // Set response headers
    res.setHeader('X-Request-ID', req.id);
    res.setHeader('X-Powered-By', 'ACE CRM API');
    
    next();
  });
};

/**
 * Apply all middleware to the application
 */
export const configureMiddleware = (app: Application): void => {
  // Request context (should be first)
  configureRequestContext(app);
  
  // Security
  configureSecurity(app);
  
  // Parsing
  configureParsing(app);
  
  // Logging
  configureLogging(app);
  
  // Health checks
  configureHealthCheck(app);
  
  // API documentation
  configureApiDocs(app);
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      id: string;
      timestamp: string;
      user?: any;
    }
  }
}

export default {
  configureSecurity,
  configureParsing,
  configureLogging,
  configureHealthCheck,
  configureApiDocs,
  configureErrorHandling,
  configureRequestContext,
  configureMiddleware
};