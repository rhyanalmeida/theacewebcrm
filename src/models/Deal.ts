import mongoose, { Schema } from 'mongoose';
import { IDeal, DealStage } from '../types';

const dealSchema = new Schema<IDeal>({
  title: {
    type: String,
    required: [true, 'Deal title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  value: {
    type: Number,
    required: [true, 'Deal value is required'],
    min: [0, 'Value cannot be negative']
  },
  stage: {
    type: String,
    enum: Object.values(DealStage),
    default: DealStage.PROSPECTING,
    required: true
  },
  probability: {
    type: Number,
    min: [0, 'Probability cannot be less than 0'],
    max: [100, 'Probability cannot be greater than 100'],
    default: function(this: IDeal) {
      // Auto-set probability based on stage
      switch (this.stage) {
        case DealStage.PROSPECTING: return 10;
        case DealStage.QUALIFICATION: return 25;
        case DealStage.PROPOSAL: return 50;
        case DealStage.NEGOTIATION: return 75;
        case DealStage.CLOSED_WON: return 100;
        case DealStage.CLOSED_LOST: return 0;
        default: return 10;
      }
    }
  },
  expectedCloseDate: {
    type: Date,
    validate: {
      validator: function(this: IDeal, date: Date) {
        return !date || date > new Date();
      },
      message: 'Expected close date must be in the future'
    }
  },
  actualCloseDate: {
    type: Date,
    validate: {
      validator: function(this: IDeal, date: Date) {
        if (!date) return true;
        return [DealStage.CLOSED_WON, DealStage.CLOSED_LOST].includes(this.stage);
      },
      message: 'Actual close date can only be set for closed deals'
    }
  },
  contact: {
    type: Schema.Types.ObjectId,
    ref: 'Contact',
    required: [true, 'Contact is required']
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required']
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Deal owner is required']
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
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Updated by is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
dealSchema.index({ stage: 1 });
dealSchema.index({ owner: 1 });
dealSchema.index({ contact: 1 });
dealSchema.index({ company: 1 });
dealSchema.index({ value: -1 });
dealSchema.index({ expectedCloseDate: 1 });
dealSchema.index({ actualCloseDate: 1 });
dealSchema.index({ createdAt: -1 });
dealSchema.index({ tags: 1 });

// Compound indexes
dealSchema.index({ owner: 1, stage: 1 });
dealSchema.index({ stage: 1, expectedCloseDate: 1 });

// Virtual for deal age in days
dealSchema.virtual('ageInDays').get(function(this: IDeal) {
  return Math.floor((new Date().getTime() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual for is closed
dealSchema.virtual('isClosed').get(function(this: IDeal) {
  return [DealStage.CLOSED_WON, DealStage.CLOSED_LOST].includes(this.stage);
});

// Virtual for weighted value (value * probability)
dealSchema.virtual('weightedValue').get(function(this: IDeal) {
  return this.value * (this.probability || 0) / 100;
});

// Pre-save middleware to update probability and close date
dealSchema.pre('save', function(next) {
  // Auto-update probability based on stage if not manually set
  if (this.isModified('stage') && !this.isModified('probability')) {
    switch (this.stage) {
      case DealStage.PROSPECTING: this.probability = 10; break;
      case DealStage.QUALIFICATION: this.probability = 25; break;
      case DealStage.PROPOSAL: this.probability = 50; break;
      case DealStage.NEGOTIATION: this.probability = 75; break;
      case DealStage.CLOSED_WON: this.probability = 100; break;
      case DealStage.CLOSED_LOST: this.probability = 0; break;
    }
  }
  
  // Set actual close date when deal is closed
  if (this.isModified('stage') && this.isClosed && !this.actualCloseDate) {
    this.actualCloseDate = new Date();
  }
  
  next();
});

// Static method to find by stage
dealSchema.statics.findByStage = function(stage: DealStage, ownerId?: string) {
  const query: any = { stage };
  if (ownerId) query.owner = ownerId;
  return this.find(query).populate('contact company owner createdBy updatedBy');
};

// Static method to find open deals
dealSchema.statics.findOpen = function(ownerId?: string) {
  const query: any = { 
    stage: { $nin: [DealStage.CLOSED_WON, DealStage.CLOSED_LOST] }
  };
  if (ownerId) query.owner = ownerId;
  return this.find(query).populate('contact company owner createdBy updatedBy');
};

// Static method to get pipeline value
dealSchema.statics.getPipelineValue = function(ownerId?: string) {
  const matchQuery: any = { 
    stage: { $nin: [DealStage.CLOSED_WON, DealStage.CLOSED_LOST] }
  };
  if (ownerId) matchQuery.owner = new mongoose.Types.ObjectId(ownerId);
  
  return this.aggregate([
    { $match: matchQuery },
    { $group: {
      _id: null,
      totalValue: { $sum: '$value' },
      weightedValue: { $sum: { $multiply: ['$value', { $divide: ['$probability', 100] }] } },
      count: { $sum: 1 }
    }}
  ]);
};

export const Deal = mongoose.model<IDeal>('Deal', dealSchema);
export default Deal;