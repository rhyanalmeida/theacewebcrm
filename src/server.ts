import express from 'express';
import { createServer } from 'http';
import config from './config';
import { logger } from './config/logger';
import DatabaseConfig from './config/database';
import { configureMiddleware, configureErrorHandling } from './middleware';
import { configureRoutes } from './routes';
import { handleUncaughtException } from './middleware/errorHandler';

/**
 * Create and configure Express application
 */
const createApp = (): express.Application => {
  const app = express();

  // Configure middleware
  configureMiddleware(app);

  // Configure routes
  configureRoutes(app);

  // Configure error handling (must be last)
  configureErrorHandling(app);

  return app;
};

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Handle uncaught exceptions
    handleUncaughtException();

    // Connect to database
    logger.info('Connecting to database...');
    await DatabaseConfig.connect();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const server = createServer(app);

    // Start listening
    server.listen(config.port, () => {
      logger.info(`🚀 Server started successfully!`);
      logger.info(`📍 Environment: ${config.nodeEnv}`);
      logger.info(`🌐 Server running on port ${config.port}`);
      logger.info(`📊 Health check: http://localhost:${config.port}/health`);
      logger.info(`🔗 API endpoints: http://localhost:${config.port}/api`);
      
      if (config.nodeEnv === 'development') {
        logger.info(`📖 API Documentation: http://localhost:${config.port}/api`);
      }
    });

    // Handle server shutdown gracefully
    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async (error) => {
        if (error) {
          logger.error('Error during server shutdown:', error);
          process.exit(1);
        }
        
        try {
          // Close database connection
          await DatabaseConfig.disconnect();
          logger.info('Database connection closed.');
          
          logger.info('Graceful shutdown completed.');
          process.exit(0);
        } catch (dbError) {
          logger.error('Error closing database connection:', dbError);
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`);
        process.exit(1);
      } else {
        logger.error('Server error:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { createApp, startServer };
export default createApp;