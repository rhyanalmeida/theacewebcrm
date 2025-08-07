import mongoose, { Schema } from 'mongoose';
import { IContact } from '../types';

const contactSchema = new Schema<IContact>({
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
  position: {
    type: String,
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters']
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
    required: [true, 'Contact owner is required']
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
contactSchema.index({ email: 1 });
contactSchema.index({ owner: 1 });
contactSchema.index({ createdBy: 1 });
contactSchema.index({ company: 1 });
contactSchema.index({ tags: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ firstName: 1, lastName: 1 });

// Compound indexes
contactSchema.index({ owner: 1, createdAt: -1 });
contactSchema.index({ email: 1, company: 1 });

// Virtual for full name
contactSchema.virtual('fullName').get(function(this: IContact) {
  return `${this.firstName} ${this.lastName}`;
});

// Static method to find by owner
contactSchema.statics.findByOwner = function(ownerId: string) {
  return this.find({ owner: ownerId }).populate('owner createdBy updatedBy', 'firstName lastName email');
};

// Static method to search contacts
contactSchema.statics.searchContacts = function(query: string, ownerId?: string) {
  const searchRegex = new RegExp(query, 'i');
  const searchQuery: any = {
    $or: [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { company: searchRegex }
    ]
  };
  
  if (ownerId) {
    searchQuery.owner = ownerId;
  }
  
  return this.find(searchQuery).populate('owner createdBy updatedBy', 'firstName lastName email');
};

export const Contact = mongoose.model<IContact>('Contact', contactSchema);
export default Contact;