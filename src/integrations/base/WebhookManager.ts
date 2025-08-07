/**
 * Webhook Management System
 * Handles webhook registration, validation, and routing
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import { WebhookPayload, IntegrationResponse } from '../types';
import { Logger } from '../../config/logger';

export interface WebhookConfig {
  url: string;
  secret?: string;
  signatureHeader?: string;
  signaturePrefix?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface WebhookHandler {
  (payload: WebhookPayload): Promise<IntegrationResponse>;
}

export class WebhookManager extends EventEmitter {
  private webhooks: Map<string, { config: WebhookConfig; handler: WebhookHandler }> = new Map();
  private logger: Logger;

  constructor() {
    super();
    this.logger = new Logger('WebhookManager');
  }

  /**
   * Register a webhook handler
   */
  public async registerWebhook(
    name: string,
    url: string,
    handler: WebhookHandler,
    config: Partial<WebhookConfig> = {}
  ): Promise<IntegrationResponse> {
    try {
      const webhookConfig: WebhookConfig = {
        url,
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        ...config
      };

      this.webhooks.set(name, { config: webhookConfig, handler });
      
      this.logger.info(`Webhook registered for ${name} at ${url}`);
      this.emit('webhook:registered', { name, config: webhookConfig });

      return { success: true, data: { name, url } };
    } catch (error: any) {
      this.logger.error(`Error registering webhook ${name}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unregister a webhook
   */
  public async unregisterWebhook(name: string): Promise<IntegrationResponse> {
    try {
      const webhook = this.webhooks.get(name);
      if (!webhook) {
        return { success: false, error: `Webhook ${name} not found` };
      }

      this.webhooks.delete(name);
      
      this.logger.info(`Webhook unregistered for ${name}`);
      this.emit('webhook:unregistered', { name });

      return { success: true, data: { name } };
    } catch (error: any) {
      this.logger.error(`Error unregistering webhook ${name}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process incoming webhook
   */
  public async processWebhook(
    name: string,
    payload: any,
    headers: Record<string, string> = {}
  ): Promise<IntegrationResponse> {
    try {
      const webhook = this.webhooks.get(name);
      if (!webhook) {
        return { success: false, error: `Webhook ${name} not found` };
      }

      // Validate webhook signature if secret is configured
      if (webhook.config.secret) {
        const isValid = this.validateSignature(payload, headers, webhook.config);
        if (!isValid) {
          this.logger.warn(`Invalid webhook signature for ${name}`);
          return { success: false, error: 'Invalid webhook signature' };
        }
      }

      // Create webhook payload
      const webhookPayload: WebhookPayload = {
        event: payload.event || 'webhook.received',
        data: payload,
        timestamp: new Date(),
        source: name,
        id: this.generateWebhookId(),
        signature: headers[webhook.config.signatureHeader || 'x-signature']
      };

      // Process with retry logic
      let lastError: any;
      const maxRetries = webhook.config.maxRetries || 3;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await Promise.race([
            webhook.handler(webhookPayload),
            this.createTimeoutPromise(webhook.config.timeout || 30000)
          ]);

          if (result.success) {
            this.emit('webhook:processed', { name, payload: webhookPayload, result });
            this.logger.info(`Webhook ${name} processed successfully`);
            return result;
          }

          lastError = result.error;
          if (attempt < maxRetries) {
            await this.delay(webhook.config.retryDelay || 1000);
            this.logger.warn(`Webhook ${name} failed, retrying (${attempt + 1}/${maxRetries})`);
          }
        } catch (error: any) {
          lastError = error;
          if (attempt < maxRetries) {
            await this.delay(webhook.config.retryDelay || 1000);
            this.logger.warn(`Webhook ${name} error, retrying (${attempt + 1}/${maxRetries}):`, error.message);
          }
        }
      }

      // All retries failed
      this.emit('webhook:failed', { name, payload: webhookPayload, error: lastError });
      this.logger.error(`Webhook ${name} failed after ${maxRetries} retries:`, lastError);
      
      return { success: false, error: `Webhook processing failed: ${lastError}` };

    } catch (error: any) {
      this.logger.error(`Error processing webhook ${name}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate webhook signature
   */
  private validateSignature(
    payload: any,
    headers: Record<string, string>,
    config: WebhookConfig
  ): boolean {
    try {
      if (!config.secret || !config.signatureHeader) {
        return true; // No validation required
      }

      const signature = headers[config.signatureHeader];
      if (!signature) {
        return false;
      }

      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expectedSignature = this.generateSignature(payloadString, config.secret);
      
      const prefix = config.signaturePrefix || '';
      const cleanSignature = signature.startsWith(prefix) ? signature.slice(prefix.length) : signature;
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(cleanSignature, 'hex')
      );
    } catch (error) {
      this.logger.error('Error validating webhook signature:', error);
      return false;
    }
  }

  /**
   * Generate HMAC signature for payload
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
  }

  /**
   * Generate unique webhook ID
   */
  private generateWebhookId(): string {
    return `webhook_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<IntegrationResponse> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Webhook processing timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get webhook configuration
   */
  public getWebhook(name: string): { config: WebhookConfig; handler: WebhookHandler } | undefined {
    return this.webhooks.get(name);
  }

  /**
   * List all registered webhooks
   */
  public listWebhooks(): Array<{ name: string; config: WebhookConfig }> {
    const result = [];
    for (const [name, webhook] of this.webhooks) {
      result.push({ name, config: webhook.config });
    }
    return result;
  }

  /**
   * Test webhook connectivity
   */
  public async testWebhook(name: string): Promise<IntegrationResponse> {
    try {
      const webhook = this.webhooks.get(name);
      if (!webhook) {
        return { success: false, error: `Webhook ${name} not found` };
      }

      const testPayload: WebhookPayload = {
        event: 'webhook.test',
        data: { test: true, timestamp: new Date().toISOString() },
        timestamp: new Date(),
        source: name,
        id: this.generateWebhookId()
      };

      const result = await webhook.handler(testPayload);
      
      if (result.success) {
        this.logger.info(`Webhook ${name} test successful`);
      } else {
        this.logger.warn(`Webhook ${name} test failed:`, result.error);
      }

      return result;
    } catch (error: any) {
      this.logger.error(`Error testing webhook ${name}:`, error);
      return { success: false, error: error.message };
    }
  }
}

export default WebhookManager;