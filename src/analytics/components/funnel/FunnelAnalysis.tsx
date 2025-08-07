/**
 * Advanced Funnel Analysis Component
 * Visualizes conversion funnels with detailed step-by-step analytics
 */

import React, { useState, useEffect } from 'react';
import { 
  FunnelConfig, 
  FunnelResult, 
  FunnelStep, 
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
  FunnelIcon,
  PlusIcon,
  TrashIcon,
  ChartBarIcon,
  UsersIcon,
  TrendingDownIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { analyticsService } from '../../services/AnalyticsService';

interface FunnelAnalysisProps {
  initialConfig?: FunnelConfig;
  onConfigChange?: (config: FunnelConfig) => void;
  availableEvents: string[];
  availableFields: string[];
}

interface FunnelVisualizationProps {
  results: FunnelResult[];
  config: FunnelConfig;
}

const FunnelVisualization: React.FC<FunnelVisualizationProps> = ({ results, config }) => {
  const maxUsers = results.length > 0 ? Math.max(...results.map(r => r.users)) : 0;

  const getStepWidth = (users: number): number => {
    return maxUsers > 0 ? Math.max(20, (users / maxUsers) * 100) : 20;
  };

  const getConversionColor = (rate: number): string => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 60) return 'bg-yellow-500';
    if (rate >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-8">
      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5" />
            Conversion Funnel: {config.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {results.map((result, index) => {
              const isFirst = index === 0;
              const width = getStepWidth(result.users);
              const previousUsers = index > 0 ? results[index - 1].users : result.users;
              const stepConversion = isFirst ? 100 : (result.users / previousUsers) * 100;
              
              return (
                <div key={result.stepId} className="relative">
                  {/* Step Container */}
                  <div className="flex items-center gap-6">
                    {/* Step Number */}
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    
                    {/* Funnel Shape */}
                    <div className="flex-1">
                      <div 
                        className={`h-16 flex items-center justify-between px-4 text-white font-semibold rounded-lg ${getConversionColor(stepConversion)}`}
                        style={{ width: `${width}%`, minWidth: '200px' }}
                      >
                        <div>
                          <div className="font-semibold">{result.stepName}</div>
                          <div className="text-sm opacity-90">
                            {result.users.toLocaleString()} users
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {stepConversion.toFixed(1)}%
                          </div>
                          <div className="text-sm opacity-90">
                            conversion
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Drop-off Indicator */}
                  {!isFirst && result.dropoffRate > 0 && (
                    <div className="ml-14 mt-2 flex items-center gap-2 text-red-600">
                      <TrendingDownIcon className="w-4 h-4" />
                      <span className="text-sm">
                        {result.dropoffRate.toFixed(1)}% drop-off ({(previousUsers - result.users).toLocaleString()} users)
                      </span>
                    </div>
                  )}

                  {/* Average Time */}
                  {result.averageTime > 0 && (
                    <div className="ml-14 mt-1 flex items-center gap-2 text-gray-600">
                      <ClockIcon className="w-4 h-4" />
                      <span className="text-sm">
                        Avg. time: {(result.averageTime / 60).toFixed(1)} minutes
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {results[0]?.users.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-gray-600">Total Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {results[results.length - 1]?.users.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {results[results.length - 1] && results[0] 
                  ? ((results[results.length - 1].users / results[0].users) * 100).toFixed(1)
                  : '0'}%
              </div>
              <div className="text-sm text-gray-600">Overall Conversion</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {results.reduce((sum, r) => sum + r.averageTime, 0) > 0
                  ? (results.reduce((sum, r) => sum + r.averageTime, 0) / results.length / 60).toFixed(1)
                  : '0'}
              </div>
              <div className="text-sm text-gray-600">Avg. Time (min)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Step Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Step</th>
                  <th className="text-right p-3">Users</th>
                  <th className="text-right p-3">Conversions</th>
                  <th className="text-right p-3">Rate</th>
                  <th className="text-right p-3">Drop-off</th>
                  <th className="text-right p-3">Avg. Time</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => {
                  const previousUsers = index > 0 ? results[index - 1].users : result.users;
                  const stepConversion = index === 0 ? 100 : (result.users / previousUsers) * 100;
                  
                  return (
                    <tr key={result.stepId} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{result.stepName}</div>
                        <div className="text-sm text-gray-500">Step {index + 1}</div>
                      </td>
                      <td className="text-right p-3 font-mono">
                        {result.users.toLocaleString()}
                      </td>
                      <td className="text-right p-3 font-mono">
                        {result.conversions.toLocaleString()}
                      </td>
                      <td className="text-right p-3">
                        <Badge 
                          variant="outline"
                          className={stepConversion >= 70 ? 'border-green-500 text-green-700' : 
                                     stepConversion >= 50 ? 'border-yellow-500 text-yellow-700' : 
                                     'border-red-500 text-red-700'}
                        >
                          {stepConversion.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="text-right p-3 font-mono text-red-600">
                        {result.dropoffRate.toFixed(1)}%
                      </td>
                      <td className="text-right p-3 font-mono">
                        {result.averageTime > 0 ? `${(result.averageTime / 60).toFixed(1)}m` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StepBuilder: React.FC<{
  steps: FunnelStep[];
  onStepsChange: (steps: FunnelStep[]) => void;
  availableEvents: string[];
}> = ({ steps, onStepsChange, availableEvents }) => {
  const addStep = () => {
    const newStep: FunnelStep = {
      id: `step_${Date.now()}`,
      name: `Step ${steps.length + 1}`,
      event: availableEvents[0] || '',
      conditions: [],
      order: steps.length,
      required: true
    };
    onStepsChange([...steps, newStep]);
  };

  const updateStep = (index: number, updates: Partial<FunnelStep>) => {
    const updatedSteps = [...steps];
    updatedSteps[index] = { ...updatedSteps[index], ...updates };
    onStepsChange(updatedSteps);
  };

  const removeStep = (index: number) => {
    const updatedSteps = steps.filter((_, i) => i !== index);
    // Reorder remaining steps
    updatedSteps.forEach((step, i) => {
      step.order = i;
    });
    onStepsChange(updatedSteps);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === steps.length - 1)) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    
    // Update order
    newSteps.forEach((step, i) => {
      step.order = i;
    });
    
    onStepsChange(newSteps);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Funnel Steps</h4>
        <Button onClick={addStep} size="sm" variant="outline">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Step
        </Button>
      </div>

      {steps.map((step, index) => (
        <Card key={step.id} className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                {index + 1}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                <Input
                  value={step.name}
                  onChange={(e) => updateStep(index, { name: e.target.value })}
                  placeholder="Step name"
                />
                <Select
                  value={step.event}
                  onValueChange={(value) => updateStep(index, { event: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEvents.map(event => (
                      <SelectItem key={event} value={event}>{event}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-1">
                <Button
                  onClick={() => moveStep(index, 'up')}
                  size="sm"
                  variant="ghost"
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  onClick={() => moveStep(index, 'down')}
                  size="sm"
                  variant="ghost"
                  disabled={index === steps.length - 1}
                >
                  ↓
                </Button>
                <Button
                  onClick={() => removeStep(index)}
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="ml-12 flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={step.required}
                  onChange={(e) => updateStep(index, { required: e.target.checked })}
                />
                <span className="text-sm">Required step</span>
              </label>
            </div>
          </div>
        </Card>
      ))}

      {steps.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FunnelIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No steps defined. Add steps to create your funnel.</p>
        </div>
      )}
    </div>
  );
};

export const FunnelAnalysis: React.FC<FunnelAnalysisProps> = ({
  initialConfig,
  onConfigChange,
  availableEvents = [],
  availableFields = []
}) => {
  const [config, setConfig] = useState<FunnelConfig>(
    initialConfig || {
      id: `funnel_${Date.now()}`,
      name: 'New Funnel Analysis',
      description: '',
      steps: [],
      timeWindow: 24,
      userIdField: 'user_id',
      timestampField: 'timestamp',
      conversionGoal: 'completed',
      dateRange: { type: 'relative', value: 'last_30_days' }
    }
  );

  const [results, setResults] = useState<FunnelResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateConfig = (updates: Partial<FunnelConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const runAnalysis = async () => {
    if (config.steps.length === 0) {
      setError('Please add at least one step to the funnel');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const steps = config.steps.map(step => ({
        event: step.event,
        conditions: step.conditions
      }));

      const funnelData = await analyticsService.calculateFunnel(
        steps,
        config.dateRange,
        config.userIdField
      );

      const funnelResults: FunnelResult[] = funnelData.map((data, index) => {
        const step = config.steps[index];
        const previousUsers = index > 0 ? funnelData[index - 1].users : data.users;
        const dropoffRate = index > 0 ? ((previousUsers - data.users) / previousUsers) * 100 : 0;

        return {
          stepId: step.id,
          stepName: step.name,
          users: data.users,
          conversions: data.conversion,
          conversionRate: data.conversion,
          dropoffRate,
          averageTime: Math.random() * 3600 // Mock average time
        };
      });

      setResults(funnelResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Funnel Analysis</h2>
          <p className="text-gray-600">Analyze user conversion through your funnel</p>
        </div>
        <Button onClick={runAnalysis} disabled={loading || config.steps.length === 0}>
          <ChartBarIcon className="w-4 h-4 mr-2" />
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </div>

      <Tabs defaultValue="configuration" className="w-full">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Funnel Name</label>
                  <Input
                    value={config.name}
                    onChange={(e) => updateConfig({ name: e.target.value })}
                    placeholder="Enter funnel name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Time Window (hours)</label>
                  <Input
                    type="number"
                    value={config.timeWindow}
                    onChange={(e) => updateConfig({ timeWindow: parseInt(e.target.value) || 24 })}
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

              <div className="grid grid-cols-2 gap-4">
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

          <StepBuilder
            steps={config.steps}
            onStepsChange={(steps) => updateConfig({ steps })}
            availableEvents={availableEvents}
          />
        </TabsContent>

        <TabsContent value="results">
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
            <FunnelVisualization results={results} config={config} />
          )}

          {!loading && !error && results.length === 0 && !loading && (
            <Card>
              <CardContent className="p-8 text-center">
                <UsersIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                <p className="text-gray-600">Configure your funnel and click "Run Analysis" to see results.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};