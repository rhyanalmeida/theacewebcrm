import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import SupabaseAuthService, { UserProfile } from '../services/supabase/auth';

// Extend Request interface for Supabase auth
export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
  session?: any;
}

/**
 * Supabase authentication middleware
 */
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
      return;
    }

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      logger.error('Authentication error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    // Get user profile with role information
    const userProfile = await SupabaseAuthService.getUserProfile(user.id);
    
    if (!userProfile || userProfile.status !== 'active') {
      res.status(401).json({
        success: false,
        message: 'User not found or account inactive'
      });
      return;
    }

    // Attach user and session to request
    req.user = userProfile;
    req.session = { user };
    
    next();
    
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuthenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        const userProfile = await SupabaseAuthService.getUserProfile(user.id);
        if (userProfile && userProfile.status === 'active') {
          req.user = userProfile;
          req.session = { user };
        }
      }
    }
    
    next();
  } catch (error) {
    logger.warn('Optional authentication warning:', error);
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

/**
 * Check if user is admin
 */
export const requireAdmin = authorize('admin');

/**
 * Check if user is admin or manager
 */
export const requireManagerOrAdmin = authorize('admin', 'manager');

/**
 * Middleware to check resource ownership or admin/manager role
 */
export const checkOwnershipOrRole = (resourceUserField: string = 'owner_id') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Admins and managers can access all resources
    if (['admin', 'manager'].includes(req.user.role || '')) {
      next();
      return;
    }

    // For regular users, check ownership
    const resourceUserId = req.body[resourceUserField] || req.params.userId || req.user.id;
    
    if (req.user.id !== resourceUserId) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
      return;
    }

    next();
  };
};

/**
 * Rate limiting for authentication endpoints
 */
export const authRateLimit = (windowMs: number = 15 * 60 * 1000, maxAttempts: number = 5) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
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
      next();
      return;
    }
    
    if (clientAttempts.count >= maxAttempts) {
      const resetIn = Math.ceil((clientAttempts.resetTime - now) / 1000);
      res.status(429).json({
        success: false,
        message: `Too many authentication attempts. Try again in ${resetIn} seconds.`,
        retryAfter: resetIn
      });
      return;
    }
    
    clientAttempts.count++;
    next();
  };
};

/**
 * Extract token from request headers
 */
function extractToken(req: Request): string | null {
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
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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
  optionalAuthenticate,
  authorize,
  requireAdmin,
  requireManagerOrAdmin,
  checkOwnershipOrRole,
  authRateLimit,
  logAuthEvent
};