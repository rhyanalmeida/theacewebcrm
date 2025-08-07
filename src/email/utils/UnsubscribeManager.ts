import crypto from 'crypto';
import { logger } from '../../utils/logger';

export interface UnsubscribeToken {
  email: string;
  campaignId?: string;
  workflowId?: string;
  expiresAt?: Date;
  preferences?: EmailPreferences;
}

export interface EmailPreferences {
  marketing: boolean;
  transactional: boolean;
  notifications: boolean;
  newsletters: boolean;
  productUpdates: boolean;
  categories: string[];
}

export interface UnsubscribeResult {
  success: boolean;
  email?: string;
  error?: string;
  preferences?: EmailPreferences;
}

export class UnsubscribeManager {
  private tokens: Map<string, UnsubscribeToken> = new Map();
  private unsubscribedEmails: Set<string> = new Set();
  private emailPreferences: Map<string, EmailPreferences> = new Map();

  constructor() {
    this.loadUnsubscribeData();
  }

  private async loadUnsubscribeData() {
    try {
      // Load unsubscribed emails and preferences from database
      logger.info('Unsubscribe manager initialized');
    } catch (error) {
      logger.error('Failed to load unsubscribe data:', error);
    }
  }

  async generateUnsubscribeToken(email: string, campaignId?: string, workflowId?: string): Promise<string> {
    const tokenData = JSON.stringify({
      email,
      campaignId,
      workflowId,
      timestamp: Date.now()
    });

    const token = crypto
      .createHmac('sha256', process.env.UNSUBSCRIBE_SECRET || 'default-secret')
      .update(tokenData)
      .digest('hex');

    // Store token data
    this.tokens.set(token, {
      email,
      campaignId,
      workflowId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      preferences: this.emailPreferences.get(email) || this.getDefaultPreferences()
    });

    return token;
  }

  async generateUnsubscribeUrl(email: string, campaignId?: string, workflowId?: string): Promise<string> {
    const token = await this.generateUnsubscribeToken(email, campaignId, workflowId);
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/email/unsubscribe/${token}`;
  }

  async generatePreferencesUrl(email: string): Promise<string> {
    const token = await this.generateUnsubscribeToken(email);
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/email/preferences/${token}`;
  }

  async processUnsubscribe(token: string, ipAddress?: string): Promise<UnsubscribeResult> {
    try {
      const tokenData = this.tokens.get(token);
      
      if (!tokenData) {
        return {
          success: false,
          error: 'Invalid or expired unsubscribe token'
        };
      }

      if (tokenData.expiresAt && tokenData.expiresAt < new Date()) {
        this.tokens.delete(token);
        return {
          success: false,
          error: 'Unsubscribe token has expired'
        };
      }

      // Add email to unsubscribed list
      this.unsubscribedEmails.add(tokenData.email);

      // Update preferences to disable all email types
      const preferences: EmailPreferences = {
        marketing: false,
        transactional: true, // Keep transactional emails enabled by default
        notifications: false,
        newsletters: false,
        productUpdates: false,
        categories: []
      };

      this.emailPreferences.set(tokenData.email, preferences);

      // Log unsubscribe event
      await this.logUnsubscribe({
        email: tokenData.email,
        campaignId: tokenData.campaignId,
        workflowId: tokenData.workflowId,
        token,
        ipAddress,
        timestamp: new Date(),
        method: 'one_click'
      });

      // Clean up token
      this.tokens.delete(token);

      logger.info(`Email unsubscribed: ${tokenData.email}`);

      return {
        success: true,
        email: tokenData.email,
        preferences
      };

    } catch (error) {
      logger.error('Unsubscribe processing error:', error);
      return {
        success: false,
        error: 'Failed to process unsubscribe request'
      };
    }
  }

  async processListUnsubscribe(email: string, listId?: string): Promise<UnsubscribeResult> {
    try {
      // RFC-compliant List-Unsubscribe processing
      this.unsubscribedEmails.add(email);

      const preferences: EmailPreferences = {
        marketing: false,
        transactional: true,
        notifications: false,
        newsletters: false,
        productUpdates: false,
        categories: listId ? [] : []
      };

      this.emailPreferences.set(email, preferences);

      await this.logUnsubscribe({
        email,
        listId,
        timestamp: new Date(),
        method: 'list_unsubscribe'
      });

      return {
        success: true,
        email,
        preferences
      };

    } catch (error) {
      logger.error('List unsubscribe processing error:', error);
      return {
        success: false,
        error: 'Failed to process list unsubscribe'
      };
    }
  }

