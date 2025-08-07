import { EmailCampaign, EmailRecipient, EmailSegment, EmailCampaignSettings, EmailCampaignStats } from '../types/email';
import { EmailService } from '../services/EmailService';
import { EmailQueue } from '../queue/EmailQueue';
import { logger } from '../../utils/logger';

export interface CreateCampaignOptions {
  name: string;
  subject: string;
  templateId: string;
  segmentId?: string;
  recipients?: EmailRecipient[];
  settings: EmailCampaignSettings;
  scheduledAt?: Date;
}

export interface CampaignFilters {
  status?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  templateId?: string;
  segmentId?: string;
}

export class CampaignManager {
  private emailService: EmailService;
  private queue: EmailQueue;
  private campaigns: Map<string, EmailCampaign> = new Map();
  private segments: Map<string, EmailSegment> = new Map();

  constructor() {
    this.emailService = new EmailService();
    this.queue = new EmailQueue();
    this.loadCampaigns();
    this.loadSegments();
  }

  private async loadCampaigns() {
    // Load campaigns from database
    // This would typically query your database
    try {
      // Placeholder for database loading
      logger.info('Campaign manager initialized');
    } catch (error) {
      logger.error('Failed to load campaigns:', error);
    }
  }

  private async loadSegments() {
    // Load segments from database
    try {
      // Example segments
      const defaultSegments: EmailSegment[] = [
        {
          id: 'all-users',
          name: 'All Users',
          description: 'All registered users',
          filters: [],
          recipientCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        },
        {
          id: 'new-users',
          name: 'New Users',
          description: 'Users registered in the last 30 days',
          filters: [
            {
              field: 'createdAt',
              operator: 'greater_than',
              value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          ],
          recipientCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        },
        {
          id: 'active-users',
          name: 'Active Users',
          description: 'Users who logged in within the last 7 days',
          filters: [
            {
              field: 'lastLoginAt',
              operator: 'greater_than',
              value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          ],
          recipientCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        }
      ];

      for (const segment of defaultSegments) {
        this.segments.set(segment.id, segment);
      }
    } catch (error) {
      logger.error('Failed to load segments:', error);
    }
  }

  async createCampaign(options: CreateCampaignOptions): Promise<EmailCampaign> {
    const campaign: EmailCampaign = {
      id: this.generateId(),
      name: options.name,
      subject: options.subject,
      templateId: options.templateId,
      segmentId: options.segmentId,
      status: options.scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: options.scheduledAt,
      recipients: options.recipients || await this.getSegmentRecipients(options.segmentId),
      settings: options.settings,
      stats: this.initializeStats(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.campaigns.set(campaign.id, campaign);
    await this.saveCampaign(campaign);

    logger.info(`Campaign created: ${campaign.name} (${campaign.id})`);
    return campaign;
  }

  private async getSegmentRecipients(segmentId?: string): Promise<EmailRecipient[]> {
    if (!segmentId) {
      return [];
    }

    const segment = this.segments.get(segmentId);
    if (!segment) {
      throw new Error(`Segment not found: ${segmentId}`);
    }

    // Apply segment filters to get recipients
    const recipients = await this.applySegmentFilters(segment.filters);
    
    // Update segment recipient count
    segment.recipientCount = recipients.length;
    segment.updatedAt = new Date();

    return recipients;
  }

  private async applySegmentFilters(filters: any[]): Promise<EmailRecipient[]> {
    // This would query your user database based on filters
    // For now, return sample data
    return [
      {
        email: 'user1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'pending',
        customData: { userId: '1', plan: 'pro' }
      },
      {
        email: 'user2@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        status: 'pending',
        customData: { userId: '2', plan: 'basic' }
      }
    ];
  }

  private initializeStats(): EmailCampaignStats {
    return {
      totalRecipients: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      unsubscribed: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      complaintRate: 0,
      unsubscribeRate: 0
    };
  }

  async sendCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error(`Campaign cannot be sent. Current status: ${campaign.status}`);
    }

    campaign.status = 'sending';
    campaign.updatedAt = new Date();
    
    try {
      await this.processCampaignSending(campaign);
      
      campaign.status = 'sent';
      campaign.sentAt = new Date();
      
      logger.info(`Campaign sent successfully: ${campaign.name}`);
    } catch (error) {
      campaign.status = 'draft';
      logger.error(`Failed to send campaign ${campaign.name}:`, error);
      throw error;
    } finally {
      await this.saveCampaign(campaign);
    }
  }

  private async processCampaignSending(campaign: EmailCampaign): Promise<void> {
    const batchSize = 100; // Send in batches to avoid overwhelming
    const delay = campaign.settings.sendRate?.maxPerHour ? 
      (60 * 60 * 1000) / campaign.settings.sendRate.maxPerHour : 1000;

    for (let i = 0; i < campaign.recipients.length; i += batchSize) {
      const batch = campaign.recipients.slice(i, i + batchSize);
      await this.sendBatch(campaign, batch);
      
      // Add delay between batches if rate limiting is configured
      if (delay > 1000 && i + batchSize < campaign.recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async sendBatch(campaign: EmailCampaign, recipients: EmailRecipient[]): Promise<void> {
    const promises = recipients.map(async (recipient) => {
      try {
        const result = await this.emailService.sendTemplate(
          campaign.templateId.replace('.html', ''),
          {
            to: recipient.email,
            subject: this.personalizeSubject(campaign.subject, recipient),
            templateData: {
              firstName: recipient.firstName,
              lastName: recipient.lastName,
              ...recipient.customData
            },
            campaignId: campaign.id,
            trackOpens: campaign.settings.trackOpens,
            trackClicks: campaign.settings.trackClicks,
            tags: campaign.settings.tags,
            priority: campaign.settings.priority
          }
        );

        if (result.status === 'sent') {
          recipient.status = 'sent';
          recipient.sentAt = new Date();
          campaign.stats.sent++;
        } else {
          recipient.status = 'failed';
          recipient.error = result.error;
        }
      } catch (error) {
        recipient.status = 'failed';
        recipient.error = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to send to ${recipient.email}:`, error);
      }
    });

    await Promise.allSettled(promises);
    await this.updateCampaignStats(campaign);
  }

  private personalizeSubject(subject: string, recipient: EmailRecipient): string {
    let personalized = subject;
    
    if (recipient.firstName) {
      personalized = personalized.replace(/\{\{firstName\}\}/g, recipient.firstName);
    }
    if (recipient.lastName) {
      personalized = personalized.replace(/\{\{lastName\}\}/g, recipient.lastName);
    }
    
    // Replace custom data variables
    if (recipient.customData) {
      for (const [key, value] of Object.entries(recipient.customData)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        personalized = personalized.replace(regex, String(value));
      }
    }
    
    return personalized;
  }

  private async updateCampaignStats(campaign: EmailCampaign): Promise<void> {
    const stats = campaign.stats;
    const total = campaign.recipients.length;
    
    stats.totalRecipients = total;
    stats.sent = campaign.recipients.filter(r => r.status === 'sent').length;
    stats.delivered = stats.sent; // This would be updated by webhook events
    
    // Calculate rates
    if (stats.totalRecipients > 0) {
      stats.openRate = (stats.opened / stats.totalRecipients) * 100;
      stats.clickRate = (stats.clicked / stats.totalRecipients) * 100;
      stats.bounceRate = (stats.bounced / stats.totalRecipients) * 100;
      stats.complaintRate = (stats.complained / stats.totalRecipients) * 100;
      stats.unsubscribeRate = (stats.unsubscribed / stats.totalRecipients) * 100;
    }
    
    await this.saveCampaign(campaign);
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (campaign.status !== 'sending') {
      throw new Error(`Campaign is not currently sending`);
    }

    campaign.status = 'paused';
    campaign.updatedAt = new Date();
    await this.saveCampaign(campaign);
    
    logger.info(`Campaign paused: ${campaign.name}`);
  }

  async resumeCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (campaign.status !== 'paused') {
      throw new Error(`Campaign is not paused`);
    }

    campaign.status = 'sending';
    campaign.updatedAt = new Date();
    await this.saveCampaign(campaign);
    
    // Resume sending
    await this.processCampaignSending(campaign);
    
    logger.info(`Campaign resumed: ${campaign.name}`);
  }

  async cancelCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    campaign.status = 'cancelled';
    campaign.updatedAt = new Date();
    await this.saveCampaign(campaign);
    
    logger.info(`Campaign cancelled: ${campaign.name}`);
  }

  async duplicateCampaign(campaignId: string, newName?: string): Promise<EmailCampaign> {
    const originalCampaign = this.campaigns.get(campaignId);
    if (!originalCampaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const duplicatedCampaign: EmailCampaign = {
      ...originalCampaign,
      id: this.generateId(),
      name: newName || `${originalCampaign.name} (Copy)`,
      status: 'draft',
      scheduledAt: undefined,
      sentAt: undefined,
      stats: this.initializeStats(),
      createdAt: new Date(),
      updatedAt: new Date(),
      recipients: originalCampaign.recipients.map(r => ({
        ...r,
        status: 'pending',
        sentAt: undefined,
        error: undefined
      }))
    };

    this.campaigns.set(duplicatedCampaign.id, duplicatedCampaign);
    await this.saveCampaign(duplicatedCampaign);

    return duplicatedCampaign;
  }

  async getCampaigns(filters?: CampaignFilters): Promise<EmailCampaign[]> {
    let campaigns = Array.from(this.campaigns.values());

    if (filters) {
      if (filters.status) {
        campaigns = campaigns.filter(c => filters.status!.includes(c.status));
      }
      
      if (filters.dateRange) {
        campaigns = campaigns.filter(c => 
          c.createdAt >= filters.dateRange!.start && 
          c.createdAt <= filters.dateRange!.end
        );
      }
      
      if (filters.tags) {
        campaigns = campaigns.filter(c => 
          filters.tags!.some(tag => c.settings.tags.includes(tag))
        );
      }
      
      if (filters.templateId) {
        campaigns = campaigns.filter(c => c.templateId === filters.templateId);
      }
      
      if (filters.segmentId) {
        campaigns = campaigns.filter(c => c.segmentId === filters.segmentId);
      }
    }

    return campaigns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCampaign(campaignId: string): Promise<EmailCampaign | undefined> {
    return this.campaigns.get(campaignId);
  }

  async updateCampaign(campaignId: string, updates: Partial<EmailCampaign>): Promise<EmailCampaign> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (campaign.status === 'sending' || campaign.status === 'sent') {
      throw new Error(`Cannot update campaign while sending or after sent`);
    }

    Object.assign(campaign, updates, { updatedAt: new Date() });
    await this.saveCampaign(campaign);

    return campaign;
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (campaign.status === 'sending') {
      throw new Error(`Cannot delete campaign while sending`);
    }

    this.campaigns.delete(campaignId);
    await this.deleteCampaignFromStorage(campaignId);
    
    logger.info(`Campaign deleted: ${campaign.name}`);
  }

  // Segment management
  async createSegment(segment: Omit<EmailSegment, 'id' | 'createdAt' | 'updatedAt' | 'recipientCount'>): Promise<EmailSegment> {
    const newSegment: EmailSegment = {
      ...segment,
      id: this.generateId(),
      recipientCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Calculate recipient count
    newSegment.recipientCount = (await this.applySegmentFilters(segment.filters)).length;
    
    this.segments.set(newSegment.id, newSegment);
    await this.saveSegment(newSegment);

    return newSegment;
  }

  async getSegments(): Promise<EmailSegment[]> {
    return Array.from(this.segments.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateSegment(segmentId: string, updates: Partial<EmailSegment>): Promise<EmailSegment> {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      throw new Error(`Segment not found: ${segmentId}`);
    }

    Object.assign(segment, updates, { updatedAt: new Date() });
    
    // Recalculate recipient count if filters changed
    if (updates.filters) {
      segment.recipientCount = (await this.applySegmentFilters(segment.filters)).length;
    }
    
    await this.saveSegment(segment);
    return segment;
  }

  async deleteSegment(segmentId: string): Promise<void> {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      throw new Error(`Segment not found: ${segmentId}`);
    }

    // Check if segment is used by any campaigns
    const campaignsUsingSegment = Array.from(this.campaigns.values())
      .filter(c => c.segmentId === segmentId);
    
    if (campaignsUsingSegment.length > 0) {
      throw new Error(`Cannot delete segment. It is used by ${campaignsUsingSegment.length} campaign(s)`);
    }

    this.segments.delete(segmentId);
    await this.deleteSegmentFromStorage(segmentId);
  }

  async getCampaignPerformanceReport(campaignId: string): Promise<any> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        createdAt: campaign.createdAt,
        sentAt: campaign.sentAt
      },
      stats: campaign.stats,
      recipients: {
        total: campaign.recipients.length,
        byStatus: this.groupRecipientsByStatus(campaign.recipients),
        topDomains: this.getTopEmailDomains(campaign.recipients),
        failures: campaign.recipients
          .filter(r => r.status === 'failed')
          .map(r => ({ email: r.email, error: r.error }))
      },
      performance: {
        deliveryRate: (campaign.stats.delivered / campaign.stats.totalRecipients) * 100,
        engagementRate: ((campaign.stats.opened + campaign.stats.clicked) / campaign.stats.totalRecipients) * 100,
        clickToOpenRate: campaign.stats.opened > 0 ? (campaign.stats.clicked / campaign.stats.opened) * 100 : 0
      }
    };
  }

  private groupRecipientsByStatus(recipients: EmailRecipient[]) {
    return recipients.reduce((acc, recipient) => {
      acc[recipient.status] = (acc[recipient.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getTopEmailDomains(recipients: EmailRecipient[]) {
    const domains = recipients.reduce((acc, recipient) => {
      const domain = recipient.email.split('@')[1];
      acc[domain] = (acc[domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(domains)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));
  }

  private generateId(): string {
    return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveCampaign(campaign: EmailCampaign): Promise<void> {
    // Save to database
    logger.debug(`Saved campaign: ${campaign.id}`);
  }

  private async saveSegment(segment: EmailSegment): Promise<void> {
    // Save to database
    logger.debug(`Saved segment: ${segment.id}`);
  }

  private async deleteCampaignFromStorage(campaignId: string): Promise<void> {
    // Delete from database
    logger.debug(`Deleted campaign: ${campaignId}`);
  }

  private async deleteSegmentFromStorage(segmentId: string): Promise<void> {
    // Delete from database
    logger.debug(`Deleted segment: ${segmentId}`);
  }
}

export default CampaignManager;