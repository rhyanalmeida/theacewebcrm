import mongoose, { Schema } from 'mongoose';
import { IRefund } from '../types';

const RefundSchema = new Schema<IRefund>({
  refundId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  paymentId: { 
    type: String, 
    required: true,
    ref: 'Payment',
    index: true 
  },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, uppercase: true, default: 'USD' },
  reason: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed'], 
    default: 'pending',
    index: true
  },
  stripeRefundId: { type: String, index: true },
  processedDate: { type: Date },
  metadata: { type: Schema.Types.Mixed },
  createdBy: { type: String, required: true, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
RefundSchema.index({ paymentId: 1, status: 1 });
RefundSchema.index({ stripeRefundId: 1 }, { sparse: true });

// Static methods
RefundSchema.statics.generateRefundId = async function(): Promise<string> {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const prefix = `REF-${year}${month}-`;
  
  const lastRefund = await this.findOne({
    refundId: { $regex: `^${prefix}` }
  }).sort({ refundId: -1 });
  
  let nextNumber = 1;
  if (lastRefund) {
    const lastNumber = parseInt(lastRefund.refundId.replace(prefix, ''));
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};

RefundSchema.statics.getRefundsByPayment = function(paymentId: string) {
  return this.find({ paymentId }).sort({ createdAt: -1 });
};

RefundSchema.statics.getRefundMetrics = async function(startDate?: Date, endDate?: Date) {
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
        totalAmount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' }
      }
    }
  ]);

  const metrics: any = {
    pending: { count: 0, amount: 0 },
    completed: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 },
    totalRefunded: 0,
    totalRefunds: 0
  };

  result.forEach((item) => {
    if (metrics[item._id]) {
      metrics[item._id].count = item.count;
      metrics[item._id].amount = item.totalAmount;
      metrics.totalRefunds += item.count;
      
      if (item._id === 'completed') {
        metrics.totalRefunded += item.totalAmount;
      }
    }
  });

  return metrics;
};

// Pre-save middleware
RefundSchema.pre('save', async function(next) {
  if (this.isNew && !this.refundId) {
    this.refundId = await (this.constructor as any).generateRefundId();
  }
  
  if (this.isModified('status') && this.status === 'completed' && !this.processedDate) {
    this.processedDate = new Date();
  }
  
  next();
});

export const Refund = mongoose.model<IRefund>('Refund', RefundSchema);
export default Refund;