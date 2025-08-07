/**
 * Advanced Cohort Analysis Component
 * Customer retention analysis with visual heatmap and detailed metrics
 */

import React, { useState, useEffect } from 'react';
import { 
  CohortConfig, 
  CohortResult, 
  CohortPeriodResult, 
  FilterConfig, 
  DateRangeConfig 
} from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { 
  UsersIcon,
  CalendarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ChartBarIcon,
  TableCellsIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { analyticsService } from '../../services/AnalyticsService';

interface CohortAnalysisProps {
  initialConfig?: CohortConfig;
  onConfigChange?: (config: CohortConfig) => void;
  availableEvents: string[];
  availableFields: string[];
}

interface CohortHeatmapProps {
  results: CohortResult[];
  config: CohortConfig;
}

interface CohortTableProps {
  results: CohortResult[];
  config: CohortConfig;
  viewMode: 'percentage' | 'absolute';
}

const CohortHeatmap: React.FC<CohortHeatmapProps> = ({ results, config }) => {
  const maxPeriods = Math.max(...results.map(r => r.periods.length));
  const periods = Array.from({ length: maxPeriods }, (_, i) => i);

  const getRetentionColor = (rate: number): string => {
    if (rate >= 80) return 'bg-green-600';
    if (rate >= 60) return 'bg-green-400';
    if (rate >= 40) return 'bg-yellow-400';
    if (rate >= 20) return 'bg-orange-400';
    if (rate > 0) return 'bg-red-400';
    return 'bg-gray-200';
  };

  const getTextColor = (rate: number): string => {
    return rate >= 40 ? 'text-white' : 'text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TableCellsIcon className="w-5 h-5" />
          Cohort Retention Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 border bg-gray-50 font-semibold">Cohort</th>
                <th className="text-center p-2 border bg-gray-50 font-semibold">Size</th>
                {periods.map(period => (
                  <th key={period} className="text-center p-2 border bg-gray-50 font-semibold min-w-16">
                    {config.cohortPeriod === 'day' ? `D${period}` :
                     config.cohortPeriod === 'week' ? `W${period}` :
                     `M${period}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((cohort, cohortIndex) => (
                <tr key={cohortIndex} className="hover:bg-gray-50">
                  <td className="p-2 border font-medium">
                    {new Date(cohort.cohortDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      ...(config.cohortPeriod === 'day' ? { day: 'numeric' } : {})
                    })}
                  </td>
                  <td className="p-2 border text-center font-mono">
                    {cohort.cohortSize.toLocaleString()}
                  </td>
                  {periods.map(periodIndex => {
                    const periodData = cohort.periods[periodIndex];
                    if (!periodData) {
                      return <td key={periodIndex} className="p-2 border bg-gray-100"></td>;
                    }

                    const rate = periodData.retentionRate;
                    return (
                      <td 
                        key={periodIndex} 
                        className={`p-2 border text-center text-sm font-medium ${getRetentionColor(rate)} ${getTextColor(rate)}`}
                        title={`${periodData.users.toLocaleString()} users (${rate.toFixed(1)}%)`}
                      >
                        {rate.toFixed(1)}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <span>Retention Rate:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-400"></div>
            <span>0-20%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-400"></div>
            <span>20-40%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400"></div>
            <span>40-60%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-400"></div>
            <span>60-80%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-600"></div>
            <span>80%+</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CohortTable: React.FC<CohortTableProps> = ({ results, config, viewMode }) => {
  const maxPeriods = Math.max(...results.map(r => r.periods.length));
  const periods = Array.from({ length: maxPeriods }, (_, i) => i);

  // Calculate average retention by period
  const avgRetention = periods.map(periodIndex => {
    const values = results
      .map(cohort => cohort.periods[periodIndex]?.retentionRate)
      .filter(rate => rate !== undefined) as number[];
    
    return values.length > 0 ? values.reduce((sum, rate) => sum + rate, 0) / values.length : 0;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5" />
            Detailed Cohort Data
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'percentage' ? 'default' : 'outline'}
              size="sm"
            >
              Percentage
            </Button>
            <Button
              variant={viewMode === 'absolute' ? 'default' : 'outline'}
              size="sm"
            >
              Absolute
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {results.length}
              </div>
              <div className="text-sm text-gray-600">Total Cohorts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {results.reduce((sum, cohort) => sum + cohort.cohortSize, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {avgRetention.length > 0 ? avgRetention[0].toFixed(1) : '0'}%
              </div>
              <div className="text-sm text-gray-600">Period 0 Avg</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {avgRetention.length > 1 ? avgRetention[avgRetention.length - 1].toFixed(1) : '0'}%
              </div>
              <div className="text-sm text-gray-600">Final Period Avg</div>
            </div>
          </div>

          {/* Average Retention Trend */}
          <Card className="p-4">
            <h4 className="font-medium mb-4">Average Retention by Period</h4>
            <div className="space-y-2">
              {avgRetention.map((rate, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-16 text-sm font-mono">
                    {config.cohortPeriod === 'day' ? `Day ${index}` :
                     config.cohortPeriod === 'week' ? `Week ${index}` :
                     `Month ${index}`}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                    <div 
                      className="bg-blue-500 h-4 rounded-full"
                      style={{ width: `${Math.max(rate, 2)}%` }}
                    ></div>
                  </div>
                  <div className="w-16 text-sm font-mono text-right">
                    {rate.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Detailed Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left p-3">Cohort</th>
                  <th className="text-center p-3">Size</th>
                  {periods.map(period => (
                    <th key={period} className="text-center p-3">
                      {config.cohortPeriod === 'day' ? `Day ${period}` :
                       config.cohortPeriod === 'week' ? `Week ${period}` :
                       `Month ${period}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((cohort, cohortIndex) => (
                  <tr key={cohortIndex} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">
                        {new Date(cohort.cohortDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          ...(config.cohortPeriod === 'day' ? { day: 'numeric' } : {})
                        })}
                      </div>
                    </td>
                    <td className="text-center p-3 font-mono">
                      {cohort.cohortSize.toLocaleString()}
                    </td>
                    {periods.map(periodIndex => {
                      const periodData = cohort.periods[periodIndex];
                      if (!periodData) {
                        return <td key={periodIndex} className="text-center p-3 text-gray-400">-</td>;
                      }

                      return (
                        <td key={periodIndex} className="text-center p-3">
                          {viewMode === 'percentage' ? (
                            <Badge 
                              variant="outline"
                              className={
                                periodData.retentionRate >= 50 ? 'border-green-500 text-green-700' :
                                periodData.retentionRate >= 25 ? 'border-yellow-500 text-yellow-700' :
                                'border-red-500 text-red-700'
                              }
                            >
                              {periodData.retentionRate.toFixed(1)}%
                            </Badge>
                          ) : (
                            <div className="font-mono">
                              {periodData.users.toLocaleString()}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const CohortAnalysis: React.FC<CohortAnalysisProps> = ({
  initialConfig,
  onConfigChange,
  availableEvents = [],
  availableFields = []
}) => {
  const [config, setConfig] = useState<CohortConfig>(
    initialConfig || {
      id: `cohort_${Date.now()}`,
      name: 'New Cohort Analysis',
      description: '',
      cohortEvent: availableEvents[0] || 'signup',
      returnEvent: availableEvents[1] || 'login',
      cohortPeriod: 'month',
      periods: 12,
      userIdField: 'user_id',
      timestampField: 'timestamp',
      filters: [],
      dateRange: { type: 'relative', value: 'last_year' }
    }
  );

  const [results, setResults] = useState<CohortResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'percentage' | 'absolute'>('percentage');

  const updateConfig = (updates: Partial<CohortConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const runAnalysis = async () => {
    if (!config.cohortEvent || !config.returnEvent) {
      setError('Please select both cohort event and return event');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cohortData = await analyticsService.calculateCohort(
        config.cohortEvent,
        config.returnEvent,
        config.dateRange,
        config.cohortPeriod,
        config.periods
      );

      const cohortResults: CohortResult[] = cohortData.map(data => ({
        cohortDate: data.cohort,
        cohortSize: data.size,
        periods: data.retention.map((rate, index) => ({
          period: index,
          users: Math.round(data.size * (rate / 100)), // Convert percentage back to users
          retentionRate: rate
        }))
      }));

      setResults(cohortResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cohort analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // Calculate insights
  const insights = React.useMemo(() => {
    if (results.length === 0) return [];

    const insights = [];
    
    // Overall retention trend
    const avgFirstPeriod = results.reduce((sum, r) => sum + (r.periods[0]?.retentionRate || 0), 0) / results.length;
    const avgLastPeriod = results.reduce((sum, r) => sum + (r.periods[r.periods.length - 1]?.retentionRate || 0), 0) / results.length;
    
    insights.push({
      type: avgLastPeriod > avgFirstPeriod * 0.3 ? 'positive' : 'negative',
      title: 'Retention Trend',
      description: `${avgLastPeriod > avgFirstPeriod * 0.3 ? 'Good' : 'Poor'} long-term retention. ${avgLastPeriod.toFixed(1)}% retention in final period.`,
      value: avgLastPeriod
    });

    // Best performing cohort
    const bestCohort = results.reduce((best, cohort) => 
      (cohort.periods[cohort.periods.length - 1]?.retentionRate || 0) > 
      (best.periods[best.periods.length - 1]?.retentionRate || 0) ? cohort : best
    );
    
    insights.push({
      type: 'info',
      title: 'Best Performing Cohort',
      description: `${new Date(bestCohort.cohortDate).toLocaleDateString()} cohort has the highest final retention (${(bestCohort.periods[bestCohort.periods.length - 1]?.retentionRate || 0).toFixed(1)}%)`,
      value: bestCohort.periods[bestCohort.periods.length - 1]?.retentionRate || 0
    });

    return insights;
  }, [results]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cohort Analysis</h2>
          <p className="text-gray-600">Track user retention over time</p>
        </div>
        <Button onClick={runAnalysis} disabled={loading}>
          <UsersIcon className="w-4 h-4 mr-2" />
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </div>

      <Tabs defaultValue="configuration" className="w-full">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Analysis Name</label>
                  <Input
                    value={config.name}
                    onChange={(e) => updateConfig({ name: e.target.value })}
                    placeholder="Enter analysis name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Periods to Track</label>
                  <Input
                    type="number"
                    value={config.periods}
                    onChange={(e) => updateConfig({ periods: parseInt(e.target.value) || 12 })}
                    min="1"
                    max="24"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={config.description}
                  onChange={(e) => updateConfig({ description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Events & Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Cohort Event</label>
                  <Select
                    value={config.cohortEvent}
                    onValueChange={(value) => updateConfig({ cohortEvent: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cohort event" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEvents.map(event => (
                        <SelectItem key={event} value={event}>{event}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Event that defines cohort entry</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Return Event</label>
                  <Select
                    value={config.returnEvent}
                    onValueChange={(value) => updateConfig({ returnEvent: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select return event" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEvents.map(event => (
                        <SelectItem key={event} value={event}>{event}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Event that indicates user returned</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Cohort Period</label>
                  <Select
                    value={config.cohortPeriod}
                    onValueChange={(value) => updateConfig({ cohortPeriod: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Daily</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="month">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">User ID Field</label>
                  <Select
                    value={config.userIdField}
                    onValueChange={(value) => updateConfig({ userIdField: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map(field => (
                        <SelectItem key={field} value={field}>{field}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Timestamp Field</label>
                  <Select
                    value={config.timestampField}
                    onValueChange={(value) => updateConfig({ timestampField: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map(field => (
                        <SelectItem key={field} value={field}>{field}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="text-red-800">{error}</div>
              </CardContent>
            </Card>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <CohortHeatmap results={results} config={config} />
          )}

          {!loading && !error && results.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                <p className="text-gray-600">Configure your cohort analysis and click "Run Analysis" to see results.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="table">
          {!loading && !error && results.length > 0 && (
            <CohortTable 
              results={results} 
              config={config} 
              viewMode={viewMode} 
            />
          )}

          {!loading && !error && results.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <TableCellsIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                <p className="text-gray-600">Run the analysis first to see detailed table view.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights">
          {insights.length > 0 && (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-full ${
                        insight.type === 'positive' ? 'bg-green-100 text-green-600' :
                        insight.type === 'negative' ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {insight.type === 'positive' ? <TrendingUpIcon className="w-5 h-5" /> :
                         insight.type === 'negative' ? <TrendingDownIcon className="w-5 h-5" /> :
                         <EyeIcon className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">{insight.title}</h4>
                        <p className="text-gray-600 mt-1">{insight.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {insights.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <EyeIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Insights Available</h3>
                <p className="text-gray-600">Run the cohort analysis to generate insights.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};