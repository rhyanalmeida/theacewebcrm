import { Router } from 'express';
import {
  createPaymentIntent,
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
  getPayments,
  getPayment,
  processRefund,
  getPaymentStats,
  handleStripeWebhook
} from '../controllers/paymentController';
import { authenticateToken, authenticateApiKey } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { catchAsync } from '../middleware/errorHandler';

const router = Router();

// Stripe webhook (no auth required, handled by webhook validation)
router.post('/webhook/stripe', 
  catchAsync(handleStripeWebhook)
);

// All other routes require authentication
router.use(authenticateToken);

// Payment Intent routes
router.post('/payment-intent',
  validateRequest(schemas.createPaymentIntent),
  catchAsync(createPaymentIntent)
);

// Invoice routes
router.get('/invoices/stats', catchAsync(getPaymentStats));

router.get('/invoices', 
  validateRequest({ query: schemas.pagination.query }),
  catchAsync(getInvoices)
);

router.post('/invoices',
  validateRequest(schemas.createInvoice),
  catchAsync(createInvoice)
);

router.get('/invoices/:id',
  validateRequest(schemas.idParam),
  catchAsync(getInvoice)
);

router.put('/invoices/:id',
  validateRequest({ 
    ...schemas.updateInvoice,
    params: schemas.idParam.params 
  }),
  catchAsync(updateInvoice)
);

router.delete('/invoices/:id',
  validateRequest(schemas.idParam),
  catchAsync(deleteInvoice)
);

router.post('/invoices/:id/send',
  validateRequest(schemas.idParam),
  catchAsync(sendInvoice)
);

// Payment routes
router.get('/payments', 
  validateRequest({ query: schemas.pagination.query }),
  catchAsync(getPayments)
);

router.get('/payments/:id',
  validateRequest(schemas.idParam),
  catchAsync(getPayment)
);

router.post('/payments/:id/refund',
  validateRequest({
    params: schemas.idParam.params,
    body: schemas.processRefund.body
  }),
  catchAsync(processRefund)
);

export default router;