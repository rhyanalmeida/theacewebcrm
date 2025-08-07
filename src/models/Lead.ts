import mongoose, { Schema } from 'mongoose';
import { ILead, LeadStatus } from '../types';

const leadSchema = new Schema<ILead>({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please provide a valid phone number']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  status: {
    type: String,
    enum: Object.values(LeadStatus),
    default: LeadStatus.NEW,
    required: true
  },
  source: {
    type: String,
    trim: true,
    maxlength: [100, 'Source cannot exceed 100 characters']
  },
  value: {
    type: Number,
    min: [0, 'Value cannot be negative'],
    default: 0
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Lead owner is required']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Updated by is required']
  },
  convertedTo: {
    type: Schema.Types.ObjectId,
    ref: 'Deal'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
leadSchema.index({ email: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ owner: 1 });
leadSchema.index({ createdBy: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ tags: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ value: -1 });

// Compound indexes
leadSchema.index({ owner: 1, status: 1 });
leadSchema.index({ status: 1, createdAt: -1 });

// Virtual for full name
leadSchema.virtual('fullName').get(function(this: ILead) {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for conversion status
leadSchema.virtual('isConverted').get(function(this: ILead) {
  return !!this.convertedTo;
});

// Static method to find by status
leadSchema.statics.findByStatus = function(status: LeadStatus, ownerId?: string) {
  const query: any = { status };
  if (ownerId) query.owner = ownerId;
  return this.find(query).populate('owner createdBy updatedBy convertedTo');
};

// Static method to find unconverted leads
leadSchema.statics.findUnconverted = function(ownerId?: string) {
  const query: any = { convertedTo: { $exists: false } };
  if (ownerId) query.owner = ownerId;
  return this.find(query).populate('owner createdBy updatedBy');
};

// Static method to get leads by value range
leadSchema.statics.findByValueRange = function(minValue: number, maxValue: number, ownerId?: string) {
  const query: any = { value: { $gte: minValue, $lte: maxValue } };
  if (ownerId) query.owner = ownerId;
  return this.find(query).populate('owner createdBy updatedBy');
};

export const Lead = mongoose.model<ILead>('Lead', leadSchema);
export default Lead;