  async getPreferences(token: string): Promise<EmailPreferences | null> {
    const tokenData = this.tokens.get(token);
    
    if (!tokenData || (tokenData.expiresAt && tokenData.expiresAt < new Date())) {
      return null;
    }

    return this.emailPreferences.get(tokenData.email) || this.getDefaultPreferences();
  }

  async updatePreferences(token: string, newPreferences: Partial<EmailPreferences>): Promise<boolean> {
    try {
      const tokenData = this.tokens.get(token);
      
      if (!tokenData || (tokenData.expiresAt && tokenData.expiresAt < new Date())) {
        return false;
      }

      const currentPreferences = this.emailPreferences.get(tokenData.email) || this.getDefaultPreferences();
      const updatedPreferences: EmailPreferences = {
        ...currentPreferences,
        ...newPreferences
      };

      this.emailPreferences.set(tokenData.email, updatedPreferences);

      // If all marketing preferences are disabled, add to unsubscribed list
      if (!updatedPreferences.marketing && 
          !updatedPreferences.notifications &&
          !updatedPreferences.newsletters &&
          !updatedPreferences.productUpdates &&
          updatedPreferences.categories.length === 0) {
        this.unsubscribedEmails.add(tokenData.email);
      } else {
        // Remove from unsubscribed list if any marketing preferences are enabled
        this.unsubscribedEmails.delete(tokenData.email);
      }

      await this.logPreferenceUpdate({
        email: tokenData.email,
        oldPreferences: currentPreferences,
        newPreferences: updatedPreferences,
        timestamp: new Date()
      });

      logger.info(`Email preferences updated: ${tokenData.email}`);
      return true;

    } catch (error) {
      logger.error('Preference update error:', error);
      return false;
    }
  }

  async isUnsubscribed(email: string, emailType?: string): Promise<boolean> {
    // Check global unsubscribe
    if (this.unsubscribedEmails.has(email)) {
      return true;
    }

    // Check specific preferences
    const preferences = this.emailPreferences.get(email);
    if (!preferences) {
      return false; // No preferences set, assume subscribed
    }

    switch (emailType) {
      case 'marketing':
        return !preferences.marketing;
      case 'transactional':
        return !preferences.transactional;
      case 'notifications':
        return !preferences.notifications;
      case 'newsletters':
        return !preferences.newsletters;
      case 'productUpdates':
        return !preferences.productUpdates;
      default:
        // For campaign emails, check marketing preference
        return !preferences.marketing;
    }
  }

  async canSendToEmail(email: string, emailType: string = 'marketing', category?: string): Promise<boolean> {
    // Check if email is globally unsubscribed
    if (this.unsubscribedEmails.has(email)) {
      // Allow transactional emails even if globally unsubscribed
      return emailType === 'transactional';
    }

    const preferences = this.emailPreferences.get(email);
    if (!preferences) {
      return true; // No preferences set, assume can send
    }

    // Check specific email type preference
    switch (emailType) {
      case 'marketing':
        if (!preferences.marketing) return false;
        break;
      case 'transactional':
        if (!preferences.transactional) return false;
        break;
      case 'notifications':
        if (!preferences.notifications) return false;
        break;
      case 'newsletters':
        if (!preferences.newsletters) return false;
        break;
      case 'productUpdates':
        if (!preferences.productUpdates) return false;
        break;
    }

    // Check category-specific preferences
    if (category && preferences.categories.length > 0) {
      return preferences.categories.includes(category);
    }

    return true;
  }

  async filterSubscribedEmails(emails: string[], emailType: string = 'marketing', category?: string): Promise<string[]> {
    const subscribedEmails: string[] = [];
    
    for (const email of emails) {
      const canSend = await this.canSendToEmail(email, emailType, category);
      if (canSend) {
        subscribedEmails.push(email);
      }
    }

    return subscribedEmails;
  }

