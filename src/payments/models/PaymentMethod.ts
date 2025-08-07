import mongoose, { Schema } from 'mongoose';
import { IPaymentMethod, PaymentMethodType } from '../types';

const AddressSchema = new Schema({
  line1: { type: String, required: true },
  line2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true, uppercase: true, default: 'US' }
}, { _id: false });

const PaymentMethodSchema = new Schema<IPaymentMethod>({
  customerId: { 
    type: String, 
    required: true,
    ref: 'Contact',
    index: true 
  },
  type: { 
    type: String, 
    enum: Object.values(PaymentMethodType), 
    required: true 
  },
  isDefault: { type: Boolean, default: false },
  stripePaymentMethodId: { type: String, index: true },
  cardLast4: { type: String },
  cardBrand: { type: String },
  cardExpMonth: { type: Number, min: 1, max: 12 },
  cardExpYear: { type: Number },
  bankName: { type: String },
  bankAccountLast4: { type: String },
  billingAddress: AddressSchema,
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
PaymentMethodSchema.index({ customerId: 1, isDefault: -1 });
PaymentMethodSchema.index({ stripePaymentMethodId: 1 }, { sparse: true });

// Virtual fields
PaymentMethodSchema.virtual('displayName').get(function() {
  switch (this.type) {
    case PaymentMethodType.CREDIT_CARD:
    case PaymentMethodType.DEBIT_CARD:
      return `${this.cardBrand || 'Card'} ending in ${this.cardLast4}`;
    case PaymentMethodType.BANK_TRANSFER:
      return `${this.bankName || 'Bank'} ending in ${this.bankAccountLast4}`;
    default:
      return this.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
});

PaymentMethodSchema.virtual('isExpired').get(function() {
  if (!this.cardExpMonth || !this.cardExpYear) return false;
  
  const now = new Date();
  const expiry = new Date(this.cardExpYear, this.cardExpMonth - 1);
  return expiry < now;
});

// Pre-save middleware to ensure only one default payment method per customer
PaymentMethodSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Remove default flag from other payment methods for this customer
    await PaymentMethod.updateMany(
      { 
        customerId: this.customerId,
        _id: { $ne: this._id }
      },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Static methods
PaymentMethodSchema.statics.setDefaultPaymentMethod = async function(customerId: string, paymentMethodId: string) {
  // Remove default flag from all payment methods for this customer
  await this.updateMany(
    { customerId },
    { $set: { isDefault: false } }
  );
  
  // Set the specified payment method as default
  return this.findByIdAndUpdate(
    paymentMethodId,
    { $set: { isDefault: true } },
    { new: true }
  );
};

PaymentMethodSchema.statics.getDefaultPaymentMethod = function(customerId: string) {
  return this.findOne({ customerId, isDefault: true });
};

PaymentMethodSchema.statics.getPaymentMethods = function(customerId: string) {
  return this.find({ customerId }).sort({ isDefault: -1, createdAt: -1 });
};

export const PaymentMethod = mongoose.model<IPaymentMethod>('PaymentMethod', PaymentMethodSchema);
export default PaymentMethod;