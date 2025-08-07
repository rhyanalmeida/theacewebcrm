/**
 * Central Integration Manager
 * Handles registration, lifecycle, and coordination of all integrations
 */

import { BaseIntegration, IntegrationConfig, IntegrationResponse, WebhookPayload, SyncOperation } from '../types';
import { EventEmitter } from 'events';
import { WebhookManager } from './WebhookManager';
import { Logger } from '../../config/logger';

export class IntegrationManager extends EventEmitter {
  private static instance: IntegrationManager;
  private integrations: Map<string, BaseIntegration> = new Map();
  private configs: Map<string, IntegrationConfig> = new Map();
  private webhookManager: WebhookManager;
  private logger: Logger;
  private syncOperations: Map<string, SyncOperation> = new Map();

  private constructor() {
    super();
    this.webhookManager = new WebhookManager();
    this.logger = new Logger('IntegrationManager');
    this.setupEventHandlers();
  }

  public static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager();
    }
    return IntegrationManager.instance;
  }

  /**
   * Register a new integration
   */
  public async registerIntegration(
    name: string, 
    integration: BaseIntegration, 
    config: IntegrationConfig
  ): Promise<IntegrationResponse> {
    try {
      this.integrations.set(name, integration);
      this.configs.set(name, config);

      if (config.enabled) {
        const result = await integration.initialize();
        if (!result.success) {
          this.logger.error(`Failed to initialize integration ${name}:`, result.error);
          return result;
        }
      }

      // Register webhook endpoint if supported
      if (integration.handleWebhook && config.webhookUrl) {
        await this.webhookManager.registerWebhook(name, config.webhookUrl, integration.handleWebhook);
      }

      this.emit('integration:registered', { name, integration, config });
      this.logger.info(`Integration ${name} registered successfully`);

      return { success: true, data: { name, status: 'registered' } };
    } catch (error: any) {
      this.logger.error(`Error registering integration ${name}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unregister an integration
   */
  public async unregisterIntegration(name: string): Promise<IntegrationResponse> {
    try {
      const integration = this.integrations.get(name);
      if (!integration) {
        return { success: false, error: `Integration ${name} not found` };
      }

      // Disconnect integration
      await integration.disconnect();

      // Remove webhook
      await this.webhookManager.unregisterWebhook(name);

      // Clean up
      this.integrations.delete(name);
      this.configs.delete(name);

      this.emit('integration:unregistered', { name });
      this.logger.info(`Integration ${name} unregistered successfully`);

      return { success: true, data: { name, status: 'unregistered' } };
    } catch (error: any) {
      this.logger.error(`Error unregistering integration ${name}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get integration by name
   */
  public getIntegration(name: string): BaseIntegration | undefined {
    return this.integrations.get(name);
  }

  /**
   * Get integration configuration
   */
  public getIntegrationConfig(name: string): IntegrationConfig | undefined {
    return this.configs.get(name);
  }

  /**
   * List all registered integrations
   */
  public listIntegrations(): Array<{ name: string; integration: BaseIntegration; config: IntegrationConfig }> {
    const result = [];
    for (const [name, integration] of this.integrations) {
      const config = this.configs.get(name);
      if (config) {
        result.push({ name, integration, config });
      }
    }
    return result;
  }

  /**
   * Enable integration
   */
  public async enableIntegration(name: string): Promise<IntegrationResponse> {
    try {
      const integration = this.integrations.get(name);
      const config = this.configs.get(name);

      if (!integration || !config) {
        return { success: false, error: `Integration ${name} not found` };
      }

      config.enabled = true;
      const result = await integration.initialize();

      if (result.success) {
        this.emit('integration:enabled', { name });
        this.logger.info(`Integration ${name} enabled`);
      }

      return result;
    } catch (error: any) {
      this.logger.error(`Error enabling integration ${name}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disable integration
   */
  public async disableIntegration(name: string): Promise<IntegrationResponse> {
    try {
      const integration = this.integrations.get(name);
      const config = this.configs.get(name);

      if (!integration || !config) {
        return { success: false, error: `Integration ${name} not found` };
      }

      config.enabled = false;
      const result = await integration.disconnect();

      if (result.success) {
        this.emit('integration:disabled', { name });
        this.logger.info(`Integration ${name} disabled`);
      }

      return result;
    } catch (error: any) {
      this.logger.error(`Error disabling integration ${name}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Health check for all integrations
   */
  public async healthCheckAll(): Promise<IntegrationResponse> {
    const results: Record<string, any> = {};
    
    for (const [name, integration] of this.integrations) {
      const config = this.configs.get(name);
      if (config?.enabled) {
        try {
          results[name] = await integration.healthCheck();
        } catch (error: any) {
          results[name] = { success: false, error: error.message };
        }
      } else {
        results[name] = { success: false, error: 'Integration disabled' };
      }
    }

    return { success: true, data: results };
  }

  /**
   * Handle incoming webhook
   */
  public async handleWebhook(integrationType: string, payload: WebhookPayload): Promise<IntegrationResponse> {
    try {
      const integration = this.integrations.get(integrationType);
      
      if (!integration || !integration.handleWebhook) {
        return { success: false, error: `No webhook handler for ${integrationType}` };
      }

      const result = await integration.handleWebhook(payload);
      
      if (result.success) {
        this.emit('webhook:processed', { integrationType, payload, result });
      } else {
        this.emit('webhook:error', { integrationType, payload, error: result.error });
      }

      return result;
    } catch (error: any) {
      this.logger.error(`Error handling webhook for ${integrationType}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start sync operation
   */
  public async startSync(operation: SyncOperation): Promise<IntegrationResponse> {
    try {
      this.syncOperations.set(operation.id, { ...operation, status: 'running' });
      
      this.emit('sync:started', { operation });
      this.logger.info(`Sync operation ${operation.id} started for ${operation.integrationType}`);

      return { success: true, data: { operationId: operation.id } };
    } catch (error: any) {
      this.logger.error(`Error starting sync operation:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update sync progress
   */
  public updateSyncProgress(operationId: string, progress: Partial<SyncOperation>): void {
    const operation = this.syncOperations.get(operationId);
    if (operation) {
      Object.assign(operation, progress);
      this.emit('sync:progress', { operation });
    }
  }

  /**
   * Complete sync operation
   */
  public completeSyncOperation(operationId: string, status: 'completed' | 'failed', error?: string): void {
    const operation = this.syncOperations.get(operationId);
    if (operation) {
      operation.status = status;
      operation.completedAt = new Date();
      if (error) {
        operation.errors.push(error);
      }
      
      this.emit('sync:completed', { operation });
      this.logger.info(`Sync operation ${operationId} completed with status: ${status}`);
    }
  }

  /**
   * Get sync operation status
   */
  public getSyncOperation(operationId: string): SyncOperation | undefined {
    return this.syncOperations.get(operationId);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('integration:error', (data) => {
      this.logger.error('Integration error:', data);
    });

    this.on('webhook:error', (data) => {
      this.logger.error('Webhook error:', data);
    });

    this.on('sync:error', (data) => {
      this.logger.error('Sync error:', data);
    });
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Integration Manager...');
    
    // Disconnect all integrations
    const disconnectPromises = [];
    for (const [name, integration] of this.integrations) {
      disconnectPromises.push(integration.disconnect());
    }
    
    await Promise.allSettled(disconnectPromises);
    
    // Clear maps
    this.integrations.clear();
    this.configs.clear();
    this.syncOperations.clear();
    
    this.logger.info('Integration Manager shutdown complete');
  }
}

export default IntegrationManager;