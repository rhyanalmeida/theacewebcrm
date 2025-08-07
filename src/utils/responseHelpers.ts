import { Response } from 'express';
import { ApiResponse } from '../types';

/**
 * Send successful response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
  meta?: any
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta
  };

  res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  message: string = 'Error occurred',
  statusCode: number = 500,
  errors?: string[]
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    errors
  };

  res.status(statusCode).json(response);
};

/**
 * Send paginated response
 */
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
    nextPage?: number | null;
    prevPage?: number | null;
  },
  message: string = 'Data retrieved successfully',
  statusCode: number = 200
): void => {
  const response: ApiResponse<T[]> = {
    success: true,
    message,
    data,
    meta
  };

  res.status(statusCode).json(response);
};

/**
 * Send created response
 */
export const sendCreated = <T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): void => {
  sendSuccess(res, data, message, 201);
};

/**
 * Send updated response
 */
export const sendUpdated = <T>(
  res: Response,
  data: T,
  message: string = 'Resource updated successfully'
): void => {
  sendSuccess(res, data, message, 200);
};

/**
 * Send deleted response
 */
export const sendDeleted = (
  res: Response,
  message: string = 'Resource deleted successfully'
): void => {
  const response: ApiResponse = {
    success: true,
    message
  };

  res.status(200).json(response);
};

/**
 * Send not found response
 */
export const sendNotFound = (
  res: Response,
  message: string = 'Resource not found'
): void => {
  sendError(res, message, 404);
};

/**
 * Send bad request response
 */
export const sendBadRequest = (
  res: Response,
  message: string = 'Bad request',
  errors?: string[]
): void => {
  sendError(res, message, 400, errors);
};

/**
 * Send unauthorized response
 */
export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized access'
): void => {
  sendError(res, message, 401);
};

/**
 * Send forbidden response
 */
export const sendForbidden = (
  res: Response,
  message: string = 'Access forbidden'
): void => {
  sendError(res, message, 403);
};

/**
 * Send conflict response
 */
export const sendConflict = (
  res: Response,
  message: string = 'Resource conflict',
  errors?: string[]
): void => {
  sendError(res, message, 409, errors);
};

/**
 * Send too many requests response
 */
export const sendTooManyRequests = (
  res: Response,
  message: string = 'Too many requests',
  retryAfter?: number
): void => {
  const response: ApiResponse = {
    success: false,
    message
  };

  if (retryAfter) {
    res.set('Retry-After', retryAfter.toString());
  }

  res.status(429).json(response);
};

/**
 * Send validation error response
 */
export const sendValidationError = (
  res: Response,
  errors: string[],
  message: string = 'Validation failed'
): void => {
  sendError(res, message, 422, errors);
};

/**
 * Send internal server error response
 */
export const sendInternalError = (
  res: Response,
  message: string = 'Internal server error'
): void => {
  sendError(res, message, 500);
};

/**
 * Send statistics response
 */
export const sendStats = <T>(
  res: Response,
  stats: T,
  message: string = 'Statistics retrieved successfully'
): void => {
  sendSuccess(res, stats, message);
};

/**
 * Send search results response
 */
export const sendSearchResults = <T>(
  res: Response,
  results: T[],
  total: number,
  query: string,
  message?: string
): void => {
  const finalMessage = message || `Found ${total} results for "${query}"`;
  
  const response: ApiResponse<T[]> = {
    success: true,
    message: finalMessage,
    data: results,
    meta: {
      total,
      query
    } as any
  };

  res.json(response);
};

/**
 * Send file response
 */
export const sendFile = (
  res: Response,
  filePath: string,
  filename?: string,
  contentType?: string
): void => {
  if (contentType) {
    res.type(contentType);
  }

  if (filename) {
    res.attachment(filename);
  }

  res.sendFile(filePath);
};

/**
 * Send CSV response
 */
export const sendCSV = (
  res: Response,
  csvData: string,
  filename: string = 'export.csv'
): void => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvData);
};

/**
 * Send no content response
 */
export const sendNoContent = (res: Response): void => {
  res.status(204).send();
};

/**
 * Helper to determine appropriate success message based on HTTP method
 */
export const getMethodMessage = (method: string, resourceName: string): string => {
  const messages: Record<string, string> = {
    GET: `${resourceName} retrieved successfully`,
    POST: `${resourceName} created successfully`,
    PUT: `${resourceName} updated successfully`,
    PATCH: `${resourceName} updated successfully`,
    DELETE: `${resourceName} deleted successfully`
  };

  return messages[method.toUpperCase()] || 'Operation completed successfully';
};

export default {
  sendSuccess,
  sendError,
  sendPaginated,
  sendCreated,
  sendUpdated,
  sendDeleted,
  sendNotFound,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendConflict,
  sendTooManyRequests,
  sendValidationError,
  sendInternalError,
  sendStats,
  sendSearchResults,
  sendFile,
  sendCSV,
  sendNoContent,
  getMethodMessage
};