/**
 * Supabase Analytics Service
 * Integrates the analytics system with your existing Supabase backend
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AnalyticsService } from './AnalyticsService';
import { 
  TimeSeriesData, 
  FilterConfig, 
  DateRangeConfig, 
  MetricDefinition,
  QueryResult 
} from '../types';

interface SupabaseAnalyticsConfig {
  supabaseUrl: string;
  supabaseKey: string;
  schema?: string;
}

export class SupabaseAnalyticsService extends AnalyticsService {
  private supabase: SupabaseClient;
  private schema: string;

  constructor(config: SupabaseAnalyticsConfig) {
    super('/api/analytics');
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.schema = config.schema || 'public';
  }

  /**
   * Get sales metrics from deals table
   */
  async getSalesMetrics(dateRange: DateRangeConfig): Promise<TimeSeriesData[]> {
    const { start, end } = this.parseDateRange(dateRange);
    
    const { data, error } = await this.supabase
      .from('deals')
      .select('value, close_date, stage, created_at')
      .gte('close_date', start.toISOString())
      .lte('close_date', end.toISOString())
      .eq('stage', 'completed')
      .order('close_date');

    if (error) throw new Error(`Sales metrics query failed: ${error.message}`);

    return (data || []).map((deal: any) => ({
      id: `deal_${deal.close_date}`,
      timestamp: deal.close_date,
      value: parseFloat(deal.value) || 0,
      category: 'sales',
      metadata: { stage: deal.stage }
    }));
  }

  /**
   * Get customer acquisition metrics
   */
  async getCustomerAcquisitionMetrics(dateRange: DateRangeConfig): Promise<TimeSeriesData[]> {
    const { start, end } = this.parseDateRange(dateRange);
    
    const { data, error } = await this.supabase
      .from('contacts')
      .select('created_at, lead_source, status')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at');

    if (error) throw new Error(`Customer acquisition query failed: ${error.message}`);

    // Group by day and count
    const dailyCounts = this.groupByDay(data || [], 'created_at');
    
    return Object.entries(dailyCounts).map(([date, contacts]) => ({
      id: `acquisition_${date}`,
      timestamp: date,
      value: contacts.length,
      category: 'acquisition',
      metadata: { sources: this.countBySources(contacts as any[]) }
    }));
  }

  /**
   * Get project completion metrics
   */
  async getProjectMetrics(dateRange: DateRangeConfig): Promise<TimeSeriesData[]> {
    const { start, end } = this.parseDateRange(dateRange);
    
    const { data, error } = await this.supabase
      .from('projects')
      .select('completion_date, status, budget, hours_actual, hours_estimated')
      .gte('completion_date', start.toISOString())
      .lte('completion_date', end.toISOString())
      .eq('status', 'completed')
      .order('completion_date');

    if (error) throw new Error(`Project metrics query failed: ${error.message}`);

    return (data || []).map((project: any) => ({
      id: `project_${project.completion_date}`,
      timestamp: project.completion_date,
      value: parseFloat(project.budget) || 0,
      category: 'projects',
      metadata: { 
        hoursActual: project.hours_actual,
        hoursEstimated: project.hours_estimated,
        efficiency: project.hours_estimated > 0 ? 
          (project.hours_estimated / project.hours_actual) * 100 : 0
      }
    }));
  }

  /**
   * Get lead conversion funnel data
   */
  async getLeadFunnelData(dateRange: DateRangeConfig): Promise<Array<{ step: string; users: number; conversion: number }>> {
    const { start, end } = this.parseDateRange(dateRange);
    
    // Get all leads in date range
    const { data: leadsData, error: leadsError } = await this.supabase
      .from('leads')
      .select('id, status, created_at, contact_id')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (leadsError) throw new Error(`Leads funnel query failed: ${leadsError.message}`);

    // Count by status
    const statusCounts = this.countByStatus(leadsData || []);
    const totalLeads = leadsData?.length || 0;

    // Define funnel steps
    const funnelSteps = [
      { step: 'new', count: statusCounts.new || 0 },
      { step: 'contacted', count: statusCounts.contacted || 0 },
      { step: 'qualified', count: statusCounts.qualified || 0 },
      { step: 'proposal', count: statusCounts.proposal || 0 },
      { step: 'won', count: statusCounts.won || 0 }
    ];

    return funnelSteps.map((stepData, index) => {
      const previousCount = index === 0 ? totalLeads : funnelSteps[index - 1].count;
      return {
        step: stepData.step,
        users: stepData.count,
        conversion: previousCount > 0 ? (stepData.count / previousCount) * 100 : 0
      };
    });
  }

  /**
   * Get customer cohort data for retention analysis
   */
  async getCustomerCohortData(
    cohortPeriod: 'month' | 'week' = 'month',
    periods: number = 12
  ): Promise<Array<{ cohort: string; size: number; retention: number[] }>> {
    // This would require more complex queries to track customer return behavior
    // For now, we'll create a simplified version based on contact creation and activity
    
    const { data: contacts, error } = await this.supabase
      .from('contacts')
      .select(`
        id, 
        created_at,
        activities:activities(activity_date)
      `)
      .order('created_at');

    if (error) throw new Error(`Cohort query failed: ${error.message}`);

    // Group contacts by cohort period
    const cohorts = this.groupIntoCohorts(contacts || [], cohortPeriod);
    
    return Object.entries(cohorts).map(([cohortDate, contactIds]) => {
      const retentionRates = this.calculateRetentionRates(
        contactIds as string[], 
        cohortDate, 
        periods, 
        cohortPeriod
      );
      
      return {
        cohort: cohortDate,
        size: contactIds.length,
        retention: retentionRates
      };
    });
  }

  /**
   * Get real-time dashboard metrics
   */
  async getRealTimeMetrics(): Promise<Record<string, number>> {
    // Use Supabase's real-time subscriptions for live data
    const [
      activeProjects,
      pendingInvoices,
      monthlyRevenue,
      newLeadsToday
    ] = await Promise.all([
      this.supabase.from('projects').select('id', { count: 'exact' }).eq('status', 'active'),
      this.supabase.from('invoices').select('id', { count: 'exact' }).eq('status', 'sent'),
      this.supabase.from('deals').select('value').eq('stage', 'completed').gte('close_date', this.getMonthStart()),
      this.supabase.from('leads').select('id', { count: 'exact' }).gte('created_at', this.getTodayStart())
    ]);

    const revenue = (activeProjects.data || []).reduce((sum: number, deal: any) => sum + (parseFloat(deal.value) || 0), 0);

    return {
      active_projects: activeProjects.count || 0,
      pending_invoices: pendingInvoices.count || 0,
      monthly_revenue: revenue,
      new_leads_today: newLeadsToday.count || 0
    };
  }

  /**
   * Create analytics tables for advanced tracking
   */
  async createAnalyticsTables(): Promise<{ success: boolean; error?: string }> {
    try {
      // Create analytics events table for custom tracking
      const analyticsEventsSQL = `
        CREATE TABLE IF NOT EXISTS analytics_events (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          event_name VARCHAR(100) NOT NULL,
          event_data JSONB DEFAULT '{}',
          user_id UUID REFERENCES auth.users(id),
          session_id VARCHAR(100),
          timestamp TIMESTAMPTZ DEFAULT NOW(),
          properties JSONB DEFAULT '{}'
        );
        
        CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
      `;

      // Create analytics metrics table for pre-computed metrics
      const analyticsMetricsSQL = `
        CREATE TABLE IF NOT EXISTS analytics_metrics (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          metric_name VARCHAR(100) NOT NULL,
          metric_value DECIMAL(15,4) NOT NULL,
          metric_date DATE NOT NULL,
          metric_period VARCHAR(20) DEFAULT 'day',
          dimensions JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_metrics_unique 
        ON analytics_metrics(metric_name, metric_date, metric_period, dimensions);
      `;

      // Create analytics reports table for saved reports
      const analyticsReportsSQL = `
        CREATE TABLE IF NOT EXISTS analytics_reports (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          config JSONB NOT NULL,
          is_scheduled BOOLEAN DEFAULT FALSE,
          schedule_config JSONB,
          last_run TIMESTAMPTZ,
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_analytics_reports_created_by ON analytics_reports(created_by);
      `;

      // Execute all SQL statements
      await this.supabase.rpc('exec_sql', { sql: analyticsEventsSQL });
      await this.supabase.rpc('exec_sql', { sql: analyticsMetricsSQL });
      await this.supabase.rpc('exec_sql', { sql: analyticsReportsSQL });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create analytics tables'
      };
    }
  }

  /**
   * Track custom analytics events
   */
  async trackEvent(
    eventName: string,
    userId?: string,
    eventData: Record<string, any> = {},
    sessionId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('analytics_events')
        .insert({
          event_name: eventName,
          event_data: eventData,
          user_id: userId,
          session_id: sessionId,
          properties: eventData
        });

      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to track event'
      };
    }
  }

  /**
   * Set up real-time subscriptions for live metrics
   */
  setupRealTimeSubscriptions(onUpdate: (tableName: string, payload: any) => void): void {
    // Subscribe to deals changes
    this.supabase
      .channel('deals-changes')
      .on('postgres_changes', 
        { event: '*', schema: this.schema, table: 'deals' },
        (payload) => onUpdate('deals', payload)
      )
      .subscribe();

    // Subscribe to leads changes
    this.supabase
      .channel('leads-changes')
      .on('postgres_changes',
        { event: '*', schema: this.schema, table: 'leads' },
        (payload) => onUpdate('leads', payload)
      )
      .subscribe();

    // Subscribe to projects changes
    this.supabase
      .channel('projects-changes')
      .on('postgres_changes',
        { event: '*', schema: this.schema, table: 'projects' },
        (payload) => onUpdate('projects', payload)
      )
      .subscribe();
  }

  // Helper methods

  private parseDateRange(dateRange: DateRangeConfig): { start: Date; end: Date } {
    const now = new Date();
    let start: Date, end: Date = now;

    if (dateRange.type === 'relative') {
      switch (dateRange.value) {
        case 'last_7_days':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last_30_days':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last_90_days':
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'last_year':
          start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    } else {
      // Handle absolute date ranges
      const [startDate, endDate] = dateRange.value as [Date, Date];
      start = startDate;
      end = endDate;
    }

    return { start, end };
  }

  private groupByDay(data: any[], dateField: string): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    data.forEach(item => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    
    return groups;
  }

  private countBySources(contacts: any[]): Record<string, number> {
    const sources: Record<string, number> = {};
    
    contacts.forEach(contact => {
      const source = contact.lead_source || 'unknown';
      sources[source] = (sources[source] || 0) + 1;
    });
    
    return sources;
  }

  private countByStatus(leads: any[]): Record<string, number> {
    const statusCounts: Record<string, number> = {};
    
    leads.forEach(lead => {
      const status = lead.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return statusCounts;
  }

  private groupIntoCohorts(contacts: any[], period: 'month' | 'week'): Record<string, string[]> {
    const cohorts: Record<string, string[]> = {};
    
    contacts.forEach(contact => {
      const date = new Date(contact.created_at);
      let cohortKey = '';
      
      if (period === 'month') {
        cohortKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      } else {
        // Week-based cohorts
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        cohortKey = weekStart.toISOString().split('T')[0];
      }
      
      if (!cohorts[cohortKey]) cohorts[cohortKey] = [];
      cohorts[cohortKey].push(contact.id);
    });
    
    return cohorts;
  }

  private calculateRetentionRates(
    contactIds: string[], 
    cohortDate: string, 
    periods: number, 
    cohortPeriod: 'month' | 'week'
  ): number[] {
    // This would require tracking when customers "return" (activity, purchases, etc.)
    // For now, we'll return mock retention rates
    const rates = [];
    for (let i = 0; i < periods; i++) {
      const baseRate = 100; // Start at 100%
      const decayRate = 0.15; // 15% decay per period
      const rate = Math.max(5, baseRate * Math.pow(1 - decayRate, i));
      rates.push(Math.round(rate));
    }
    return rates;
  }

  private getMonthStart(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  private getTodayStart(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }

  /**
   * Get available metrics from your CRM data
   */
  async getAvailableMetrics(): Promise<MetricDefinition[]> {
    return [
      {
        id: 'total_revenue',
        name: 'Total Revenue',
        description: 'Sum of all completed deals',
        type: 'counter',
        unit: 'USD',
        format: 'currency',
        category: 'sales',
        tags: ['revenue', 'sales', 'deals']
      },
      {
        id: 'new_customers',
        name: 'New Customers',
        description: 'Number of new contacts acquired',
        type: 'counter',
        unit: 'count',
        format: 'number',
        category: 'customer',
        tags: ['customers', 'acquisition']
      },
      {
        id: 'active_projects',
        name: 'Active Projects',
        description: 'Number of projects in progress',
        type: 'gauge',
        unit: 'count',
        format: 'number',
        category: 'operations',
        tags: ['projects', 'status']
      },
      {
        id: 'lead_conversion_rate',
        name: 'Lead Conversion Rate',
        description: 'Percentage of leads that become customers',
        type: 'rate',
        unit: 'percentage',
        format: 'percentage',
        category: 'sales',
        tags: ['leads', 'conversion', 'sales']
      },
      {
        id: 'project_completion_rate',
        name: 'Project Completion Rate',
        description: 'Percentage of projects completed on time',
        type: 'rate',
        unit: 'percentage',
        format: 'percentage',
        category: 'operations',
        tags: ['projects', 'completion', 'efficiency']
      },
      {
        id: 'average_deal_size',
        name: 'Average Deal Size',
        description: 'Average value of completed deals',
        type: 'gauge',
        unit: 'USD',
        format: 'currency',
        category: 'sales',
        tags: ['deals', 'value', 'average']
      }
    ];
  }
}

// Create configured instance
export const createSupabaseAnalytics = (config: SupabaseAnalyticsConfig) => {
  return new SupabaseAnalyticsService(config);
};

// Default instance (you'll need to configure with your Supabase credentials)
export const supabaseAnalytics = new SupabaseAnalyticsService({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
});