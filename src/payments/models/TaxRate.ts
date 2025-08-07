import mongoose, { Schema } from 'mongoose';
import { ITaxRate, TaxType } from '../types';

const TaxRateSchema = new Schema<ITaxRate>({
  name: { type: String, required: true },
  rate: { type: Number, required: true, min: 0, max: 100 },
  type: { 
    type: String, 
    enum: Object.values(TaxType), 
    required: true 
  },
  region: { type: String }, // State, country, or region code
  isActive: { type: Boolean, default: true },
  description: { type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
TaxRateSchema.index({ type: 1, region: 1 });
TaxRateSchema.index({ isActive: 1 });

// Virtual fields
TaxRateSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.rate}%)`;
});

// Static methods
TaxRateSchema.statics.getActiveTaxRates = function(region?: string) {
  const query: any = { isActive: true };
  if (region) query.region = region;
  return this.find(query).sort({ name: 1 });
};

TaxRateSchema.statics.getTaxRateByRegion = function(region: string, type?: TaxType) {
  const query: any = { region, isActive: true };
  if (type) query.type = type;
  return this.findOne(query);
};

TaxRateSchema.statics.calculateTax = function(amount: number, taxRate: number): number {
  return Math.round((amount * taxRate / 100) * 100) / 100;
};

export const TaxRate = mongoose.model<ITaxRate>('TaxRate', TaxRateSchema);
export default TaxRate;