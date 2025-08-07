import { Router } from 'express';
import SubscriptionController from '../controllers/SubscriptionController';
import { auth } from '../../middleware/auth';
import { validation } from '../../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();

// Subscription validation rules
const createSubscriptionValidation = [
  body('customerId').notEmpty().withMessage('Customer ID is required'),
  body('planId').notEmpty().withMessage('Plan ID is required'),
  body('paymentMethodId').optional().isString(),
  body('trialPeriodDays').optional().isInt({ min: 1 }).withMessage('Trial period must be positive'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('metadata').optional().isObject()
];

const updateSubscriptionValidation = [
  body('planId').optional().isString(),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('metadata').optional().isObject()
];

const cancelSubscriptionValidation = [
  body('immediately').optional().isBoolean(),
  body('reason').optional().isString()
];

const pauseSubscriptionValidation = [
  body('resumeDate').optional().isISO8601().withMessage('Valid resume date is required')
];

// Subscription routes
router.post('/', 
  auth, 
  createSubscriptionValidation, 
  validation, 
  SubscriptionController.createSubscription
);

router.get('/active', 
  query('customerId').optional().isString(),
  validation,
  SubscriptionController.getActiveSubscriptions
);

router.get('/expiring', 
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  validation,
  SubscriptionController.getExpiringSubscriptions
);

router.get('/metrics', 
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  validation,
  SubscriptionController.getSubscriptionMetrics
);

router.get('/customer/:customerId', 
  param('customerId').notEmpty().withMessage('Customer ID is required'),
  validation,
  SubscriptionController.getSubscriptionsByCustomer
);

router.get('/:subscriptionId', 
  param('subscriptionId').notEmpty().withMessage('Subscription ID is required'),
  validation,
  SubscriptionController.getSubscription
);

router.put('/:subscriptionId', 
  auth,
  param('subscriptionId').notEmpty().withMessage('Subscription ID is required'),
  updateSubscriptionValidation,
  validation,
  SubscriptionController.updateSubscription
);

router.post('/:subscriptionId/cancel', 
  auth,
  param('subscriptionId').notEmpty().withMessage('Subscription ID is required'),
  cancelSubscriptionValidation,
  validation,
  SubscriptionController.cancelSubscription
);

router.post('/:subscriptionId/pause', 
  auth,
  param('subscriptionId').notEmpty().withMessage('Subscription ID is required'),
  pauseSubscriptionValidation,
  validation,
  SubscriptionController.pauseSubscription
);

router.post('/:subscriptionId/resume', 
  auth,
  param('subscriptionId').notEmpty().withMessage('Subscription ID is required'),
  validation,
  SubscriptionController.resumeSubscription
);

router.post('/:subscriptionId/sync', 
  auth,
  param('subscriptionId').notEmpty().withMessage('Subscription ID is required'),
  validation,
  SubscriptionController.syncWithStripe
);

router.post('/:subscriptionId/proration', 
  auth,
  param('subscriptionId').notEmpty().withMessage('Subscription ID is required'),
  body('newPlanId').notEmpty().withMessage('New plan ID is required'),
  body('changeDate').optional().isISO8601().withMessage('Valid change date is required'),
  validation,
  SubscriptionController.calculateProration
);

// Webhook endpoint (no auth required)
router.post('/webhook', SubscriptionController.handleSubscriptionWebhook);

export default router;