/**
 * Simplified server for THE ACE CRM API
 * Focuses on getting the core API working
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Load environment variables
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://hxcrjwrinexiyeyyyhfa.supabase.co"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://ace-crm.onrender.com',
        'https://www.acewebdesigners.com',
        'https://acewebdesigners.com'
      ]
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

// Body parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: 'supabase',
    api: 'ready'
  });
});

// API status endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'ACE CRM API v1.0.0',
    status: 'Active',
    timestamp: new Date().toISOString(),
    database: 'Supabase Connected',
    endpoints: [
      '/api/health - API Health Check',
      '/api/auth/* - Authentication endpoints (coming soon)',
      '/api/contacts/* - Contact management (coming soon)',
      '/api/leads/* - Lead management (coming soon)',
      '/api/deals/* - Deal management (coming soon)',
      '/api/companies/* - Company management (coming soon)',
      '/api/projects/* - Project management (coming soon)'
    ],
    note: 'Backend API is operational. Frontend integration in progress.'
  });
});

// Test Supabase connection endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    // Simple test - just check if we can import supabase
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        error: 'Supabase configuration missing',
        details: 'SUPABASE_URL or SUPABASE_ANON_KEY not configured'
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try a simple query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows, which is OK
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        details: error.message
      });
    }
    
    res.json({
      success: true,
      message: 'Database connection successful',
      database: 'Supabase',
      url: supabaseUrl,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database test failed',
      details: error.message
    });
  }
});

// Catch all other routes
app.get('/api/*', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Endpoint not implemented yet',
    endpoint: req.path,
    method: req.method,
    status: 'Coming soon - TypeScript backend in development'
  });
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log('🚀 ACE CRM API Server started successfully!');
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API status: http://localhost:${PORT}/api`);
  console.log(`🧪 Database test: http://localhost:${PORT}/api/test-db`);
  console.log('');
  console.log('✨ Backend API is operational and ready for frontend integration!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Test the health endpoint');
  console.log('  2. Test the database connection');
  console.log('  3. Frontend can now connect to the API');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

module.exports = app;