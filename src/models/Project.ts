import mongoose, { Schema } from 'mongoose';
import { IProject, ProjectStatus } from '../types';

const projectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Project name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: Object.values(ProjectStatus),
    default: ProjectStatus.PLANNING,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(this: IProject, date: Date) {
        return !date || !this.startDate || date >= this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative'],
    default: 0
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative'],
    default: 0
  },
  budget: {
    type: Number,
    min: [0, 'Budget cannot be negative'],
    default: 0
  },
  actualCost: {
    type: Number,
    min: [0, 'Actual cost cannot be negative'],
    default: 0
  },
  client: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Client company is required']
  },
  assignedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  manager: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Project manager is required']
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
projectSchema.index({ status: 1 });
projectSchema.index({ manager: 1 });
projectSchema.index({ client: 1 });
projectSchema.index({ assignedUsers: 1 });
projectSchema.index({ startDate: 1 });
projectSchema.index({ endDate: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ tags: 1 });

// Compound indexes
projectSchema.index({ status: 1, manager: 1 });
projectSchema.index({ client: 1, status: 1 });
projectSchema.index({ manager: 1, status: 1, startDate: -1 });

// Virtual for project duration in days
projectSchema.virtual('durationInDays').get(function(this: IProject) {
  if (!this.startDate || !this.endDate) return null;
  return Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual for progress percentage
projectSchema.virtual('progressPercentage').get(function(this: IProject) {
  if (!this.estimatedHours || this.estimatedHours === 0) return 0;
  return Math.min(100, Math.round((this.actualHours / this.estimatedHours) * 100));
});

// Virtual for budget utilization percentage
projectSchema.virtual('budgetUtilizationPercentage').get(function(this: IProject) {
  if (!this.budget || this.budget === 0) return 0;
  return Math.round((this.actualCost / this.budget) * 100);
});

// Virtual for is overdue
projectSchema.virtual('isOverdue').get(function(this: IProject) {
  if (!this.endDate) return false;
  return this.endDate < new Date() && ![ProjectStatus.COMPLETED, ProjectStatus.CANCELLED].includes(this.status);
});

// Virtual for is active
projectSchema.virtual('isActive').get(function(this: IProject) {
  return [ProjectStatus.PLANNING, ProjectStatus.IN_PROGRESS, ProjectStatus.REVIEW].includes(this.status);
});

// Pre-save middleware
projectSchema.pre('save', function(next) {
  // Ensure manager is in assigned users
  if (this.manager && this.assignedUsers.indexOf(this.manager) === -1) {
    this.assignedUsers.push(this.manager);
  }
  
  next();
});

// Static method to find by status
projectSchema.statics.findByStatus = function(status: ProjectStatus, managerId?: string) {
  const query: any = { status };
  if (managerId) query.manager = managerId;
  return this.find(query).populate('client manager assignedUsers createdBy updatedBy');
};

// Static method to find active projects
projectSchema.statics.findActive = function(managerId?: string) {
  const query: any = { 
    status: { $in: [ProjectStatus.PLANNING, ProjectStatus.IN_PROGRESS, ProjectStatus.REVIEW] }
  };
  if (managerId) query.manager = managerId;
  return this.find(query).populate('client manager assignedUsers createdBy updatedBy');
};

// Static method to find overdue projects
projectSchema.statics.findOverdue = function(managerId?: string) {
  const query: any = { 
    endDate: { $lt: new Date() },
    status: { $nin: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED] }
  };
  if (managerId) query.manager = managerId;
  return this.find(query).populate('client manager assignedUsers createdBy updatedBy');
};

// Static method to find projects by user
projectSchema.statics.findByUser = function(userId: string) {
  return this.find({ assignedUsers: userId }).populate('client manager assignedUsers createdBy updatedBy');
};

// Static method to get project statistics
projectSchema.statics.getProjectStats = function(managerId?: string) {
  const matchQuery: any = {};
  if (managerId) matchQuery.manager = new mongoose.Types.ObjectId(managerId);
  
  return this.aggregate([
    { $match: matchQuery },
    { $group: {
      _id: '$status',
      count: { $sum: 1 },
      totalBudget: { $sum: '$budget' },
      totalActualCost: { $sum: '$actualCost' },
      totalEstimatedHours: { $sum: '$estimatedHours' },
      totalActualHours: { $sum: '$actualHours' }
    }}
  ]);
};

export const Project = mongoose.model<IProject>('Project', projectSchema);
export default Project;