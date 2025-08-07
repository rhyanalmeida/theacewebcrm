import { Payment, Invoice, Refund } from '../models';
import { IPayment, CreatePaymentRequest, PaymentStatus, PaymentMethodType } from '../types';
import { logger } from '../../config/logger';
import StripeService from './StripeService';
import InvoiceService from './InvoiceService';

export class PaymentService {
  private static instance: PaymentService;

  private constructor() {}

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  async processPayment(data: CreatePaymentRequest, createdBy: string): Promise<IPayment> {
    try {
      // Generate payment ID
      const paymentId = await Payment.generatePaymentId();

      // Create payment record
      const paymentData = {
        paymentId,
        invoiceId: data.invoiceId,
        customerId: data.customerId,
        amount: data.amount,
        currency: data.currency || 'USD',
        status: PaymentStatus.PENDING,
        paymentMethod: PaymentMethodType.STRIPE,
        paymentMethodId: data.paymentMethodId,
        paymentDate: new Date(),
        description: data.description,
        metadata: data.metadata || {},
        createdBy,
        updatedBy: createdBy
      };

      const payment = new Payment(paymentData);
      await payment.save();

      try {
        // Process payment through Stripe
        const paymentIntent = await StripeService.createPaymentIntent({
          amount: data.amount,
          currency: data.currency || 'USD',
          customerId: data.customerId,
          paymentMethodId: data.paymentMethodId,
          description: data.description,
          metadata: {
            ...data.metadata,
            paymentId: payment.paymentId,
            invoiceId: data.invoiceId || ''
          },
          confirmImmediately: true
        });

        // Update payment with Stripe info
        payment.stripePaymentIntentId = paymentIntent.id;
        payment.status = this.mapStripeStatusToPaymentStatus(paymentIntent.status);
        payment.transactionId = paymentIntent.id;

        if (payment.status === PaymentStatus.COMPLETED) {
          payment.paymentDate = new Date();
          
          // Update invoice if payment is for an invoice
          if (data.invoiceId) {
            await InvoiceService.markAsPaid(data.invoiceId, data.amount);
          }
        } else if (payment.status === PaymentStatus.FAILED) {
          payment.failureReason = 'Payment failed during processing';
        }

        await payment.save();

        logger.info('Payment processed', {
          paymentId: payment.paymentId,
          stripePaymentIntentId: paymentIntent.id,
          status: payment.status,
          amount: data.amount
        });

        return payment;
      } catch (stripeError) {
        // Update payment status to failed
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = (stripeError as Error).message;
        await payment.save();

        logger.error('Stripe payment failed', {
          paymentId: payment.paymentId,
          error: stripeError
        });

        throw stripeError;
      }
    } catch (error) {
      logger.error('Failed to process payment', { error, data });
      throw error;
    }
  }

