import { EmailEvent, EmailAnalytics } from '../types/email';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

export interface TrackingPixelData {
  trackingId: string;
  email: string;
  campaignId?: string;
  workflowId?: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface ClickTrackingData {
  trackingId: string;
  originalUrl: string;
  email: string;
  campaignId?: string;
  workflowId?: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface EmailTrackingStats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
}

export class EmailTracker {
  private events: Map<string, EmailEvent[]> = new Map();
  private trackingData: Map<string, any> = new Map();

  constructor() {
    this.loadTrackingData();
  }

  private async loadTrackingData() {
    try {
      // Load tracking data from database
      logger.info('Email tracker initialized');
    } catch (error) {
      logger.error('Failed to load tracking data:', error);
    }
  }

  async generateTrackingId(): Promise<string> {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return crypto.createHash('sha256').update(timestamp + randomBytes).digest('hex').substring(0, 32);
  }

  async logEmailSent(data: {
    id: string;
    to: string[];
    subject: string;
    provider: string;
    campaignId?: string;
    workflowId?: string;
    tags?: string[];
    metadata?: Record<string, any>;
    sentAt: Date;
  }): Promise<void> {
    for (const email of data.to) {
      const event: EmailEvent = {
        id: this.generateEventId(),
        type: 'sent',
        email,
        campaignId: data.campaignId,
        workflowId: data.workflowId,
        messageId: data.id,
        timestamp: data.sentAt,
        data: {
          subject: data.subject,
          provider: data.provider,
          tags: data.tags,
          metadata: data.metadata
        }
      };

      await this.storeEvent(event);
    }

    logger.debug(`Logged email sent for ${data.to.length} recipients`);
  }

  async trackEmailOpen(trackingId: string, userAgent?: string, ipAddress?: string): Promise<void> {
    const trackingData = this.trackingData.get(trackingId);
    if (!trackingData) {
      logger.warn(`No tracking data found for ID: ${trackingId}`);
      return;
    }

    const event: EmailEvent = {
      id: this.generateEventId(),
      type: 'opened',
      email: trackingData.email,
      campaignId: trackingData.campaignId,
      workflowId: trackingData.workflowId,
      messageId: trackingData.messageId,
      timestamp: new Date(),
      userAgent,
      ipAddress,
      location: await this.getLocationFromIP(ipAddress),
      data: { trackingId }
    };

    await this.storeEvent(event);
    
    // Update tracking data to mark as opened
    trackingData.opened = true;
    trackingData.openedAt = new Date();

    logger.debug(`Email opened: ${trackingData.email}`);
  }

  async trackEmailClick(trackingId: string, originalUrl: string, userAgent?: string, ipAddress?: string): Promise<string> {
    const trackingData = this.trackingData.get(trackingId);
    if (!trackingData) {
      logger.warn(`No tracking data found for ID: ${trackingId}`);
      return originalUrl;
    }

    const event: EmailEvent = {
      id: this.generateEventId(),
      type: 'clicked',
      email: trackingData.email,
      campaignId: trackingData.campaignId,
      workflowId: trackingData.workflowId,
      messageId: trackingData.messageId,
      timestamp: new Date(),
      userAgent,
      ipAddress,
      location: await this.getLocationFromIP(ipAddress),
      data: { 
        trackingId,
        originalUrl,
        clickedUrl: originalUrl
      }
    };

    await this.storeEvent(event);

    // Update tracking data to mark as clicked
    trackingData.clicked = true;
    trackingData.clickedAt = new Date();

    logger.debug(`Email clicked: ${trackingData.email} -> ${originalUrl}`);
    
    return originalUrl;
  }

  async trackEmailBounce(messageId: string, email: string, bounceType: 'hard' | 'soft', reason?: string): Promise<void> {
    const event: EmailEvent = {
      id: this.generateEventId(),
      type: 'bounced',
      email,
      messageId,
      timestamp: new Date(),
      data: {
        bounceType,
        reason
      }
    };

    await this.storeEvent(event);
    logger.debug(`Email bounced: ${email} (${bounceType})`);
  }

