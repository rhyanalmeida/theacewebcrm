import { EmailQueue as EmailQueueItem, SendEmailOptions } from '../types/email';
import { EmailService } from '../services/EmailService';
import { logger } from '../../utils/logger';

export interface QueueOptions {
  maxConcurrency?: number;
  retryDelayMs?: number;
  maxRetries?: number;
  processIntervalMs?: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  averageProcessingTime: number;
}

export class EmailQueue {
  private queue: Map<string, EmailQueueItem> = new Map();
  private processing: Set<string> = new Set();
  private emailService: EmailService;
  private options: Required<QueueOptions>;
  private processingInterval?: NodeJS.Timeout;
  private stats = {
    totalProcessed: 0,
    totalProcessingTime: 0,
    lastProcessedAt?: Date
  };

  constructor(options: QueueOptions = {}) {
    this.emailService = new EmailService();
    this.options = {
      maxConcurrency: options.maxConcurrency || 5,
      retryDelayMs: options.retryDelayMs || 60000, // 1 minute
      maxRetries: options.maxRetries || 3,
      processIntervalMs: options.processIntervalMs || 5000 // 5 seconds
    };
    
    this.startProcessing();
    this.loadQueue();
  }

  private async loadQueue() {
    try {
      // Load pending queue items from database
      logger.info('Email queue initialized');
    } catch (error) {
      logger.error('Failed to load email queue:', error);
    }
  }

  async add(emailOptions: SendEmailOptions): Promise<EmailQueueItem> {
    const queueItem: EmailQueueItem = {
      id: this.generateId(),
      email: Array.isArray(emailOptions.to) ? emailOptions.to[0] : emailOptions.to,
      subject: emailOptions.subject,
      html: emailOptions.html || '',
      text: emailOptions.text,
      templateId: emailOptions.template,
      templateData: emailOptions.templateData,
      campaignId: emailOptions.campaignId,
      workflowId: emailOptions.metadata?.workflowId,
      priority: emailOptions.priority || 'normal',
      scheduledAt: emailOptions.scheduledAt || new Date(),
      attempts: 0,
      maxAttempts: this.options.maxRetries,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.queue.set(queueItem.id, queueItem);
    await this.saveQueueItem(queueItem);
    
    logger.debug(`Added email to queue: ${queueItem.id} for ${queueItem.email}`);
    return queueItem;
  }

  async addBulk(emailOptionsList: SendEmailOptions[]): Promise<EmailQueueItem[]> {
    const queueItems: EmailQueueItem[] = [];
    
    for (const emailOptions of emailOptionsList) {
      const queueItem = await this.add(emailOptions);
      queueItems.push(queueItem);
    }
    
    logger.info(`Added ${queueItems.length} emails to queue`);
    return queueItems;
  }

  private startProcessing() {
    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, this.options.processIntervalMs);
    
    logger.info('Email queue processing started');
  }

  private async processQueue() {
    try {
      // Get items ready for processing
      const readyItems = this.getReadyForProcessing();
      
      if (readyItems.length === 0) {
        return;
      }
      
      // Process items up to max concurrency
      const itemsToProcess = readyItems.slice(0, this.options.maxConcurrency - this.processing.size);
      
      const promises = itemsToProcess.map(item => this.processItem(item));
      await Promise.allSettled(promises);
      
    } catch (error) {
      logger.error('Error processing email queue:', error);
    }
  }

  private getReadyForProcessing(): EmailQueueItem[] {
    const now = new Date();
    
    return Array.from(this.queue.values())
      .filter(item => 
        item.status === 'pending' &&
        item.scheduledAt <= now &&
        !this.processing.has(item.id) &&
        item.attempts < item.maxAttempts
      )
      .sort((a, b) => {
        // Sort by priority first, then by scheduled time
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        
        return a.scheduledAt.getTime() - b.scheduledAt.getTime();
      });
  }

