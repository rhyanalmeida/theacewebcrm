import { Request, Response } from 'express';
import { SubscriptionService } from '../services';
import { CreateSubscriptionRequest } from '../types';
import { AuthRequest } from '../../types';
import { logger } from '../../config/logger';

export class SubscriptionController {
  async createSubscription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data: CreateSubscriptionRequest = req.body;
      const createdBy = req.user?._id?.toString() || 'system';

      const subscription = await SubscriptionService.createSubscription(data, createdBy);

      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: subscription
      });
    } catch (error) {
      logger.error('Create subscription error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async getSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const subscription = await SubscriptionService.getSubscription(subscriptionId);

      if (!subscription) {
        res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
        return;
      }

      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      logger.error('Get subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async getSubscriptionsByCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const subscriptions = await SubscriptionService.getSubscriptionsByCustomer(customerId);

      res.json({
        success: true,
        data: subscriptions
      });
    } catch (error) {
      logger.error('Get subscriptions by customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async updateSubscription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const updates = req.body;
      const updatedBy = req.user?._id?.toString() || 'system';

      const subscription = await SubscriptionService.updateSubscription(subscriptionId, updates, updatedBy);

      res.json({
        success: true,
        message: 'Subscription updated successfully',
        data: subscription
      });
    } catch (error) {
      logger.error('Update subscription error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const { immediately, reason } = req.body;

      const subscription = await SubscriptionService.cancelSubscription(
        subscriptionId,
        immediately === true,
        reason
      );

      res.json({
        success: true,
        message: 'Subscription cancelled successfully',
        data: subscription
      });
    } catch (error) {
      logger.error('Cancel subscription error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async pauseSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const { resumeDate } = req.body;

      const subscription = await SubscriptionService.pauseSubscription(
        subscriptionId,
        resumeDate ? new Date(resumeDate) : undefined
      );

      res.json({
        success: true,
        message: 'Subscription paused successfully',
        data: subscription
      });
    } catch (error) {
      logger.error('Pause subscription error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async resumeSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;

      const subscription = await SubscriptionService.resumeSubscription(subscriptionId);

      res.json({
        success: true,
        message: 'Subscription resumed successfully',
        data: subscription
      });
    } catch (error) {
      logger.error('Resume subscription error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async syncWithStripe(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;

      const subscription = await SubscriptionService.syncWithStripe(subscriptionId);

      res.json({
        success: true,
        message: 'Subscription synced with Stripe',
        data: subscription
      });
    } catch (error) {
      logger.error('Sync subscription error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  async getActiveSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.query;

      const subscriptions = await SubscriptionService.getActiveSubscriptions(
        customerId as string
      );

      res.json({
        success: true,
        data: subscriptions
      });
    } catch (error) {
      logger.error('Get active subscriptions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async getExpiringSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const { days } = req.query;
      const daysNumber = days ? parseInt(days as string) : 7;

      const subscriptions = await SubscriptionService.getExpiringSubscriptions(daysNumber);

      res.json({
        success: true,
        data: subscriptions
      });
    } catch (error) {
      logger.error('Get expiring subscriptions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async getSubscriptionMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      };

      const metrics = await SubscriptionService.getSubscriptionMetrics(filters);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Get subscription metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error]
      });
    }
  }

  async calculateProration(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const { newPlanId, changeDate } = req.body;

      if (!newPlanId) {
        res.status(400).json({
          success: false,
          message: 'New plan ID is required'
        });
        return;
      }

      const proration = await SubscriptionService.calculateProration(
        subscriptionId,
        newPlanId,
        changeDate ? new Date(changeDate) : undefined
      );

      res.json({
        success: true,
        data: proration
      });
    } catch (error) {
      logger.error('Calculate proration error:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message,
        errors: [error]
      });
    }
  }

  // Webhook handlers for subscription events
  async handleSubscriptionWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { type, data } = req.body;

      logger.info('Subscription webhook received', { type, subscriptionId: data.object?.id });

      // Handle different subscription webhook events
      switch (type) {
        case 'customer.subscription.updated':
          // Handle subscription updates
          break;
        case 'customer.subscription.deleted':
          // Handle subscription cancellations
          break;
        case 'invoice.payment_succeeded':
          // Handle successful subscription payments
          break;
        case 'invoice.payment_failed':
          // Handle failed subscription payments
          break;
        default:
          logger.info('Unhandled subscription webhook event', { type });
      }

      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Subscription webhook error:', error);
      res.status(400).json({
        success: false,
        message: 'Webhook processing failed'
      });
    }
  }
}

export default new SubscriptionController();