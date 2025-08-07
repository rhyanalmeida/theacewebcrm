import { Router } from 'express';
import invoiceRoutes from './invoices';
import paymentRoutes from './payments';
import quoteRoutes from './quotes';
import subscriptionRoutes from './subscriptions';

const router = Router();

// Mount all payment routes
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/quotes', quoteRoutes);
router.use('/subscriptions', subscriptionRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Payment system is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;