  async getUnsubscribeStats(dateRange?: { start: Date; end: Date }): Promise<{
    totalUnsubscribed: number;
    unsubscribesByType: Record<string, number>;
    unsubscribesByDate: Array<{ date: string; count: number }>;
    topUnsubscribeReasons: Array<{ reason: string; count: number }>;
  }> {
    // In a real implementation, this would query the database
    return {
      totalUnsubscribed: this.unsubscribedEmails.size,
      unsubscribesByType: {
        one_click: 0,
        list_unsubscribe: 0,
        manual: 0
      },
      unsubscribesByDate: [],
      topUnsubscribeReasons: []
    };
  }

  async resubscribeEmail(email: string, preferences?: Partial<EmailPreferences>): Promise<boolean> {
    try {
      // Remove from unsubscribed list
      this.unsubscribedEmails.delete(email);

      // Update preferences
      const newPreferences: EmailPreferences = {
        ...this.getDefaultPreferences(),
        ...preferences
      };

      this.emailPreferences.set(email, newPreferences);

      await this.logResubscribe({
        email,
        preferences: newPreferences,
        timestamp: new Date()
      });

      logger.info(`Email resubscribed: ${email}`);
      return true;

    } catch (error) {
      logger.error('Resubscribe error:', error);
      return false;
    }
  }

  async addToSuppressionList(email: string, reason: 'bounce' | 'complaint' | 'manual', permanent: boolean = false): Promise<void> {
    this.unsubscribedEmails.add(email);

    // Set very restrictive preferences
    const suppressedPreferences: EmailPreferences = {
      marketing: false,
      transactional: !permanent, // Allow transactional unless permanently suppressed
      notifications: false,
      newsletters: false,
      productUpdates: false,
      categories: []
    };

    this.emailPreferences.set(email, suppressedPreferences);

    await this.logSuppression({
      email,
      reason,
      permanent,
      timestamp: new Date()
    });

    logger.info(`Email added to suppression list: ${email} (${reason})`);
  }

  async removeFromSuppressionList(email: string): Promise<boolean> {
    try {
      this.unsubscribedEmails.delete(email);
      
      // Reset to default preferences
      this.emailPreferences.set(email, this.getDefaultPreferences());

      logger.info(`Email removed from suppression list: ${email}`);
      return true;

    } catch (error) {
      logger.error('Failed to remove from suppression list:', error);
      return false;
    }
  }

  async getEmailPreferences(email: string): Promise<EmailPreferences> {
    return this.emailPreferences.get(email) || this.getDefaultPreferences();
  }

  async bulkUpdatePreferences(updates: Array<{ email: string; preferences: Partial<EmailPreferences> }>): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const update of updates) {
      try {
        const currentPreferences = this.emailPreferences.get(update.email) || this.getDefaultPreferences();
        const newPreferences: EmailPreferences = {
          ...currentPreferences,
          ...update.preferences
        };

        this.emailPreferences.set(update.email, newPreferences);
        success++;
      } catch (error) {
        logger.error(`Failed to update preferences for ${update.email}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  private getDefaultPreferences(): EmailPreferences {
    return {
      marketing: true,
      transactional: true,
      notifications: true,
      newsletters: true,
      productUpdates: true,
      categories: []
    };
  }

  private async logUnsubscribe(data: any): Promise<void> {
    // Log to database
    logger.debug('Unsubscribe logged:', data);
  }

  private async logPreferenceUpdate(data: any): Promise<void> {
    // Log to database
    logger.debug('Preference update logged:', data);
  }

  private async logResubscribe(data: any): Promise<void> {
    // Log to database
    logger.debug('Resubscribe logged:', data);
  }

  private async logSuppression(data: any): Promise<void> {
    // Log to database
    logger.debug('Suppression logged:', data);
  }

  // Helper method to generate List-Unsubscribe headers
  generateListUnsubscribeHeaders(email: string, campaignId?: string): {
    'List-Unsubscribe': string;
    'List-Unsubscribe-Post': string;
  } {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?email=${encodeURIComponent(email)}${campaignId ? `&campaignId=${campaignId}` : ''}`;
    
    return {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    };
  }

  // Clean up expired tokens
  async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [token, data] of this.tokens.entries()) {
      if (data.expiresAt && data.expiresAt < now) {
        this.tokens.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired unsubscribe tokens`);
    }

    return cleanedCount;
  }
}

export default UnsubscribeManager;