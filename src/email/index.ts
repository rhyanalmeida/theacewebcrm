// Email System Main Index
// Comprehensive email management system for ACE CRM

// Core Services
export { EmailService } from './services/EmailService';
export type { SendEmailOptions, EmailResult, EmailProvider } from './services/EmailService';

// Campaign Management
export { default as CampaignManager } from './campaigns/CampaignManager';
export type { CreateCampaignOptions, CampaignFilters } from './campaigns/CampaignManager';

// Workflow Engine
export { default as WorkflowEngine } from './workflows/WorkflowEngine';
export type { WorkflowExecution, TriggerEvent } from './workflows/WorkflowEngine';

// Email Tracking
export { default as EmailTracker } from './tracking/EmailTracker';
export type { TrackingPixelData, ClickTrackingData, EmailTrackingStats } from './tracking/EmailTracker';

// Queue Management
export { default as EmailQueue } from './queue/EmailQueue';
export type { QueueOptions, QueueStats } from './queue/EmailQueue';

// Analytics
export { default as EmailAnalytics } from './analytics/EmailAnalytics';
export type { AnalyticsQuery, AnalyticsDashboard, RealtimeStats, CohortAnalysis } from './analytics/EmailAnalytics';

// Unsubscribe Management
export { default as UnsubscribeManager } from './utils/UnsubscribeManager';
export type { UnsubscribeToken, EmailPreferences, UnsubscribeResult } from './utils/UnsubscribeManager';

// Email Validation
export { default as EmailValidator } from './utils/EmailValidator';
export type { ValidationResult, BulkValidationResult, ValidationOptions } from './utils/EmailValidator';

// API Server
export { default as EmailAPI } from './api/EmailAPI';
export type { EmailAPIOptions } from './api/EmailAPI';

// Type Definitions
export * from './types/email';

// Email System Class - Main orchestrator
export class EmailSystem {
  private emailService: EmailService;
  private campaignManager: CampaignManager;
  private workflowEngine: WorkflowEngine;
  private emailTracker: EmailTracker;
  private emailQueue: EmailQueue;
  private emailAnalytics: EmailAnalytics;
  private unsubscribeManager: UnsubscribeManager;
  private emailValidator: EmailValidator;
  private apiServer?: EmailAPI;

  constructor() {
    // Initialize all components
    this.emailService = new EmailService();
    this.campaignManager = new CampaignManager();
    this.workflowEngine = new WorkflowEngine();
    this.emailTracker = new EmailTracker();
    this.emailQueue = new EmailQueue();
    this.emailAnalytics = new EmailAnalytics();
    this.unsubscribeManager = new UnsubscribeManager();
    this.emailValidator = new EmailValidator();
  }

  // Core email functionality
  async sendEmail(options: SendEmailOptions) {
    return await this.emailService.sendEmail(options);
  }

  async sendTemplate(templateName: string, options: any) {
    return await this.emailService.sendTemplate(templateName, options);
  }

  // Campaign functionality
  async createCampaign(options: CreateCampaignOptions) {
    return await this.campaignManager.createCampaign(options);
  }

  async sendCampaign(campaignId: string) {
    return await this.campaignManager.sendCampaign(campaignId);
  }

  async getCampaigns(filters?: CampaignFilters) {
    return await this.campaignManager.getCampaigns(filters);
  }

  // Workflow functionality
  async createWorkflow(workflowData: any) {
    return await this.workflowEngine.createWorkflow(workflowData);
  }

  async triggerWorkflow(event: TriggerEvent) {
    return await this.workflowEngine.handleTriggerEvent(event);
  }

  // Analytics functionality
  async getDashboard(query: AnalyticsQuery) {
    return await this.emailAnalytics.getDashboard(query);
  }

  async getRealtimeStats() {
    return await this.emailAnalytics.getRealtimeStats();
  }

  // Queue functionality
  async getQueueStats() {
    return this.emailQueue.getStats();
  }

  async getQueueHealth() {
    return await this.emailQueue.getQueueHealth();
  }

  // Validation functionality
  async validateEmail(email: string, options?: ValidationOptions) {
    return await this.emailValidator.validateEmail(email, options);
  }

  async validateBulk(emails: string[], options?: ValidationOptions) {
    return await this.emailValidator.validateBulk(emails, options);
  }

  // Unsubscribe functionality
  async generateUnsubscribeUrl(email: string, campaignId?: string) {
    return await this.unsubscribeManager.generateUnsubscribeUrl(email, campaignId);
  }

  async processUnsubscribe(token: string, ipAddress?: string) {
    return await this.unsubscribeManager.processUnsubscribe(token, ipAddress);
  }

  async isUnsubscribed(email: string, emailType?: string) {
    return await this.unsubscribeManager.isUnsubscribed(email, emailType);
  }

  // API Server functionality
  async startAPIServer(port: number = 3001, options?: EmailAPIOptions) {
    this.apiServer = new EmailAPI(options);
    await this.apiServer.start(port);
    return this.apiServer;
  }

  getAPIServer() {
    return this.apiServer;
  }

  // System health and maintenance
  async getSystemHealth() {
    const [emailProviders, queueHealth, cacheStats] = await Promise.all([
      this.emailService.testEmailConfiguration(),
      this.emailQueue.getQueueHealth(),
      Promise.resolve(this.emailValidator.getValidationStats())
    ]);

    return {
      timestamp: new Date().toISOString(),
      status: queueHealth.status === 'healthy' ? 'healthy' : 'degraded',
      components: {
        emailProviders: {
          status: emailProviders.every(p => p.status === 'connected') ? 'healthy' : 'degraded',
          providers: emailProviders
        },
        queue: queueHealth,
        validation: {
          status: 'healthy',
          stats: cacheStats
        }
      }
    };
  }

  async performMaintenance() {
    const results = {
      queueCleaned: 0,
      validationCacheCleaned: 0,
      analyticsCacheCleaned: 0,
      trackingDataCleaned: 0,
      unsubscribeTokensCleaned: 0
    };

    try {
      // Clean up completed queue items older than 7 days
      results.queueCleaned = await this.emailQueue.clearCompleted();

      // Clean up validation cache
      results.validationCacheCleaned = await this.emailValidator.cleanupCache();

      // Clean up analytics cache
      results.analyticsCacheCleaned = await this.emailAnalytics.cleanupCache();

      // Clean up old tracking data (90 days)
      results.trackingDataCleaned = await this.emailTracker.clearTrackingData();

      // Clean up expired unsubscribe tokens
      results.unsubscribeTokensCleaned = await this.unsubscribeManager.cleanupExpiredTokens();

      return {
        success: true,
        results,
        totalItemsCleaned: Object.values(results).reduce((sum, count) => sum + count, 0)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results
      };
    }
  }

  // Shutdown gracefully
  async shutdown() {
    try {
      // Shutdown queue processing
      await this.emailQueue.shutdown();
      
      // Perform final cleanup
      await this.performMaintenance();
      
      console.log('Email system shutdown complete');
    } catch (error) {
      console.error('Error during email system shutdown:', error);
      throw error;
    }
  }
}

// Default export
export default EmailSystem;

// Convenience factory function
export function createEmailSystem(): EmailSystem {
  return new EmailSystem();
}

// Version and package info
export const version = '1.0.0';
export const name = 'ACE CRM Email System';
export const description = 'Comprehensive email management system with campaigns, workflows, tracking, and analytics';

// Feature flags
export const features = {
  campaigns: true,
  workflows: true,
  tracking: true,
  analytics: true,
  validation: true,
  unsubscribe: true,
  api: true,
  queue: true,
  templates: true
} as const;