  async trackEmailComplaint(messageId: string, email: string, complaintType?: string): Promise<void> {
    const event: EmailEvent = {
      id: this.generateEventId(),
      type: 'complained',
      email,
      messageId,
      timestamp: new Date(),
      data: {
        complaintType
      }
    };

    await this.storeEvent(event);
    logger.debug(`Email complaint: ${email}`);
  }

  async trackUnsubscribe(email: string, campaignId?: string, workflowId?: string, reason?: string): Promise<void> {
    const event: EmailEvent = {
      id: this.generateEventId(),
      type: 'unsubscribed',
      email,
      campaignId,
      workflowId,
      messageId: 'unsubscribe',
      timestamp: new Date(),
      data: {
        reason
      }
    };

    await this.storeEvent(event);
    logger.debug(`Unsubscribe: ${email}`);
  }

  async addClickTracking(html: string, trackingId: string): Promise<string> {
    // Store tracking data for this ID
    this.trackingData.set(trackingId, {
      trackingId,
      createdAt: new Date()
    });

    // Replace all links with tracking links
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
    
    return html.replace(linkRegex, (match, quote, url) => {
      // Skip tracking for unsubscribe links and relative URLs
      if (url.includes('unsubscribe') || url.startsWith('#') || url.startsWith('mailto:')) {
        return match;
      }

      const trackingUrl = `${process.env.APP_URL}/api/email/track/click/${trackingId}?url=${encodeURIComponent(url)}`;
      return match.replace(url, trackingUrl);
    });
  }

  async getStats(campaignId?: string, workflowId?: string, dateRange?: { start: Date; end: Date }): Promise<EmailTrackingStats> {
    let allEvents: EmailEvent[] = [];
    
    // Collect all events based on filters
    for (const events of this.events.values()) {
      let filteredEvents = events;
      
      if (campaignId) {
        filteredEvents = filteredEvents.filter(e => e.campaignId === campaignId);
      }
      
      if (workflowId) {
        filteredEvents = filteredEvents.filter(e => e.workflowId === workflowId);
      }
      
      if (dateRange) {
        filteredEvents = filteredEvents.filter(e => 
          e.timestamp >= dateRange.start && e.timestamp <= dateRange.end
        );
      }
      
      allEvents = allEvents.concat(filteredEvents);
    }

    // Calculate statistics
    const sentEvents = allEvents.filter(e => e.type === 'sent');
    const openedEvents = allEvents.filter(e => e.type === 'opened');
    const clickedEvents = allEvents.filter(e => e.type === 'clicked');

    const totalSent = sentEvents.length;
    const totalOpened = openedEvents.length;
    const totalClicked = clickedEvents.length;

    // Get unique opens and clicks by email
    const uniqueOpens = new Set(openedEvents.map(e => e.email)).size;
    const uniqueClicks = new Set(clickedEvents.map(e => e.email)).size;

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
    const clickToOpenRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;

    return {
      totalSent,
      totalOpened,
      totalClicked,
      uniqueOpens,
      uniqueClicks,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      clickToOpenRate: Math.round(clickToOpenRate * 100) / 100
    };
  }

