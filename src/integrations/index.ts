/**
 * Third-Party Integrations Module
 * Centralized management for all external service integrations
 */

// Core Integration Types
export * from './types';
export * from './base/IntegrationManager';

// Authentication & Webhook Infrastructure
export * from './zapier/ZapierWebhook';
export * from './base/WebhookManager';

// Communication Integrations
export * from './slack/SlackIntegration';
export * from './twilio/TwilioSMSIntegration';

// Productivity & Workspace
export * from './google/GoogleWorkspaceIntegration';
export * from './microsoft/Microsoft365Integration';

// Marketing & CRM
export * from './mailchimp/MailchimpIntegration';
export * from './hubspot/HubSpotIntegration';

// Social Media
export * from './social/LinkedInIntegration';
export * from './social/TwitterIntegration';

// Accounting
export * from './quickbooks/QuickBooksIntegration';
export * from './xero/XeroIntegration';

// File Storage
export * from './dropbox/DropboxIntegration';
export * from './googledrive/GoogleDriveIntegration';

// Development Tools
export * from './github/GitHubIntegration';
export * from './gitlab/GitLabIntegration';

// Integration Registry
import { IntegrationManager } from './base/IntegrationManager';

// Available integrations
export const AVAILABLE_INTEGRATIONS = {
  ZAPIER: 'zapier',
  SLACK: 'slack',
  GOOGLE_WORKSPACE: 'google_workspace',
  MICROSOFT_365: 'microsoft_365',
  MAILCHIMP: 'mailchimp',
  HUBSPOT: 'hubspot',
  LINKEDIN: 'linkedin',
  TWITTER: 'twitter',
  QUICKBOOKS: 'quickbooks',
  XERO: 'xero',
  DROPBOX: 'dropbox',
  GOOGLE_DRIVE: 'google_drive',
  TWILIO: 'twilio',
  GITHUB: 'github',
  GITLAB: 'gitlab'
} as const;

// Initialize integration manager singleton
export const integrationManager = IntegrationManager.getInstance();

// Export default integration manager
export default integrationManager;