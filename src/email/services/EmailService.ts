import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { EmailTemplate } from '../types/email';
import { EmailTracker } from '../tracking/EmailTracker';
import { EmailQueue } from '../queue/EmailQueue';
import { logger } from '../../utils/logger';

export interface EmailProvider {
  name: 'resend' | 'sendgrid' | 'smtp';
  config: any;
}

export interface SendEmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  tags?: string[];
  metadata?: Record<string, any>;
  trackOpens?: boolean;
  trackClicks?: boolean;
  priority?: 'high' | 'normal' | 'low';
  scheduledAt?: Date;
  campaignId?: string;
}

export interface EmailResult {
  id: string;
  provider: string;
  status: 'sent' | 'queued' | 'failed';
  error?: string;
  messageId?: string;
}

export class EmailService {
  private resend?: Resend;
  private nodemailerTransporter?: nodemailer.Transporter;
  private tracker: EmailTracker;
  private queue: EmailQueue;
  private defaultProvider: EmailProvider;
  private providers: Map<string, EmailProvider> = new Map();

  constructor() {
    this.tracker = new EmailTracker();
    this.queue = new EmailQueue();
    this.initializeProviders();
  }

  private initializeProviders() {
    // Resend setup
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.providers.set('resend', {
        name: 'resend',
        config: { apiKey: process.env.RESEND_API_KEY }
      });
    }

    // SendGrid via SMTP
    if (process.env.SENDGRID_API_KEY) {
      this.nodemailerTransporter = nodemailer.createTransporter({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
      this.providers.set('sendgrid', {
        name: 'sendgrid',
        config: { apiKey: process.env.SENDGRID_API_KEY }
      });
    }

    // Custom SMTP
    if (process.env.SMTP_HOST) {
      this.nodemailerTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      this.providers.set('smtp', {
        name: 'smtp',
        config: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER
        }
      });
    }

    // Set default provider
    if (this.resend) {
      this.defaultProvider = this.providers.get('resend')!;
    } else if (this.providers.has('sendgrid')) {
      this.defaultProvider = this.providers.get('sendgrid')!;
    } else if (this.providers.has('smtp')) {
      this.defaultProvider = this.providers.get('smtp')!;
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    try {
      // Add tracking pixels if enabled
      if (options.trackOpens || options.trackClicks) {
        options = await this.addTrackingToEmail(options);
      }

      // Check if should be queued
      if (options.scheduledAt || options.priority === 'low') {
        const queuedEmail = await this.queue.add(options);
        return {
          id: queuedEmail.id,
          provider: 'queue',
          status: 'queued'
        };
      }

      // Send immediately
      const result = await this.sendImmediately(options);
      
      // Log email sent
      await this.tracker.logEmailSent({
        id: result.id,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        provider: result.provider,
        campaignId: options.campaignId,
        tags: options.tags,
        metadata: options.metadata,
        sentAt: new Date()
      });

      return result;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return {
        id: 'error',
        provider: this.defaultProvider.name,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async sendImmediately(options: SendEmailOptions): Promise<EmailResult> {
    const provider = this.defaultProvider.name;

    switch (provider) {
      case 'resend':
        return this.sendWithResend(options);
      case 'sendgrid':
      case 'smtp':
        return this.sendWithNodemailer(options);
      default:
        throw new Error('No email provider configured');
    }
  }

  private async sendWithResend(options: SendEmailOptions): Promise<EmailResult> {
    if (!this.resend) {
      throw new Error('Resend not configured');
    }

    const emailData = {
      from: options.from || process.env.DEFAULT_FROM_EMAIL || 'noreply@acecrm.com',
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
      tags: options.tags?.map(tag => ({ name: 'category', value: tag }))
    };

    const result = await this.resend.emails.send(emailData);

    return {
      id: result.data?.id || 'unknown',
      provider: 'resend',
      status: 'sent',
      messageId: result.data?.id
    };
  }

  private async sendWithNodemailer(options: SendEmailOptions): Promise<EmailResult> {
    if (!this.nodemailerTransporter) {
      throw new Error('Nodemailer not configured');
    }

    const mailOptions = {
      from: options.from || process.env.DEFAULT_FROM_EMAIL || 'noreply@acecrm.com',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
      headers: {
        'X-Category': options.tags?.join(','),
        'X-Campaign-Id': options.campaignId
      }
    };

    const info = await this.nodemailerTransporter.sendMail(mailOptions);

    return {
      id: info.messageId,
      provider: this.defaultProvider.name,
      status: 'sent',
      messageId: info.messageId
    };
  }

  private async addTrackingToEmail(options: SendEmailOptions): Promise<SendEmailOptions> {
    const trackingId = await this.tracker.generateTrackingId();
    
    let html = options.html || '';
    
    // Add open tracking pixel
    if (options.trackOpens) {
      const pixelUrl = `${process.env.APP_URL}/api/email/track/open/${trackingId}`;
      html += `<img src="${pixelUrl}" width="1" height="1" style="display:none;" />`;
    }
    
    // Add click tracking
    if (options.trackClicks) {
      html = await this.tracker.addClickTracking(html, trackingId);
    }
    
    return { ...options, html };
  }

  async sendTemplate(templateName: string, options: Omit<SendEmailOptions, 'html' | 'template'> & { templateData?: Record<string, any> }): Promise<EmailResult> {
    const template = await this.loadTemplate(templateName);
    const html = this.renderTemplate(template, options.templateData || {});
    
    return this.sendEmail({
      ...options,
      html,
      template: templateName
    });
  }

  private async loadTemplate(templateName: string): Promise<string> {
    // This would load from database or file system
    const templatePath = `/mnt/c/Users/rhyan/Downloads/THE ACE CRM/src/email/templates/html/${templateName}.html`;
    try {
      const fs = require('fs').promises;
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      throw new Error(`Template ${templateName} not found`);
    }
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    // Simple template rendering - in production, use a proper template engine
    let rendered = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    }
    return rendered;
  }

  async getEmailStats(campaignId?: string): Promise<any> {
    return this.tracker.getStats(campaignId);
  }

  async testEmailConfiguration(): Promise<{ provider: string; status: string; error?: string }[]> {
    const results = [];
    
    for (const [name, provider] of this.providers) {
      try {
        if (name === 'resend' && this.resend) {
          // Test Resend connection
          results.push({ provider: name, status: 'connected' });
        } else if (this.nodemailerTransporter) {
          // Test SMTP connection
          await this.nodemailerTransporter.verify();
          results.push({ provider: name, status: 'connected' });
        }
      } catch (error) {
        results.push({
          provider: name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }
}

export default EmailService;