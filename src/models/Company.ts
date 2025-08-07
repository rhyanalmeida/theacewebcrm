import mongoose, { Schema } from 'mongoose';
import { ICompany } from '../types';

const companySchema = new Schema<ICompany>({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [200, 'Company name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  website: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, 'Please provide a valid website URL']
  },
  industry: {
    type: String,
    trim: true,
    maxlength: [100, 'Industry cannot exceed 100 characters']
  },
  size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+', 'Unknown'],
    default: 'Unknown'
  },
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters']
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [20, 'Zip code cannot exceed 20 characters']
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters']
    }
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please provide a valid phone number']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
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
    required: [true, 'Company owner is required']
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
companySchema.index({ name: 1 });
companySchema.index({ owner: 1 });
companySchema.index({ industry: 1 });
companySchema.index({ size: 1 });
companySchema.index({ tags: 1 });
companySchema.index({ createdAt: -1 });
companySchema.index({ email: 1 });

// Compound indexes
companySchema.index({ owner: 1, createdAt: -1 });
companySchema.index({ industry: 1, size: 1 });

// Text search index
companySchema.index({
  name: 'text',
  description: 'text',
  industry: 'text'
});

// Virtual for contacts count
companySchema.virtual('contactsCount', {
  ref: 'Contact',
  localField: '_id',
  foreignField: 'company',
  count: true
});

// Virtual for deals count
companySchema.virtual('dealsCount', {
  ref: 'Deal',
  localField: '_id',
  foreignField: 'company',
  count: true
});

// Virtual for projects count
companySchema.virtual('projectsCount', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'client',
  count: true
});

// Static method to search companies
companySchema.statics.searchCompanies = function(query: string, ownerId?: string) {
  const searchQuery: any = {
    $text: { $search: query }
  };
  
  if (ownerId) {
    searchQuery.owner = ownerId;
  }
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .populate('owner createdBy updatedBy', 'firstName lastName email');
};

// Static method to find by industry
companySchema.statics.findByIndustry = function(industry: string, ownerId?: string) {
  const query: any = { industry };
  if (ownerId) query.owner = ownerId;
  return this.find(query).populate('owner createdBy updatedBy', 'firstName lastName email');
};

// Static method to find by size
companySchema.statics.findBySize = function(size: string, ownerId?: string) {
  const query: any = { size };
  if (ownerId) query.owner = ownerId;
  return this.find(query).populate('owner createdBy updatedBy', 'firstName lastName email');
};

export const Company = mongoose.model<ICompany>('Company', companySchema);
export default Company;