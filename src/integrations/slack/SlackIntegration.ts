/**
 * Slack Integration for Notifications and Communication
 * Provides real-time notifications and team communication features
 */

import { BaseIntegration, IntegrationConfig, IntegrationResponse, IntegrationCredentials, WebhookPayload } from '../types';
import { Logger } from '../../config/logger';
import axios, { AxiosInstance } from 'axios';

export interface SlackMessage {
  channel: string;
  text: string;
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
  attachments?: SlackAttachment[];
  blocks?: SlackBlock[];
  thread_ts?: string;
}

export interface SlackAttachment {
  color?: string;
  pretext?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: SlackField[];
  footer?: string;
  footer_icon?: string;
  ts?: number;
}

export interface SlackField {
  title: string;
  value: string;
  short?: boolean;
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  elements?: any[];
}

export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  email?: string;
  is_bot?: boolean;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_member: boolean;
  is_private: boolean;
}

export class SlackIntegration implements BaseIntegration {
  public readonly name = 'Slack';
  public readonly type = 'communication';
  public readonly version = '1.0.0';
  public enabled = false;

  private logger: Logger;
  private httpClient: AxiosInstance;
  private botToken?: string;
  private appToken?: string;

  constructor(public config: IntegrationConfig) {
    this.logger = new Logger('SlackIntegration');
    this.enabled = config.enabled;
    
    this.httpClient = axios.create({
      baseURL: 'https://slack.com/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ACE-CRM-Slack/1.0.0'
      }
    });
  }

  /**
   * Initialize Slack integration
   */
  public async initialize(): Promise<IntegrationResponse> {
    try {
      this.logger.info('Initializing Slack integration...');

      if (this.config.accessToken) {
        this.botToken = this.config.accessToken;
        this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${this.botToken}`;
      }

      // Test the connection
      const testResult = await this.healthCheck();
      if (!testResult.success) {
        return testResult;
      }

      this.enabled = true;
      this.logger.info('Slack integration initialized successfully');

      return {
        success: true,
        data: {
          botToken: !!this.botToken,
          webhookUrl: this.config.webhookUrl
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to initialize Slack integration:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Authenticate with Slack
   */
  public async authenticate(credentials: IntegrationCredentials): Promise<IntegrationResponse> {
    try {
      if (credentials.type === 'oauth2') {
        this.botToken = credentials.data.accessToken;
        this.appToken = credentials.data.refreshToken; // App-level token
      } else if (credentials.type === 'bearer_token') {
        this.botToken = credentials.data.bearerToken;
      } else {
        return { success: false, error: 'OAuth2 or Bearer Token required for Slack integration' };
      }

      if (this.botToken) {
        this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${this.botToken}`;
      }

      // Test authentication
      const testResult = await this.testAuth();
      if (!testResult.success) {
        return testResult;
      }

      this.logger.info('Slack authentication successful');
      return { success: true, data: { authenticated: true } };
    } catch (error: any) {
      this.logger.error('Slack authentication failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disconnect from Slack
   */
  public async disconnect(): Promise<IntegrationResponse> {
    try {
      this.enabled = false;
      this.botToken = undefined;
      this.appToken = undefined;
      delete this.httpClient.defaults.headers.common['Authorization'];
      
      this.logger.info('Slack integration disconnected');
      return { success: true };
    } catch (error: any) {
      this.logger.error('Error disconnecting from Slack:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<IntegrationResponse> {
    try {
      if (!this.enabled || !this.botToken) {
        return { success: false, error: 'Slack integration not configured' };
      }

      const response = await this.httpClient.post('/auth.test');
      
      if (response.data.ok) {
        return {
          success: true,
          data: {
            status: 'healthy',
            team: response.data.team,
            user: response.data.user,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        return { success: false, error: response.data.error || 'Authentication failed' };
      }
    } catch (error: any) {
      this.logger.error('Slack health check failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send message to Slack channel
   */
  public async sendMessage(message: SlackMessage): Promise<IntegrationResponse> {
    try {
      if (!this.botToken) {
        return { success: false, error: 'Slack not authenticated' };
      }

      const response = await this.httpClient.post('/chat.postMessage', message);

      if (response.data.ok) {
        this.logger.info(`Message sent to Slack channel: ${message.channel}`);
        return {
          success: true,
          data: {
            channel: response.data.channel,
            ts: response.data.ts,
            message: response.data.message
          }
        };
      } else {
        return { success: false, error: response.data.error || 'Failed to send message' };
      }
    } catch (error: any) {
      this.logger.error('Error sending Slack message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send CRM notification to Slack
   */
  public async sendCRMNotification(
    event: string,
    data: any,
    channel: string = '#general'
  ): Promise<IntegrationResponse> {
    try {
      const message = this.formatCRMNotification(event, data);
      message.channel = channel;

      return await this.sendMessage(message);
    } catch (error: any) {
      this.logger.error('Error sending CRM notification to Slack:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Slack channels
   */
  public async getChannels(): Promise<IntegrationResponse<SlackChannel[]>> {
    try {
      if (!this.botToken) {
        return { success: false, error: 'Slack not authenticated' };
      }

      const response = await this.httpClient.post('/conversations.list', {
        types: 'public_channel,private_channel',
        limit: 1000
      });

      if (response.data.ok) {
        return {
          success: true,
          data: response.data.channels.map((channel: any) => ({
            id: channel.id,
            name: channel.name,
            is_channel: channel.is_channel,
            is_group: channel.is_group,
            is_im: channel.is_im,
            is_member: channel.is_member,
            is_private: channel.is_private
          }))
        };
      } else {
        return { success: false, error: response.data.error || 'Failed to get channels' };
      }
    } catch (error: any) {
      this.logger.error('Error getting Slack channels:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Slack users
   */
  public async getUsers(): Promise<IntegrationResponse<SlackUser[]>> {
    try {
      if (!this.botToken) {
        return { success: false, error: 'Slack not authenticated' };
      }

      const response = await this.httpClient.post('/users.list', {
        limit: 1000
      });

      if (response.data.ok) {
        return {
          success: true,
          data: response.data.members.map((user: any) => ({
            id: user.id,
            name: user.name,
            real_name: user.real_name,
            email: user.profile?.email,
            is_bot: user.is_bot
          })).filter((user: SlackUser) => !user.is_bot)
        };
      } else {
        return { success: false, error: response.data.error || 'Failed to get users' };
      }
    } catch (error: any) {
      this.logger.error('Error getting Slack users:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle incoming Slack webhook
   */
  public async handleWebhook(payload: WebhookPayload): Promise<IntegrationResponse> {
    try {
      this.logger.info(`Processing Slack webhook: ${payload.event}`);

      // Handle URL verification for Slack Events API
      if (payload.data.type === 'url_verification') {
        return {
          success: true,
          data: { challenge: payload.data.challenge }
        };
      }

      // Handle Slack events
      if (payload.data.event) {
        return await this.handleSlackEvent(payload.data.event);
      }

      // Handle interactive components (buttons, menus, etc.)
      if (payload.data.type === 'interactive_message' || payload.data.type === 'block_actions') {
        return await this.handleInteractiveComponent(payload.data);
      }

      return { success: true, data: { processed: true } };
    } catch (error: any) {
      this.logger.error('Error handling Slack webhook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create interactive message with buttons
   */
  public async sendInteractiveMessage(
    channel: string,
    text: string,
    actions: Array<{
      name: string;
      text: string;
      type: 'button' | 'select';
      value?: string;
      style?: 'default' | 'primary' | 'danger';
    }>
  ): Promise<IntegrationResponse> {
    try {
      const message: SlackMessage = {
        channel,
        text,
        attachments: [{
          fallback: text,
          color: 'good',
          attachment_type: 'default',
          actions: actions.map(action => ({
            name: action.name,
            text: action.text,
            type: action.type,
            value: action.value || action.name,
            style: action.style || 'default'
          })) as any
        }]
      };

      return await this.sendMessage(message);
    } catch (error: any) {
      this.logger.error('Error sending interactive Slack message:', error);
      return { success: false, error: error.message };
    }
  }

  // Private helper methods

  private async testAuth(): Promise<IntegrationResponse> {
    try {
      const response = await this.httpClient.post('/auth.test');
      
      if (response.data.ok) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.data.error || 'Authentication failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private formatCRMNotification(event: string, data: any): SlackMessage {
    const baseMessage: SlackMessage = {
      channel: '#general',
      username: 'ACE CRM',
      icon_emoji: ':office:',
      attachments: []
    };

    switch (event) {
      case 'contact.created':
        baseMessage.text = '📝 New Contact Created';
        baseMessage.attachments = [{
          color: 'good',
          fields: [
            { title: 'Name', value: `${data.firstName} ${data.lastName}`, short: true },
            { title: 'Email', value: data.email || 'N/A', short: true },
            { title: 'Company', value: data.company || 'N/A', short: true },
            { title: 'Phone', value: data.phone || 'N/A', short: true }
          ],
          footer: 'ACE CRM',
          ts: Math.floor(Date.now() / 1000)
        }];
        break;

      case 'deal.created':
        baseMessage.text = '💰 New Deal Created';
        baseMessage.attachments = [{
          color: 'warning',
          fields: [
            { title: 'Deal Name', value: data.name, short: true },
            { title: 'Amount', value: `$${data.amount.toLocaleString()}`, short: true },
            { title: 'Stage', value: data.stage, short: true },
            { title: 'Probability', value: `${data.probability || 0}%`, short: true }
          ],
          footer: 'ACE CRM',
          ts: Math.floor(Date.now() / 1000)
        }];
        break;

      case 'deal.stage_changed':
        baseMessage.text = '🔄 Deal Stage Updated';
        baseMessage.attachments = [{
          color: 'warning',
          fields: [
            { title: 'Deal', value: data.name, short: true },
            { title: 'Old Stage', value: data.previousStage, short: true },
            { title: 'New Stage', value: data.currentStage, short: true },
            { title: 'Amount', value: `$${data.amount.toLocaleString()}`, short: true }
          ],
          footer: 'ACE CRM',
          ts: Math.floor(Date.now() / 1000)
        }];
        break;

      case 'task.created':
        baseMessage.text = '✅ New Task Created';
        baseMessage.attachments = [{
          color: '#36a64f',
          fields: [
            { title: 'Task', value: data.title, short: false },
            { title: 'Priority', value: data.priority, short: true },
            { title: 'Due Date', value: data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'N/A', short: true },
            { title: 'Assigned To', value: data.assignedTo || 'Unassigned', short: true }
          ],
          footer: 'ACE CRM',
          ts: Math.floor(Date.now() / 1000)
        }];
        break;

      case 'payment.received':
        baseMessage.text = '💳 Payment Received';
        baseMessage.attachments = [{
          color: 'good',
          fields: [
            { title: 'Amount', value: `$${data.amount.toLocaleString()}`, short: true },
            { title: 'Customer', value: data.customer, short: true },
            { title: 'Invoice', value: data.invoice || 'N/A', short: true },
            { title: 'Payment Method', value: data.paymentMethod, short: true }
          ],
          footer: 'ACE CRM',
          ts: Math.floor(Date.now() / 1000)
        }];
        break;

      default:
        baseMessage.text = `🔔 CRM Event: ${event}`;
        baseMessage.attachments = [{
          color: '#439FE0',
          text: JSON.stringify(data, null, 2),
          footer: 'ACE CRM',
          ts: Math.floor(Date.now() / 1000)
        }];
    }

    return baseMessage;
  }

  private async handleSlackEvent(event: any): Promise<IntegrationResponse> {
    this.logger.info(`Handling Slack event: ${event.type}`);

    switch (event.type) {
      case 'message':
        // Handle incoming messages (if bot is mentioned or DM)
        if (event.text && (event.text.includes('<@U') || event.channel_type === 'im')) {
          // Process command or respond to mention
          return await this.handleBotMention(event);
        }
        break;

      case 'app_mention':
        // Handle app mentions
        return await this.handleBotMention(event);

      default:
        this.logger.info(`Unhandled Slack event type: ${event.type}`);
    }

    return { success: true, data: { processed: true } };
  }

  private async handleBotMention(event: any): Promise<IntegrationResponse> {
    // Simple command handling - can be extended
    const text = event.text.toLowerCase();
    
    if (text.includes('help')) {
      await this.sendMessage({
        channel: event.channel,
        text: '🤖 ACE CRM Bot Commands:\n• `@acecrm stats` - Get CRM statistics\n• `@acecrm deals` - Show recent deals\n• `@acecrm help` - Show this help message',
        thread_ts: event.ts
      });
    } else if (text.includes('stats')) {
      // This would integrate with your CRM stats service
      await this.sendMessage({
        channel: event.channel,
        text: '📊 CRM Stats (Demo):\n• Total Contacts: 1,234\n• Open Deals: $45,000\n• This Month\'s Revenue: $12,500',
        thread_ts: event.ts
      });
    } else {
      await this.sendMessage({
        channel: event.channel,
        text: '👋 Hello! I\'m the ACE CRM bot. Type `@acecrm help` to see what I can do.',
        thread_ts: event.ts
      });
    }

    return { success: true, data: { responded: true } };
  }

  private async handleInteractiveComponent(payload: any): Promise<IntegrationResponse> {
    this.logger.info('Handling Slack interactive component');

    // Handle button clicks, menu selections, etc.
    const action = payload.actions?.[0];
    
    if (action) {
      this.logger.info(`Button clicked: ${action.name} = ${action.value}`);
      
      // Process the action based on your business logic
      // For example, updating a deal status, creating a task, etc.
      
      return { success: true, data: { action: action.name, value: action.value } };
    }

    return { success: true, data: { processed: true } };
  }
}

export default SlackIntegration;