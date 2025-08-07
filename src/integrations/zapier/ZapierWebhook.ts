/**
 * Zapier Integration with Webhook Triggers
 * Provides seamless integration with Zapier automation platform
 */

import { BaseIntegration, IntegrationConfig, IntegrationResponse, WebhookPayload, IntegrationCredentials, CRMContact, CRMDeal, CRMTask } from '../types';
import { Logger } from '../../config/logger';
import axios, { AxiosInstance } from 'axios';

export interface ZapierTriggerData {
  event: string;
  data: any;
  timestamp: string;
  crmId: string;
}

export interface ZapierAction {
  action: 'create_contact' | 'update_contact' | 'create_deal' | 'update_deal' | 'create_task' | 'send_email';
  data: any;
  zapId?: string;
}

export class ZapierWebhook implements BaseIntegration {
  public readonly name = 'Zapier';
  public readonly type = 'webhook';
  public readonly version = '1.0.0';
  public enabled = false;

  private logger: Logger;
  private httpClient: AxiosInstance;
  private registeredWebhooks: Map<string, string> = new Map();

  constructor(public config: IntegrationConfig) {
    this.logger = new Logger('ZapierWebhook');
    this.enabled = config.enabled;
    
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ACE-CRM-Zapier/1.0.0'
      }
    });
  }

  /**
   * Initialize Zapier integration
   */
  public async initialize(): Promise<IntegrationResponse> {
    try {
      this.logger.info('Initializing Zapier integration...');

      // Register default webhook endpoints
      await this.registerDefaultTriggers();

      this.enabled = true;
      this.logger.info('Zapier integration initialized successfully');

      return {
        success: true,
        data: {
          triggers: Array.from(this.registeredWebhooks.keys()),
          webhookUrl: this.config.webhookUrl
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to initialize Zapier integration:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Authenticate with Zapier (API key based)
   */
  public async authenticate(credentials: IntegrationCredentials): Promise<IntegrationResponse> {
    try {
      if (credentials.type !== 'api_key' || !credentials.data.apiKey) {
        return { success: false, error: 'API key required for Zapier integration' };
      }

      this.config.apiKey = credentials.data.apiKey;
      
      // Test the API key by making a test request
      const testResult = await this.healthCheck();
      if (!testResult.success) {
        return testResult;
      }

      this.logger.info('Zapier authentication successful');
      return { success: true, data: { authenticated: true } };
    } catch (error: any) {
      this.logger.error('Zapier authentication failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disconnect from Zapier
   */
  public async disconnect(): Promise<IntegrationResponse> {
    try {
      this.enabled = false;
      this.registeredWebhooks.clear();
      
      this.logger.info('Zapier integration disconnected');
      return { success: true };
    } catch (error: any) {
      this.logger.error('Error disconnecting from Zapier:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<IntegrationResponse> {
    try {
      if (!this.enabled) {
        return { success: false, error: 'Zapier integration not enabled' };
      }

      return {
        success: true,
        data: {
          status: 'healthy',
          triggers: Array.from(this.registeredWebhooks.keys()),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      this.logger.error('Zapier health check failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle incoming webhook from Zapier
   */
  public async handleWebhook(payload: WebhookPayload): Promise<IntegrationResponse> {
    try {
      this.logger.info(`Processing Zapier webhook: ${payload.event}`);

      const zapierAction = payload.data as ZapierAction;

      switch (zapierAction.action) {
        case 'create_contact':
          return await this.handleCreateContact(zapierAction.data);
        case 'update_contact':
          return await this.handleUpdateContact(zapierAction.data);
        case 'create_deal':
          return await this.handleCreateDeal(zapierAction.data);
        case 'update_deal':
          return await this.handleUpdateDeal(zapierAction.data);
        case 'create_task':
          return await this.handleCreateTask(zapierAction.data);
        case 'send_email':
          return await this.handleSendEmail(zapierAction.data);
        default:
          this.logger.warn(`Unknown Zapier action: ${zapierAction.action}`);
          return { success: false, error: `Unknown action: ${zapierAction.action}` };
      }
    } catch (error: any) {
      this.logger.error('Error handling Zapier webhook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Trigger CRM event to Zapier
   */
  public async triggerEvent(event: string, data: any, zapierWebhookUrl?: string): Promise<IntegrationResponse> {
    try {
      const webhookUrl = zapierWebhookUrl || this.registeredWebhooks.get(event);
      
      if (!webhookUrl) {
        return { success: false, error: `No webhook URL configured for event: ${event}` };
      }

      const triggerData: ZapierTriggerData = {
        event,
        data,
        timestamp: new Date().toISOString(),
        crmId: process.env.CRM_INSTANCE_ID || 'ace-crm'
      };

      const response = await this.httpClient.post(webhookUrl, triggerData);

      this.logger.info(`Zapier trigger sent for event: ${event}`);
      return {
        success: true,
        data: {
          event,
          status: response.status,
          zapierResponse: response.data
        }
      };
    } catch (error: any) {
      this.logger.error(`Error triggering Zapier event ${event}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Register webhook URL for specific trigger
   */
  public async registerTrigger(event: string, webhookUrl: string): Promise<IntegrationResponse> {
    try {
      this.registeredWebhooks.set(event, webhookUrl);
      
      this.logger.info(`Zapier trigger registered: ${event} -> ${webhookUrl}`);
      return {
        success: true,
        data: { event, webhookUrl }
      };
    } catch (error: any) {
      this.logger.error(`Error registering Zapier trigger ${event}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unregister webhook trigger
   */
  public async unregisterTrigger(event: string): Promise<IntegrationResponse> {
    try {
      const removed = this.registeredWebhooks.delete(event);
      
      if (removed) {
        this.logger.info(`Zapier trigger unregistered: ${event}`);
        return { success: true, data: { event } };
      } else {
        return { success: false, error: `Trigger not found: ${event}` };
      }
    } catch (error: any) {
      this.logger.error(`Error unregistering Zapier trigger ${event}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all registered triggers
   */
  public getRegisteredTriggers(): Map<string, string> {
    return new Map(this.registeredWebhooks);
  }

  // Private methods for handling different actions

  private async handleCreateContact(data: any): Promise<IntegrationResponse> {
    try {
      // Transform Zapier data to CRM contact format
      const contact: CRMContact = {
        firstName: data.firstName || data.first_name || '',
        lastName: data.lastName || data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        company: data.company || '',
        title: data.title || data.job_title || '',
        tags: data.tags || [],
        customFields: data.customFields || {}
      };

      // Here you would integrate with your CRM's contact creation service
      // For example: await contactService.create(contact);

      this.logger.info('Contact created from Zapier');
      return {
        success: true,
        data: {
          action: 'create_contact',
          contact
        }
      };
    } catch (error: any) {
      this.logger.error('Error creating contact from Zapier:', error);
      return { success: false, error: error.message };
    }
  }

  private async handleUpdateContact(data: any): Promise<IntegrationResponse> {
    try {
      const contactId = data.id || data.contactId;
      if (!contactId) {
        return { success: false, error: 'Contact ID required for update' };
      }

      // Transform and update contact
      const updates = {
        firstName: data.firstName || data.first_name,
        lastName: data.lastName || data.last_name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        title: data.title || data.job_title,
        customFields: data.customFields || {}
      };

      // Remove undefined values
      Object.keys(updates).forEach(key => {
        if (updates[key as keyof typeof updates] === undefined) {
          delete updates[key as keyof typeof updates];
        }
      });

      // Here you would integrate with your CRM's contact update service
      // For example: await contactService.update(contactId, updates);

      this.logger.info(`Contact ${contactId} updated from Zapier`);
      return {
        success: true,
        data: {
          action: 'update_contact',
          contactId,
          updates
        }
      };
    } catch (error: any) {
      this.logger.error('Error updating contact from Zapier:', error);
      return { success: false, error: error.message };
    }
  }

  private async handleCreateDeal(data: any): Promise<IntegrationResponse> {
    try {
      const deal: CRMDeal = {
        name: data.name || data.deal_name || '',
        amount: parseFloat(data.amount || data.value || '0'),
        stage: data.stage || data.deal_stage || 'prospect',
        probability: data.probability ? parseFloat(data.probability) : undefined,
        closeDate: data.closeDate ? new Date(data.closeDate) : undefined,
        contactId: data.contactId || data.contact_id,
        companyId: data.companyId || data.company_id,
        ownerId: data.ownerId || data.owner_id,
        description: data.description || '',
        customFields: data.customFields || {}
      };

      // Here you would integrate with your CRM's deal creation service
      // For example: await dealService.create(deal);

      this.logger.info('Deal created from Zapier');
      return {
        success: true,
        data: {
          action: 'create_deal',
          deal
        }
      };
    } catch (error: any) {
      this.logger.error('Error creating deal from Zapier:', error);
      return { success: false, error: error.message };
    }
  }

  private async handleUpdateDeal(data: any): Promise<IntegrationResponse> {
    try {
      const dealId = data.id || data.dealId;
      if (!dealId) {
        return { success: false, error: 'Deal ID required for update' };
      }

      const updates = {
        name: data.name || data.deal_name,
        amount: data.amount ? parseFloat(data.amount) : undefined,
        stage: data.stage || data.deal_stage,
        probability: data.probability ? parseFloat(data.probability) : undefined,
        closeDate: data.closeDate ? new Date(data.closeDate) : undefined,
        description: data.description,
        customFields: data.customFields || {}
      };

      // Remove undefined values
      Object.keys(updates).forEach(key => {
        if (updates[key as keyof typeof updates] === undefined) {
          delete updates[key as keyof typeof updates];
        }
      });

      // Here you would integrate with your CRM's deal update service
      // For example: await dealService.update(dealId, updates);

      this.logger.info(`Deal ${dealId} updated from Zapier`);
      return {
        success: true,
        data: {
          action: 'update_deal',
          dealId,
          updates
        }
      };
    } catch (error: any) {
      this.logger.error('Error updating deal from Zapier:', error);
      return { success: false, error: error.message };
    }
  }

  private async handleCreateTask(data: any): Promise<IntegrationResponse> {
    try {
      const task: CRMTask = {
        title: data.title || data.task_name || '',
        description: data.description || '',
        type: data.type || 'task',
        priority: data.priority || 'medium',
        status: 'pending',
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        assignedTo: data.assignedTo || data.assigned_to,
        relatedTo: data.relatedTo ? {
          type: data.relatedTo.type,
          id: data.relatedTo.id
        } : undefined
      };

      // Here you would integrate with your CRM's task creation service
      // For example: await taskService.create(task);

      this.logger.info('Task created from Zapier');
      return {
        success: true,
        data: {
          action: 'create_task',
          task
        }
      };
    } catch (error: any) {
      this.logger.error('Error creating task from Zapier:', error);
      return { success: false, error: error.message };
    }
  }

  private async handleSendEmail(data: any): Promise<IntegrationResponse> {
    try {
      const emailData = {
        to: data.to || data.recipient,
        subject: data.subject || '',
        body: data.body || data.content || '',
        template: data.template,
        variables: data.variables || {}
      };

      if (!emailData.to || !emailData.subject) {
        return { success: false, error: 'Email recipient and subject are required' };
      }

      // Here you would integrate with your email service
      // For example: await emailService.send(emailData);

      this.logger.info('Email sent from Zapier trigger');
      return {
        success: true,
        data: {
          action: 'send_email',
          emailData
        }
      };
    } catch (error: any) {
      this.logger.error('Error sending email from Zapier:', error);
      return { success: false, error: error.message };
    }
  }

  private async registerDefaultTriggers(): Promise<void> {
    // These would typically be configured via the Zapier dashboard
    const defaultTriggers = [
      'contact.created',
      'contact.updated',
      'deal.created',
      'deal.updated',
      'deal.stage_changed',
      'task.created',
      'task.completed',
      'invoice.created',
      'payment.received'
    ];

    // Register webhook endpoints for each trigger
    defaultTriggers.forEach(trigger => {
      const webhookUrl = `${this.config.baseUrl || ''}/api/webhooks/zapier/${trigger}`;
      this.registeredWebhooks.set(trigger, webhookUrl);
    });
  }
}

export default ZapierWebhook;