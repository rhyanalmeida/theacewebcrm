import { Request, Response } from 'express';
import { PaymentService } from '../services';
import { CreatePaymentRequest, PaymentStatus } from '../types';
import { AuthRequest } from '../../types';
import { logger } from '../../config/logger';

export class PaymentController {
  async processPayment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data: CreatePaymentRequest = req.body;
      const createdBy = req.user?._id?.toString() || 'system';

      const payment = await PaymentService.processPayment(data, createdBy);

      res.status(201).json({
        success: true,
        message: 'Payment processed successfully',
        data: payment
      });
    } catch (error) {
      logger.error('Process payment error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async getPayment(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const payment = await PaymentService.getPayment(paymentId);

      if (!payment) {
        res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
        return;
      }

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      logger.error('Get payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async getPaymentsByInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { invoiceId } = req.params;
      const payments = await PaymentService.getPaymentsByInvoice(invoiceId);

      res.json({
        success: true,
        data: payments
      });
    } catch (error) {
      logger.error('Get payments by invoice error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async getPaymentsByCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const {
        status,
        startDate,
        endDate,
        page,
        limit
      } = req.query;

      const filters = {
        status: status as PaymentStatus,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      };

      const result = await PaymentService.getPaymentsByCustomer(customerId, filters);

      res.json({
        success: true,
        data: result.payments,
        meta: {
          page: result.page,
          limit: filters.limit || 20,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      logger.error('Get payments by customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async refundPayment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { amount, reason, metadata } = req.body;
      const createdBy = req.user?._id?.toString() || 'system';

      const refundData = {
        amount: amount ? parseFloat(amount) : undefined,
        reason,
        metadata
      };

      const payment = await PaymentService.refundPayment(paymentId, refundData, createdBy);

      res.json({
        success: true,
        message: 'Payment refunded successfully',
        data: payment
      });
    } catch (error) {
      logger.error('Refund payment error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async cancelPayment(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;

      const payment = await PaymentService.cancelPayment(paymentId, reason);

      res.json({
        success: true,
        message: 'Payment cancelled successfully',
        data: payment
      });
    } catch (error) {
      logger.error('Cancel payment error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async updatePaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { status, metadata } = req.body;

      const payment = await PaymentService.updatePaymentStatus(paymentId, status, metadata);

      if (!payment) {
        res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Payment status updated successfully',
        data: payment
      });
    } catch (error) {
      logger.error('Update payment status error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async getPaymentMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { customerId, startDate, endDate } = req.query;

      const filters = {
        customerId: customerId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      };

      const metrics = await PaymentService.getPaymentMetrics(filters);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Get payment metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async getRevenueReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
        return;
      }

      const report = await PaymentService.getRevenueReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Get revenue report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async getPaymentsByMethod(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const report = await PaymentService.getPaymentsByMethod(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Get payments by method error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  // Webhook handler for Stripe payments
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const payload = req.body;

      // This would integrate with StripeService to handle webhooks
      // Implementation depends on specific webhook events you want to handle

      logger.info('Payment webhook received', { 
        signature: signature?.substring(0, 10) + '...',
        hasPayload: !!payload
      });

      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Payment webhook error:', error);
      res.status(400).json({
        success: false,
        message: 'Webhook processing failed'
      });
    }
  }

  async createPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      const { amount, currency, customerId, paymentMethodId, description, metadata } = req.body;

      // This would create a Stripe Payment Intent
      // Implementation would call StripeService.createPaymentIntent

      logger.info('Create payment intent request', { amount, currency, customerId });

      res.status(201).json({
        success: true,
        message: 'Payment intent created',
        data: {
          // clientSecret would be returned for frontend
          // paymentIntentId would be stored
        }
      });
    } catch (error) {
      logger.error('Create payment intent error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async confirmPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      const { paymentIntentId } = req.params;
      const { paymentMethodId } = req.body;

      // This would confirm a Stripe Payment Intent
      // Implementation would call StripeService.confirmPaymentIntent

      logger.info('Confirm payment intent request', { paymentIntentId });

      res.json({
        success: true,
        message: 'Payment intent confirmed',
        data: {
          // Payment intent status and details
        }
      });
    } catch (error) {
      logger.error('Confirm payment intent error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }
}

export default new PaymentController();