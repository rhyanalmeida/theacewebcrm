import { Router } from 'express';
import {
  getDashboardStats,
  getSalesStats,
  getLeadStats,
  getProjectStats,
  getUserActivityStats,
  getRevenueStats,
  getConversionRates,
  getCustomReport
} from '../controllers/analyticsController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { catchAsync } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Dashboard stats
router.get('/dashboard',
  catchAsync(getDashboardStats)
);

// Sales analytics
router.get('/sales',
  validateRequest({ query: schemas.dateRange.query }),
  catchAsync(getSalesStats)
);

// Lead analytics
router.get('/leads',
  validateRequest({ query: schemas.dateRange.query }),
  catchAsync(getLeadStats)
);

// Project analytics
router.get('/projects',
  validateRequest({ query: schemas.dateRange.query }),
  catchAsync(getProjectStats)
);

// Revenue analytics
router.get('/revenue',
  validateRequest({ query: schemas.dateRange.query }),
  catchAsync(getRevenueStats)
);

// Conversion rates
router.get('/conversion-rates',
  validateRequest({ query: schemas.dateRange.query }),
  catchAsync(getConversionRates)
);

// User activity stats (admin/manager only)
router.get('/user-activity',
  authorizeRoles('admin', 'manager'),
  validateRequest({ query: schemas.dateRange.query }),
  catchAsync(getUserActivityStats)
);

// Custom reports (admin/manager only)
router.post('/reports/custom',
  authorizeRoles('admin', 'manager'),
  validateRequest({ body: schemas.customReport.body }),
  catchAsync(getCustomReport)
);

export default router;