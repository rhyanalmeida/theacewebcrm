// Comprehensive Security Headers Configuration for ACE CRM
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Security headers middleware configuration
const securityHeadersConfig = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Next.js
        "'unsafe-eval'", // Required for development
        "https://js.stripe.com",
        "https://checkout.stripe.com",
        "https://maps.googleapis.com",
        "https://www.google-analytics.com",
        "https://www.googletagmanager.com",
        "https://*.supabase.co"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled-components and inline styles
        "https://fonts.googleapis.com",
        "https://*.supabase.co"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:",
        "https://*.supabase.co",
        "https://*.stripe.com",
        "https://www.google-analytics.com",
        "https://maps.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "data:",
        "https://fonts.gstatic.com",
        "https://*.supabase.co"
      ],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://www.google-analytics.com",
        "https://vitals.vercel-insights.com"
      ],
      frameSrc: [
        "https://js.stripe.com",
        "https://checkout.stripe.com",
        "https://www.google.com" // For reCAPTCHA if needed
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
    reportOnly: process.env.NODE_ENV === 'development'
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // X-Frame-Options
  frameguard: {
    action: 'sameorigin'
  },

  // X-Content-Type-Options
  noSniff: true,

  // X-XSS-Protection
  xssFilter: true,

  // Referrer Policy
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin"
  },

  // Permissions Policy (formerly Feature Policy)
  permissionsPolicy: {
    features: {
      accelerometer: ["'none'"],
      camera: ["'self'"],
      geolocation: ["'none'"],
      gyroscope: ["'none'"],
      magnetometer: ["'none'"],
      microphone: ["'self'"],
      payment: ["'self'"],
      usb: ["'none'"]
    }
  }
};

// Rate limiting configurations
const rateLimitConfigs = {
  // General API rate limit
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  }),

  // Strict rate limit for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: {
      error: 'Too many authentication attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    },
    skipSuccessfulRequests: true // Don't count successful requests
  }),

  // Password reset rate limit
  passwordReset: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 password reset requests per hour
    message: {
      error: 'Too many password reset attempts, please try again later.',
      code: 'PASSWORD_RESET_LIMIT_EXCEEDED',
      retryAfter: '1 hour'
    }
  }),

  // File upload rate limit
  fileUpload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // limit each IP to 50 file uploads per hour
    message: {
      error: 'Too many file uploads, please try again later.',
      code: 'FILE_UPLOAD_LIMIT_EXCEEDED',
      retryAfter: '1 hour'
    }
  }),

  // Contact form rate limit
  contact: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 contact form submissions per hour
    message: {
      error: 'Too many contact form submissions, please try again later.',
      code: 'CONTACT_LIMIT_EXCEEDED',
      retryAfter: '1 hour'
    }
  })
};

// Slow down configurations (progressive delays)
const slowDownConfigs = {
  api: slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 500, // allow 500 requests per 15 minutes at full speed
    delayMs: 500, // add 500ms delay per request after delayAfter
    maxDelayMs: 5000, // max delay of 5 seconds
  }),

  auth: slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 5, // allow 5 requests per 15 minutes at full speed
    delayMs: 1000, // add 1s delay per request after delayAfter
    maxDelayMs: 10000, // max delay of 10 seconds
  })
};

// Security middleware factory
const createSecurityMiddleware = (options = {}) => {
  const middlewares = [];

  // Apply Helmet with security headers
  middlewares.push(helmet({
    ...securityHeadersConfig,
    ...options.helmet
  }));

  // Apply rate limiting based on route
  if (options.rateLimit) {
    const limitConfig = rateLimitConfigs[options.rateLimit] || rateLimitConfigs.api;
    middlewares.push(limitConfig);
  }

  // Apply slow down based on route
  if (options.slowDown) {
    const slowConfig = slowDownConfigs[options.slowDown] || slowDownConfigs.api;
    middlewares.push(slowConfig);
  }

  return middlewares;
};

// Additional security middleware
const additionalSecurityMiddleware = {
  // Remove powered-by header
  removePoweredBy: (req, res, next) => {
    res.removeHeader('X-Powered-By');
    next();
  },

  // Add security headers manually if needed
  customHeaders: (req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add HSTS header for HTTPS
    if (req.secure || req.get('X-Forwarded-Proto') === 'https') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }
    
    next();
  },

  // Validate request size
  requestSizeLimit: (maxSize = '10mb') => {
    return (req, res, next) => {
      const contentLength = parseInt(req.get('content-length') || '0', 10);
      const maxBytes = parseSize(maxSize);
      
      if (contentLength > maxBytes) {
        return res.status(413).json({
          error: 'Request too large',
          code: 'REQUEST_TOO_LARGE',
          maxSize
        });
      }
      
      next();
    };
  },

  // Validate content type
  contentTypeValidation: (allowedTypes = ['application/json']) => {
    return (req, res, next) => {
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const contentType = req.get('content-type') || '';
        const isValid = allowedTypes.some(type => 
          contentType.toLowerCase().includes(type.toLowerCase())
        );
        
        if (!isValid) {
          return res.status(415).json({
            error: 'Unsupported Media Type',
            code: 'UNSUPPORTED_MEDIA_TYPE',
            allowedTypes
          });
        }
      }
      
      next();
    };
  },

  // IP whitelist/blacklist
  ipFilter: (options = {}) => {
    const { whitelist = [], blacklist = [] } = options;
    
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // Check blacklist
      if (blacklist.includes(clientIP)) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'IP_BLOCKED'
        });
      }
      
      // Check whitelist (if specified)
      if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'IP_NOT_WHITELISTED'
        });
      }
      
      next();
    };
  }
};

// Helper function to parse size strings
const parseSize = (size) => {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * units[unit]);
};

// Export configurations and middleware
module.exports = {
  securityHeadersConfig,
  rateLimitConfigs,
  slowDownConfigs,
  createSecurityMiddleware,
  additionalSecurityMiddleware,
  
  // Pre-configured middleware sets
  apiSecurity: createSecurityMiddleware({ 
    rateLimit: 'api', 
    slowDown: 'api' 
  }),
  
  authSecurity: createSecurityMiddleware({ 
    rateLimit: 'auth', 
    slowDown: 'auth' 
  }),
  
  fileUploadSecurity: createSecurityMiddleware({ 
    rateLimit: 'fileUpload' 
  }),
  
  contactSecurity: createSecurityMiddleware({ 
    rateLimit: 'contact' 
  })
};