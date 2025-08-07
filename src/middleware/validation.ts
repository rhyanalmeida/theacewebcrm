import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { createApiError } from './errorHandler';
import { UserRole, LeadStatus, DealStage, ProjectStatus } from '../types';

/**
 * Generic validation middleware
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      throw createApiError.badRequest('Validation failed', errors);
    }

    req.body = value;
    next();
  };
};

/**
 * Validation middleware for query parameters
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      throw createApiError.badRequest('Query validation failed', errors);
    }

    req.query = value;
    next();
  };
};

/**
 * Validation middleware for URL parameters
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, { 
      abortEarly: false 
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      throw createApiError.badRequest('Parameter validation failed', errors);
    }

    req.params = value;
    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  // MongoDB ObjectId validation
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid ID format'),
  
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),
  
  // Common filters
  filters: Joi.object({
    search: Joi.string().trim().min(1).max(100),
    status: Joi.string(),
    role: Joi.string().valid(...Object.values(UserRole)),
    owner: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    createdBy: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    tags: Joi.string(),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso().greater(Joi.ref('dateFrom'))
  })
};

// User validation schemas
export const userSchemas = {
  register: Joi.object({
    firstName: Joi.string().trim().min(2).max(50).required(),
    lastName: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    role: Joi.string().valid(...Object.values(UserRole)).default(UserRole.USER),
    phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
    department: Joi.string().trim().max(100)
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().trim().min(2).max(50),
    lastName: Joi.string().trim().min(2).max(50),
    phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).allow(''),
    department: Joi.string().trim().max(100).allow('')
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Passwords do not match'
    })
  }),

  resetPassword: Joi.object({
    email: Joi.string().email().required()
  })
};

// Contact validation schemas
export const contactSchemas = {
  create: Joi.object({
    firstName: Joi.string().trim().min(2).max(50).required(),
    lastName: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().email().lowercase().required(),
    phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
    company: Joi.string().trim().max(100),
    position: Joi.string().trim().max(100),
    address: Joi.object({
      street: Joi.string().trim().max(200),
      city: Joi.string().trim().max(100),
      state: Joi.string().trim().max(100),
      zipCode: Joi.string().trim().max(20),
      country: Joi.string().trim().max(100)
    }),
    notes: Joi.string().trim().max(2000),
    tags: Joi.array().items(Joi.string().trim().lowercase())
  }),

  update: Joi.object({
    firstName: Joi.string().trim().min(2).max(50),
    lastName: Joi.string().trim().min(2).max(50),
    email: Joi.string().email().lowercase(),
    phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).allow(''),
    company: Joi.string().trim().max(100).allow(''),
    position: Joi.string().trim().max(100).allow(''),
    address: Joi.object({
      street: Joi.string().trim().max(200).allow(''),
      city: Joi.string().trim().max(100).allow(''),
      state: Joi.string().trim().max(100).allow(''),
      zipCode: Joi.string().trim().max(20).allow(''),
      country: Joi.string().trim().max(100).allow('')
    }),
    notes: Joi.string().trim().max(2000).allow(''),
    tags: Joi.array().items(Joi.string().trim().lowercase())
  })
};

// Lead validation schemas
export const leadSchemas = {
  create: Joi.object({
    firstName: Joi.string().trim().min(2).max(50).required(),
    lastName: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().email().lowercase().required(),
    phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
    company: Joi.string().trim().max(100),
    status: Joi.string().valid(...Object.values(LeadStatus)).default(LeadStatus.NEW),
    source: Joi.string().trim().max(100),
    value: Joi.number().min(0).default(0),
    notes: Joi.string().trim().max(2000),
    tags: Joi.array().items(Joi.string().trim().lowercase())
  }),

  update: Joi.object({
    firstName: Joi.string().trim().min(2).max(50),
    lastName: Joi.string().trim().min(2).max(50),
    email: Joi.string().email().lowercase(),
    phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).allow(''),
    company: Joi.string().trim().max(100).allow(''),
    status: Joi.string().valid(...Object.values(LeadStatus)),
    source: Joi.string().trim().max(100).allow(''),
    value: Joi.number().min(0),
    notes: Joi.string().trim().max(2000).allow(''),
    tags: Joi.array().items(Joi.string().trim().lowercase())
  })
};

// Deal validation schemas
export const dealSchemas = {
  create: Joi.object({
    title: Joi.string().trim().min(2).max(200).required(),
    description: Joi.string().trim().max(2000),
    value: Joi.number().min(0).required(),
    stage: Joi.string().valid(...Object.values(DealStage)).default(DealStage.PROSPECTING),
    probability: Joi.number().min(0).max(100),
    expectedCloseDate: Joi.date().iso().greater('now'),
    contact: commonSchemas.objectId.required(),
    company: commonSchemas.objectId.required(),
    notes: Joi.string().trim().max(2000),
    tags: Joi.array().items(Joi.string().trim().lowercase())
  }),

  update: Joi.object({
    title: Joi.string().trim().min(2).max(200),
    description: Joi.string().trim().max(2000).allow(''),
    value: Joi.number().min(0),
    stage: Joi.string().valid(...Object.values(DealStage)),
    probability: Joi.number().min(0).max(100),
    expectedCloseDate: Joi.date().iso().allow(null),
    actualCloseDate: Joi.date().iso(),
    contact: commonSchemas.objectId,
    company: commonSchemas.objectId,
    notes: Joi.string().trim().max(2000).allow(''),
    tags: Joi.array().items(Joi.string().trim().lowercase())
  })
};

// Company validation schemas
export const companySchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(200).required(),
    description: Joi.string().trim().max(2000),
    website: Joi.string().uri(),
    industry: Joi.string().trim().max(100),
    size: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+', 'Unknown').default('Unknown'),
    address: Joi.object({
      street: Joi.string().trim().max(200),
      city: Joi.string().trim().max(100),
      state: Joi.string().trim().max(100),
      zipCode: Joi.string().trim().max(20),
      country: Joi.string().trim().max(100)
    }),
    phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
    email: Joi.string().email().lowercase(),
    notes: Joi.string().trim().max(2000),
    tags: Joi.array().items(Joi.string().trim().lowercase())
  }),

  update: Joi.object({
    name: Joi.string().trim().min(2).max(200),
    description: Joi.string().trim().max(2000).allow(''),
    website: Joi.string().uri().allow(''),
    industry: Joi.string().trim().max(100).allow(''),
    size: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+', 'Unknown'),
    address: Joi.object({
      street: Joi.string().trim().max(200).allow(''),
      city: Joi.string().trim().max(100).allow(''),
      state: Joi.string().trim().max(100).allow(''),
      zipCode: Joi.string().trim().max(20).allow(''),
      country: Joi.string().trim().max(100).allow('')
    }),
    phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).allow(''),
    email: Joi.string().email().lowercase().allow(''),
    notes: Joi.string().trim().max(2000).allow(''),
    tags: Joi.array().items(Joi.string().trim().lowercase())
  })
};

// Project validation schemas
export const projectSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(200).required(),
    description: Joi.string().trim().max(2000),
    status: Joi.string().valid(...Object.values(ProjectStatus)).default(ProjectStatus.PLANNING),
    startDate: Joi.date().iso().default(() => new Date()),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')),
    estimatedHours: Joi.number().min(0).default(0),
    budget: Joi.number().min(0).default(0),
    client: commonSchemas.objectId.required(),
    assignedUsers: Joi.array().items(commonSchemas.objectId).min(1).required(),
    manager: commonSchemas.objectId.required(),
    notes: Joi.string().trim().max(2000),
    tags: Joi.array().items(Joi.string().trim().lowercase())
  }),

  update: Joi.object({
    name: Joi.string().trim().min(2).max(200),
    description: Joi.string().trim().max(2000).allow(''),
    status: Joi.string().valid(...Object.values(ProjectStatus)),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    estimatedHours: Joi.number().min(0),
    actualHours: Joi.number().min(0),
    budget: Joi.number().min(0),
    actualCost: Joi.number().min(0),
    client: commonSchemas.objectId,
    assignedUsers: Joi.array().items(commonSchemas.objectId).min(1),
    manager: commonSchemas.objectId,
    notes: Joi.string().trim().max(2000).allow(''),
    tags: Joi.array().items(Joi.string().trim().lowercase())
  })
};

export default {
  validate,
  validateQuery,
  validateParams,
  commonSchemas,
  userSchemas,
  contactSchemas,
  leadSchemas,
  dealSchemas,
  companySchemas,
  projectSchemas
};