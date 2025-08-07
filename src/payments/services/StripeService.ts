import Stripe from 'stripe';
import { logger } from '../../config/logger';
import { PaymentMethod, Payment, Refund } from '../models';
import { 
  PaymentMethodType, 
  PaymentStatus, 
  CreatePaymentRequest,
  StripeCustomer,
  StripePaymentIntent 
} from '../types';

export class StripeService {
  private stripe: Stripe;
  private static instance: StripeService;

  private constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-06-20',
      typescript: true
    });
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  // Customer Management
  async createCustomer(data: {
    email: string;
    name?: string;
    phone?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<StripeCustomer> {
    try {
      const customer = await this.stripe.customers.create({
        email: data.email,
        name: data.name,
        phone: data.phone,
        description: data.description,
        metadata: data.metadata || {}
      });

      logger.info('Stripe customer created', { customerId: customer.id, email: data.email });
      return customer as StripeCustomer;
    } catch (error) {
      logger.error('Failed to create Stripe customer', { error, email: data.email });
      throw error;
    }
  }

  async updateCustomer(customerId: string, data: {
    email?: string;
    name?: string;
    phone?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<StripeCustomer> {
    try {
      const customer = await this.stripe.customers.update(customerId, data);
      logger.info('Stripe customer updated', { customerId });
      return customer as StripeCustomer;
    } catch (error) {
      logger.error('Failed to update Stripe customer', { error, customerId });
      throw error;
    }
  }

  async getCustomer(customerId: string): Promise<StripeCustomer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if (customer.deleted) return null;
      return customer as StripeCustomer;
    } catch (error) {
      if ((error as Stripe.StripeError).code === 'resource_missing') {
        return null;
      }
      logger.error('Failed to retrieve Stripe customer', { error, customerId });
      throw error;
    }
  }

  async deleteCustomer(customerId: string): Promise<boolean> {
    try {
      await this.stripe.customers.del(customerId);
      logger.info('Stripe customer deleted', { customerId });
      return true;
    } catch (error) {
      logger.error('Failed to delete Stripe customer', { error, customerId });
      throw error;
    }
  }

  // Payment Methods
  async createPaymentMethod(data: {
    customerId: string;
    type: 'card';
    card: {
      number: string;
      exp_month: number;
      exp_year: number;
      cvc: string;
    };
    billingDetails?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
      };
    };
  }): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: data.type,
        card: data.card,
        billing_details: data.billingDetails || {}
      });

      // Attach to customer
      await this.stripe.paymentMethods.attach(paymentMethod.id, {
        customer: data.customerId
      });

      logger.info('Payment method created and attached', {
        paymentMethodId: paymentMethod.id,
        customerId: data.customerId
      });

      return paymentMethod;
    } catch (error) {
      logger.error('Failed to create payment method', { error, customerId: data.customerId });
      throw error;
    }
  }

  async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });

      logger.info('Payment method attached', { paymentMethodId, customerId });
      return paymentMethod;
    } catch (error) {
      logger.error('Failed to attach payment method', { error, paymentMethodId, customerId });
      throw error;
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
      logger.info('Payment method detached', { paymentMethodId });
      return paymentMethod;
    } catch (error) {
      logger.error('Failed to detach payment method', { error, paymentMethodId });
      throw error;
    }
  }

  async listPaymentMethods(customerId: string, type: 'card' | 'bank_account' = 'card'): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type
      });

      return paymentMethods.data;
    } catch (error) {
      logger.error('Failed to list payment methods', { error, customerId });
      throw error;
    }
  }

  // Payments
  async createPaymentIntent(data: {
    amount: number;
    currency: string;
    customerId?: string;
    paymentMethodId?: string;
    description?: string;
    metadata?: Record<string, string>;
    receiptEmail?: string;
    confirmImmediately?: boolean;
  }): Promise<StripePaymentIntent> {
    try {
      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency.toLowerCase(),
        description: data.description,
        metadata: data.metadata || {},
        receipt_email: data.receiptEmail
      };

      if (data.customerId) {
        paymentIntentData.customer = data.customerId;
      }

      if (data.paymentMethodId) {
        paymentIntentData.payment_method = data.paymentMethodId;
        if (data.confirmImmediately) {
          paymentIntentData.confirm = true;
          paymentIntentData.return_url = `${process.env.FRONTEND_URL}/payments/return`;
        }
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);

      logger.info('Payment intent created', {
        paymentIntentId: paymentIntent.id,
        amount: data.amount,
        currency: data.currency
      });

      return paymentIntent as StripePaymentIntent;
    } catch (error) {
      logger.error('Failed to create payment intent', { error, data });
      throw error;
    }
  }

  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<StripePaymentIntent> {
    try {
      const confirmData: Stripe.PaymentIntentConfirmParams = {
        return_url: `${process.env.FRONTEND_URL}/payments/return`
      };

      if (paymentMethodId) {
        confirmData.payment_method = paymentMethodId;
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, confirmData);

      logger.info('Payment intent confirmed', { paymentIntentId });
      return paymentIntent as StripePaymentIntent;
    } catch (error) {
      logger.error('Failed to confirm payment intent', { error, paymentIntentId });
      throw error;
    }
  }

  async capturePaymentIntent(paymentIntentId: string, amountToCapture?: number): Promise<StripePaymentIntent> {
    try {
      const captureData: Stripe.PaymentIntentCaptureParams = {};
      if (amountToCapture) {
        captureData.amount_to_capture = Math.round(amountToCapture * 100);
      }

      const paymentIntent = await this.stripe.paymentIntents.capture(paymentIntentId, captureData);

      logger.info('Payment intent captured', { paymentIntentId, amountToCapture });
      return paymentIntent as StripePaymentIntent;
    } catch (error) {
      logger.error('Failed to capture payment intent', { error, paymentIntentId });
      throw error;
    }
  }

  async cancelPaymentIntent(paymentIntentId: string, reason?: string): Promise<StripePaymentIntent> {
    try {
      const cancelData: Stripe.PaymentIntentCancelParams = {};
      if (reason) {
        cancelData.cancellation_reason = reason as Stripe.PaymentIntentCancelParams.CancellationReason;
      }

      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId, cancelData);

      logger.info('Payment intent cancelled', { paymentIntentId, reason });
      return paymentIntent as StripePaymentIntent;
    } catch (error) {
      logger.error('Failed to cancel payment intent', { error, paymentIntentId });
      throw error;
    }
  }

  // Refunds
  async createRefund(data: {
    paymentIntentId: string;
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
  }): Promise<Stripe.Refund> {
    try {
      const refundData: Stripe.RefundCreateParams = {
        payment_intent: data.paymentIntentId,
        reason: data.reason,
        metadata: data.metadata || {}
      };

      if (data.amount) {
        refundData.amount = Math.round(data.amount * 100);
      }

      const refund = await this.stripe.refunds.create(refundData);

      logger.info('Refund created', {
        refundId: refund.id,
        paymentIntentId: data.paymentIntentId,
        amount: data.amount
      });

      return refund;
    } catch (error) {
      logger.error('Failed to create refund', { error, data });
      throw error;
    }
  }

  // Subscriptions
  async createSubscription(data: {
    customerId: string;
    priceId: string;
    paymentMethodId?: string;
    trialPeriodDays?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    try {
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: data.customerId,
        items: [{ price: data.priceId }],
        metadata: data.metadata || {}
      };

      if (data.paymentMethodId) {
        subscriptionData.default_payment_method = data.paymentMethodId;
      }

      if (data.trialPeriodDays) {
        subscriptionData.trial_period_days = data.trialPeriodDays;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);

      logger.info('Subscription created', {
        subscriptionId: subscription.id,
        customerId: data.customerId
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to create subscription', { error, data });
      throw error;
    }
  }

  async updateSubscription(subscriptionId: string, data: {
    priceId?: string;
    quantity?: number;
    trialEnd?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    try {
      const updateData: Stripe.SubscriptionUpdateParams = {
        metadata: data.metadata
      };

      if (data.priceId) {
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
        updateData.items = [{
          id: subscription.items.data[0].id,
          price: data.priceId,
          quantity: data.quantity || 1
        }];
      }

      if (data.trialEnd) {
        updateData.trial_end = data.trialEnd;
      }

      const subscription = await this.stripe.subscriptions.update(subscriptionId, updateData);

      logger.info('Subscription updated', { subscriptionId });
      return subscription;
    } catch (error) {
      logger.error('Failed to update subscription', { error, subscriptionId });
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<Stripe.Subscription> {
    try {
      let subscription: Stripe.Subscription;

      if (immediately) {
        subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        });
      }

      logger.info('Subscription cancelled', { subscriptionId, immediately });
      return subscription;
    } catch (error) {
      logger.error('Failed to cancel subscription', { error, subscriptionId });
      throw error;
    }
  }

  // Webhook handling
  async constructWebhookEvent(payload: string | Buffer, signature: string): Promise<Stripe.Event> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event;
    } catch (error) {
      logger.error('Webhook signature verification failed', { error });
      throw error;
    }
  }

  // Utility methods
  formatAmountForStripe(amount: number): number {
    return Math.round(amount * 100);
  }

  formatAmountFromStripe(amount: number): number {
    return amount / 100;
  }

  async syncPaymentMethodToLocal(stripePaymentMethod: Stripe.PaymentMethod, customerId: string): Promise<void> {
    try {
      const paymentMethodData = {
        customerId,
        type: this.mapStripePaymentMethodType(stripePaymentMethod.type),
        stripePaymentMethodId: stripePaymentMethod.id,
        billingAddress: stripePaymentMethod.billing_details?.address ? {
          line1: stripePaymentMethod.billing_details.address.line1 || '',
          line2: stripePaymentMethod.billing_details.address.line2 || '',
          city: stripePaymentMethod.billing_details.address.city || '',
          state: stripePaymentMethod.billing_details.address.state || '',
          postalCode: stripePaymentMethod.billing_details.address.postal_code || '',
          country: stripePaymentMethod.billing_details.address.country || 'US'
        } : undefined
      };

      if (stripePaymentMethod.type === 'card' && stripePaymentMethod.card) {
        Object.assign(paymentMethodData, {
          cardLast4: stripePaymentMethod.card.last4,
          cardBrand: stripePaymentMethod.card.brand,
          cardExpMonth: stripePaymentMethod.card.exp_month,
          cardExpYear: stripePaymentMethod.card.exp_year
        });
      }

      await PaymentMethod.findOneAndUpdate(
        { stripePaymentMethodId: stripePaymentMethod.id },
        paymentMethodData,
        { upsert: true, new: true }
      );

      logger.info('Payment method synced to local database', {
        stripePaymentMethodId: stripePaymentMethod.id
      });
    } catch (error) {
      logger.error('Failed to sync payment method to local database', { error });
      throw error;
    }
  }

  private mapStripePaymentMethodType(stripeType: string): PaymentMethodType {
    switch (stripeType) {
      case 'card':
        return PaymentMethodType.CREDIT_CARD;
      case 'bank_account':
        return PaymentMethodType.BANK_TRANSFER;
      default:
        return PaymentMethodType.STRIPE;
    }
  }
}

export default StripeService.getInstance();