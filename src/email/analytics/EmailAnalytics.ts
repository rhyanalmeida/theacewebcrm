import { EmailEvent, EmailAnalytics as EmailAnalyticsType, EmailTrackingStats } from '../types/email';
import { EmailTracker } from '../tracking/EmailTracker';
import { logger } from '../../utils/logger';

export interface AnalyticsQuery {
  startDate: Date;
  endDate: Date;
  campaignId?: string;
  workflowId?: string;
  segmentId?: string;
  tags?: string[];
  emailType?: string;
  provider?: string;
}

export interface AnalyticsDashboard {
  overview: {
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    bounced: number;
    complained: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    unsubscribeRate: number;
    bounceRate: number;
    complaintRate: number;
  };
  trends: {
    daily: Array<{
      date: string;
      sent: number;
      opened: number;
      clicked: number;
      bounced: number;
      unsubscribed: number;
    }>;
    hourly: Array<{
      hour: number;
      sent: number;
      opened: number;
      clicked: number;
    }>;
  };
  performance: {
    topCampaigns: Array<{
      id: string;
      name: string;
      sent: number;
      openRate: number;
      clickRate: number;
      conversionRate: number;
    }>;
    topTemplates: Array<{
      id: string;
      name: string;
      usage: number;
      openRate: number;
      clickRate: number;
    }>;
    worstPerforming: Array<{
      type: 'campaign' | 'template';
      id: string;
      name: string;
      metric: string;
      value: number;
    }>;
  };
  audience: {
    devices: Record<string, number>;
    locations: Array<{
      country: string;
      opens: number;
      clicks: number;
      percentage: number;
    }>;
    domains: Array<{
      domain: string;
      recipients: number;
      openRate: number;
      clickRate: number;
    }>;
    engagement: {
      highlyEngaged: number; // Users with >50% open rate
      moderatelyEngaged: number; // Users with 20-50% open rate
      lowEngaged: number; // Users with <20% open rate
      inactive: number; // Users with no engagement in last 30 days
    };
  };
  deliverability: {
    providers: Array<{
      provider: string;
      sent: number;
      delivered: number;
      bounced: number;
      deliveryRate: number;
    }>;
    bounceReasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
    spamComplaints: {
      total: number;
      rate: number;
      byProvider: Record<string, number>;
    };
  };
  revenue: {
    totalRevenue: number;
    revenuePerEmail: number;
    conversionRate: number;
    averageOrderValue: number;
    topConvertingCampaigns: Array<{
      id: string;
      name: string;
      revenue: number;
      conversions: number;
      conversionRate: number;
    }>;
  };
}

export interface RealtimeStats {
  activeCampaigns: number;
  emailsInQueue: number;
  emailsSentToday: number;
  openRateToday: number;
  clickRateToday: number;
  recentEvents: Array<{
    type: string;
    email: string;
    timestamp: Date;
    campaignName?: string;
    location?: string;
  }>;
  systemHealth: {
    queueProcessing: 'healthy' | 'warning' | 'critical';
    deliverySuccess: number;
    errorRate: number;
  };
}

export interface CohortAnalysis {
  cohorts: Array<{
    cohort: string; // e.g., "2024-01"
    size: number;
    periods: Array<{
      period: number; // weeks/months since signup
      active: number;
      percentage: number;
    }>;
  }>;
  retention: {
    week1: number;
    week2: number;
    week4: number;
    month1: number;
    month3: number;
    month6: number;
  };
}