  async getPayment(paymentId: string): Promise<IPayment | null> {
    try {
      const payment = await Payment.findOne({ paymentId }).populate('refunds');
      return payment;
    } catch (error) {
      logger.error('Failed to get payment', { error, paymentId });
      throw error;
    }
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<IPayment[]> {
    try {
      const payments = await Payment.find({ invoiceId }).sort({ createdAt: -1 });
      return payments;
    } catch (error) {
      logger.error('Failed to get payments by invoice', { error, invoiceId });
      throw error;
    }
  }

  async getPaymentsByCustomer(customerId: string, filters?: {
    status?: PaymentStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ payments: IPayment[]; total: number; page: number; totalPages: number }> {
    try {
      const query: any = { customerId };
      
      if (filters?.status) query.status = filters.status;
      
      if (filters?.startDate || filters?.endDate) {
        query.paymentDate = {};
        if (filters.startDate) query.paymentDate.$gte = filters.startDate;
        if (filters.endDate) query.paymentDate.$lte = filters.endDate;
      }

      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const [payments, total] = await Promise.all([
        Payment.find(query)
          .sort({ paymentDate: -1 })
          .skip(skip)
          .limit(limit)
          .populate('refunds')
          .exec(),
        Payment.countDocuments(query)
      ]);

      return {
        payments,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Failed to get payments by customer', { error, customerId });
      throw error;
    }
  }

  async refundPayment(paymentId: string, data: {
    amount?: number;
    reason?: string;
    metadata?: Record<string, any>;
  }, createdBy: string): Promise<IPayment> {
    try {
      const payment = await Payment.findOne({ paymentId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new Error('Can only refund completed payments');
      }

      const refundAmount = data.amount || payment.amount;
      const totalRefunded = await this.getTotalRefundedAmount(paymentId);
      
      if (totalRefunded + refundAmount > payment.amount) {
        throw new Error('Refund amount exceeds payment amount');
      }

      // Generate refund ID
      const refundId = await Refund.generateRefundId();

      // Create refund record
      const refund = new Refund({
        refundId,
        paymentId: payment._id,
        amount: refundAmount,
        currency: payment.currency,
        reason: data.reason,
        status: 'pending',
        metadata: data.metadata || {},
        createdBy
      });

      try {
        // Process refund through Stripe
        const stripeRefund = await StripeService.createRefund({
          paymentIntentId: payment.stripePaymentIntentId!,
          amount: refundAmount,
          reason: data.reason as any,
          metadata: {
            refundId: refund.refundId,
            paymentId: payment.paymentId
          }
        });

        // Update refund with Stripe info
        refund.stripeRefundId = stripeRefund.id;
        refund.status = stripeRefund.status === 'succeeded' ? 'completed' : 'pending';
        
        if (refund.status === 'completed') {
          refund.processedDate = new Date();
        }

        await refund.save();

        // Add refund to payment
        payment.refunds.push(refund._id);

        // Update payment status
        const newTotalRefunded = totalRefunded + refundAmount;
        if (newTotalRefunded >= payment.amount) {
          payment.status = PaymentStatus.REFUNDED;
        } else {
          payment.status = PaymentStatus.PARTIALLY_REFUNDED;
        }

        await payment.save();

        logger.info('Payment refunded', {
          paymentId: payment.paymentId,
          refundId: refund.refundId,
          amount: refundAmount,
          stripeRefundId: stripeRefund.id
        });

        return payment;
      } catch (stripeError) {
        // Update refund status to failed
        refund.status = 'failed';
        await refund.save();

        logger.error('Stripe refund failed', {
          paymentId: payment.paymentId,
          refundId: refund.refundId,
          error: stripeError
        });

        throw stripeError;
      }
    } catch (error) {
      logger.error('Failed to refund payment', { error, paymentId });
      throw error;
    }
  }

  async cancelPayment(paymentId: string, reason?: string): Promise<IPayment> {
    try {
      const payment = await Payment.findOne({ paymentId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === PaymentStatus.COMPLETED) {
        throw new Error('Cannot cancel completed payment. Use refund instead.');
      }

      if (payment.status === PaymentStatus.CANCELLED) {
        throw new Error('Payment already cancelled');
      }

      // Cancel in Stripe if payment intent exists
      if (payment.stripePaymentIntentId) {
        try {
          await StripeService.cancelPaymentIntent(payment.stripePaymentIntentId, reason);
        } catch (stripeError) {
          logger.warn('Failed to cancel payment intent in Stripe', {
            paymentId: payment.paymentId,
            stripePaymentIntentId: payment.stripePaymentIntentId,
            error: stripeError
          });
        }
      }

      // Update payment status
      payment.status = PaymentStatus.CANCELLED;
      payment.failureReason = reason || 'Payment cancelled by user';
      await payment.save();

      logger.info('Payment cancelled', { paymentId: payment.paymentId, reason });

      return payment;
    } catch (error) {
      logger.error('Failed to cancel payment', { error, paymentId });
      throw error;
    }
  }

  async updatePaymentStatus(paymentId: string, status: PaymentStatus, metadata?: Record<string, any>): Promise<IPayment | null> {
    try {
      const payment = await Payment.findOneAndUpdate(
        { paymentId },
        { 
          status, 
          ...(metadata && { metadata: { ...metadata } }),
          updatedAt: new Date() 
        },
        { new: true }
      );

      if (payment) {
        logger.info('Payment status updated', { paymentId, status });
        
        // Update invoice if payment completed
        if (status === PaymentStatus.COMPLETED && payment.invoiceId) {
          await InvoiceService.markAsPaid(payment.invoiceId, payment.amount);
        }
      }

      return payment;
    } catch (error) {
      logger.error('Failed to update payment status', { error, paymentId, status });
      throw error;
    }
  }

  async getPaymentMetrics(filters?: {
    customerId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    try {
      const matchStage: any = {};
      
      if (filters?.customerId) matchStage.customerId = filters.customerId;
      
      if (filters?.startDate || filters?.endDate) {
        matchStage.paymentDate = {};
        if (filters.startDate) matchStage.paymentDate.$gte = filters.startDate;
        if (filters.endDate) matchStage.paymentDate.$lte = filters.endDate;
      }

      const metrics = await Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            averageAmount: { $avg: '$amount' }
          }
        }
      ]);

      const result: any = {
        completed: { count: 0, amount: 0 },
        pending: { count: 0, amount: 0 },
        failed: { count: 0, amount: 0 },
        refunded: { count: 0, amount: 0 },
        totalRevenue: 0,
        totalPayments: 0
      };

      metrics.forEach((metric) => {
        if (result[metric._id]) {
          result[metric._id].count = metric.count;
          result[metric._id].amount = metric.totalAmount;
          result.totalPayments += metric.count;
          
          if (metric._id === PaymentStatus.COMPLETED) {
            result.totalRevenue += metric.totalAmount;
          }
        }
      });

      return result;
    } catch (error) {
      logger.error('Failed to get payment metrics', { error, filters });
      throw error;
    }
  }

  async getRevenueReport(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      return await Payment.getRevenueReport(startDate, endDate);
    } catch (error) {
      logger.error('Failed to get revenue report', { error });
      throw error;
    }
  }

  async getPaymentsByMethod(startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      return await Payment.getPaymentsByMethod(startDate, endDate);
    } catch (error) {
      logger.error('Failed to get payments by method', { error });
      throw error;
    }
  }

  private async getTotalRefundedAmount(paymentId: string): Promise<number> {
    try {
      const payment = await Payment.findOne({ paymentId }).populate({
        path: 'refunds',
        match: { status: 'completed' }
      });

      if (!payment || !payment.refunds) return 0;

      return (payment.refunds as any[]).reduce((total, refund) => total + refund.amount, 0);
    } catch (error) {
      logger.error('Failed to get total refunded amount', { error, paymentId });
      return 0;
    }
  }

  private mapStripeStatusToPaymentStatus(stripeStatus: string): PaymentStatus {
    switch (stripeStatus) {
      case 'succeeded':
        return PaymentStatus.COMPLETED;
      case 'processing':
        return PaymentStatus.PROCESSING;
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return PaymentStatus.PENDING;
      case 'canceled':
        return PaymentStatus.CANCELLED;
      default:
        return PaymentStatus.FAILED;
    }
  }
}

export default PaymentService.getInstance();