import mongoose, { Schema } from 'mongoose';
import { ISubscription, SubscriptionStatus, BillingInterval } from '../types';

const SubscriptionSchema = new Schema<ISubscription>({
  subscriptionId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  customerId: { 
    type: String, 
    required: true,
    ref: 'Contact',
    index: true 
  },
  companyId: { 
    type: String, 
    ref: 'Company',
    index: true 
  },
  planId: { type: String, required: true },
  status: { 
    type: String, 
    enum: Object.values(SubscriptionStatus), 
    default: SubscriptionStatus.ACTIVE,
    index: true
  },
  stripeSubscriptionId: { type: String, index: true },
  currentPeriodStart: { type: Date, required: true, index: true },
  currentPeriodEnd: { type: Date, required: true, index: true },
  trialStart: { type: Date },
  trialEnd: { type: Date },
  cancelledAt: { type: Date },
  cancelAt: { type: Date },
  endedAt: { type: Date },
  billingInterval: { 
    type: String, 
    enum: Object.values(BillingInterval), 
    required: true 
  },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, uppercase: true, default: 'USD' },
  quantity: { type: Number, default: 1, min: 1 },
  metadata: { type: Schema.Types.Mixed },
  createdBy: { type: String, required: true, ref: 'User' },
  updatedBy: { type: String, required: true, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
SubscriptionSchema.index({ customerId: 1, status: 1 });
SubscriptionSchema.index({ currentPeriodEnd: 1 });
SubscriptionSchema.index({ stripeSubscriptionId: 1 }, { sparse: true });

// Virtual fields
SubscriptionSchema.virtual('isActive').get(function() {
  return this.status === SubscriptionStatus.ACTIVE;
});

SubscriptionSchema.virtual('isTrialing').get(function() {
  return this.status === SubscriptionStatus.TRIALING;
});

SubscriptionSchema.virtual('daysUntilRenewal').get(function() {
  const now = new Date();
  const diffTime = this.currentPeriodEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

SubscriptionSchema.virtual('totalAmount').get(function() {
  return this.amount * this.quantity;
});

// Static methods
SubscriptionSchema.statics.generateSubscriptionId = async function(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SUB-${year}-`;
  
  const lastSubscription = await this.findOne({
    subscriptionId: { $regex: `^${prefix}` }
  }).sort({ subscriptionId: -1 });
  
  let nextNumber = 1;
  if (lastSubscription) {
    const lastNumber = parseInt(lastSubscription.subscriptionId.replace(prefix, ''));
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};

SubscriptionSchema.statics.getActiveSubscriptions = function(customerId?: string) {
  const query: any = { status: SubscriptionStatus.ACTIVE };
  if (customerId) query.customerId = customerId;
  return this.find(query);
};

SubscriptionSchema.statics.getExpiringSubscriptions = function(days: number = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: SubscriptionStatus.ACTIVE,
    currentPeriodEnd: { $lte: futureDate }
  });
};

SubscriptionSchema.statics.getSubscriptionMetrics = async function(startDate?: Date, endDate?: Date) {
  const matchStage: any = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }

  const result = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: { $multiply: ['$amount', '$quantity'] } },
        averageAmount: { $avg: { $multiply: ['$amount', '$quantity'] } }
      }
    }
  ]);

  const metrics: any = {
    active: 0,
    cancelled: 0,
    trialing: 0,
    pastDue: 0,
    totalRevenue: 0,
    averageRevenue: 0
  };

  result.forEach((item) => {
    switch (item._id) {
      case SubscriptionStatus.ACTIVE:
        metrics.active = item.count;
        metrics.totalRevenue += item.totalRevenue;
        break;
      case SubscriptionStatus.CANCELLED:
        metrics.cancelled = item.count;
        break;
      case SubscriptionStatus.TRIALING:
        metrics.trialing = item.count;
        break;
      case SubscriptionStatus.PAST_DUE:
        metrics.pastDue = item.count;
        break;
    }
  });

  const totalSubscriptions = result.reduce((sum, item) => sum + item.count, 0);
  metrics.averageRevenue = totalSubscriptions > 0 ? metrics.totalRevenue / totalSubscriptions : 0;

  return metrics;
};

// Pre-save middleware
SubscriptionSchema.pre('save', async function(next) {
  if (this.isNew && !this.subscriptionId) {
    this.subscriptionId = await (this.constructor as any).generateSubscriptionId();
  }
  next();
});

// Middleware to handle status changes
SubscriptionSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === SubscriptionStatus.CANCELLED && !this.cancelledAt) {
      this.cancelledAt = new Date();
    }
    if (this.status === SubscriptionStatus.CANCELLED && !this.endedAt) {
      this.endedAt = new Date();
    }
  }
  next();
});

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
export default Subscription;