  async getDetailedAnalytics(period: { start: Date; end: Date }, campaignId?: string): Promise<EmailAnalytics> {
    const events = await this.getEventsInPeriod(period, campaignId);
    
    // Calculate overview stats
    const sentEvents = events.filter(e => e.type === 'sent');
    const deliveredEvents = events.filter(e => e.type === 'delivered');
    const openedEvents = events.filter(e => e.type === 'opened');
    const clickedEvents = events.filter(e => e.type === 'clicked');
    const bouncedEvents = events.filter(e => e.type === 'bounced');
    const complaintEvents = events.filter(e => e.type === 'complained');
    const unsubscribedEvents = events.filter(e => e.type === 'unsubscribed');

    const totalSent = sentEvents.length;
    const delivered = deliveredEvents.length;
    const opened = openedEvents.length;
    const clicked = clickedEvents.length;
    const bounced = bouncedEvents.length;
    const complained = complaintEvents.length;
    const unsubscribed = unsubscribedEvents.length;

    // Calculate rates
    const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
    const openRate = totalSent > 0 ? (opened / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (clicked / totalSent) * 100 : 0;
    const clickToOpenRate = opened > 0 ? (clicked / opened) * 100 : 0;
    const bounceRate = totalSent > 0 ? (bounced / totalSent) * 100 : 0;
    const complaintRate = totalSent > 0 ? (complained / totalSent) * 100 : 0;
    const unsubscribeRate = totalSent > 0 ? (unsubscribed / totalSent) * 100 : 0;

    // Generate daily trends
    const trends = this.generateDailyTrends(events, period);
    
    // Get top performing campaigns (if not filtered by campaign)
    const topPerformingCampaigns = campaignId ? [] : this.getTopPerformingCampaigns(events);
    
    // Get device stats
    const deviceStats = this.getDeviceStats(events);
    
    // Get location stats
    const locationStats = this.getLocationStats(events);

    return {
      period,
      overview: {
        totalSent,
        delivered,
        opened,
        clicked,
        bounced,
        complained,
        unsubscribed,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100,
        clickToOpenRate: Math.round(clickToOpenRate * 100) / 100,
        bounceRate: Math.round(bounceRate * 100) / 100,
        complaintRate: Math.round(complaintRate * 100) / 100,
        unsubscribeRate: Math.round(unsubscribeRate * 100) / 100
      },
      trends,
      topPerformingCampaigns,
      topPerformingTemplates: [], // Would be calculated from template usage data
      deviceStats,
      locationStats,
      providerStats: [] // Would be calculated from provider usage data
    };
  }

  private async getEventsInPeriod(period: { start: Date; end: Date }, campaignId?: string): Promise<EmailEvent[]> {
    let allEvents: EmailEvent[] = [];
    
    for (const events of this.events.values()) {
      let filteredEvents = events.filter(e => 
        e.timestamp >= period.start && e.timestamp <= period.end
      );
      
      if (campaignId) {
        filteredEvents = filteredEvents.filter(e => e.campaignId === campaignId);
      }
      
      allEvents = allEvents.concat(filteredEvents);
    }
    
    return allEvents;
  }

  private generateDailyTrends(events: EmailEvent[], period: { start: Date; end: Date }) {
    const trends = [];
    const currentDate = new Date(period.start);
    
    while (currentDate <= period.end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayEvents = events.filter(e => 
        e.timestamp.toISOString().split('T')[0] === dateStr
      );
      
      trends.push({
        date: dateStr,
        sent: dayEvents.filter(e => e.type === 'sent').length,
        delivered: dayEvents.filter(e => e.type === 'delivered').length,
        opened: dayEvents.filter(e => e.type === 'opened').length,
        clicked: dayEvents.filter(e => e.type === 'clicked').length,
        bounced: dayEvents.filter(e => e.type === 'bounced').length
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return trends;
  }

  private getTopPerformingCampaigns(events: EmailEvent[]) {
    const campaignStats = new Map<string, any>();
    
    for (const event of events) {
      if (!event.campaignId) continue;
      
      if (!campaignStats.has(event.campaignId)) {
        campaignStats.set(event.campaignId, {
          campaignId: event.campaignId,
          name: `Campaign ${event.campaignId}`, // Would get actual name from database
          sent: 0,
          opened: 0,
          clicked: 0
        });
      }
      
      const stats = campaignStats.get(event.campaignId);
      
      if (event.type === 'sent') stats.sent++;
      if (event.type === 'opened') stats.opened++;
      if (event.type === 'clicked') stats.clicked++;
    }
    
    return Array.from(campaignStats.values())
      .map(stats => ({
        ...stats,
        openRate: stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0,
        clickRate: stats.sent > 0 ? (stats.clicked / stats.sent) * 100 : 0
      }))
      .sort((a, b) => b.openRate - a.openRate)
      .slice(0, 10);
  }

  private getDeviceStats(events: EmailEvent[]) {
    const deviceCounts = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
    const relevantEvents = events.filter(e => e.type === 'opened' || e.type === 'clicked');
    
    for (const event of relevantEvents) {
      const deviceType = this.detectDeviceType(event.userAgent);
      deviceCounts[deviceType]++;
    }
    
    return deviceCounts;
  }

  private getLocationStats(events: EmailEvent[]) {
    const locationCounts = new Map<string, { opens: number; clicks: number }>();
    
    for (const event of events) {
      if (!event.location?.country) continue;
      
      const country = event.location.country;
      if (!locationCounts.has(country)) {
        locationCounts.set(country, { opens: 0, clicks: 0 });
      }
      
      const stats = locationCounts.get(country)!;
      if (event.type === 'opened') stats.opens++;
      if (event.type === 'clicked') stats.clicks++;
    }
    
    return Array.from(locationCounts.entries())
      .map(([country, stats]) => ({ country, ...stats }))
      .sort((a, b) => (b.opens + b.clicks) - (a.opens + a.clicks))
      .slice(0, 20);
  }

  private detectDeviceType(userAgent?: string): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile') && !ua.includes('tablet')) return 'mobile';
    if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
    if (ua.includes('desktop') || ua.includes('windows') || ua.includes('macintosh')) return 'desktop';
    
    return 'unknown';
  }

  private async getLocationFromIP(ipAddress?: string): Promise<any> {
    if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168.')) {
      return null;
    }
    
    try {
      // In a real implementation, you would use a geolocation service
      // For now, return mock data
      return {
        country: 'United States',
        region: 'California',
        city: 'San Francisco'
      };
    } catch (error) {
      logger.error('Failed to get location from IP:', error);
      return null;
    }
  }

  private async storeEvent(event: EmailEvent): Promise<void> {
    const emailEvents = this.events.get(event.email) || [];
    emailEvents.push(event);
    this.events.set(event.email, emailEvents);
    
    // In a real implementation, you would save to database
    logger.debug(`Stored event: ${event.type} for ${event.email}`);
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API for retrieving tracking data
  async getTrackingData(trackingId: string): Promise<any> {
    return this.trackingData.get(trackingId);
  }

  async getEventsByEmail(email: string, eventType?: string): Promise<EmailEvent[]> {
    const events = this.events.get(email) || [];
    
    if (eventType) {
      return events.filter(e => e.type === eventType);
    }
    
    return events;
  }

  async getEventsByCampaign(campaignId: string, eventType?: string): Promise<EmailEvent[]> {
    let allEvents: EmailEvent[] = [];
    
    for (const events of this.events.values()) {
      const campaignEvents = events.filter(e => e.campaignId === campaignId);
      allEvents = allEvents.concat(campaignEvents);
    }
    
    if (eventType) {
      return allEvents.filter(e => e.type === eventType);
    }
    
    return allEvents;
  }

  async clearTrackingData(olderThan?: Date): Promise<number> {
    let clearedCount = 0;
    const cutoffDate = olderThan || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days default
    
    for (const [email, events] of this.events.entries()) {
      const filteredEvents = events.filter(e => e.timestamp > cutoffDate);
      clearedCount += events.length - filteredEvents.length;
      
      if (filteredEvents.length === 0) {
        this.events.delete(email);
      } else {
        this.events.set(email, filteredEvents);
      }
    }
    
    logger.info(`Cleared ${clearedCount} old tracking events`);
    return clearedCount;
  }
}

export default EmailTracker;