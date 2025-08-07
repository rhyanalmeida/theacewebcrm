import { Subscription } from '../models';
import { ISubscription, CreateSubscriptionRequest, SubscriptionStatus, BillingInterval } from '../types';
import { logger } from '../../config/logger';
import StripeService from './StripeService';

export class SubscriptionService {
  private static instance: SubscriptionService;

  private constructor() {}

  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  async createSubscription(data: CreateSubscriptionRequest, createdBy: string): Promise<ISubscription> {
    try {
      const subscriptionId = await Subscription.generateSubscriptionId();

      // Create subscription in Stripe
      const stripeSubscription = await StripeService.createSubscription({
        customerId: data.customerId,
        priceId: data.planId,
        paymentMethodId: data.paymentMethodId,
        trialPeriodDays: data.trialPeriodDays,
        metadata: data.metadata
      });

      // Extract pricing information from Stripe subscription
      const priceData = stripeSubscription.items.data[0].price;
      const amount = priceData.unit_amount ? priceData.unit_amount / 100 : 0;
      const interval = this.mapStripeBillingInterval(priceData.recurring?.interval || 'month');

      // Create local subscription record
      const subscriptionData = {
        subscriptionId,
        customerId: data.customerId,
        planId: data.planId,
        status: this.mapStripeSubscriptionStatus(stripeSubscription.status),
        stripeSubscriptionId: stripeSubscription.id,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : undefined,
        trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : undefined,
        billingInterval: interval,
        amount,
        currency: priceData.currency?.toUpperCase() || 'USD',
        quantity: data.quantity || 1,
        metadata: data.metadata || {},
        createdBy,
        updatedBy: createdBy
      };

      const subscription = new Subscription(subscriptionData);
      await subscription.save();

      logger.info('Subscription created', {
        subscriptionId: subscription.subscriptionId,
        stripeSubscriptionId: stripeSubscription.id,
        customerId: data.customerId
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to create subscription', { error, data });
      throw error;
    }
  }

  async getSubscription(subscriptionId: string): Promise<ISubscription | null> {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      return subscription;
    } catch (error) {
      logger.error('Failed to get subscription', { error, subscriptionId });
      throw error;
    }
  }

  async getSubscriptionsByCustomer(customerId: string): Promise<ISubscription[]> {
    try {
      const subscriptions = await Subscription.find({ customerId }).sort({ createdAt: -1 });
      return subscriptions;
    } catch (error) {
      logger.error('Failed to get subscriptions by customer', { error, customerId });
      throw error;
    }
  }

  async updateSubscription(subscriptionId: string, updates: {
    planId?: string;
    quantity?: number;
    metadata?: Record<string, any>;
  }, updatedBy: string): Promise<ISubscription> {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Update in Stripe
      if (subscription.stripeSubscriptionId) {
        await StripeService.updateSubscription(subscription.stripeSubscriptionId, {
          priceId: updates.planId,
          quantity: updates.quantity,
          metadata: updates.metadata
        });
      }

      // Update local record
      const updateData: any = { updatedBy, updatedAt: new Date() };
      if (updates.planId) updateData.planId = updates.planId;
      if (updates.quantity) updateData.quantity = updates.quantity;
      if (updates.metadata) updateData.metadata = { ...subscription.metadata, ...updates.metadata };

      const updatedSubscription = await Subscription.findOneAndUpdate(
        { subscriptionId },
        updateData,
        { new: true }
      );

      logger.info('Subscription updated', { subscriptionId, updates: Object.keys(updates) });
      return updatedSubscription!;
    } catch (error) {
      logger.error('Failed to update subscription', { error, subscriptionId });
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string, immediately: boolean = false, reason?: string): Promise<ISubscription> {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status === SubscriptionStatus.CANCELLED) {
        throw new Error('Subscription already cancelled');
      }

      // Cancel in Stripe
      if (subscription.stripeSubscriptionId) {
        await StripeService.cancelSubscription(subscription.stripeSubscriptionId, immediately);
      }

      // Update local record
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();
      
      if (immediately) {
        subscription.endedAt = new Date();
      }
      
      if (reason) {
        subscription.metadata = { 
          ...subscription.metadata, 
          cancellationReason: reason 
        };
      }

      await subscription.save();

      logger.info('Subscription cancelled', { subscriptionId, immediately, reason });
      return subscription;
    } catch (error) {
      logger.error('Failed to cancel subscription', { error, subscriptionId });
      throw error;
    }
  }

  async pauseSubscription(subscriptionId: string, resumeDate?: Date): Promise<ISubscription> {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Note: Stripe doesn't have a native pause feature, so we handle this locally
      // In production, you might want to use Stripe's trial period extension or other methods

      subscription.status = SubscriptionStatus.PAUSED;
      subscription.metadata = {
        ...subscription.metadata,
        pausedAt: new Date().toISOString(),
        resumeDate: resumeDate?.toISOString()
      };

      await subscription.save();

      logger.info('Subscription paused', { subscriptionId, resumeDate });
      return subscription;
    } catch (error) {
      logger.error('Failed to pause subscription', { error, subscriptionId });
      throw error;
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<ISubscription> {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== SubscriptionStatus.PAUSED) {
        throw new Error('Subscription is not paused');
      }

      subscription.status = SubscriptionStatus.ACTIVE;
      
      // Remove pause metadata
      const metadata = { ...subscription.metadata };
      delete metadata.pausedAt;
      delete metadata.resumeDate;
      subscription.metadata = metadata;

      await subscription.save();

      logger.info('Subscription resumed', { subscriptionId });
      return subscription;
    } catch (error) {
      logger.error('Failed to resume subscription', { error, subscriptionId });
      throw error;
    }
  }

  async syncWithStripe(subscriptionId: string): Promise<ISubscription> {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription || !subscription.stripeSubscriptionId) {
        throw new Error('Subscription not found or no Stripe subscription ID');
      }

      // Get latest data from Stripe
      const stripeSubscription = await StripeService.stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      // Update local record with Stripe data
      subscription.status = this.mapStripeSubscriptionStatus(stripeSubscription.status);
      subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      
      if (stripeSubscription.canceled_at) {
        subscription.cancelledAt = new Date(stripeSubscription.canceled_at * 1000);
      }
      
      if (stripeSubscription.ended_at) {
        subscription.endedAt = new Date(stripeSubscription.ended_at * 1000);
      }

      await subscription.save();

      logger.info('Subscription synced with Stripe', { subscriptionId });
      return subscription;
    } catch (error) {
      logger.error('Failed to sync subscription with Stripe', { error, subscriptionId });
      throw error;
    }
  }

  async getExpiringSubscriptions(days: number = 7): Promise<ISubscription[]> {
    try {
      return await Subscription.getExpiringSubscriptions(days);
    } catch (error) {
      logger.error('Failed to get expiring subscriptions', { error, days });
      throw error;
    }
  }

  async getSubscriptionMetrics(filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    try {
      return await Subscription.getSubscriptionMetrics(filters?.startDate, filters?.endDate);
    } catch (error) {
      logger.error('Failed to get subscription metrics', { error, filters });
      throw error;
    }
  }

  async getActiveSubscriptions(customerId?: string): Promise<ISubscription[]> {
    try {
      return await Subscription.getActiveSubscriptions(customerId);
    } catch (error) {
      logger.error('Failed to get active subscriptions', { error, customerId });
      throw error;
    }
  }

  async calculateProration(subscriptionId: string, newPlanId: string, changeDate?: Date): Promise<{
    proratedAmount: number;
    newAmount: number;
    creditAmount: number;
    nextBillingDate: Date;
  }> {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // This is a simplified proration calculation
      // In production, you'd want to use Stripe's proration preview API
      
      const currentDate = changeDate || new Date();
      const remainingDays = Math.ceil(
        (subscription.currentPeriodEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const totalDays = Math.ceil(
        (subscription.currentPeriodEnd.getTime() - subscription.currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Mock new plan amount - in production, fetch from Stripe
      const newAmount = subscription.amount * 1.5; // Example: 50% increase
      
      const creditAmount = (subscription.amount * remainingDays) / totalDays;
      const proratedAmount = (newAmount * remainingDays) / totalDays - creditAmount;

      return {
        proratedAmount,
        newAmount,
        creditAmount,
        nextBillingDate: subscription.currentPeriodEnd
      };
    } catch (error) {
      logger.error('Failed to calculate proration', { error, subscriptionId });
      throw error;
    }
  }

  private mapStripeSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'canceled':
        return SubscriptionStatus.CANCELLED;
      case 'incomplete':
      case 'incomplete_expired':
        return SubscriptionStatus.INACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      default:
        return SubscriptionStatus.INACTIVE;
    }
  }

  private mapStripeBillingInterval(interval: string): BillingInterval {
    switch (interval) {
      case 'day':
        return BillingInterval.DAILY;
      case 'week':
        return BillingInterval.WEEKLY;
      case 'month':
        return BillingInterval.MONTHLY;
      case 'year':
        return BillingInterval.YEARLY;
      default:
        return BillingInterval.MONTHLY;
    }
  }
}

export default SubscriptionService.getInstance();