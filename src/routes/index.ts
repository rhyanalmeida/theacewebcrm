import { Router, Application } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import contactRoutes from './contacts';
import leadRoutes from './leads';
import paymentRoutes from '../payments/routes';
import paymentPortalRoutes from '../payments/routes/portal';
import { logger } from '../config/logger';

/**
 * Configure all API routes
 */
export const configureRoutes = (app: Application): void => {
  const apiRouter = Router();

  // API routes
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/users', userRoutes);
  apiRouter.use('/contacts', contactRoutes);
  apiRouter.use('/leads', leadRoutes);
  
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
        '/api/payments'
      ]
    });
  });

  // Mount API router
  app.use('/api', apiRouter);

  logger.info('API routes configured successfully');
};

export default configureRoutes;