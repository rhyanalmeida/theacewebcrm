import mongoose, { Schema } from 'mongoose';
import { IInvoice, InvoiceStatus, TaxType } from '../types';

const InvoiceLineItemSchema = new Schema({
  id: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  productId: { type: String },
  serviceId: { type: String },
  taxable: { type: Boolean, default: true },
  discountPercent: { type: Number, min: 0, max: 100 },
  discountAmount: { type: Number, min: 0 }
}, { _id: false });

const TaxDetailSchema = new Schema({
  taxType: { 
    type: String, 
    enum: Object.values(TaxType), 
    required: true 
  },
  taxRate: { type: Number, required: true, min: 0 },
  taxAmount: { type: Number, required: true, min: 0 },
  taxableAmount: { type: Number, required: true, min: 0 },
  description: { type: String, required: true }
}, { _id: false });

const ReminderLogSchema = new Schema({
  sentDate: { type: Date, required: true },
  type: { 
    type: String, 
    enum: ['first_reminder', 'second_reminder', 'final_notice'], 
    required: true 
  },
  recipientEmail: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'opened', 'failed'], 
    default: 'sent' 
  }
}, { _id: false });

const InvoiceSchema = new Schema<IInvoice>({
  invoiceNumber: { 
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
  status: { 
    type: String, 
    enum: Object.values(InvoiceStatus), 
    default: InvoiceStatus.DRAFT,
    index: true
  },
  issueDate: { type: Date, required: true, index: true },
  dueDate: { type: Date, required: true, index: true },
  paidDate: { type: Date, index: true },
  subtotal: { type: Number, required: true, min: 0 },
  taxAmount: { type: Number, required: true, min: 0 },
  discountAmount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  remainingBalance: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD', uppercase: true },
  lineItems: [InvoiceLineItemSchema],
  taxDetails: [TaxDetailSchema],
  paymentTerms: { type: String },
  notes: { type: String },
  publicNotes: { type: String },
  privateNotes: { type: String },
  recurringInvoiceId: { type: String, ref: 'RecurringInvoice' },
  templateId: { type: String },
  pdfPath: { type: String },
  lastSentDate: { type: Date },
  viewedDate: { type: Date },
  remindersSent: [ReminderLogSchema],
  metadata: { type: Schema.Types.Mixed },
  createdBy: { type: String, required: true, ref: 'User' },
  updatedBy: { type: String, required: true, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
InvoiceSchema.index({ customerId: 1, status: 1 });
InvoiceSchema.index({ companyId: 1, status: 1 });
InvoiceSchema.index({ dueDate: 1, status: 1 });
InvoiceSchema.index({ createdAt: -1 });
InvoiceSchema.index({ totalAmount: -1 });
InvoiceSchema.index({ 'lineItems.productId': 1 });

// Virtual fields
InvoiceSchema.virtual('isOverdue').get(function() {
  return this.status !== InvoiceStatus.PAID && 
         this.status !== InvoiceStatus.CANCELLED &&
         this.dueDate < new Date();
});

InvoiceSchema.virtual('daysPastDue').get(function() {
  if (!this.isOverdue) return 0;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.dueDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to calculate totals
InvoiceSchema.pre('save', function(next) {
  // Calculate subtotal
  this.subtotal = this.lineItems.reduce((total, item) => {
    item.totalPrice = item.quantity * item.unitPrice;
    if (item.discountAmount) {
      item.totalPrice -= item.discountAmount;
    } else if (item.discountPercent) {
      item.totalPrice -= (item.totalPrice * item.discountPercent / 100);
    }
    return total + item.totalPrice;
  }, 0);

  // Calculate tax amount
  this.taxAmount = this.taxDetails.reduce((total, tax) => total + tax.taxAmount, 0);

  // Calculate total amount
  this.totalAmount = this.subtotal + this.taxAmount - (this.discountAmount || 0);

  // Calculate remaining balance
  this.remainingBalance = this.totalAmount - this.amountPaid;

  // Update status based on payment
  if (this.amountPaid >= this.totalAmount && this.status !== InvoiceStatus.PAID) {
    this.status = InvoiceStatus.PAID;
    this.paidDate = new Date();
  } else if (this.amountPaid > 0 && this.amountPaid < this.totalAmount) {
    this.status = InvoiceStatus.PARTIALLY_PAID;
  }

  // Check if overdue
  if (this.status !== InvoiceStatus.PAID && 
      this.status !== InvoiceStatus.CANCELLED &&
      this.dueDate < new Date()) {
    this.status = InvoiceStatus.OVERDUE;
  }

  next();
});

// Static methods
InvoiceSchema.statics.generateInvoiceNumber = async function(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  // Find the last invoice for this year
  const lastInvoice = await this.findOne({
    invoiceNumber: { $regex: `^${prefix}` }
  }).sort({ invoiceNumber: -1 });
  
  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''));
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};

InvoiceSchema.statics.getOverdueInvoices = function(customerId?: string) {
  const query: any = {
    status: { $nin: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
    dueDate: { $lt: new Date() }
  };
  
  if (customerId) {
    query.customerId = customerId;
  }
  
  return this.find(query).sort({ dueDate: 1 });
};

InvoiceSchema.statics.getFinancialSummary = async function(startDate?: Date, endDate?: Date) {
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
        _id: null,
        totalRevenue: {
          $sum: {
            $cond: [{ $eq: ['$status', InvoiceStatus.PAID] }, '$totalAmount', 0]
          }
        },
        totalOutstanding: {
          $sum: {
            $cond: [
              { $nin: ['$status', [InvoiceStatus.PAID, InvoiceStatus.CANCELLED]] },
              '$remainingBalance',
              0
            ]
          }
        },
        totalOverdue: {
          $sum: {
            $cond: [
              { 
                $and: [
                  { $eq: ['$status', InvoiceStatus.OVERDUE] },
                  { $lt: ['$dueDate', new Date()] }
                ]
              },
              '$remainingBalance',
              0
            ]
          }
        },
        paidInvoices: {
          $sum: {
            $cond: [{ $eq: ['$status', InvoiceStatus.PAID] }, 1, 0]
          }
        },
        unpaidInvoices: {
          $sum: {
            $cond: [
              { $nin: ['$status', [InvoiceStatus.PAID, InvoiceStatus.CANCELLED]] },
              1,
              0
            ]
          }
        },
        overdueInvoices: {
          $sum: {
            $cond: [{ $eq: ['$status', InvoiceStatus.OVERDUE] }, 1, 0]
          }
        }
      }
    }
  ]);

  return result[0] || {
    totalRevenue: 0,
    totalOutstanding: 0,
    totalOverdue: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
    overdueInvoices: 0
  };
};

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
export default Invoice;