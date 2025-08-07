/**
 * Core Analytics Service
 * Handles data processing, querying, and analytics operations
 */

import { 
  AnalyticsData, 
  TimeSeriesData, 
  MetricDefinition, 
  QueryResult, 
  FilterConfig, 
  DateRangeConfig,
  AnalyticsResponse,
  AnalyticsError
} from '../types';

export class AnalyticsService {
  private baseUrl: string;
  private cache: Map<string, { data: any; expiry: Date }> = new Map();

  constructor(baseUrl: string = '/api/analytics') {
    this.baseUrl = baseUrl;
  }

  /**
   * Execute a custom analytics query
   */
  async executeQuery(
    query: string, 
    params: Record<string, any> = {},
    useCache: boolean = true
  ): Promise<QueryResult> {
    const cacheKey = `query_${btoa(query + JSON.stringify(params))}`;
    
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (cached.expiry > new Date()) {
        return { ...cached.data, cached: true };
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, params })
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (useCache) {
        this.cache.set(cacheKey, {
          data: { ...result, cached: false },
          expiry: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes cache
        });
      }

      return result;
    } catch (error) {
      throw this.createAnalyticsError('Query execution failed', 'execution', error);
    }
  }

  /**
   * Get time series data with aggregation
   */
  async getTimeSeries(
    metric: string,
    dateRange: DateRangeConfig,
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' = 'sum',
    groupBy: 'hour' | 'day' | 'week' | 'month' = 'day',
    filters: FilterConfig[] = []
  ): Promise<TimeSeriesData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/timeseries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric,
          dateRange,
          aggregation,
          groupBy,
          filters
        })
      });

      if (!response.ok) {
        throw new Error(`Time series request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw this.createAnalyticsError('Time series request failed', 'execution', error);
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(metrics: string[]): Promise<Record<string, number>> {
    try {
      const response = await fetch(`${this.baseUrl}/realtime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics })
      });

      if (!response.ok) {
        throw new Error(`Real-time metrics request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw this.createAnalyticsError('Real-time metrics request failed', 'execution', error);
    }
  }

  /**
   * Get available metrics definitions
   */
  async getMetricDefinitions(category?: string): Promise<MetricDefinition[]> {
    try {
      const url = category 
        ? `${this.baseUrl}/metrics?category=${category}`
        : `${this.baseUrl}/metrics`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Metrics request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw this.createAnalyticsError('Metrics request failed', 'execution', error);
    }
  }

  /**
   * Calculate conversion funnel
   */
  async calculateFunnel(
    steps: Array<{ event: string; conditions?: FilterConfig[] }>,
    dateRange: DateRangeConfig,
    userIdField: string = 'user_id'
  ): Promise<Array<{ step: string; users: number; conversion: number }>> {
    try {
      const response = await fetch(`${this.baseUrl}/funnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps,
          dateRange,
          userIdField
        })
      });

      if (!response.ok) {
        throw new Error(`Funnel analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw this.createAnalyticsError('Funnel analysis failed', 'execution', error);
    }
  }

  /**
   * Perform cohort analysis
   */
  async calculateCohort(
    cohortEvent: string,
    returnEvent: string,
    dateRange: DateRangeConfig,
    period: 'day' | 'week' | 'month' = 'month',
    periods: number = 12
  ): Promise<Array<{ cohort: string; size: number; retention: number[] }>> {
    try {
      const response = await fetch(`${this.baseUrl}/cohort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortEvent,
          returnEvent,
          dateRange,
          period,
          periods
        })
      });

      if (!response.ok) {
        throw new Error(`Cohort analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw this.createAnalyticsError('Cohort analysis failed', 'execution', error);
    }
  }

  /**
   * Generate predictive forecast
   */
  async generateForecast(
    metric: string,
    historicalPeriods: number,
    forecastPeriods: number,
    algorithm: 'linear' | 'exponential' | 'arima' | 'prophet' = 'linear'
  ): Promise<Array<{ date: string; predicted: number; confidence: [number, number] }>> {
    try {
      const response = await fetch(`${this.baseUrl}/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric,
          historicalPeriods,
          forecastPeriods,
          algorithm
        })
      });

      if (!response.ok) {
        throw new Error(`Forecast generation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw this.createAnalyticsError('Forecast generation failed', 'execution', error);
    }
  }

  /**
   * Detect anomalies in data
   */
  async detectAnomalies(
    metric: string,
    dateRange: DateRangeConfig,
    sensitivity: number = 0.05,
    algorithm: 'isolation_forest' | 'statistical' | 'seasonal' = 'statistical'
  ): Promise<Array<{ date: string; value: number; isAnomaly: boolean; score: number }>> {
    try {
      const response = await fetch(`${this.baseUrl}/anomalies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric,
          dateRange,
          sensitivity,
          algorithm
        })
      });

      if (!response.ok) {
        throw new Error(`Anomaly detection failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw this.createAnalyticsError('Anomaly detection failed', 'execution', error);
    }
  }

  /**
   * Get AI-generated insights
   */
  async generateInsights(
    metrics: string[],
    dateRange: DateRangeConfig,
    context: Record<string, any> = {}
  ): Promise<Array<{ type: string; title: string; description: string; confidence: number; data: any }>> {
    try {
      const response = await fetch(`${this.baseUrl}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          dateRange,
          context
        })
      });

      if (!response.ok) {
        throw new Error(`Insights generation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw this.createAnalyticsError('Insights generation failed', 'execution', error);
    }
  }

  /**
   * Export data in various formats
   */
  async exportData(
    data: any[],
    format: 'csv' | 'excel' | 'json' | 'pdf',
    options: Record<string, any> = {}
  ): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          format,
          options
        })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      throw this.createAnalyticsError('Export failed', 'execution', error);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Create standardized analytics error
   */
  private createAnalyticsError(
    message: string, 
    category: 'validation' | 'execution' | 'authorization' | 'configuration',
    originalError: any
  ): AnalyticsError {
    const error = new Error(message) as AnalyticsError;
    error.name = 'AnalyticsError';
    error.code = `ANALYTICS_${category.toUpperCase()}`;
    error.category = category;
    error.details = {
      originalError: originalError?.message || originalError,
      stack: originalError?.stack
    };
    error.timestamp = new Date();
    return error;
  }

  /**
   * Validate filter configuration
   */
  validateFilters(filters: FilterConfig[]): boolean {
    for (const filter of filters) {
      if (!filter.field || !filter.operator) {
        throw this.createAnalyticsError('Invalid filter configuration', 'validation', null);
      }
      
      if (['in', 'not_in'].includes(filter.operator) && !Array.isArray(filter.values)) {
        throw this.createAnalyticsError('IN/NOT_IN operators require values array', 'validation', null);
      }
      
      if (filter.operator === 'between' && (!Array.isArray(filter.values) || filter.values.length !== 2)) {
        throw this.createAnalyticsError('BETWEEN operator requires array with two values', 'validation', null);
      }
    }
    
    return true;
  }

  /**
   * Build query from filters
   */
  buildFilterQuery(filters: FilterConfig[]): string {
    this.validateFilters(filters);
    
    return filters.map(filter => {
      switch (filter.operator) {
        case 'equals':
          return `${filter.field} = '${filter.value}'`;
        case 'not_equals':
          return `${filter.field} != '${filter.value}'`;
        case 'greater_than':
          return `${filter.field} > ${filter.value}`;
        case 'less_than':
          return `${filter.field} < ${filter.value}`;
        case 'greater_equal':
          return `${filter.field} >= ${filter.value}`;
        case 'less_equal':
          return `${filter.field} <= ${filter.value}`;
        case 'contains':
          return `${filter.field} LIKE '%${filter.value}%'`;
        case 'not_contains':
          return `${filter.field} NOT LIKE '%${filter.value}%'`;
        case 'starts_with':
          return `${filter.field} LIKE '${filter.value}%'`;
        case 'ends_with':
          return `${filter.field} LIKE '%${filter.value}'`;
        case 'in':
          return `${filter.field} IN (${filter.values!.map(v => `'${v}'`).join(',')})`;
        case 'not_in':
          return `${filter.field} NOT IN (${filter.values!.map(v => `'${v}'`).join(',')})`;
        case 'between':
          return `${filter.field} BETWEEN ${filter.values![0]} AND ${filter.values![1]}`;
        case 'null':
          return `${filter.field} IS NULL`;
        case 'not_null':
          return `${filter.field} IS NOT NULL`;
        default:
          return '';
      }
    }).join(' AND ');
  }
}

export const analyticsService = new AnalyticsService();