export class EmailAnalytics {
  private tracker: EmailTracker;
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private cacheExpiryMs = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.tracker = new EmailTracker();
  }

  async getDashboard(query: AnalyticsQuery): Promise<AnalyticsDashboard> {
    const cacheKey = this.getCacheKey('dashboard', query);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const [overview, trends, performance, audience, deliverability, revenue] = await Promise.all([
        this.getOverviewStats(query),
        this.getTrends(query),
        this.getPerformanceStats(query),
        this.getAudienceStats(query),
        this.getDeliverabilityStats(query),
        this.getRevenueStats(query)
      ]);

      const dashboard: AnalyticsDashboard = {
        overview,
        trends,
        performance,
        audience,
        deliverability,
        revenue
      };

      this.setCache(cacheKey, dashboard);
      return dashboard;

    } catch (error) {
      logger.error('Failed to generate analytics dashboard:', error);
      throw error;
    }
  }

  private async getOverviewStats(query: AnalyticsQuery) {
    const stats = await this.tracker.getDetailedAnalytics(
      { start: query.startDate, end: query.endDate },
      query.campaignId
    );

    return stats.overview;
  }

  private async getTrends(query: AnalyticsQuery) {
    const stats = await this.tracker.getDetailedAnalytics(
      { start: query.startDate, end: query.endDate },
      query.campaignId
    );

    // Generate hourly trends for the last 24 hours if date range is recent
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    let hourlyTrends = [];
    if (query.startDate >= dayAgo) {
      hourlyTrends = await this.generateHourlyTrends(query);
    }

    return {
      daily: stats.trends,
      hourly: hourlyTrends
    };
  }

  private async generateHourlyTrends(query: AnalyticsQuery) {
    // Generate hourly breakdown for the last 24 hours
    const trends = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStart = new Date(hour);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      // Get stats for this hour
      const hourStats = await this.tracker.getStats(
        query.campaignId,
        query.workflowId,
        { start: hourStart, end: hourEnd }
      );

      trends.push({
        hour: hour.getHours(),
        sent: hourStats.totalSent,
        opened: hourStats.totalOpened,
        clicked: hourStats.totalClicked
      });
    }

    return trends;
  }

  private async getPerformanceStats(query: AnalyticsQuery) {
    // In a real implementation, this would query the database for campaign and template performance
    return {
      topCampaigns: [
        {
          id: 'campaign1',
          name: 'Welcome Series',
          sent: 1250,
          openRate: 45.2,
          clickRate: 12.8,
          conversionRate: 3.4
        },
        {
          id: 'campaign2',
          name: 'Product Launch',
          sent: 2100,
          openRate: 38.7,
          clickRate: 9.2,
          conversionRate: 2.1
        }
      ],
      topTemplates: [
        {
          id: 'template1',
          name: 'Welcome Email',
          usage: 850,
          openRate: 52.3,
          clickRate: 15.7
        }
      ],
      worstPerforming: [
        {
          type: 'campaign' as const,
          id: 'campaign3',
          name: 'Old Newsletter',
          metric: 'openRate',
          value: 8.2
        }
      ]
    };
  }

  private async getAudienceStats(query: AnalyticsQuery) {
    const stats = await this.tracker.getDetailedAnalytics(
      { start: query.startDate, end: query.endDate },
      query.campaignId
    );

    // Calculate engagement levels (mock data for now)
    const totalUsers = 10000;
    const engagement = {
      highlyEngaged: Math.floor(totalUsers * 0.15), // 15%
      moderatelyEngaged: Math.floor(totalUsers * 0.35), // 35%
      lowEngaged: Math.floor(totalUsers * 0.35), // 35%
      inactive: Math.floor(totalUsers * 0.15) // 15%
    };

    // Calculate domain stats
    const domains = await this.calculateDomainStats(query);

    return {
      devices: stats.deviceStats,
      locations: stats.locationStats,
      domains,
      engagement
    };
  }

  private async calculateDomainStats(query: AnalyticsQuery) {
    // Mock domain statistics
    return [
      {
        domain: 'gmail.com',
        recipients: 4500,
        openRate: 42.1,
        clickRate: 11.3
      },
      {
        domain: 'yahoo.com',
        recipients: 2300,
        openRate: 38.7,
        clickRate: 9.8
      },
      {
        domain: 'outlook.com',
        recipients: 1800,
        openRate: 45.2,
        clickRate: 12.1
      }
    ];
  }

  private async getDeliverabilityStats(query: AnalyticsQuery) {
    return {
      providers: [
        {
          provider: 'Resend',
          sent: 5000,
          delivered: 4950,
          bounced: 50,
          deliveryRate: 99.0
        },
        {
          provider: 'SendGrid',
          sent: 3000,
          delivered: 2940,
          bounced: 60,
          deliveryRate: 98.0
        }
      ],
      bounceReasons: [
        { reason: 'Mailbox full', count: 45, percentage: 40.9 },
        { reason: 'Invalid email address', count: 35, percentage: 31.8 },
        { reason: 'Domain not found', count: 20, percentage: 18.2 },
        { reason: 'Rejected by server', count: 10, percentage: 9.1 }
      ],
      spamComplaints: {
        total: 15,
        rate: 0.15,
        byProvider: {
          'Gmail': 8,
          'Yahoo': 4,
          'Outlook': 3
        }
      }
    };
  }

  private async getRevenueStats(query: AnalyticsQuery) {
    // Mock revenue data - in real implementation, this would integrate with your order/payment system
    return {
      totalRevenue: 125000,
      revenuePerEmail: 12.50,
      conversionRate: 3.2,
      averageOrderValue: 390.63,
      topConvertingCampaigns: [
        {
          id: 'campaign1',
          name: 'Black Friday Sale',
          revenue: 45000,
          conversions: 120,
          conversionRate: 5.8
        },
        {
          id: 'campaign2',
          name: 'Product Launch',
          revenue: 32000,
          conversions: 85,
          conversionRate: 4.2
        }
      ]
    };
  }

  async getRealtimeStats(): Promise<RealtimeStats> {
    const cacheKey = 'realtime-stats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const now = new Date();

      const todayStats = await this.tracker.getStats(
        undefined,
        undefined,
        { start: today, end: now }
      );

      const realtimeStats: RealtimeStats = {
        activeCampaigns: 3, // Would query active campaigns
        emailsInQueue: 250, // Would query email queue
        emailsSentToday: todayStats.totalSent,
        openRateToday: todayStats.openRate,
        clickRateToday: todayStats.clickRate,
        recentEvents: await this.getRecentEvents(),
        systemHealth: {
          queueProcessing: 'healthy',
          deliverySuccess: 98.5,
          errorRate: 1.5
        }
      };

      this.setCache(cacheKey, realtimeStats, 60000); // Cache for 1 minute
      return realtimeStats;

    } catch (error) {
      logger.error('Failed to get realtime stats:', error);
      throw error;
    }
  }

  private async getRecentEvents() {
    // Get recent events from the last hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const now = new Date();

    // Mock recent events - in real implementation, query from event store
    return [
      {
        type: 'opened',
        email: 'user@example.com',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        campaignName: 'Weekly Newsletter',
        location: 'United States'
      },
      {
        type: 'clicked',
        email: 'customer@company.com',
        timestamp: new Date(Date.now() - 8 * 60 * 1000),
        campaignName: 'Product Updates',
        location: 'Canada'
      },
      {
        type: 'sent',
        email: 'lead@startup.io',
        timestamp: new Date(Date.now() - 12 * 60 * 1000),
        campaignName: 'Welcome Series'
      }
    ];
  }

  async getCohortAnalysis(startDate: Date, endDate: Date, period: 'weekly' | 'monthly' = 'monthly'): Promise<CohortAnalysis> {
    const cacheKey = this.getCacheKey('cohort', { startDate, endDate, period });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Generate cohort analysis based on user signup dates and email engagement
      const cohortAnalysis: CohortAnalysis = {
        cohorts: await this.generateCohorts(startDate, endDate, period),
        retention: {
          week1: 85.2,
          week2: 72.8,
          week4: 61.4,
          month1: 58.7,
          month3: 45.3,
          month6: 38.9
        }
      };

      this.setCache(cacheKey, cohortAnalysis);
      return cohortAnalysis;

    } catch (error) {
      logger.error('Failed to generate cohort analysis:', error);
      throw error;
    }
  }

  private async generateCohorts(startDate: Date, endDate: Date, period: 'weekly' | 'monthly') {
    // Mock cohort data generation
    const cohorts = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const cohortLabel = period === 'monthly' 
        ? `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
        : `${current.getFullYear()}-W${this.getWeekNumber(current)}`;

      const periods = [];
      for (let p = 0; p < 12; p++) {
        const retention = Math.max(0, 100 - p * 8 - Math.random() * 10);
        periods.push({
          period: p,
          active: Math.floor(500 * (retention / 100)),
          percentage: Math.round(retention * 100) / 100
        });
      }

      cohorts.push({
        cohort: cohortLabel,
        size: 500,
        periods
      });

      if (period === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      } else {
        current.setDate(current.getDate() + 7);
      }
    }

    return cohorts;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  async exportAnalytics(query: AnalyticsQuery, format: 'csv' | 'json' | 'pdf'): Promise<Buffer | string> {
    const dashboard = await this.getDashboard(query);

    switch (format) {
      case 'csv':
        return this.exportToCsv(dashboard);
      case 'json':
        return JSON.stringify(dashboard, null, 2);
      case 'pdf':
        return this.exportToPdf(dashboard);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportToCsv(dashboard: AnalyticsDashboard): string {
    const headers = ['Date', 'Sent', 'Opened', 'Clicked', 'Bounced', 'Unsubscribed'];
    const rows = dashboard.trends.daily.map(day => [
      day.date,
      day.sent.toString(),
      day.opened.toString(),
      day.clicked.toString(),
      day.bounced.toString(),
      day.unsubscribed.toString()
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private async exportToPdf(dashboard: AnalyticsDashboard): Promise<Buffer> {
    // In a real implementation, you would use a PDF library like puppeteer or jsPDF
    // For now, return a placeholder
    return Buffer.from('PDF export not implemented');
  }

  async getCustomReport(query: AnalyticsQuery & {
    metrics: string[];
    groupBy: string[];
    filters: Record<string, any>;
  }): Promise<any[]> {
    // Build custom analytics report based on specified metrics and grouping
    const results = [];

    // Mock implementation - in reality, this would build dynamic queries
    for (let i = 0; i < 10; i++) {
      const result: any = {};
      
      for (const groupField of query.groupBy) {
        result[groupField] = `Group ${i + 1}`;
      }
      
      for (const metric of query.metrics) {
        result[metric] = Math.floor(Math.random() * 1000);
      }
      
      results.push(result);
    }

    return results;
  }

  async getABTestResults(testId: string): Promise<{
    variants: Array<{
      id: string;
      name: string;
      sent: number;
      opened: number;
      clicked: number;
      conversions: number;
      openRate: number;
      clickRate: number;
      conversionRate: number;
      significance: number;
      winner: boolean;
    }>;
    confidence: number;
    recommendation: string;
  }> {
    // Mock A/B test results
    return {
      variants: [
        {
          id: 'variant-a',
          name: 'Subject A',
          sent: 500,
          opened: 225,
          clicked: 45,
          conversions: 12,
          openRate: 45.0,
          clickRate: 9.0,
          conversionRate: 2.4,
          significance: 95.2,
          winner: true
        },
        {
          id: 'variant-b',
          name: 'Subject B',
          sent: 500,
          opened: 190,
          clicked: 32,
          conversions: 8,
          openRate: 38.0,
          clickRate: 6.4,
          conversionRate: 1.6,
          significance: 0,
          winner: false
        }
      ],
      confidence: 95.2,
      recommendation: 'Variant A shows significantly better performance. Deploy to full audience.'
    };
  }

  private getCacheKey(type: string, query: any): string {
    return `${type}-${JSON.stringify(query)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, customExpiryMs?: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (customExpiryMs || this.cacheExpiryMs)
    });
  }

  // Clean up old cache entries
  async cleanupCache(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (cached.expiry <= now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

export default EmailAnalytics;