import mongoose, { Schema } from 'mongoose';
import { IQuote, TaxType } from '../types';

const QuoteLineItemSchema = new Schema({
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

const QuoteTaxDetailSchema = new Schema({
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

const QuoteSchema = new Schema<IQuote>({
  quoteNumber: { 
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
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'], 
    default: 'draft',
    index: true
  },
  issueDate: { type: Date, required: true, index: true },
  expirationDate: { type: Date, required: true, index: true },
  acceptedDate: { type: Date },
  subtotal: { type: Number, required: true, min: 0 },
  taxAmount: { type: Number, required: true, min: 0 },
  discountAmount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD', uppercase: true },
  lineItems: [QuoteLineItemSchema],
  taxDetails: [QuoteTaxDetailSchema],
  terms: { type: String },
  notes: { type: String },
  publicNotes: { type: String },
  privateNotes: { type: String },
  templateId: { type: String },
  pdfPath: { type: String },
  convertedInvoiceId: { type: String, ref: 'Invoice' },
  metadata: { type: Schema.Types.Mixed },
  createdBy: { type: String, required: true, ref: 'User' },
  updatedBy: { type: String, required: true, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
QuoteSchema.index({ customerId: 1, status: 1 });
QuoteSchema.index({ companyId: 1, status: 1 });
QuoteSchema.index({ expirationDate: 1 });
QuoteSchema.index({ createdAt: -1 });

// Virtual fields
QuoteSchema.virtual('isExpired').get(function() {
  return this.status !== 'accepted' && 
         this.status !== 'rejected' &&
         this.expirationDate < new Date();
});

QuoteSchema.virtual('daysUntilExpiration').get(function() {
  if (this.isExpired) return 0;
  const now = new Date();
  const diffTime = this.expirationDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

QuoteSchema.virtual('isConverted').get(function() {
  return !!this.convertedInvoiceId;
});

// Pre-save middleware to calculate totals
QuoteSchema.pre('save', function(next) {
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

  // Auto-expire quotes
  if (this.status !== 'accepted' && 
      this.status !== 'rejected' && 
      this.status !== 'expired' &&
      this.expirationDate < new Date()) {
    this.status = 'expired';
  }

  next();
});

// Static methods
QuoteSchema.statics.generateQuoteNumber = async function(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `QUO-${year}-`;
  
  const lastQuote = await this.findOne({
    quoteNumber: { $regex: `^${prefix}` }
  }).sort({ quoteNumber: -1 });
  
  let nextNumber = 1;
  if (lastQuote) {
    const lastNumber = parseInt(lastQuote.quoteNumber.replace(prefix, ''));
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};

QuoteSchema.statics.getExpiringQuotes = function(days: number = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: { $in: ['draft', 'sent'] },
    expirationDate: { $lte: futureDate, $gte: new Date() }
  }).sort({ expirationDate: 1 });
};

QuoteSchema.statics.getQuoteMetrics = async function(startDate?: Date, endDate?: Date) {
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
        totalValue: { $sum: '$totalAmount' },
        averageValue: { $avg: '$totalAmount' }
      }
    }
  ]);

  const metrics: any = {
    draft: { count: 0, value: 0 },
    sent: { count: 0, value: 0 },
    accepted: { count: 0, value: 0 },
    rejected: { count: 0, value: 0 },
    expired: { count: 0, value: 0 },
    totalValue: 0,
    conversionRate: 0
  };

  let totalQuotes = 0;
  let acceptedQuotes = 0;

  result.forEach((item) => {
    if (metrics[item._id]) {
      metrics[item._id].count = item.count;
      metrics[item._id].value = item.totalValue;
      totalQuotes += item.count;
      
      if (item._id === 'accepted') {
        acceptedQuotes = item.count;
      }
    }
    metrics.totalValue += item.totalValue;
  });

  metrics.conversionRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0;

  return metrics;
};

QuoteSchema.methods.convertToInvoice = async function(dueDate?: Date) {
  if (this.status !== 'accepted') {
    throw new Error('Only accepted quotes can be converted to invoices');
  }

  if (this.convertedInvoiceId) {
    throw new Error('Quote has already been converted to an invoice');
  }

  const Invoice = mongoose.model('Invoice');
  const invoiceNumber = await Invoice.generateInvoiceNumber();
  
  const invoiceData = {
    invoiceNumber,
    customerId: this.customerId,
    companyId: this.companyId,
    status: 'draft',
    issueDate: new Date(),
    dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    subtotal: this.subtotal,
    taxAmount: this.taxAmount,
    discountAmount: this.discountAmount,
    totalAmount: this.totalAmount,
    currency: this.currency,
    lineItems: this.lineItems,
    taxDetails: this.taxDetails,
    notes: this.notes,
    publicNotes: this.publicNotes,
    privateNotes: this.privateNotes,
    metadata: { ...this.metadata, convertedFromQuote: this._id },
    createdBy: this.updatedBy,
    updatedBy: this.updatedBy
  };

  const invoice = new Invoice(invoiceData);
  await invoice.save();

  // Update quote with converted invoice ID
  this.convertedInvoiceId = invoice._id;
  await this.save();

  return invoice;
};

export const Quote = mongoose.model<IQuote>('Quote', QuoteSchema);
export default Quote;