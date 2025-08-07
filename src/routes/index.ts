import { Router, Application } from 'express';
import authRoutes from './auth';
// import userRoutes from './users'; // TODO: Fix validation schemas
import contactRoutes from './contacts';
import leadRoutes from './leads';
import companyRoutes from './companies';
import dealRoutes from './deals';
import projectRoutes from './projects';
import fileRoutes from './files';
import emailRoutes from './email';
import analyticsRoutes from './analytics';
import paymentRoutes from '../payments/routes';
import paymentPortalRoutes from '../payments/routes/portal';
import { logger } from '../config/logger';

/**
 * Configure all API routes
 */
export const configureRoutes = (app: Application): void => {
  const apiRouter = Router();

  // Health check
  apiRouter.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  });

  // API routes
  apiRouter.use('/auth', authRoutes);
  // apiRouter.use('/users', userRoutes); // TODO: Fix validation schemas
  apiRouter.use('/contacts', contactRoutes);
  apiRouter.use('/leads', leadRoutes);
  apiRouter.use('/companies', companyRoutes);
  apiRouter.use('/deals', dealRoutes);
  apiRouter.use('/projects', projectRoutes);
  apiRouter.use('/files', fileRoutes);
  apiRouter.use('/email', emailRoutes);
  apiRouter.use('/analytics', analyticsRoutes);
  
  // Payment system routes
  apiRouter.use('/payments', paymentRoutes);
  apiRouter.use('/payments/portal', paymentPortalRoutes);

  // API status endpoint
  apiRouter.get('/', (req, res) => {
    res.json({
      message: 'ACE CRM API v1.0.0',
      status: 'Active',
      timestamp: new Date().toISOString(),
      endpoints: [
        '/api/auth',
        '/api/users', 
        '/api/contacts',
        '/api/leads',
        '/api/deals',
        '/api/companies',
        '/api/projects',
        '/api/files',
        '/api/email',
        '/api/analytics',
        '/api/payments'
      ]
    });
  });

  // Mount API router
  app.use('/api', apiRouter);

  logger.info('API routes configured successfully');
};

export default configureRoutes;