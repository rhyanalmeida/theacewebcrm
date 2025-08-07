// Zapier Integration with Webhook Triggers
import axios from 'axios';
import crypto from 'crypto';
import { EventEmitter } from 'events';

interface ZapierWebhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  createdAt: Date;
  lastTriggered?: Date;
}

interface ZapierEvent {
  event: string;
  data: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class ZapierIntegration extends EventEmitter {
  private webhooks: Map<string, ZapierWebhook> = new Map();
  private apiKey: string;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  // Register a new Zapier webhook
  async registerWebhook(webhook: Omit<ZapierWebhook, 'id' | 'createdAt'>): Promise<ZapierWebhook> {
    const newWebhook: ZapierWebhook = {
      ...webhook,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      secret: webhook.secret || crypto.randomBytes(32).toString('hex')
    };

    this.webhooks.set(newWebhook.id, newWebhook);
    
    // Test the webhook URL
    await this.testWebhook(newWebhook.id);
    
    this.emit('webhook:registered', newWebhook);
    return newWebhook;
  }

  // Trigger a webhook for specific events
  async triggerWebhook(event: string, data: any, metadata?: Record<string, any>): Promise<void> {
    const webhooksToTrigger = Array.from(this.webhooks.values()).filter(
      webhook => webhook.active && webhook.events.includes(event)
    );

    const eventData: ZapierEvent = {
      event,
      data,
      timestamp: new Date(),
      metadata
    };

    const triggers = webhooksToTrigger.map(webhook => 
      this.sendWebhookRequest(webhook, eventData)
    );

    await Promise.allSettled(triggers);
  }

  // Send webhook request with retry logic
  private async sendWebhookRequest(
    webhook: ZapierWebhook, 
    event: ZapierEvent,
    attempt: number = 1
  ): Promise<void> {
    try {
      const signature = this.generateSignature(webhook.secret!, event);
      
      const response = await axios.post(webhook.url, event, {
        headers: {
          'Content-Type': 'application/json',
          'X-Zapier-Signature': signature,
          'X-Zapier-Webhook-Id': webhook.id,
          'X-Zapier-Event': event.event,
          'X-API-Key': this.apiKey
        },
        timeout: 10000
      });

      if (response.status >= 200 && response.status < 300) {
        webhook.lastTriggered = new Date();
        this.emit('webhook:success', { webhook, event, response: response.data });
      }
    } catch (error: any) {
      if (attempt < this.retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        return this.sendWebhookRequest(webhook, event, attempt + 1);
      }
      
      this.emit('webhook:error', { webhook, event, error: error.message });
      throw error;
    }
  }

  // Generate HMAC signature for webhook security
  private generateSignature(secret: string, data: any): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(data));
    return hmac.digest('hex');
  }

  // Test webhook connectivity
  async testWebhook(webhookId: string): Promise<boolean> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) throw new Error('Webhook not found');

    try {
      const testEvent: ZapierEvent = {
        event: 'test',
        data: { message: 'Test webhook from ACE CRM' },
        timestamp: new Date()
      };

      await this.sendWebhookRequest(webhook, testEvent);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Available Zapier triggers
  static readonly TRIGGERS = {
    // Contact triggers
    CONTACT_CREATED: 'contact.created',
    CONTACT_UPDATED: 'contact.updated',
    CONTACT_DELETED: 'contact.deleted',
    
    // Lead triggers
    LEAD_CREATED: 'lead.created',
    LEAD_CONVERTED: 'lead.converted',
    LEAD_UPDATED: 'lead.updated',
    
    // Deal triggers
    DEAL_CREATED: 'deal.created',
    DEAL_WON: 'deal.won',
    DEAL_LOST: 'deal.lost',
    DEAL_UPDATED: 'deal.updated',
    
    // Project triggers
    PROJECT_CREATED: 'project.created',
    PROJECT_COMPLETED: 'project.completed',
    PROJECT_UPDATED: 'project.updated',
    
    // Invoice triggers
    INVOICE_CREATED: 'invoice.created',
    INVOICE_PAID: 'invoice.paid',
    INVOICE_OVERDUE: 'invoice.overdue',
    
    // Task triggers
    TASK_CREATED: 'task.created',
    TASK_COMPLETED: 'task.completed',
    TASK_ASSIGNED: 'task.assigned',
    
    // Custom triggers
    FORM_SUBMITTED: 'form.submitted',
    EMAIL_OPENED: 'email.opened',
    EMAIL_CLICKED: 'email.clicked'
  };

  // Get all webhooks
  getWebhooks(): ZapierWebhook[] {
    return Array.from(this.webhooks.values());
  }

  // Update webhook
  updateWebhook(webhookId: string, updates: Partial<ZapierWebhook>): ZapierWebhook {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) throw new Error('Webhook not found');

    const updated = { ...webhook, ...updates };
    this.webhooks.set(webhookId, updated);
    
    this.emit('webhook:updated', updated);
    return updated;
  }

  // Delete webhook
  deleteWebhook(webhookId: string): void {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) throw new Error('Webhook not found');

    this.webhooks.delete(webhookId);
    this.emit('webhook:deleted', webhook);
  }

  // Validate incoming webhook request
  validateWebhookRequest(headers: any, body: any, secret: string): boolean {
    const signature = headers['x-zapier-signature'];
    if (!signature) return false;

    const expectedSignature = this.generateSignature(secret, body);
    return signature === expectedSignature;
  }
}