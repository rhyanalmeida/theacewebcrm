/**
 * Advanced Drag-and-Drop Report Builder Component
 * Allows users to create custom reports with interactive visual elements
 */

import React, { useState, useCallback, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
  ReportConfig, 
  VisualizationConfig, 
  ChartType, 
  FilterConfig, 
  MetricDefinition,
  DataSource
} from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { 
  ChartBarIcon, 
  ChartPieIcon, 
  PresentationChartLineIcon,
  FunnelIcon,
  CogIcon,
  EyeIcon,
  SaveIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface ReportBuilderProps {
  onSaveReport: (config: ReportConfig) => void;
  onPreviewReport: (config: ReportConfig) => void;
  existingConfig?: ReportConfig;
  availableMetrics: MetricDefinition[];
  dataSources: DataSource[];
}

interface DragItem {
  type: string;
  id: string;
  category: string;
  name: string;
  chartType?: ChartType;
  field?: string;
}

const ItemTypes = {
  METRIC: 'metric',
  CHART: 'chart',
  FILTER: 'filter',
  GROUPBY: 'groupby'
};

// Draggable metric item
const MetricItem: React.FC<{ metric: MetricDefinition }> = ({ metric }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.METRIC,
    item: {
      type: ItemTypes.METRIC,
      id: metric.id,
      name: metric.name,
      field: metric.id,
      category: metric.category
    } as DragItem,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`p-3 border rounded-lg cursor-move transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'
      }`}
    >
      <div className="font-medium text-sm">{metric.name}</div>
      <div className="text-xs text-gray-500 mt-1">{metric.description}</div>
      <Badge variant="secondary" className="mt-2 text-xs">
        {metric.category}
      </Badge>
    </div>
  );
};

// Draggable chart type item
const ChartTypeItem: React.FC<{ chartType: ChartType; icon: React.ReactNode; name: string }> = ({ 
  chartType, 
  icon, 
  name 
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CHART,
    item: {
      type: ItemTypes.CHART,
      id: chartType,
      name,
      chartType,
      category: 'visualization'
    } as DragItem,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`p-4 border rounded-lg cursor-move transition-all flex flex-col items-center ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'
      }`}
    >
      {icon}
      <span className="text-sm mt-2">{name}</span>
    </div>
  );
};

