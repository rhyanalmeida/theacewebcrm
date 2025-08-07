/**
 * Executive Dashboard Component
 * High-level insights and AI-powered summaries for executives
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ExecutiveDashboard as ExecutiveDashboardConfig,
  KPIWidget,
  AIInsight,
  ExecutiveSummary,
  AlertWidget,
  TrendWidget,
  SummaryMetric
} from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { 
  SimpleLineChart, 
  SimpleAreaChart, 
  MetricCard 
} from '../../../ace-crm/frontend/src/components/ui/charts';
import { 
  PresentationChartBarIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowRightIcon,
  EyeIcon,
  SparklesIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { analyticsService } from '../../services/AnalyticsService';
import { predictiveAnalytics } from '../../services/PredictiveAnalytics';

interface ExecutiveDashboardProps {
  config: ExecutiveDashboardConfig;
  onConfigChange?: (config: ExecutiveDashboardConfig) => void;
}

interface DashboardData {
  kpis: KPIWidget[];
  insights: AIInsight[];
  summaries: ExecutiveSummary[];
  alerts: AlertWidget[];
  trends: TrendWidget[];
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  config,
  onConfigChange
}) => {
  const [data, setData] = useState<DashboardData>({
    kpis: [],
    insights: [],
    summaries: [],
    alerts: [],
    trends: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  // Load executive dashboard data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load KPIs
      const kpiPromises = config.kpis.map(async (kpiConfig) => {
        // Mock KPI data - in real implementation, fetch from analytics service
        const currentValue = Math.floor(Math.random() * 1000000) + 500000;
        const previousValue = currentValue * (0.8 + Math.random() * 0.4);
        const changeValue = ((currentValue - previousValue) / previousValue) * 100;

        return {
          ...kpiConfig,
          value: currentValue,
          change: {
            value: Math.abs(changeValue),
            period: selectedPeriod,
            direction: changeValue > 0 ? 'up' : changeValue < 0 ? 'down' : 'flat'
          },
          status: changeValue > 10 ? 'good' : changeValue > 0 ? 'warning' : 'danger',
          trend: Array.from({ length: 12 }, () => Math.floor(Math.random() * 100000) + 50000)
        } as KPIWidget;
      });

      const kpis = await Promise.all(kpiPromises);

      // Generate AI insights
      const insights = await generateExecutiveInsights(kpis, selectedPeriod);

      // Generate executive summaries
      const summaries = await generateExecutiveSummaries(kpis, insights, selectedPeriod);

      // Load alerts (mock data)
      const alerts: AlertWidget[] = [
        {
          id: 'alert_1',
          title: 'Revenue Target at Risk',
          message: 'Q4 revenue is tracking 12% below target. Immediate action recommended.',
          severity: 'error',
          timestamp: new Date(Date.now() - 2 * 3600000),
          acknowledged: false
        },
        {
          id: 'alert_2',
          title: 'Customer Acquisition Cost Increased',
          message: 'CAC has increased by 18% in the last 30 days due to higher ad spend.',
          severity: 'warning',
          timestamp: new Date(Date.now() - 6 * 3600000),
          acknowledged: false
        }
      ];

      // Generate trend widgets
      const trends: TrendWidget[] = [
        {
          id: 'revenue_trend',
          title: 'Revenue Trend',
          metric: 'revenue',
          data: Array.from({ length: 30 }, (_, i) => ({
            id: `day_${i}`,
            timestamp: new Date(Date.now() - (29 - i) * 24 * 3600000).toISOString(),
            value: 10000 + Math.random() * 5000 + i * 200,
            category: 'revenue',
            metadata: {}
          })),
          annotations: ['Strong growth trend', 'Seasonal uptick expected']
        }
      ];

      setData({
        kpis,
        insights,
        summaries,
        alerts,
        trends
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executive dashboard');
    } finally {
      setLoading(false);
    }
  }, [config, selectedPeriod]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const generateExecutiveInsights = async (
    kpis: KPIWidget[], 
    period: string
  ): Promise<AIInsight[]> => {
    // Mock AI insights generation
    const insights: AIInsight[] = [
      {
        id: 'insight_1',
        type: 'opportunity',
        title: 'Sales Team Performance Opportunity',
        description: 'The Northeast sales team is outperforming others by 23%. Consider sharing their best practices company-wide.',
        confidence: 0.87,
        priority: 'high',
        category: 'sales',
        data: [],
        actions: ['Schedule best practice sharing session', 'Analyze team processes'],
        timestamp: new Date()
      },
      {
        id: 'insight_2',
        type: 'risk',
        title: 'Customer Churn Risk Increasing',
        description: 'Churn prediction model indicates 15% higher risk for enterprise customers. Focus on retention strategies.',
        confidence: 0.92,
        priority: 'high',
        category: 'customer',
        data: [],
        actions: ['Review enterprise customer health scores', 'Launch retention campaign'],
        timestamp: new Date()
      },
      {
        id: 'insight_3',
        type: 'trend',
        title: 'Mobile Usage Growing Rapidly',
        description: 'Mobile app usage has increased 45% this quarter. Consider prioritizing mobile features in product roadmap.',
        confidence: 0.79,
        priority: 'medium',
        category: 'product',
        data: [],
        actions: ['Review mobile roadmap', 'Allocate additional mobile development resources'],
        timestamp: new Date()
      }
    ];

    return insights;
  };

  const generateExecutiveSummaries = async (
    kpis: KPIWidget[], 
    insights: AIInsight[], 
    period: string
  ): Promise<ExecutiveSummary[]> => {
    const summary: ExecutiveSummary = {
      id: 'summary_current',
      period: `Current ${period}`,
      highlights: [
        'Revenue grew 8.5% compared to last quarter',
        'Customer acquisition exceeded targets by 12%',
        'Product adoption rate increased significantly',
        'Team productivity metrics show positive trends'
      ],
      concerns: [
        'Customer support response times are above target',
        'Monthly recurring revenue growth slowing',
        'Increased competition in key market segments'
      ],
      recommendations: [
        'Invest in customer success team expansion',
        'Accelerate product development for competitive features',
        'Implement advanced analytics for sales forecasting',
        'Review pricing strategy for enterprise customers'
      ],
      metrics: [
        {
          name: 'Revenue',
          current: 1250000,
          previous: 1150000,
          target: 1300000,
          status: 'at_risk'
        },
        {
          name: 'New Customers',
          current: 125,
          previous: 98,
          target: 120,
          status: 'on_track'
        },
        {
          name: 'Customer Satisfaction',
          current: 4.2,
          previous: 4.1,
          target: 4.5,
          status: 'at_risk'
        }
      ]
    };

    return [summary];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track': return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'at_risk': return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      case 'off_track': return <XCircleIcon className="w-5 h-5 text-red-600" />;
      default: return <ClockIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'border-l-red-500 bg-red-50';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50';
      case 'info': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  if (loading) {
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
          <p className="text-gray-600">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
            <p className="text-gray-600 mt-2">Comprehensive business insights and performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {['week', 'month', 'quarter'].map(period => (
                <Button
                  key={period}
                  size="sm"
                  variant={selectedPeriod === period ? 'default' : 'ghost'}
                  onClick={() => setSelectedPeriod(period as any)}
                  className="px-4"
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm">
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.kpis.map(kpi => (
          <Card key={kpi.id} className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">{kpi.title}</h3>
                <div className={`p-2 rounded-full ${
                  kpi.status === 'good' ? 'bg-green-100 text-green-600' :
                  kpi.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  <ChartBarIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900">
                  {kpi.format === 'currency' ? '$' : ''}
                  {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                  {kpi.format === 'percentage' ? '%' : ''}
                </div>
                <div className="flex items-center mt-2">
                  {kpi.change.direction === 'up' ? (
                    <TrendingUpIcon className="w-4 h-4 text-green-600 mr-1" />
                  ) : kpi.change.direction === 'down' ? (
                    <TrendingDownIcon className="w-4 h-4 text-red-600 mr-1" />
                  ) : (
                    <ArrowRightIcon className="w-4 h-4 text-gray-600 mr-1" />
                  )}
                  <span className={`text-sm ${
                    kpi.change.direction === 'up' ? 'text-green-600' :
                    kpi.change.direction === 'down' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {kpi.change.value.toFixed(1)}% vs {kpi.change.period}
                  </span>
                </div>
              </div>
              <div className="h-12">
                <SimpleAreaChart
                  data={kpi.trend.map((value, index) => ({ period: index, value }))}
                  dataKey="value"
                  xKey="period"
                  height={48}
                  showGrid={false}
                  showTooltip={false}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <SparklesIcon className="w-4 h-4" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <DocumentTextIcon className="w-4 h-4" />
            Executive Summary
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUpIcon className="w-4 h-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid gap-6">
            {data.insights.map(insight => (
              <Card key={insight.id} className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${
                      insight.type === 'opportunity' ? 'bg-green-100 text-green-600' :
                      insight.type === 'risk' ? 'bg-red-100 text-red-600' :
                      insight.type === 'trend' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {insight.type === 'opportunity' ? <TrendingUpIcon className="w-6 h-6" /> :
                       insight.type === 'risk' ? <ExclamationTriangleIcon className="w-6 h-6" /> :
                       insight.type === 'trend' ? <ChartBarIcon className="w-6 h-6" /> :
                       <LightBulbIcon className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{insight.title}</h3>
                        <Badge className={`${getPriorityColor(insight.priority)} border`}>
                          {insight.priority} priority
                        </Badge>
                        <Badge variant="outline">
                          {(insight.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-4">{insight.description}</p>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Recommended Actions:</h4>
                        <div className="flex flex-wrap gap-2">
                          {insight.actions.map((action, index) => (
                            <Button key={index} variant="outline" size="sm">
                              {action}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          {data.summaries.map(summary => (
            <div key={summary.id} className="space-y-6">
              {/* Metrics Overview */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PresentationChartBarIcon className="w-5 h-5" />
                    Key Metrics - {summary.period}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {summary.metrics.map((metric, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{metric.name}</h4>
                          {getStatusIcon(metric.status)}
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {typeof metric.current === 'number' && metric.name === 'Revenue' 
                            ? `$${metric.current.toLocaleString()}` 
                            : metric.current.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          Target: {typeof metric.target === 'number' && metric.name === 'Revenue' 
                            ? `$${metric.target.toLocaleString()}` 
                            : metric.target.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Previous: {typeof metric.previous === 'number' && metric.name === 'Revenue' 
                            ? `$${metric.previous.toLocaleString()}` 
                            : metric.previous.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Highlights, Concerns, Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-800 flex items-center gap-2">
                      <TrendingUpIcon className="w-5 h-5" />
                      Highlights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {summary.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-start gap-2 text-green-700">
                          <CheckCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-yellow-50 border-yellow-200">
                  <CardHeader>
                    <CardTitle className="text-yellow-800 flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5" />
                      Concerns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {summary.concerns.map((concern, index) => (
                        <li key={index} className="flex items-start gap-2 text-yellow-700">
                          <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{concern}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-blue-800 flex items-center gap-2">
                      <LightBulbIcon className="w-5 h-5" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {summary.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start gap-2 text-blue-700">
                          <ArrowRightIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {data.alerts.map(alert => (
            <Card key={alert.id} className={`${getSeverityColor(alert.severity)} border-l-4`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {alert.severity === 'error' ? (
                        <XCircleIcon className="w-6 h-6 text-red-600" />
                      ) : alert.severity === 'warning' ? (
                        <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
                      ) : (
                        <BoltIcon className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">{alert.title}</h4>
                      <p className="text-gray-700 mb-3">{alert.message}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{alert.timestamp.toLocaleString()}</span>
                        <Badge variant="outline">{alert.severity}</Badge>
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
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {data.trends.map(trend => (
            <Card key={trend.id} className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpIcon className="w-5 h-5" />
                  {trend.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <SimpleLineChart
                    data={trend.data.map(d => ({
                      date: new Date(d.timestamp).toLocaleDateString(),
                      value: d.value
                    }))}
                    dataKey="value"
                    xKey="date"
                    title=""
                    height={300}
                  />
                </div>
                <div>
                  <h4 className="font-medium mb-2">Key Observations:</h4>
                  <ul className="space-y-1">
                    {trend.annotations.map((annotation, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                        <EyeIcon className="w-4 h-4" />
                        {annotation}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};