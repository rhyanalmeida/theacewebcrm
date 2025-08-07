import express, { Request, Response, NextFunction } from 'express';
import { EmailService } from '../services/EmailService';
import { CampaignManager } from '../campaigns/CampaignManager';
import { WorkflowEngine } from '../workflows/WorkflowEngine';
import { EmailTracker } from '../tracking/EmailTracker';
import { EmailQueue } from '../queue/EmailQueue';
import { UnsubscribeManager } from '../utils/UnsubscribeManager';
import { logger } from '../../utils/logger';

export interface EmailAPIOptions {
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  authentication?: {
    required: boolean;
    apiKeyHeader?: string;
  };
}

export class EmailAPI {
  private app: express.Application;
  private emailService: EmailService;
  private campaignManager: CampaignManager;
  private workflowEngine: WorkflowEngine;
  private emailTracker: EmailTracker;
  private emailQueue: EmailQueue;
  private unsubscribeManager: UnsubscribeManager;
  private options: EmailAPIOptions;

  constructor(options: EmailAPIOptions = {}) {
    this.app = express();
    this.emailService = new EmailService();
    this.campaignManager = new CampaignManager();
    this.workflowEngine = new WorkflowEngine();
    this.emailTracker = new EmailTracker();
    this.emailQueue = new EmailQueue();
    this.unsubscribeManager = new UnsubscribeManager();
    this.options = {
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        ...options.rateLimit
      },
      authentication: {
        required: true,
        apiKeyHeader: 'x-api-key',
        ...options.authentication
      }
    };

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware() {
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, { 
        userAgent: req.get('User-Agent'),
        ip: req.ip 
      });
      next();
    });

    // Rate limiting (basic implementation)
    const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
    
    this.app.use((req, res, next) => {
      if (!this.options.rateLimit) return next();
      
      const key = req.ip || 'unknown';
      const now = Date.now();
      const windowMs = this.options.rateLimit.windowMs;
      const maxRequests = this.options.rateLimit.maxRequests;
      
      let clientData = rateLimitStore.get(key);
      
      if (!clientData || now > clientData.resetTime) {
        clientData = { count: 0, resetTime: now + windowMs };
      }
      
      clientData.count++;
      rateLimitStore.set(key, clientData);
      
      if (clientData.count > maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        });
      }
      
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - clientData.count).toString(),
        'X-RateLimit-Reset': Math.ceil(clientData.resetTime / 1000).toString()
      });
      
      next();
    });

    // Authentication
    if (this.options.authentication?.required) {
      this.app.use('/api/email', (req, res, next) => {
        // Skip auth for public endpoints
        const publicPaths = ['/track/', '/unsubscribe/', '/webhook/'];
        if (publicPaths.some(path => req.path.includes(path))) {
          return next();
        }
        
        const apiKey = req.header(this.options.authentication!.apiKeyHeader!);
        if (!apiKey || !this.validateApiKey(apiKey)) {
          return res.status(401).json({ error: 'Invalid or missing API key' });
        }
        
        next();
      });
    }
  }

  private validateApiKey(apiKey: string): boolean {
    // In a real implementation, validate against your API key store
    const validApiKeys = process.env.EMAIL_API_KEYS?.split(',') || [];
    return validApiKeys.includes(apiKey);
  }

  private setupRoutes() {
    // Transactional Email Routes
    this.app.post('/api/email/send', this.handleSendEmail.bind(this));
    this.app.post('/api/email/send-template', this.handleSendTemplate.bind(this));
    this.app.post('/api/email/send-bulk', this.handleSendBulkEmail.bind(this));
    
    // Campaign Routes
    this.app.get('/api/email/campaigns', this.handleGetCampaigns.bind(this));
    this.app.post('/api/email/campaigns', this.handleCreateCampaign.bind(this));
    this.app.get('/api/email/campaigns/:campaignId', this.handleGetCampaign.bind(this));
    this.app.put('/api/email/campaigns/:campaignId', this.handleUpdateCampaign.bind(this));
    this.app.delete('/api/email/campaigns/:campaignId', this.handleDeleteCampaign.bind(this));
    this.app.post('/api/email/campaigns/:campaignId/send', this.handleSendCampaign.bind(this));
    this.app.post('/api/email/campaigns/:campaignId/pause', this.handlePauseCampaign.bind(this));
    this.app.post('/api/email/campaigns/:campaignId/resume', this.handleResumeCampaign.bind(this));
    this.app.post('/api/email/campaigns/:campaignId/duplicate', this.handleDuplicateCampaign.bind(this));
    this.app.get('/api/email/campaigns/:campaignId/report', this.handleGetCampaignReport.bind(this));
    
    // Segment Routes
    this.app.get('/api/email/segments', this.handleGetSegments.bind(this));
    this.app.post('/api/email/segments', this.handleCreateSegment.bind(this));
    this.app.put('/api/email/segments/:segmentId', this.handleUpdateSegment.bind(this));
    this.app.delete('/api/email/segments/:segmentId', this.handleDeleteSegment.bind(this));
    
    // Workflow Routes
    this.app.get('/api/email/workflows', this.handleGetWorkflows.bind(this));
    this.app.post('/api/email/workflows', this.handleCreateWorkflow.bind(this));
    this.app.get('/api/email/workflows/:workflowId', this.handleGetWorkflow.bind(this));
    this.app.put('/api/email/workflows/:workflowId', this.handleUpdateWorkflow.bind(this));
    this.app.delete('/api/email/workflows/:workflowId', this.handleDeleteWorkflow.bind(this));
    this.app.post('/api/email/workflows/:workflowId/pause', this.handlePauseWorkflow.bind(this));
    this.app.post('/api/email/workflows/:workflowId/resume', this.handleResumeWorkflow.bind(this));
    this.app.get('/api/email/workflows/:workflowId/executions', this.handleGetWorkflowExecutions.bind(this));
    this.app.post('/api/email/workflows/trigger', this.handleTriggerWorkflow.bind(this));
    
    // Queue Routes
    this.app.get('/api/email/queue', this.handleGetQueueItems.bind(this));
    this.app.get('/api/email/queue/stats', this.handleGetQueueStats.bind(this));
    this.app.get('/api/email/queue/health', this.handleGetQueueHealth.bind(this));
    this.app.post('/api/email/queue/:itemId/cancel', this.handleCancelQueueItem.bind(this));
    this.app.post('/api/email/queue/:itemId/retry', this.handleRetryQueueItem.bind(this));
    this.app.delete('/api/email/queue/:itemId', this.handleDeleteQueueItem.bind(this));
    this.app.post('/api/email/queue/clear-completed', this.handleClearCompletedQueue.bind(this));
    
    // Tracking Routes (Public)
    this.app.get('/api/email/track/open/:trackingId', this.handleTrackOpen.bind(this));
    this.app.get('/api/email/track/click/:trackingId', this.handleTrackClick.bind(this));
    
    // Analytics Routes
    this.app.get('/api/email/analytics/stats', this.handleGetStats.bind(this));
    this.app.get('/api/email/analytics/detailed', this.handleGetDetailedAnalytics.bind(this));
    this.app.get('/api/email/analytics/campaigns/:campaignId', this.handleGetCampaignAnalytics.bind(this));
    
    // Unsubscribe Routes (Public)
    this.app.get('/api/email/unsubscribe/:token', this.handleUnsubscribe.bind(this));
    this.app.post('/api/email/unsubscribe', this.handleUnsubscribePost.bind(this));
    this.app.get('/api/email/preferences/:token', this.handlePreferences.bind(this));
    this.app.post('/api/email/preferences/:token', this.handleUpdatePreferences.bind(this));
    
    // Webhook Routes (Public)
    this.app.post('/api/email/webhook/resend', this.handleResendWebhook.bind(this));
    this.app.post('/api/email/webhook/sendgrid', this.handleSendGridWebhook.bind(this));
    
    // System Routes
    this.app.get('/api/email/health', this.handleHealthCheck.bind(this));
    this.app.post('/api/email/test', this.handleTestConfiguration.bind(this));
    
    // Template Preview Route
    this.app.post('/api/email/preview', this.handlePreviewTemplate.bind(this));
  }

  // Transactional Email Handlers
  private async handleSendEmail(req: Request, res: Response) {
    try {
      const result = await this.emailService.sendEmail(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ 
        error: 'Failed to send email', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async handleSendTemplate(req: Request, res: Response) {
    try {
      const { template, ...options } = req.body;
      const result = await this.emailService.sendTemplate(template, options);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ 
        error: 'Failed to send template email', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async handleSendBulkEmail(req: Request, res: Response) {
    try {
      const { emails } = req.body;
      const results = await Promise.all(
        emails.map((email: any) => this.emailService.sendEmail(email))
      );
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(400).json({ 
        error: 'Failed to send bulk emails', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // Campaign Handlers
  private async handleGetCampaigns(req: Request, res: Response) {
    try {
      const campaigns = await this.campaignManager.getCampaigns(req.query as any);
      res.json({ success: true, data: campaigns });
    } catch (error) {
      res.status(400).json({ 
        error: 'Failed to get campaigns', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async handleCreateCampaign(req: Request, res: Response) {
    try {
      const campaign = await this.campaignManager.createCampaign(req.body);
      res.status(201).json({ success: true, data: campaign });
    } catch (error) {
      res.status(400).json({ 
        error: 'Failed to create campaign', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async handleGetCampaign(req: Request, res: Response) {
    try {
      const campaign = await this.campaignManager.getCampaign(req.params.campaignId);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(400).json({ 
        error: 'Failed to get campaign', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async handleSendCampaign(req: Request, res: Response) {
    try {
      await this.campaignManager.sendCampaign(req.params.campaignId);
      res.json({ success: true, message: 'Campaign sending started' });
    } catch (error) {
      res.status(400).json({ 
        error: 'Failed to send campaign', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async handleGetCampaignReport(req: Request, res: Response) {
    try {
      const report = await this.campaignManager.getCampaignPerformanceReport(req.params.campaignId);
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(400).json({ 
        error: 'Failed to get campaign report', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // Tracking Handlers
  private async handleTrackOpen(req: Request, res: Response) {
    try {
      await this.emailTracker.trackEmailOpen(
        req.params.trackingId,
        req.get('User-Agent'),
        req.ip
      );
      
      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 
        'base64'
      );
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.end(pixel);
    } catch (error) {
      // Still return pixel even if tracking fails
      const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      res.set('Content-Type', 'image/png');
      res.end(pixel);
    }
  }

  private async handleTrackClick(req: Request, res: Response) {
    try {
      const originalUrl = req.query.url as string;
      if (!originalUrl) {
        return res.status(400).json({ error: 'Missing URL parameter' });
      }
      
      const redirectUrl = await this.emailTracker.trackEmailClick(
        req.params.trackingId,
        originalUrl,
        req.get('User-Agent'),
        req.ip
      );
      
      res.redirect(302, redirectUrl);
    } catch (error) {
      // If tracking fails, still redirect to original URL
      const originalUrl = req.query.url as string;
      if (originalUrl) {
        res.redirect(302, originalUrl);
      } else {
        res.status(400).json({ error: 'Invalid tracking link' });
      }
    }
  }

  // Unsubscribe Handlers
  private async handleUnsubscribe(req: Request, res: Response) {
    try {
      const result = await this.unsubscribeManager.processUnsubscribe(req.params.token, req.ip);
      
      if (result.success) {
        // Return unsubscribe confirmation page
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Unsubscribed Successfully</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
                .container { background: white; padding: 40px; border-radius: 10px; display: inline-block; max-width: 500px; }
                h1 { color: #28a745; }
                .email { background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>✓ Unsubscribed Successfully</h1>
                <p>You have been unsubscribed from our email list.</p>
                <div class="email">${result.email}</div>
                <p>We're sorry to see you go! If you change your mind, you can resubscribe at any time.</p>
                <p><small>Processed on ${new Date().toLocaleDateString()}</small></p>
              </div>
            </body>
          </html>
        `);
      } else {
        res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Unsubscribe Error</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
                .container { background: white; padding: 40px; border-radius: 10px; display: inline-block; max-width: 500px; }
                h1 { color: #dc3545; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>❌ Error</h1>
                <p>${result.error}</p>
                <p>Please contact support if this problem persists.</p>
              </div>
            </body>
          </html>
        `);
      }
    } catch (error) {
      res.status(500).send('Internal server error');
    }
  }

  // Queue Handlers
  private async handleGetQueueStats(req: Request, res: Response) {
    try {
      const stats = this.emailQueue.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(400).json({ 
        error: 'Failed to get queue stats', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async handleGetQueueHealth(req: Request, res: Response) {
    try {
      const health = await this.emailQueue.getQueueHealth();
      res.json({ success: true, data: health });
    } catch (error) {
      res.status(400).json({ 
        error: 'Failed to get queue health', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // Webhook Handlers
  private async handleResendWebhook(req: Request, res: Response) {
    try {
      const { type, data } = req.body;
      
      switch (type) {
        case 'email.delivered':
          // Update tracking
          break;
        case 'email.bounced':
          await this.emailTracker.trackEmailBounce(
            data.email_id, 
            data.to, 
            data.bounce_type,
            data.reason
          );
          break;
        case 'email.complained':
          await this.emailTracker.trackEmailComplaint(
            data.email_id,
            data.to,
            data.complaint_type
          );
          break;
      }
      
      res.json({ received: true });
    } catch (error) {
      logger.error('Resend webhook error:', error);
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  }

  // System Handlers
  private async handleHealthCheck(req: Request, res: Response) {
    try {
      const providers = await this.emailService.testEmailConfiguration();
      const queueHealth = await this.emailQueue.getQueueHealth();
      
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          providers,
          queue: queueHealth,
          uptime: process.uptime()
        }
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'Service unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handlePreviewTemplate(req: Request, res: Response) {
    try {
      const { template, data } = req.body;
      // This would render the template with test data
      res.json({ 
        success: true, 
        data: { 
          html: `<p>Template preview for: ${template}</p>`,
          text: `Template preview for: ${template}`
        } 
      });
    } catch (error) {
      res.status(400).json({ 
        error: 'Failed to preview template', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // Placeholder handlers for other routes
  private async handleUpdateCampaign(req: Request, res: Response) {
    try {
      const campaign = await this.campaignManager.updateCampaign(req.params.campaignId, req.body);
      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleDeleteCampaign(req: Request, res: Response) {
    try {
      await this.campaignManager.deleteCampaign(req.params.campaignId);
      res.json({ success: true, message: 'Campaign deleted' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handlePauseCampaign(req: Request, res: Response) {
    try {
      await this.campaignManager.pauseCampaign(req.params.campaignId);
      res.json({ success: true, message: 'Campaign paused' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleResumeCampaign(req: Request, res: Response) {
    try {
      await this.campaignManager.resumeCampaign(req.params.campaignId);
      res.json({ success: true, message: 'Campaign resumed' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleDuplicateCampaign(req: Request, res: Response) {
    try {
      const { name } = req.body;
      const campaign = await this.campaignManager.duplicateCampaign(req.params.campaignId, name);
      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleGetSegments(req: Request, res: Response) {
    try {
      const segments = await this.campaignManager.getSegments();
      res.json({ success: true, data: segments });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleCreateSegment(req: Request, res: Response) {
    try {
      const segment = await this.campaignManager.createSegment(req.body);
      res.status(201).json({ success: true, data: segment });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleUpdateSegment(req: Request, res: Response) {
    try {
      const segment = await this.campaignManager.updateSegment(req.params.segmentId, req.body);
      res.json({ success: true, data: segment });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleDeleteSegment(req: Request, res: Response) {
    try {
      await this.campaignManager.deleteSegment(req.params.segmentId);
      res.json({ success: true, message: 'Segment deleted' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleGetWorkflows(req: Request, res: Response) {
    try {
      const workflows = await this.workflowEngine.getWorkflows();
      res.json({ success: true, data: workflows });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleCreateWorkflow(req: Request, res: Response) {
    try {
      const workflow = await this.workflowEngine.createWorkflow(req.body);
      res.status(201).json({ success: true, data: workflow });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleGetWorkflow(req: Request, res: Response) {
    try {
      const workflow = await this.workflowEngine.getWorkflow(req.params.workflowId);
      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
      res.json({ success: true, data: workflow });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleUpdateWorkflow(req: Request, res: Response) {
    try {
      const workflow = await this.workflowEngine.updateWorkflow(req.params.workflowId, req.body);
      res.json({ success: true, data: workflow });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleDeleteWorkflow(req: Request, res: Response) {
    try {
      await this.workflowEngine.deleteWorkflow(req.params.workflowId);
      res.json({ success: true, message: 'Workflow deleted' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handlePauseWorkflow(req: Request, res: Response) {
    try {
      await this.workflowEngine.pauseWorkflow(req.params.workflowId);
      res.json({ success: true, message: 'Workflow paused' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleResumeWorkflow(req: Request, res: Response) {
    try {
      await this.workflowEngine.resumeWorkflow(req.params.workflowId);
      res.json({ success: true, message: 'Workflow resumed' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleGetWorkflowExecutions(req: Request, res: Response) {
    try {
      const executions = await this.workflowEngine.getActiveExecutions(req.params.workflowId);
      res.json({ success: true, data: executions });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleTriggerWorkflow(req: Request, res: Response) {
    try {
      await this.workflowEngine.handleTriggerEvent(req.body);
      res.json({ success: true, message: 'Workflow triggered' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleGetQueueItems(req: Request, res: Response) {
    try {
      const items = await this.emailQueue.getItems(req.query as any);
      res.json({ success: true, data: items });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleCancelQueueItem(req: Request, res: Response) {
    try {
      const success = await this.emailQueue.cancelItem(req.params.itemId);
      if (success) {
        res.json({ success: true, message: 'Queue item cancelled' });
      } else {
        res.status(404).json({ error: 'Queue item not found or cannot be cancelled' });
      }
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleRetryQueueItem(req: Request, res: Response) {
    try {
      const success = await this.emailQueue.retryItem(req.params.itemId);
      if (success) {
        res.json({ success: true, message: 'Queue item queued for retry' });
      } else {
        res.status(404).json({ error: 'Queue item not found or cannot be retried' });
      }
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleDeleteQueueItem(req: Request, res: Response) {
    try {
      const success = await this.emailQueue.deleteItem(req.params.itemId);
      if (success) {
        res.json({ success: true, message: 'Queue item deleted' });
      } else {
        res.status(404).json({ error: 'Queue item not found or cannot be deleted' });
      }
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleClearCompletedQueue(req: Request, res: Response) {
    try {
      const { olderThan } = req.body;
      const count = await this.emailQueue.clearCompleted(olderThan ? new Date(olderThan) : undefined);
      res.json({ success: true, message: `Cleared ${count} completed queue items` });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleGetStats(req: Request, res: Response) {
    try {
      const { campaignId, workflowId, startDate, endDate } = req.query;
      const dateRange = startDate && endDate ? {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      } : undefined;
      
      const stats = await this.emailTracker.getStats(
        campaignId as string,
        workflowId as string,
        dateRange
      );
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleGetDetailedAnalytics(req: Request, res: Response) {
    try {
      const { startDate, endDate, campaignId } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }
      
      const analytics = await this.emailTracker.getDetailedAnalytics(
        {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        },
        campaignId as string
      );
      res.json({ success: true, data: analytics });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleGetCampaignAnalytics(req: Request, res: Response) {
    try {
      const stats = await this.emailTracker.getStats(req.params.campaignId);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleUnsubscribePost(req: Request, res: Response) {
    try {
      const { email, campaignId, reason } = req.body;
      await this.emailTracker.trackUnsubscribe(email, campaignId, undefined, reason);
      res.json({ success: true, message: 'Unsubscribed successfully' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handlePreferences(req: Request, res: Response) {
    try {
      const preferences = await this.unsubscribeManager.getPreferences(req.params.token);
      res.json({ success: true, data: preferences });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleUpdatePreferences(req: Request, res: Response) {
    try {
      await this.unsubscribeManager.updatePreferences(req.params.token, req.body);
      res.json({ success: true, message: 'Preferences updated' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleSendGridWebhook(req: Request, res: Response) {
    try {
      // Process SendGrid webhook events
      const events = req.body;
      for (const event of events) {
        switch (event.event) {
          case 'bounce':
            await this.emailTracker.trackEmailBounce(
              event.sg_message_id,
              event.email,
              event.type === 'bounce' ? 'hard' : 'soft',
              event.reason
            );
            break;
          case 'spamreport':
            await this.emailTracker.trackEmailComplaint(
              event.sg_message_id,
              event.email,
              'spam'
            );
            break;
        }
      }
      res.json({ received: true });
    } catch (error) {
      logger.error('SendGrid webhook error:', error);
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  }

  private async handleTestConfiguration(req: Request, res: Response) {
    try {
      const results = await this.emailService.testEmailConfiguration();
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    // Global error handler
    this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
      logger.error('API Error:', error);
      
      if (res.headersSent) {
        return next(error);
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });
  }

  getApp(): express.Application {
    return this.app;
  }

  async start(port: number = 3001): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        logger.info(`Email API server started on port ${port}`);
        resolve();
      });
    });
  }
}

export default EmailAPI;