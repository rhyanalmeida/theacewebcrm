import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';

export interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  userId?: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const originalSend = res.json;

  // Override res.json to capture response data
  res.json = function(body: any) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      statusCode: res.statusCode,
      responseTime
    };

    // Add user ID if available
    if ((req as any).user?.id) {
      logEntry.userId = (req as any).user.id;
    }

    // Log errors separately
    if (res.statusCode >= 400) {
      logEntry.error = body?.error || 'Unknown error';
    }

    // Only log in development or if specifically enabled
    if (config.nodeEnv === 'development' || process.env.ENABLE_REQUEST_LOGGING === 'true') {
      console.log('📝 Request Log:', JSON.stringify(logEntry, null, 2));
    }

    return originalSend.call(this, body);
  };

  next();
};

export const logActivity = async (
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'file' | 'payment',
  title: string,
  relatedType: 'lead' | 'contact' | 'company' | 'deal' | 'project' | 'invoice',
  relatedId: string,
  userId: string,
  description?: string,
  metadata?: any
): Promise<void> => {
  try {
    // Import supabase here to avoid circular dependency
    const { supabase } = await import('../config/supabase');
    
    await supabase.from('activities').insert({
      type,
      title,
      description,
      related_type: relatedType,
      related_id: relatedId,
      user_id: userId,
      metadata
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

export const createActivityLogger = (
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'file' | 'payment',
  relatedType: 'lead' | 'contact' | 'company' | 'deal' | 'project' | 'invoice'
) => {
  return async (
    title: string,
    relatedId: string,
    userId: string,
    description?: string,
    metadata?: any
  ): Promise<void> => {
    await logActivity(type, title, relatedType, relatedId, userId, description, metadata);
  };
};

// Pre-defined activity loggers
export const loggers = {
  lead: {
    call: createActivityLogger('call', 'lead'),
    email: createActivityLogger('email', 'lead'),
    meeting: createActivityLogger('meeting', 'lead'),
    note: createActivityLogger('note', 'lead'),
    task: createActivityLogger('task', 'lead')
  },
  contact: {
    call: createActivityLogger('call', 'contact'),
    email: createActivityLogger('email', 'contact'),
    meeting: createActivityLogger('meeting', 'contact'),
    note: createActivityLogger('note', 'contact'),
    task: createActivityLogger('task', 'contact')
  },
  company: {
    call: createActivityLogger('call', 'company'),
    email: createActivityLogger('email', 'company'),
    meeting: createActivityLogger('meeting', 'company'),
    note: createActivityLogger('note', 'company'),
    task: createActivityLogger('task', 'company')
  },
  deal: {
    call: createActivityLogger('call', 'deal'),
    email: createActivityLogger('email', 'deal'),
    meeting: createActivityLogger('meeting', 'deal'),
    note: createActivityLogger('note', 'deal'),
    task: createActivityLogger('task', 'deal')
  },
  project: {
    call: createActivityLogger('call', 'project'),
    email: createActivityLogger('email', 'project'),
    meeting: createActivityLogger('meeting', 'project'),
    note: createActivityLogger('note', 'project'),
    task: createActivityLogger('task', 'project'),
    file: createActivityLogger('file', 'project')
  },
  invoice: {
    email: createActivityLogger('email', 'invoice'),
    payment: createActivityLogger('payment', 'invoice'),
    note: createActivityLogger('note', 'invoice')
  }
};