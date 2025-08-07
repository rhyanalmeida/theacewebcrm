import { Router } from 'express';
import PaymentController from '../controllers/PaymentController';
import { auth } from '../../middleware/auth';
import { validation } from '../../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();

// Payment validation rules
const createPaymentValidation = [
  body('customerId').notEmpty().withMessage('Customer ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be positive'),
  body('paymentMethodId').notEmpty().withMessage('Payment method ID is required'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('invoiceId').optional().isMongoId().withMessage('Valid invoice ID is required'),
  body('description').optional().isString()
];

const refundPaymentValidation = [
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Refund amount must be positive'),
  body('reason').optional().isString(),
  body('metadata').optional().isObject()
];

const updatePaymentStatusValidation = [
  body('status').isIn(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'])
    .withMessage('Invalid payment status'),
  body('metadata').optional().isObject()
];

// Payment routes
router.post('/', 
  auth, 
  createPaymentValidation, 
  validation, 
  PaymentController.processPayment
);

router.get('/metrics', 
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  validation,
  PaymentController.getPaymentMetrics
);

router.get('/revenue-report', 
  query('startDate').notEmpty().isISO8601().withMessage('Valid start date is required'),
  query('endDate').notEmpty().isISO8601().withMessage('Valid end date is required'),
  validation,
  PaymentController.getRevenueReport
);

router.get('/by-method', 
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  validation,
  PaymentController.getPaymentsByMethod
);

router.get('/customer/:customerId', 
  param('customerId').notEmpty().withMessage('Customer ID is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validation,
  PaymentController.getPaymentsByCustomer
);

router.get('/invoice/:invoiceId', 
  param('invoiceId').isMongoId().withMessage('Valid invoice ID is required'),
  validation,
  PaymentController.getPaymentsByInvoice
);

router.get('/:paymentId', 
  param('paymentId').notEmpty().withMessage('Payment ID is required'),
  validation,
  PaymentController.getPayment
);

router.post('/:paymentId/refund', 
  auth,
  param('paymentId').notEmpty().withMessage('Payment ID is required'),
  refundPaymentValidation,
  validation,
  PaymentController.refundPayment
);

router.post('/:paymentId/cancel', 
  param('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('reason').optional().isString(),
  validation,
  PaymentController.cancelPayment
);

router.put('/:paymentId/status', 
  auth,
  param('paymentId').notEmpty().withMessage('Payment ID is required'),
  updatePaymentStatusValidation,
  validation,
  PaymentController.updatePaymentStatus
);

// Payment Intent routes (for Stripe integration)
router.post('/intent', 
  auth,
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('currency').notEmpty().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('customerId').notEmpty().withMessage('Customer ID is required'),
  validation,
  PaymentController.createPaymentIntent
);

router.post('/intent/:paymentIntentId/confirm', 
  auth,
  param('paymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
  body('paymentMethodId').optional().isString(),
  validation,
  PaymentController.confirmPaymentIntent
);

// Webhook endpoint (no auth required)
router.post('/webhook', PaymentController.handleWebhook);

export default router;