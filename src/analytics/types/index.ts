/**
 * Analytics System Types and Interfaces
 * Comprehensive type definitions for advanced analytics features
 */

// Core Analytics Types
export interface AnalyticsData {
  id: string;
  timestamp: Date | string;
  value: number;
  category: string;
  subcategory?: string;
  metadata?: Record<string, any>;
}

export interface TimeSeriesData extends AnalyticsData {
  period: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  aggregation: 'sum' | 'average' | 'count' | 'min' | 'max';
}

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  type: 'counter' | 'gauge' | 'histogram' | 'rate';
  unit: string;
  format: 'number' | 'currency' | 'percentage' | 'duration';
  category: MetricCategory;
  tags: string[];
}

export type MetricCategory = 
  | 'sales'
  | 'marketing'
  | 'operations'
  | 'financial'
  | 'customer'
  | 'product'
  | 'performance'
  | 'engagement';

// Report Builder Types
export interface ReportConfig {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  dataSource: DataSource;
  visualization: VisualizationConfig;
  filters: FilterConfig[];
  groupBy: string[];
  orderBy: OrderConfig[];
  dateRange: DateRangeConfig;
  refreshRate?: number; // minutes
  isScheduled: boolean;
  scheduleConfig?: ScheduleConfig;
  permissions: PermissionConfig;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReportType = 
  | 'dashboard'
  | 'detailed'
  | 'summary'
  | 'comparison'
  | 'trend'
  | 'funnel'
  | 'cohort'
  | 'predictive';

export interface DataSource {
  type: 'database' | 'api' | 'file' | 'external' | 'real-time';
  connection: string;
  query?: string;
  endpoint?: string;
  params?: Record<string, any>;
  cache?: {
    enabled: boolean;
    ttl: number; // seconds
  };
}

export interface VisualizationConfig {
  type: ChartType;
  title: string;
  subtitle?: string;
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  series: SeriesConfig[];
  colors: string[];
  legend: LegendConfig;
  tooltip: TooltipConfig;
  annotations?: AnnotationConfig[];
  responsive: boolean;
  height?: number;
  width?: number;
}

export type ChartType = 
  | 'line'
  | 'area'
  | 'bar'
  | 'column'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'bubble'
  | 'heatmap'
  | 'treemap'
  | 'sankey'
  | 'funnel'
  | 'gauge'
  | 'radar'
  | 'candlestick'
  | 'waterfall';

export interface AxisConfig {
  label: string;
  field: string;
  type: 'category' | 'value' | 'time' | 'log';
  format?: string;
  min?: number;
  max?: number;
  showGrid: boolean;
  showLabels: boolean;
}

export interface SeriesConfig {
  name: string;
  field: string;
  type?: ChartType;
  color?: string;
  stack?: string;
  yAxisIndex?: number;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  orientation: 'horizontal' | 'vertical';
}

export interface TooltipConfig {
  show: boolean;
  format: string;
  showAll: boolean;
}

export interface AnnotationConfig {
  type: 'line' | 'band' | 'point' | 'text';
  value: number | Date;
  label: string;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
}

// Filter and Query Types
export interface FilterConfig {
  field: string;
  operator: FilterOperator;
  value: any;
  values?: any[];
  condition: 'and' | 'or';
}

export type FilterOperator = 
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'between'
  | 'null'
  | 'not_null';

export interface OrderConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DateRangeConfig {
  type: 'relative' | 'absolute' | 'custom';
  value: string | [Date, Date];
  timezone?: string;
}

// Scheduling and Export Types
export interface ScheduleConfig {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  interval: number;
  time?: string; // HH:MM format
  dayOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number[]; // 1-31
  timezone: string;
  enabled: boolean;
  recipients: string[];
  format: ExportFormat[];
  lastRun?: Date;
  nextRun?: Date;
}

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'png' | 'jpeg';

export interface ExportConfig {
  format: ExportFormat;
  options: ExportOptions;
  destination: 'download' | 'email' | 'storage' | 'api';
  filename?: string;
}

export interface ExportOptions {
  pdf?: {
    pageSize: 'A4' | 'Letter' | 'Legal';
    orientation: 'portrait' | 'landscape';
    margins: number[];
    header?: string;
    footer?: string;
  };
  excel?: {
    sheetName: string;
    includeCharts: boolean;
    autoFilter: boolean;
    freezePanes?: [number, number];
  };
  csv?: {
    delimiter: string;
    encoding: string;
    includeHeaders: boolean;
  };
  image?: {
    width: number;
    height: number;
    quality: number;
    backgroundColor: string;
  };
}

// Permission Types
export interface PermissionConfig {
  visibility: 'private' | 'team' | 'organization' | 'public';
  allowedUsers?: string[];
  allowedRoles?: string[];
  allowEdit: boolean;
  allowDelete: boolean;
  allowExport: boolean;
  allowSchedule: boolean;
}

// Dashboard Types
export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  filters: GlobalFilter[];
  refreshRate: number;
  autoRefresh: boolean;
  fullscreen: boolean;
  theme: 'light' | 'dark' | 'auto';
  permissions: PermissionConfig;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  type: 'grid' | 'masonry' | 'tabs' | 'accordion';
  columns: number;
  gap: number;
  responsive: boolean;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: ReportConfig;
  visible: boolean;
  locked: boolean;
}

