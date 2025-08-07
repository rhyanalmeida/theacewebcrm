import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ApiResponse } from '../types';
import config from '../config/environment';

/**
 * Custom error class for API errors (primary)
 */
export class CustomError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: string[];

  constructor(
    message: string,
    statusCode: number,
    errors?: string[],
    isOperational: boolean = true,
    stack?: string
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Legacy ApiError class for backward compatibility
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: string[];

  constructor(
    statusCode: number,
    message: string,
    errors?: string[],
    isOperational: boolean = true,
    stack?: string
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: Error | CustomError | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: string[] = [];

  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Handle different types of errors
  if (err instanceof CustomError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors || [];
  } else if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors || [];
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = handleValidationError(err);
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    errors = ['Invalid resource ID'];
  } else if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value';
    errors = handleDuplicateKeyError(err);
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    errors = ['JWT token is invalid'];
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    errors = ['JWT token has expired'];
  }

  // Create error response
  const errorResponse: ApiResponse = {
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined
  };

  // Don't leak error details in production
  if (config.nodeEnv === 'production' && !(err instanceof CustomError) && !(err instanceof ApiError)) {
    errorResponse.message = 'Something went wrong';
    errorResponse.errors = undefined;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Handle 404 errors for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const message = `Route ${req.originalUrl} not found`;
  
  logger.warn('Route not found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(404).json({
    success: false,
    message
  });
};

/**
 * Async error wrapper to catch async errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Catch async function wrapper - alias for asyncHandler
 */
export const catchAsync = asyncHandler;

/**
 * Handle Mongoose validation errors
 */
function handleValidationError(err: any): string[] {
  const errors: string[] = [];
  
  if (err.errors) {
    for (const field in err.errors) {
      errors.push(err.errors[field].message);
    }
  }
  
  return errors;
}

/**
 * Handle MongoDB duplicate key errors
 */
function handleDuplicateKeyError(err: any): string[] {
  const field = Object.keys(err.keyPattern)[0];
  const value = err.keyValue[field];
  
  return [`${field}: '${value}' already exists`];
}

/**
 * Create API errors easily
 */
export const createApiError = {
  badRequest: (message: string, errors?: string[]) => 
    new ApiError(400, message, errors),
    
  unauthorized: (message: string = 'Unauthorized') => 
    new ApiError(401, message),
    
  forbidden: (message: string = 'Forbidden') => 
    new ApiError(403, message),
    
  notFound: (message: string = 'Resource not found') => 
    new ApiError(404, message),
    
  conflict: (message: string, errors?: string[]) => 
    new ApiError(409, message, errors),
    
  unprocessableEntity: (message: string, errors?: string[]) => 
    new ApiError(422, message, errors),
    
  tooManyRequests: (message: string = 'Too many requests') => 
    new ApiError(429, message),
    
  internalError: (message: string = 'Internal server error') => 
    new ApiError(500, message),
    
  serviceUnavailable: (message: string = 'Service temporarily unavailable') => 
    new ApiError(503, message)
};

/**
 * Process termination handler for uncaught errors
 */
export const handleUncaughtException = () => {
  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled Rejection:', reason);
    process.exit(1);
  });
};

export default {
  CustomError,
  ApiError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  catchAsync,
  createApiError,
  handleUncaughtException
};