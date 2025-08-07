export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text?: string;
  variables: EmailTemplateVariable[];
  category: 'transactional' | 'marketing' | 'notification';
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface EmailTemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  templateId: string;
  segmentId?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  scheduledAt?: Date;
  sentAt?: Date;
  recipients: EmailRecipient[];
  settings: EmailCampaignSettings;
  stats: EmailCampaignStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailRecipient {
  email: string;
  firstName?: string;
  lastName?: string;
  customData?: Record<string, any>;
  status: 'pending' | 'sent' | 'failed' | 'bounced' | 'unsubscribed';
  sentAt?: Date;
  error?: string;
}

export interface EmailCampaignSettings {
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  trackOpens: boolean;
  trackClicks: boolean;
  enableUnsubscribe: boolean;
  customUnsubscribeUrl?: string;
  tags: string[];
  priority: 'high' | 'normal' | 'low';
  sendRate?: {
    maxPerHour: number;
    maxPerDay: number;
  };
}

export interface EmailCampaignStats {
  totalRecipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  complaintRate: number;
  unsubscribeRate: number;
}

export interface EmailSegment {
  id: string;
  name: string;
  description?: string;
  filters: EmailSegmentFilter[];
  recipientCount: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface EmailSegmentFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'is_null' | 'is_not_null' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface EmailWorkflow {
  id: string;
  name: string;
  description?: string;
  trigger: EmailWorkflowTrigger;
  steps: EmailWorkflowStep[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  stats: EmailWorkflowStats;
}

export interface EmailWorkflowTrigger {
  type: 'user_signup' | 'user_login' | 'purchase' | 'cart_abandonment' | 'birthday' | 'custom_event' | 'date_based' | 'api_trigger';
  conditions?: Record<string, any>;
  schedule?: {
    type: 'immediate' | 'delay' | 'specific_time' | 'recurring';
    delay?: number; // in minutes
    time?: string; // HH:MM format
    timezone?: string;
    days?: number[]; // 0-6, Sunday to Saturday
  };
}

export interface EmailWorkflowStep {
  id: string;
  type: 'send_email' | 'wait' | 'condition' | 'update_contact' | 'add_tag' | 'remove_tag';
  order: number;
  config: EmailWorkflowStepConfig;
  nextSteps: string[]; // IDs of next steps
}

export interface EmailWorkflowStepConfig {
  // For send_email type
  templateId?: string;
  subject?: string;
  customData?: Record<string, any>;
  
  // For wait type
  waitDuration?: number; // in minutes
  waitUntil?: string; // specific time or condition
  
  // For condition type
  condition?: {
    field: string;
    operator: string;
    value: any;
  };
  
  // For update_contact type
  updateFields?: Record<string, any>;
  
  // For tag operations
  tags?: string[];
}

export interface EmailWorkflowStats {
  totalEntered: number;
  completed: number;
  currentlyActive: number;
  emailsSent: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
}

export interface EmailEvent {
  id: string;
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
  email: string;
  campaignId?: string;
  workflowId?: string;
  messageId: string;
  timestamp: Date;
  data?: Record<string, any>; // Additional event data
  userAgent?: string;
  ipAddress?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

export interface EmailContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  customFields: Record<string, any>;
  tags: string[];
  segments: string[];
  subscriptionStatus: 'subscribed' | 'unsubscribed' | 'bounced' | 'complained';
  subscriptionSource?: string;
  subscribedAt?: Date;
  unsubscribedAt?: Date;
  lastEmailedAt?: Date;
  emailStats: {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    lastOpenedAt?: Date;
    lastClickedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailQueue {
  id: string;
  email: string;
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  campaignId?: string;
  workflowId?: string;
  priority: 'high' | 'normal' | 'low';
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  error?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailProvider {
  id: string;
  name: string;
  type: 'resend' | 'sendgrid' | 'mailgun' | 'ses' | 'smtp';
  config: Record<string, any>;
  isDefault: boolean;
  isActive: boolean;
  dailyQuota?: number;
  monthlyQuota?: number;
  usageStats: {
    dailySent: number;
    monthlySent: number;
    lastResetAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailBlacklist {
  id: string;
  email: string;
  reason: 'bounce' | 'complaint' | 'unsubscribe' | 'manual' | 'spam';
  addedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface EmailWhitelist {
  id: string;
  email: string;
  reason: string;
  addedAt: Date;
  addedBy: string;
}

export interface EmailAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  overview: {
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    unsubscribed: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    clickToOpenRate: number;
    bounceRate: number;
    complaintRate: number;
    unsubscribeRate: number;
  };
  trends: {
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
  }[];
  topPerformingCampaigns: {
    campaignId: string;
    name: string;
    sent: number;
    openRate: number;
    clickRate: number;
  }[];
  topPerformingTemplates: {
    templateId: string;
    name: string;
    usage: number;
    openRate: number;
    clickRate: number;
  }[];
  deviceStats: {
    desktop: number;
    mobile: number;
    tablet: number;
    unknown: number;
  };
  locationStats: {
    country: string;
    opens: number;
    clicks: number;
  }[];
  providerStats: {
    provider: string;
    sent: number;
    delivered: number;
    bounced: number;
  }[];
}