export type WidgetType = 
  | 'chart'
  | 'metric'
  | 'table'
  | 'text'
  | 'image'
  | 'iframe'
  | 'custom';

export interface WidgetPosition {
  x: number;
  y: number;
  z?: number;
}

export interface WidgetSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface GlobalFilter extends FilterConfig {
  appliesToWidgets: string[];
}

// Funnel Analysis Types
export interface FunnelConfig {
  id: string;
  name: string;
  description?: string;
  steps: FunnelStep[];
  timeWindow: number; // hours
  userIdField: string;
  timestampField: string;
  conversionGoal: string;
  segmentation?: SegmentationConfig[];
  dateRange: DateRangeConfig;
}

export interface FunnelStep {
  id: string;
  name: string;
  event: string;
  conditions: FilterConfig[];
  order: number;
  required: boolean;
}

export interface FunnelResult {
  stepId: string;
  stepName: string;
  users: number;
  conversions: number;
  conversionRate: number;
  dropoffRate: number;
  averageTime: number; // seconds
}

// Cohort Analysis Types
export interface CohortConfig {
  id: string;
  name: string;
  description?: string;
  cohortEvent: string;
  returnEvent: string;
  cohortPeriod: 'day' | 'week' | 'month';
  periods: number;
  userIdField: string;
  timestampField: string;
  filters: FilterConfig[];
  dateRange: DateRangeConfig;
}

export interface CohortResult {
  cohortDate: string;
  cohortSize: number;
  periods: CohortPeriodResult[];
}

export interface CohortPeriodResult {
  period: number;
  users: number;
  retentionRate: number;
}

// Predictive Analytics Types
export interface PredictionConfig {
  id: string;
  name: string;
  type: PredictionType;
  targetVariable: string;
  features: string[];
  algorithm: MLAlgorithm;
  trainingSplit: number;
  validationSplit: number;
  hyperparameters: Record<string, any>;
  evaluation: EvaluationMetric[];
  confidence: number;
  horizon: number; // prediction periods ahead
}

export type PredictionType = 
  | 'regression'
  | 'classification'
  | 'time_series'
  | 'anomaly_detection'
  | 'clustering';

export type MLAlgorithm = 
  | 'linear_regression'
  | 'random_forest'
  | 'gradient_boosting'
  | 'neural_network'
  | 'arima'
  | 'prophet'
  | 'isolation_forest'
  | 'kmeans';

export type EvaluationMetric = 
  | 'mse'
  | 'rmse'
  | 'mae'
  | 'r2'
  | 'accuracy'
  | 'precision'
  | 'recall'
  | 'f1'
  | 'auc_roc';

export interface PredictionResult {
  timestamp: Date;
  predicted: number;
  confidence_lower: number;
  confidence_upper: number;
  actual?: number;
}

// Segmentation Types
export interface SegmentationConfig {
  field: string;
  type: 'dimension' | 'metric';
  grouping: 'exact' | 'range' | 'percentile' | 'custom';
  ranges?: SegmentRange[];
  customFunction?: string;
}

