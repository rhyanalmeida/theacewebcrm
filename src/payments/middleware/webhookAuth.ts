import { Request, Response, NextFunction } from 'express';
import { StripeService } from '../services';
import { logger } from '../../config/logger';

export interface WebhookRequest extends Request {
  rawBody?: Buffer;
}

// Middleware to capture raw body for webhook signature verification
export const captureRawBody = (req: WebhookRequest, res: Response, next: NextFunction): void => {
  let data = '';
  req.setEncoding('utf8');

  req.on('data', (chunk) => {
    data += chunk;
  });

  req.on('end', () => {
    req.rawBody = Buffer.from(data, 'utf8');
    req.body = data;
    next();
  });
};

// Stripe webhook signature verification
export const verifyStripeWebhook = async (req: WebhookRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.rawBody || req.body;

    if (!signature) {
      res.status(400).json({
        success: false,
        message: 'Missing Stripe signature'
      });
      return;
    }

    if (!payload) {
      res.status(400).json({
        success: false,
        message: 'Missing request body'
      });
      return;
    }

    // Verify webhook signature
    const event = await StripeService.constructWebhookEvent(payload, signature);
    
    // Attach verified event to request
    req.body = event;
    
    logger.info('Stripe webhook verified', { 
      eventType: event.type,
      eventId: event.id
    });

    next();
  } catch (error) {
    logger.error('Stripe webhook verification failed:', error);
    res.status(400).json({
      success: false,
      message: 'Webhook signature verification failed'
    });
  }
};

// Generic webhook authentication for other payment providers
export const verifyWebhookAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.WEBHOOK_AUTH_TOKEN;

  if (!expectedToken) {
    logger.warn('WEBHOOK_AUTH_TOKEN not configured');
    next();
    return;
  }

  if (!authHeader) {
    res.status(401).json({
      success: false,
      message: 'Missing authorization header'
    });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (token !== expectedToken) {
    logger.error('Webhook authentication failed', { 
      providedToken: token.substring(0, 10) + '...' 
    });
    res.status(401).json({
      success: false,
      message: 'Invalid webhook token'
    });
    return;
  }

  logger.info('Webhook authenticated successfully');
  next();
};

// Rate limiting for webhooks
export const webhookRateLimit = (windowMs: number = 60000, maxRequests: number = 100) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;

    const clientData = requests.get(clientIp);
    
    if (!clientData || clientData.resetTime !== windowStart) {
      requests.set(clientIp, { count: 1, resetTime: windowStart });
      next();
      return;
    }

    if (clientData.count >= maxRequests) {
      logger.warn('Webhook rate limit exceeded', { 
        clientIp, 
        count: clientData.count,
        limit: maxRequests 
      });
      
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded'
      });
      return;
    }

    clientData.count++;
    next();
  };
};

// Webhook request logging middleware
export const logWebhookRequest = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Log incoming webhook
  logger.info('Webhook received', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    ip: req.ip
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Webhook processed', {
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
};

// Middleware to handle webhook errors gracefully
export const handleWebhookErrors = (error: any, req: Request, res: Response, next: NextFunction): void => {
  logger.error('Webhook error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });

  // Always respond with 200 for webhooks to prevent retries
  // unless it's a client error (4xx)
  const statusCode = error.statusCode || (error.status >= 400 && error.status < 500) ? error.status : 200;
  
  res.status(statusCode).json({
    success: false,
    message: 'Webhook processing failed',
    timestamp: new Date().toISOString()
  });
};

// Combined Stripe webhook middleware
export const stripeWebhookMiddleware = [
  captureRawBody,
  logWebhookRequest,
  verifyStripeWebhook,
  handleWebhookErrors
];

// Combined generic webhook middleware
export const genericWebhookMiddleware = [
  logWebhookRequest,
  webhookRateLimit(),
  verifyWebhookAuth,
  handleWebhookErrors
];