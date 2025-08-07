/**
 * Common types for third-party integrations
 */

export interface IntegrationConfig {
  enabled: boolean;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  webhookUrl?: string;
  baseUrl?: string;
  version?: string;
  scopes?: string[];
  customSettings?: Record<string, any>;
}

export interface IntegrationCredentials {
  type: 'oauth2' | 'api_key' | 'bearer_token' | 'basic_auth';
  data: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    username?: string;
    password?: string;
    bearerToken?: string;
  };
  expiresAt?: Date;
  scopes?: string[];
}

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: Date;
  source: string;
  id: string;
  signature?: string;
}

export interface IntegrationResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
  rateLimit?: {
    remaining: number;
    limit: number;
    resetTime: Date;
  };
}

export interface BaseIntegration {
  name: string;
  type: string;
  version: string;
  enabled: boolean;
  config: IntegrationConfig;
  
  // Core methods
  initialize(): Promise<IntegrationResponse>;
  authenticate(credentials: IntegrationCredentials): Promise<IntegrationResponse>;
  disconnect(): Promise<IntegrationResponse>;
  healthCheck(): Promise<IntegrationResponse>;
  
  // Event handling
  handleWebhook?(payload: WebhookPayload): Promise<IntegrationResponse>;
  
  // Rate limiting
  getRateLimit?(): Promise<IntegrationResponse>;
}

// CRM-specific data types
export interface CRMContact {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CRMDeal {
  id?: string;
  name: string;
  amount: number;
  stage: string;
  probability?: number;
  closeDate?: Date;
  contactId?: string;
  companyId?: string;
  ownerId?: string;
  description?: string;
  customFields?: Record<string, any>;
}

export interface CRMTask {
  id?: string;
  title: string;
  description?: string;
  type: 'call' | 'email' | 'meeting' | 'task';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'overdue';
  dueDate?: Date;
  assignedTo?: string;
  relatedTo?: {
    type: 'contact' | 'deal' | 'company';
    id: string;
  };
}

// Integration event types
export type IntegrationEvent = 
  | 'contact.created'
  | 'contact.updated' 
  | 'contact.deleted'
  | 'deal.created'
  | 'deal.updated'
  | 'deal.stage_changed'
  | 'task.created'
  | 'task.completed'
  | 'email.sent'
  | 'email.opened'
  | 'email.clicked'
  | 'payment.received'
  | 'invoice.created'
  | 'file.uploaded'
  | 'project.created'
  | 'project.completed';

export interface IntegrationEventData {
  event: IntegrationEvent;
  entityType: string;
  entityId: string;
  data: any;
  metadata?: Record<string, any>;
  timestamp: Date;
}

// OAuth flow types
export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface OAuthAuthorizationUrl {
  url: string;
  state: string;
  codeVerifier?: string;
}

// Sync operation types
export interface SyncOperation {
  id: string;
  integrationType: string;
  operation: 'import' | 'export' | 'bidirectional';
  entityType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsTotal: number;
  errors: string[];
  lastSyncToken?: string;
}

export interface SyncConfiguration {
  integrationType: string;
  entityMapping: Record<string, string>;
  fieldMapping: Record<string, string>;
  syncDirection: 'import' | 'export' | 'bidirectional';
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  conflictResolution: 'source_wins' | 'destination_wins' | 'newest_wins' | 'manual';
  filters?: Record<string, any>;
}