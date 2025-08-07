/**
 * Advanced Analytics Dashboard Component
 * Interactive dashboard with real-time metrics, charts, and insights
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  DashboardConfig, 
  DashboardWidget, 
  RealTimeMetric, 
  AIInsight,
  KPIWidget,
  AlertWidget 
} from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { 
  SimpleLineChart, 
  SimpleAreaChart, 
  SimpleBarChart, 
  SimplePieChart,
  MetricCard,
  ChartContainer 
} from '../../../ace-crm/frontend/src/components/ui/charts';
import { 
  ChartBarIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  CogIcon,
  RefreshIcon,
  FullScreenIcon
} from '@heroicons/react/24/outline';
import { analyticsService } from '../../services/AnalyticsService';

interface AnalyticsDashboardProps {
  config: DashboardConfig;
  onConfigChange?: (config: DashboardConfig) => void;
  realTimeEnabled?: boolean;
}

interface DashboardData {
  kpis: KPIWidget[];
  realTimeMetrics: RealTimeMetric[];
  insights: AIInsight[];
  alerts: AlertWidget[];
  chartData: Record<string, any[]>;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  config,
  onConfigChange,
  realTimeEnabled = true
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    kpis: [],
    realTimeMetrics: [],
    insights: [],
    alerts: [],
    chartData: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load KPIs
      const kpiPromises = config.widgets
        .filter(w => w.type === 'metric')
        .map(async (widget) => {
          const data = await analyticsService.getTimeSeries(
            widget.config.visualization.series[0]?.field || 'revenue',
            widget.config.dateRange,
            'sum'
          );
          
          const currentValue = data[data.length - 1]?.value || 0;
          const previousValue = data[data.length - 2]?.value || 0;
          const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

          return {
            id: widget.id,
            title: widget.title,
            value: currentValue,
            change: {
              value: Math.abs(change),
              period: 'vs previous period',
              direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
            },
            status: change > 0 ? 'good' : change < -10 ? 'danger' : 'warning',
            trend: data.slice(-10).map(d => d.value),
            format: 'number'
          } as KPIWidget;
        });

      const kpis = await Promise.all(kpiPromises);

      // Load real-time metrics if enabled
      let realTimeMetrics: RealTimeMetric[] = [];
      if (realTimeEnabled) {
        const metrics = await analyticsService.getRealTimeMetrics([
          'active_users',
          'revenue_today',
          'conversion_rate',
          'avg_response_time'
        ]);

        realTimeMetrics = Object.entries(metrics).map(([key, value]) => ({
          id: key,
          name: key.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase()),
          value: value as number,
          timestamp: new Date(),
          change: Math.random() * 10 - 5, // Mock change for demo
          changeType: Math.random() > 0.5 ? 'increase' : 'decrease'
        }));
      }

      // Load AI insights
      const insights = await analyticsService.generateInsights(
        ['revenue', 'users', 'conversions'],
        config.filters[0]?.field ? { type: 'relative', value: 'last_30_days' } : { type: 'relative', value: 'last_7_days' }
      );

      const aiInsights: AIInsight[] = insights.slice(0, 5).map((insight, index) => ({
        id: `insight_${index}`,
        type: insight.type as any,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        priority: insight.confidence > 0.8 ? 'high' : insight.confidence > 0.6 ? 'medium' : 'low',
        category: 'performance',
        data: insight.data,
        actions: ['View Details', 'Create Action Plan'],
        timestamp: new Date()
      }));

      // Generate mock alerts
      const alerts: AlertWidget[] = [
        {
          id: 'alert_1',
          title: 'High Server Response Time',
          message: 'Average response time is 15% above normal threshold',
          severity: 'warning',
          timestamp: new Date(Date.now() - 3600000),
          acknowledged: false
        },
        {
          id: 'alert_2',
          title: 'Conversion Rate Drop',
          message: 'Conversion rate decreased by 8% in the last 24 hours',
          severity: 'error',
          timestamp: new Date(Date.now() - 7200000),
          acknowledged: false
        }
      ];

      // Load chart data for widgets
      const chartDataPromises = config.widgets
        .filter(w => w.type === 'chart')
        .map(async (widget) => {
          const data = await analyticsService.getTimeSeries(
            widget.config.visualization.series[0]?.field || 'revenue',
            widget.config.dateRange,
            'sum',
            'day'
          );
          return { widgetId: widget.id, data };
        });

      const chartResults = await Promise.all(chartDataPromises);
      const chartData = chartResults.reduce((acc, { widgetId, data }) => {
        acc[widgetId] = data;
        return acc;
      }, {} as Record<string, any[]>);

      setDashboardData({
        kpis,
        realTimeMetrics,
        insights: aiInsights,
        alerts,
        chartData
      });
      
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [config, realTimeEnabled]);

  // Auto-refresh for real-time updates
  useEffect(() => {
    if (realTimeEnabled && config.autoRefresh) {
      const interval = setInterval(() => {
        loadDashboardData();
      }, config.refreshRate * 1000);

      return () => clearInterval(interval);
    }
  }, [config.autoRefresh, config.refreshRate, loadDashboardData, realTimeEnabled]);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  const getChangeIcon = (direction: 'up' | 'down' | 'flat') => {
    switch (direction) {
      case 'up': return <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />;
      case 'down': return <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />;
      default: return <MinusIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'danger': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && dashboardData.kpis.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Dashboard Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadDashboardData} variant="outline">
            <RefreshIcon className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${isFullScreen ? 'p-6' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{config.name}</h1>
          <p className="text-gray-600 mt-1">Last updated: {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <div className="flex items-center gap-3">
          {realTimeEnabled && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-800">Live</span>
            </div>
          )}
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
            <RefreshIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleFullScreen} variant="outline" size="sm">
            <FullScreenIcon className="w-4 h-4 mr-2" />
            Full Screen
          </Button>
          {onConfigChange && (
            <Button variant="outline" size="sm">
              <CogIcon className="w-4 h-4 mr-2" />
              Configure
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPIs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardData.kpis.map((kpi) => (
              <Card key={kpi.id} className={`p-6 ${getStatusColor(kpi.status)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-70">{kpi.title}</p>
                    <p className="text-2xl font-bold mt-1">
                      {kpi.format === 'currency' ? '$' : ''}{kpi.value.toLocaleString()}
                      {kpi.format === 'percentage' ? '%' : ''}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      {getChangeIcon(kpi.change.direction)}
                      <span className="text-sm">
                        {kpi.change.value.toFixed(1)}% {kpi.change.period}
                      </span>
                    </div>
                  </div>
                  <div className="w-16 h-10">
                    <SimpleLineChart
                      data={kpi.trend.map((value, index) => ({ index, value }))}
                      dataKey="value"
                      xKey="index"
                      height={40}
                      showGrid={false}
                      showTooltip={false}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {config.widgets
              .filter(w => w.type === 'chart')
              .map((widget) => {
                const data = dashboardData.chartData[widget.id] || [];
                const chartProps = {
                  data,
                  dataKey: widget.config.visualization.series[0]?.field || 'value',
                  xKey: 'timestamp',
                  title: widget.title,
                  height: 300
                };

                return (
                  <Card key={widget.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ChartBarIcon className="w-5 h-5" />
                        {widget.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        switch (widget.config.visualization.type) {
                          case 'bar':
                            return <SimpleBarChart {...chartProps} />;
                          case 'area':
                            return <SimpleAreaChart {...chartProps} />;
                          case 'pie':
                            return <SimplePieChart 
                              data={data.map(d => ({ name: d.category || 'Item', value: d.value }))}
                              title={widget.title}
                              height={300}
                            />;
                          default:
                            return <SimpleLineChart {...chartProps} />;
                        }
                      })()}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4">
            {dashboardData.insights.map((insight) => (
              <Card key={insight.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <LightBulbIcon className="w-6 h-6 text-yellow-500" />
                      <div>
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={getPriorityColor(insight.priority)}>
                            {insight.priority} priority
                          </Badge>
                          <Badge variant="outline">
                            {(insight.confidence * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{insight.description}</p>
                  <div className="flex gap-2">
                    {insight.actions.map((action, index) => (
                      <Button key={index} variant="outline" size="sm">
                        {action}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardData.realTimeMetrics.map((metric) => (
              <Card key={metric.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                    <p className="text-2xl font-bold mt-1">{metric.value.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <BoltIcon className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-blue-600">
                        {metric.changeType === 'increase' ? '+' : ''}{metric.change.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {metric.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-3">
            {dashboardData.alerts.map((alert) => (
              <Card key={alert.id} className="border-l-4 border-l-yellow-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mt-0.5" />
                      <div>
                        <h4 className="font-semibold">{alert.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {alert.timestamp.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button variant="outline" size="sm">
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};