// Drop zone for building report
const ReportCanvas: React.FC<{
  config: Partial<ReportConfig>;
  onUpdateConfig: (updates: Partial<ReportConfig>) => void;
}> = ({ config, onUpdateConfig }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.METRIC, ItemTypes.CHART, ItemTypes.FILTER, ItemTypes.GROUPBY],
    drop: (item: DragItem) => {
      handleDrop(item);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const handleDrop = useCallback((item: DragItem) => {
    switch (item.type) {
      case ItemTypes.METRIC:
        const newSeries = {
          name: item.name,
          field: item.field!,
          type: config.visualization?.type || 'line'
        };
        onUpdateConfig({
          visualization: {
            ...config.visualization,
            series: [...(config.visualization?.series || []), newSeries]
          }
        });
        break;

      case ItemTypes.CHART:
        onUpdateConfig({
          visualization: {
            ...config.visualization,
            type: item.chartType!,
            title: config.visualization?.title || `${item.name} Chart`
          }
        });
        break;

      default:
        break;
    }
  }, [config, onUpdateConfig]);

  return (
    <div
      ref={drop}
      className={`min-h-96 border-2 border-dashed rounded-lg p-6 transition-colors ${
        isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
    >
      {config.visualization?.type ? (
        <ReportPreview config={config as ReportConfig} />
      ) : (
        <div className="text-center text-gray-500 py-20">
          <ChartBarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Drag chart type and metrics here to build your report</p>
        </div>
      )}
    </div>
  );
};

// Mini preview of the report being built
const ReportPreview: React.FC<{ config: ReportConfig }> = ({ config }) => {
  const getChartIcon = (type: ChartType) => {
    switch (type) {
      case 'pie':
      case 'donut':
        return <ChartPieIcon className="w-8 h-8" />;
      case 'bar':
      case 'column':
        return <ChartBarIcon className="w-8 h-8" />;
      case 'funnel':
        return <FunnelIcon className="w-8 h-8" />;
      default:
        return <PresentationChartLineIcon className="w-8 h-8" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {getChartIcon(config.visualization.type)}
          <div>
            <CardTitle className="text-lg">{config.visualization.title}</CardTitle>
            <p className="text-sm text-gray-500">
              {config.visualization.series?.length || 0} series • {config.visualization.type}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {config.visualization.series?.map((series, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: config.visualization.colors?.[index] || '#8884d8' }}
              />
              <span className="text-sm">{series.name}</span>
              <Badge variant="outline" className="text-xs">{series.field}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Filter builder component
const FilterBuilder: React.FC<{
  filters: FilterConfig[];
  onFiltersChange: (filters: FilterConfig[]) => void;
  availableFields: string[];
}> = ({ filters, onFiltersChange, availableFields }) => {
  const addFilter = () => {
    const newFilter: FilterConfig = {
      field: availableFields[0] || '',
      operator: 'equals',
      value: '',
      condition: 'and'
    };
    onFiltersChange([...filters, newFilter]);
  };

  const updateFilter = (index: number, updates: Partial<FilterConfig>) => {
    const updatedFilters = [...filters];
    updatedFilters[index] = { ...updatedFilters[index], ...updates };
    onFiltersChange(updatedFilters);
  };

  const removeFilter = (index: number) => {
    onFiltersChange(filters.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Filters</h4>
        <Button onClick={addFilter} size="sm" variant="outline">
          Add Filter
        </Button>
      </div>
      
      {filters.map((filter, index) => (
        <Card key={index} className="p-3">
          <div className="grid grid-cols-4 gap-2">
            <Select
              value={filter.field}
              onValueChange={(value) => updateFilter(index, { field: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Field" />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map(field => (
                  <SelectItem key={field} value={field}>{field}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={filter.operator}
              onValueChange={(value) => updateFilter(index, { operator: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="not_equals">Not Equals</SelectItem>
                <SelectItem value="greater_than">Greater Than</SelectItem>
                <SelectItem value="less_than">Less Than</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="in">In</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              value={filter.value}
              onChange={(e) => updateFilter(index, { value: e.target.value })}
              placeholder="Value"
            />
            
            <Button 
              onClick={() => removeFilter(index)} 
              variant="destructive" 
              size="sm"
            >
              ✕
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  onSaveReport,
  onPreviewReport,
  existingConfig,
  availableMetrics,
  dataSources
}) => {
  const [reportConfig, setReportConfig] = useState<Partial<ReportConfig>>(
    existingConfig || {
      name: 'New Report',
      type: 'detailed',
      visualization: {
        type: 'line',
        title: 'New Chart',
        xAxis: { label: 'X Axis', field: '', type: 'category', showGrid: true, showLabels: true },
        yAxis: { label: 'Y Axis', field: '', type: 'value', showGrid: true, showLabels: true },
        series: [],
        colors: ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'],
        legend: { show: true, position: 'top', orientation: 'horizontal' },
        tooltip: { show: true, format: '{value}', showAll: false },
        responsive: true
      },
      filters: [],
      groupBy: [],
      orderBy: [],
      dateRange: { type: 'relative', value: 'last_30_days' },
      permissions: {
        visibility: 'private',
        allowEdit: false,
        allowDelete: false,
        allowExport: true,
        allowSchedule: false
      },
      isScheduled: false
    }
  );

  const chartTypes: Array<{ type: ChartType; name: string; icon: React.ReactNode }> = [
    { type: 'line', name: 'Line Chart', icon: <PresentationChartLineIcon className="w-6 h-6" /> },
    { type: 'bar', name: 'Bar Chart', icon: <ChartBarIcon className="w-6 h-6" /> },
    { type: 'area', name: 'Area Chart', icon: <PresentationChartLineIcon className="w-6 h-6" /> },
    { type: 'pie', name: 'Pie Chart', icon: <ChartPieIcon className="w-6 h-6" /> },
    { type: 'column', name: 'Column Chart', icon: <ChartBarIcon className="w-6 h-6 rotate-90" /> },
    { type: 'funnel', name: 'Funnel Chart', icon: <FunnelIcon className="w-6 h-6" /> }
  ];

  const updateConfig = useCallback((updates: Partial<ReportConfig>) => {
    setReportConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSave = () => {
    const completeConfig: ReportConfig = {
      id: existingConfig?.id || `report_${Date.now()}`,
      dataSource: { type: 'database', connection: 'default' },
      createdBy: 'current_user',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...reportConfig
    } as ReportConfig;

    onSaveReport(completeConfig);
  };

  const handlePreview = () => {
    const completeConfig: ReportConfig = {
      id: existingConfig?.id || `preview_${Date.now()}`,
      dataSource: { type: 'database', connection: 'default' },
      createdBy: 'current_user',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...reportConfig
    } as ReportConfig;

    onPreviewReport(completeConfig);
  };

  const availableFields = availableMetrics.map(m => m.id);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="grid grid-cols-12 gap-6 h-screen p-6">
        {/* Left Sidebar - Components */}
        <div className="col-span-3 space-y-6 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chart Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {chartTypes.map(chart => (
                  <ChartTypeItem
                    key={chart.type}
                    chartType={chart.type}
                    name={chart.name}
                    icon={chart.icon}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableMetrics.map(metric => (
                  <MetricItem key={metric.id} metric={metric} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center - Report Canvas */}
        <div className="col-span-6 space-y-6">
          <div className="flex items-center justify-between">
            <Input
              value={reportConfig.name}
              onChange={(e) => updateConfig({ name: e.target.value })}
              className="text-xl font-bold border-none p-0 focus-visible:ring-0"
              placeholder="Report Name"
            />
            <div className="flex gap-2">
              <Button onClick={handlePreview} variant="outline" size="sm">
                <EyeIcon className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleSave} size="sm">
                <SaveIcon className="w-4 h-4 mr-2" />
                Save Report
              </Button>
            </div>
          </div>

          <ReportCanvas
            config={reportConfig}
            onUpdateConfig={updateConfig}
          />
        </div>

        {/* Right Sidebar - Configuration */}
        <div className="col-span-3 space-y-6 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CogIcon className="w-5 h-5" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="filters">Filters</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Report Type</label>
                    <Select
                      value={reportConfig.type}
                      onValueChange={(value) => updateConfig({ type: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dashboard">Dashboard</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                        <SelectItem value="summary">Summary</SelectItem>
                        <SelectItem value="comparison">Comparison</SelectItem>
                        <SelectItem value="trend">Trend Analysis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Date Range</label>
                    <Select
                      value={reportConfig.dateRange?.value as string}
                      onValueChange={(value) => updateConfig({
                        dateRange: { type: 'relative', value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last_7_days">Last 7 days</SelectItem>
                        <SelectItem value="last_30_days">Last 30 days</SelectItem>
                        <SelectItem value="last_90_days">Last 90 days</SelectItem>
                        <SelectItem value="last_year">Last year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {reportConfig.visualization && (
                    <div>
                      <label className="text-sm font-medium">Chart Title</label>
                      <Input
                        value={reportConfig.visualization.title}
                        onChange={(e) => updateConfig({
                          visualization: {
                            ...reportConfig.visualization,
                            title: e.target.value
                          }
                        })}
                        placeholder="Chart Title"
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="filters">
                  <FilterBuilder
                    filters={reportConfig.filters || []}
                    onFiltersChange={(filters) => updateConfig({ filters })}
                    availableFields={availableFields}
                  />
                </TabsContent>

                <TabsContent value="schedule" className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={reportConfig.isScheduled}
                      onChange={(e) => updateConfig({ isScheduled: e.target.checked })}
                    />
                    <label className="text-sm font-medium">Enable Scheduling</label>
                  </div>

                  {reportConfig.isScheduled && (
                    <>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input type="time" placeholder="Time" />
                      
                      <Input placeholder="Email recipients (comma separated)" />
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </DndProvider>
  );
};