import { Router } from 'express';
import PaymentPortal from '../utils/PaymentPortal';
import { param, body } from 'express-validator';
import { validation } from '../../middleware/validation';

const router = Router();

// Portal validation rules
const paymentValidation = [
  body('paymentMethodId').notEmpty().withMessage('Payment method is required'),
  body('billingDetails').optional().isObject()
];

const quoteActionValidation = [
  body('reason').optional().isString(),
  body('customerDetails').optional().isObject(),
  body('convertToInvoice').optional().isBoolean(),
  body('dueDate').optional().isISO8601().withMessage('Valid due date is required')
];

// Public routes (no authentication required)

// Invoice portal routes
router.get('/invoice/:invoiceId', 
  param('invoiceId').isMongoId().withMessage('Valid invoice ID is required'),
  validation,
  PaymentPortal.getPublicInvoice
);

router.get('/invoice/:invoiceId/pay', 
  param('invoiceId').isMongoId().withMessage('Valid invoice ID is required'),
  validation,
  PaymentPortal.showPaymentForm
);

router.post('/invoice/:invoiceId/pay', 
  param('invoiceId').isMongoId().withMessage('Valid invoice ID is required'),
  paymentValidation,
  validation,
  PaymentPortal.processPortalPayment
);

router.get('/invoice/:invoiceId/pdf', 
  param('invoiceId').isMongoId().withMessage('Valid invoice ID is required'),
  validation,
  PaymentPortal.downloadInvoicePDF
);

// Quote portal routes
router.get('/quote/:quoteId', 
  param('quoteId').isMongoId().withMessage('Valid quote ID is required'),
  validation,
  PaymentPortal.getPublicQuote
);

router.post('/quote/:quoteId/accept', 
  param('quoteId').isMongoId().withMessage('Valid quote ID is required'),
  quoteActionValidation,
  validation,
  PaymentPortal.acceptPortalQuote
);

router.post('/quote/:quoteId/reject', 
  param('quoteId').isMongoId().withMessage('Valid quote ID is required'),
  body('reason').optional().isString(),
  validation,
  PaymentPortal.rejectPortalQuote
);

router.get('/quote/:quoteId/pdf', 
  param('quoteId').isMongoId().withMessage('Valid quote ID is required'),
  validation,
  PaymentPortal.downloadQuotePDF
);

// Payment status routes
router.get('/payment/:paymentId/success', 
  param('paymentId').notEmpty().withMessage('Payment ID is required'),
  validation,
  PaymentPortal.showPaymentSuccess
);

router.get('/payment/:paymentId/failure', 
  param('paymentId').optional().isString(),
  validation,
  PaymentPortal.showPaymentFailure
);

// Customer dashboard (basic auth via email/reference)
router.get('/customer/:customerId/dashboard', 
  param('customerId').notEmpty().withMessage('Customer ID is required'),
  validation,
  PaymentPortal.showCustomerDashboard
);

// Stripe payment return URL
router.get('/payment/return', (req, res) => {
  const { payment_intent, payment_intent_client_secret, redirect_status } = req.query;
  
  if (redirect_status === 'succeeded') {
    res.redirect(`/payments/portal/payment/${payment_intent}/success`);
  } else {
    res.redirect(`/payments/portal/payment/${payment_intent}/failure?error=${redirect_status}`);
  }
});

export default router;