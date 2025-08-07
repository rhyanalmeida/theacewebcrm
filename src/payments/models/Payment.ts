import mongoose, { Schema } from 'mongoose';
import { IPayment, PaymentStatus, PaymentMethodType } from '../types';

const PaymentFeeSchema = new Schema({
  type: { 
    type: String, 
    enum: ['processing', 'transaction', 'other'], 
    required: true 
  },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, required: true }
}, { _id: false });

const PaymentSchema = new Schema<IPayment>({
  paymentId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  invoiceId: { 
    type: String, 
    ref: 'Invoice',
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
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, uppercase: true, default: 'USD' },
  status: { 
    type: String, 
    enum: Object.values(PaymentStatus), 
    default: PaymentStatus.PENDING,
    index: true
  },
  paymentMethod: { 
    type: String, 
    enum: Object.values(PaymentMethodType), 
    required: true 
  },
  paymentMethodId: { type: String }, // Stripe payment method ID
  transactionId: { type: String, index: true }, // External transaction ID
  stripePaymentIntentId: { type: String, index: true },
  paymentDate: { type: Date, required: true, index: true },
  description: { type: String },
  metadata: { type: Schema.Types.Mixed },
  failureReason: { type: String },
  refunds: [{ type: Schema.Types.ObjectId, ref: 'Refund' }],
  fees: [PaymentFeeSchema],
  createdBy: { type: String, required: true, ref: 'User' },
  updatedBy: { type: String, required: true, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
PaymentSchema.index({ customerId: 1, status: 1 });
PaymentSchema.index({ invoiceId: 1, status: 1 });
PaymentSchema.index({ paymentDate: -1 });
PaymentSchema.index({ amount: -1 });
PaymentSchema.index({ stripePaymentIntentId: 1 }, { sparse: true });

// Virtual fields
PaymentSchema.virtual('totalRefunded').get(function() {
  return this.populated('refunds') 
    ? this.refunds.reduce((total: number, refund: any) => {
        return refund.status === 'completed' ? total + refund.amount : total;
      }, 0)
    : 0;
});

PaymentSchema.virtual('netAmount').get(function() {
  const totalFees = this.fees?.reduce((total, fee) => total + fee.amount, 0) || 0;
  return this.amount - totalFees;
});

PaymentSchema.virtual('isRefundable').get(function() {
  return this.status === PaymentStatus.COMPLETED && 
         this.amount > (this.totalRefunded || 0);
});

// Static methods
PaymentSchema.statics.generatePaymentId = async function(): Promise<string> {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const prefix = `PAY-${year}${month}-`;
  
  // Find the last payment for this month
  const lastPayment = await this.findOne({
    paymentId: { $regex: `^${prefix}` }
  }).sort({ paymentId: -1 });
  
  let nextNumber = 1;
  if (lastPayment) {
    const lastNumber = parseInt(lastPayment.paymentId.replace(prefix, ''));
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};

PaymentSchema.statics.getRevenueReport = async function(startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        status: PaymentStatus.COMPLETED,
        paymentDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$paymentDate' },
          month: { $month: '$paymentDate' },
          day: { $dayOfMonth: '$paymentDate' }
        },
        totalRevenue: { $sum: '$amount' },
        paymentCount: { $sum: 1 },
        averagePayment: { $avg: '$amount' }
      }
    },
    {
      $project: {
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          }
        },
        revenue: '$totalRevenue',
        paymentCount: '$paymentCount',
        averagePayment: { $round: ['$averagePayment', 2] }
      }
    },
    { $sort: { date: 1 } }
  ]);
};

PaymentSchema.statics.getPaymentsByMethod = async function(startDate?: Date, endDate?: Date) {
  const matchStage: any = { status: PaymentStatus.COMPLETED };
  if (startDate || endDate) {
    matchStage.paymentDate = {};
    if (startDate) matchStage.paymentDate.$gte = startDate;
    if (endDate) matchStage.paymentDate.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$paymentMethod',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        averageAmount: { $avg: '$amount' }
      }
    },
    {
      $project: {
        paymentMethod: '$_id',
        totalAmount: '$totalAmount',
        count: '$count',
        averageAmount: { $round: ['$averageAmount', 2] }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);
};

// Pre-save middleware
PaymentSchema.pre('save', async function(next) {
  if (this.isNew && !this.paymentId) {
    this.paymentId = await (this.constructor as any).generatePaymentId();
  }
  next();
});

// Post-save middleware to update invoice
PaymentSchema.post('save', async function() {
  if (this.invoiceId && this.status === PaymentStatus.COMPLETED) {
    const Invoice = mongoose.model('Invoice');
    const invoice = await Invoice.findById(this.invoiceId);
    
    if (invoice) {
      const totalPayments = await Payment.aggregate([
        {
          $match: {
            invoiceId: this.invoiceId,
            status: PaymentStatus.COMPLETED
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);
      
      const amountPaid = totalPayments[0]?.total || 0;
      invoice.amountPaid = amountPaid;
      await invoice.save();
    }
  }
});

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
export default Payment;