  private async processItem(item: EmailQueueItem): Promise<void> {
    const startTime = Date.now();
    this.processing.add(item.id);
    
    try {
      item.status = 'processing';
      item.attempts++;
      item.updatedAt = new Date();
      
      logger.debug(`Processing email queue item: ${item.id} (attempt ${item.attempts})`);
      
      // Send the email
      const result = await this.sendQueuedEmail(item);
      
      if (result.success) {
        item.status = 'sent';
        item.processedAt = new Date();
        
        this.stats.totalProcessed++;
        this.stats.totalProcessingTime += Date.now() - startTime;
        this.stats.lastProcessedAt = new Date();
        
        logger.debug(`Successfully sent queued email: ${item.id}`);
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to process queue item ${item.id}:`, error);
      
      if (item.attempts >= item.maxAttempts) {
        item.status = 'failed';
        item.error = errorMessage;
        logger.warn(`Queue item failed after ${item.attempts} attempts: ${item.id}`);
      } else {
        item.status = 'pending';
        item.error = errorMessage;
        // Schedule retry with exponential backoff
        const retryDelay = this.options.retryDelayMs * Math.pow(2, item.attempts - 1);
        item.scheduledAt = new Date(Date.now() + retryDelay);
        
        logger.info(`Scheduled retry for queue item ${item.id} in ${retryDelay}ms (attempt ${item.attempts})`);
      }
      
    } finally {
      item.updatedAt = new Date();
      await this.saveQueueItem(item);
      this.processing.delete(item.id);
    }
  }

  private async sendQueuedEmail(item: EmailQueueItem): Promise<{ success: boolean; error?: string }> {
    try {
      const emailOptions: SendEmailOptions = {
        to: item.email,
        subject: item.subject,
        html: item.html,
        text: item.text,
        template: item.templateId,
        templateData: item.templateData,
        campaignId: item.campaignId,
        metadata: {
          queueItemId: item.id,
          workflowId: item.workflowId,
          attempt: item.attempts
        },
        priority: item.priority
      };
      
      const result = await this.emailService.sendEmail(emailOptions);
      
      if (result.status === 'sent') {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getItem(itemId: string): Promise<EmailQueueItem | undefined> {
    return this.queue.get(itemId);
  }

  async getItems(filters?: {
    status?: string[];
    priority?: string[];
    campaignId?: string;
    workflowId?: string;
    limit?: number;
    offset?: number;
  }): Promise<EmailQueueItem[]> {
    let items = Array.from(this.queue.values());
    
    if (filters) {
      if (filters.status) {
        items = items.filter(item => filters.status!.includes(item.status));
      }
      
      if (filters.priority) {
        items = items.filter(item => filters.priority!.includes(item.priority));
      }
      
      if (filters.campaignId) {
        items = items.filter(item => item.campaignId === filters.campaignId);
      }
      
      if (filters.workflowId) {
        items = items.filter(item => item.workflowId === filters.workflowId);
      }
    }
    
    // Sort by created date (newest first)
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (filters?.offset) {
      items = items.slice(filters.offset);
    }
    
    if (filters?.limit) {
      items = items.slice(0, filters.limit);
    }
    
    return items;
  }

  async cancelItem(itemId: string): Promise<boolean> {
    const item = this.queue.get(itemId);
    if (!item) {
      return false;
    }
    
    if (item.status === 'processing') {
      logger.warn(`Cannot cancel item currently being processed: ${itemId}`);
      return false;
    }
    
    item.status = 'cancelled';
    item.updatedAt = new Date();
    await this.saveQueueItem(item);
    
    logger.debug(`Cancelled queue item: ${itemId}`);
    return true;
  }

  async retryItem(itemId: string): Promise<boolean> {
    const item = this.queue.get(itemId);
    if (!item) {
      return false;
    }
    
    if (item.status !== 'failed') {
      logger.warn(`Cannot retry item with status: ${item.status}`);
      return false;
    }
    
    item.status = 'pending';
    item.attempts = 0;
    item.error = undefined;
    item.scheduledAt = new Date();
    item.updatedAt = new Date();
    
    await this.saveQueueItem(item);
    
    logger.debug(`Retrying queue item: ${itemId}`);
    return true;
  }

  async rescheduleItem(itemId: string, newScheduledAt: Date): Promise<boolean> {
    const item = this.queue.get(itemId);
    if (!item) {
      return false;
    }
    
    if (item.status === 'processing' || item.status === 'sent') {
      logger.warn(`Cannot reschedule item with status: ${item.status}`);
      return false;
    }
    
    item.scheduledAt = newScheduledAt;
    item.status = 'pending';
    item.updatedAt = new Date();
    
    await this.saveQueueItem(item);
    
    logger.debug(`Rescheduled queue item ${itemId} to ${newScheduledAt.toISOString()}`);
    return true;
  }

  async deleteItem(itemId: string): Promise<boolean> {
    const item = this.queue.get(itemId);
    if (!item) {
      return false;
    }
    
    if (item.status === 'processing') {
      logger.warn(`Cannot delete item currently being processed: ${itemId}`);
      return false;
    }
    
    this.queue.delete(itemId);
    await this.deleteQueueItem(itemId);
    
    logger.debug(`Deleted queue item: ${itemId}`);
    return true;
  }

  async pauseQueue(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    
    logger.info('Email queue processing paused');
  }

  async resumeQueue(): Promise<void> {
    if (!this.processingInterval) {
      this.startProcessing();
      logger.info('Email queue processing resumed');
    }
  }

  async clearCompleted(olderThan?: Date): Promise<number> {
    const cutoffDate = olderThan || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days default
    let deletedCount = 0;
    
    const itemsToDelete: string[] = [];
    
    for (const [id, item] of this.queue.entries()) {
      if ((item.status === 'sent' || item.status === 'cancelled') && 
          item.updatedAt < cutoffDate) {
        itemsToDelete.push(id);
      }
    }
    
    for (const id of itemsToDelete) {
      this.queue.delete(id);
      await this.deleteQueueItem(id);
      deletedCount++;
    }
    
    logger.info(`Cleared ${deletedCount} completed queue items`);
    return deletedCount;
  }

  getStats(): QueueStats {
    const items = Array.from(this.queue.values());
    
    const pending = items.filter(i => i.status === 'pending').length;
    const processing = items.filter(i => i.status === 'processing').length;
    const completed = items.filter(i => i.status === 'sent').length;
    const failed = items.filter(i => i.status === 'failed').length;
    
    const averageProcessingTime = this.stats.totalProcessed > 0 
      ? this.stats.totalProcessingTime / this.stats.totalProcessed 
      : 0;
    
    return {
      pending,
      processing,
      completed,
      failed,
      totalProcessed: this.stats.totalProcessed,
      averageProcessingTime: Math.round(averageProcessingTime)
    };
  }

  async getQueueHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const stats = this.getStats();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // Check for high failure rate
    const totalRecentItems = stats.pending + stats.processing + stats.completed + stats.failed;
    if (totalRecentItems > 0) {
      const failureRate = (stats.failed / totalRecentItems) * 100;
      
      if (failureRate > 20) {
        status = 'critical';
        issues.push(`High failure rate: ${failureRate.toFixed(1)}%`);
        recommendations.push('Check email service configuration and provider limits');
      } else if (failureRate > 10) {
        status = status === 'critical' ? 'critical' : 'warning';
        issues.push(`Elevated failure rate: ${failureRate.toFixed(1)}%`);
        recommendations.push('Monitor email service logs for recurring errors');
      }
    }
    
    // Check for queue backlog
    if (stats.pending > 1000) {
      status = 'critical';
      issues.push(`Large queue backlog: ${stats.pending} pending items`);
      recommendations.push('Consider increasing processing concurrency or adding more workers');
    } else if (stats.pending > 500) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push(`Queue backlog: ${stats.pending} pending items`);
      recommendations.push('Monitor queue processing rate');
    }
    
    // Check processing performance
    if (stats.averageProcessingTime > 10000) { // 10 seconds
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push(`Slow processing: ${stats.averageProcessingTime}ms average`);
      recommendations.push('Check email service response times and network connectivity');
    }
    
    // Check if processing is stuck
    if (stats.processing > this.options.maxConcurrency * 2) {
      status = 'critical';
      issues.push(`Too many items stuck in processing: ${stats.processing}`);
      recommendations.push('Restart queue processing or check for deadlocks');
    }
    
    return {
      status,
      issues,
      recommendations
    };
  }

  private generateId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveQueueItem(item: EmailQueueItem): Promise<void> {
    // Save to database
    logger.debug(`Saved queue item: ${item.id}`);
  }

  private async deleteQueueItem(itemId: string): Promise<void> {
    // Delete from database
    logger.debug(`Deleted queue item: ${itemId}`);
  }

  // Cleanup on shutdown
  async shutdown(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    // Wait for current processing to complete
    const maxWaitTime = 30000; // 30 seconds
    const checkInterval = 1000; // 1 second
    let waitTime = 0;
    
    while (this.processing.size > 0 && waitTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;
    }
    
    if (this.processing.size > 0) {
      logger.warn(`Forcing shutdown with ${this.processing.size} items still processing`);
    }
    
    logger.info('Email queue shutdown complete');
  }
}

export default EmailQueue;