export interface SegmentRange {
  label: string;
  min?: number;
  max?: number;
  values?: any[];
}

// Real-time Analytics Types
export interface RealTimeMetric {
  id: string;
  name: string;
  value: number;
  timestamp: Date;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  alert?: AlertConfig;
}

export interface AlertConfig {
  id: string;
  name: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  recipients: string[];
  cooldown: number; // minutes
  lastTriggered?: Date;
}

export interface AlertCondition {
  operator: 'greater_than' | 'less_than' | 'equals' | 'change_percent';
  timeWindow: number; // minutes
  consecutive?: number; // consecutive periods
}

// Data Warehouse Integration Types
export interface DataWarehouseConnection {
  id: string;
  name: string;
  type: 'bigquery' | 'redshift' | 'snowflake' | 'databricks' | 'postgres';
  host: string;
  port: number;
  database: string;
  schema?: string;
  credentials: CredentialConfig;
  ssl: boolean;
  connectionPool: ConnectionPoolConfig;
}

export interface CredentialConfig {
  type: 'password' | 'token' | 'oauth' | 'service_account';
  username?: string;
  password?: string;
  token?: string;
  keyFile?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface ConnectionPoolConfig {
  min: number;
  max: number;
  timeout: number;
  idle: number;
}

// Executive Dashboard Types
export interface ExecutiveDashboard {
  id: string;
  name: string;
  kpis: KPIWidget[];
  insights: AIInsight[];
  summaries: ExecutiveSummary[];
  alerts: AlertWidget[];
  trends: TrendWidget[];
  layout: ExecutiveLayout;
}

export interface KPIWidget {
  id: string;
  title: string;
  value: number | string;
  target?: number;
  change: {
    value: number;
    period: string;
    direction: 'up' | 'down' | 'flat';
  };
  status: 'good' | 'warning' | 'danger';
  trend: number[];
  format: 'number' | 'currency' | 'percentage';
}

export interface AIInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
  data: any[];
  actions: string[];
  timestamp: Date;
}

export interface ExecutiveSummary {
  id: string;
  period: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
  metrics: SummaryMetric[];
}

export interface SummaryMetric {
  name: string;
  current: number;
  previous: number;
  target: number;
  status: 'on_track' | 'at_risk' | 'off_track';
}

export interface AlertWidget {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
  acknowledged: boolean;
}

export interface TrendWidget {
  id: string;
  title: string;
  metric: string;
  data: TimeSeriesData[];
  forecast?: TimeSeriesData[];
  annotations: string[];
}

export interface ExecutiveLayout {
  sections: ExecutiveSection[];
  theme: 'executive' | 'modern' | 'classic';
  density: 'compact' | 'comfortable' | 'spacious';
}

export interface ExecutiveSection {
  id: string;
  title: string;
  type: 'kpi' | 'insights' | 'summary' | 'alerts' | 'trends';
  widgets: string[];
  collapsible: boolean;
  expanded: boolean;
}

// API Response Types
export interface AnalyticsResponse<T = any> {
  success: boolean;
  data: T;
  metadata: {
    total: number;
    page: number;
    limit: number;
    executionTime: number;
    cached: boolean;
    cacheExpiry?: Date;
  };
  errors?: string[];
  warnings?: string[];
}

export interface QueryResult {
  columns: ColumnInfo[];
  rows: any[][];
  totalRows: number;
  executionTime: number;
  cached: boolean;
}

export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  nullable: boolean;
  unique: boolean;
}

// Error Types
export interface AnalyticsError extends Error {
  code: string;
  category: 'validation' | 'execution' | 'authorization' | 'configuration';
  details: Record<string, any>;
  timestamp: Date;
}

// Event Types for Real-time Updates
export interface AnalyticsEvent {
  type: AnalyticsEventType;
  payload: any;
  timestamp: Date;
  source: string;
}

export type AnalyticsEventType = 
  | 'data_updated'
  | 'report_generated'
  | 'alert_triggered'
  | 'export_completed'
  | 'schedule_executed'
  | 'insight_generated'
  | 'dashboard_viewed'
  | 'user_action';