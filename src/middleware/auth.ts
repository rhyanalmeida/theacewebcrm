import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthRequest, JwtPayload, UserRole } from '../types';
import { logger } from '../config/logger';
import config from '../config';

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Authentication middleware to verify JWT tokens
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    
    // Find user and check if still active
    const user = await User.findById(decoded.userId).select('+refreshToken');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
    
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Authorization middleware to check user roles
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuthenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Middleware to check if user owns resource or is admin/manager
 */
export const checkOwnershipOrRole = (resourceUserField: string = 'owner') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admins and managers can access all resources
    if ([UserRole.ADMIN, UserRole.MANAGER].includes(req.user.role)) {
      return next();
    }

    // For regular users, check ownership
    const resourceUserId = req.body[resourceUserField] || req.params.userId || req.user._id.toString();
    
    if (req.user._id.toString() !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = (windowMs: number = 15 * 60 * 1000, maxAttempts: number = 5) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [ip, data] of attempts.entries()) {
      if (now > data.resetTime) {
        attempts.delete(ip);
      }
    }
    
    const clientAttempts = attempts.get(clientIp);
    
    if (!clientAttempts) {
      attempts.set(clientIp, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (clientAttempts.count >= maxAttempts) {
      const resetIn = Math.ceil((clientAttempts.resetTime - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `Too many authentication attempts. Try again in ${resetIn} seconds.`,
        retryAfter: resetIn
      });
    }
    
    clientAttempts.count++;
    next();
  };
};

/**
 * Extract token from request headers or query parameters
 */
function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  // Check query parameter as fallback
  const queryToken = req.query.token as string;
  if (queryToken) {
    return queryToken;
  }
  
  return null;
}

/**
 * Middleware to log authentication events
 */
export const logAuthEvent = (event: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const userId = req.user?.id || 'anonymous';
    
    logger.info(`Auth Event: ${event}`, {
      userId,
      clientIp,
      userAgent,
      timestamp: new Date().toISOString()
    });
    
    next();
  };
};

export default {
  authenticate,
  authorize,
  optionalAuthenticate,
  checkOwnershipOrRole,
  authRateLimit,
  logAuthEvent
};