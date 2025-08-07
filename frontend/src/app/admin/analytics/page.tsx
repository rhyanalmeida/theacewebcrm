'use client';

import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ServerIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '@/utils/cn';

// Types
interface APIMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  requests_per_minute: number;
  unique_ips: number;
}

interface EndpointStats {
  endpoint: string;
  method: string;
  requests: number;
  avg_response_time: number;
  success_rate: number;
  errors: number;
}

interface TimeSeriesData {
  timestamp: string;
  requests: number;
  response_time: number;
  errors: number;
}

// Mock data - replace with real API calls
const mockMetrics: APIMetrics = {
  total_requests: 2847629,
  successful_requests: 2781456,
  failed_requests: 66173,
  average_response_time: 147,
  requests_per_minute: 1247,
  unique_ips: 8934,
};

const mockEndpoints: EndpointStats[] = [
  {
    endpoint: '/api/projects',
    method: 'GET',
    requests: 456789,
    avg_response_time: 123,
    success_rate: 99.2,
    errors: 3654,
  },
  {
    endpoint: '/api/users',
    method: 'GET',
    requests: 234567,
    avg_response_time: 89,
    success_rate: 99.8,
    errors: 469,
  },
  {
    endpoint: '/api/files/upload',
    method: 'POST',
    requests: 189234,
    avg_response_time: 2341,
    success_rate: 94.7,
    errors: 10029,
  },
  {
    endpoint: '/api/auth/login',
    method: 'POST',
    requests: 167432,
    avg_response_time: 234,
    success_rate: 92.3,
    errors: 12892,
  },
  {
    endpoint: '/api/invoices',
    method: 'GET',
    requests: 145623,
    avg_response_time: 156,
    success_rate: 99.1,
    errors: 1311,
  },
];

const mockTimeSeriesData: TimeSeriesData[] = [
  { timestamp: '00:00', requests: 234, response_time: 145, errors: 12 },
  { timestamp: '01:00', requests: 189, response_time: 156, errors: 8 },
  { timestamp: '02:00', requests: 167, response_time: 134, errors: 5 },
  { timestamp: '03:00', requests: 145, response_time: 123, errors: 3 },
  { timestamp: '04:00', requests: 178, response_time: 167, errors: 7 },
  { timestamp: '05:00', requests: 234, response_time: 145, errors: 9 },
  { timestamp: '06:00', requests: 345, response_time: 156, errors: 15 },
  { timestamp: '07:00', requests: 456, response_time: 134, errors: 23 },
  { timestamp: '08:00', requests: 567, response_time: 178, errors: 34 },
  { timestamp: '09:00', requests: 678, response_time: 189, errors: 45 },
  { timestamp: '10:00', requests: 789, response_time: 167, errors: 56 },
  { timestamp: '11:00', requests: 654, response_time: 145, errors: 41 },
  { timestamp: '12:00', requests: 723, response_time: 156, errors: 47 },
  { timestamp: '13:00', requests: 812, response_time: 178, errors: 52 },
  { timestamp: '14:00', requests: 891, response_time: 189, errors: 58 },
  { timestamp: '15:00', requests: 756, response_time: 167, errors: 48 },
  { timestamp: '16:00', requests: 645, response_time: 145, errors: 39 },
  { timestamp: '17:00', requests: 534, response_time: 156, errors: 32 },
  { timestamp: '18:00', requests: 423, response_time: 134, errors: 25 },
  { timestamp: '19:00', requests: 345, response_time: 123, errors: 18 },
  { timestamp: '20:00', requests: 267, response_time: 145, errors: 12 },
  { timestamp: '21:00', requests: 234, response_time: 156, errors: 9 },
  { timestamp: '22:00', requests: 189, response_time: 134, errors: 7 },
  { timestamp: '23:00', requests: 156, response_time: 123, errors: 5 },
];

const statusCodeData = [
  { name: '2xx Success', value: 2781456, color: '#10B981' },
  { name: '4xx Client Error', value: 45234, color: '#F59E0B' },
  { name: '5xx Server Error', value: 20939, color: '#EF4444' },
];

const deviceTypeData = [
  { name: 'Desktop', value: 1654, color: '#6366F1' },
  { name: 'Mobile', value: 1234, color: '#8B5CF6' },
  { name: 'Tablet', value: 567, color: '#06B6D4' },
  { name: 'API Client', value: 2345, color: '#10B981' },
];

const COLORS = ['#6366F1', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

export default function APIAnalytics() {
  const [metrics] = useState<APIMetrics>(mockMetrics);
  const [endpoints] = useState<EndpointStats[]>(mockEndpoints);
  const [timeSeriesData] = useState<TimeSeriesData[]>(mockTimeSeriesData);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [realTimeMode, setRealTimeMode] = useState(false);

  const successRate = ((metrics.successful_requests / metrics.total_requests) * 100).toFixed(1);
  const errorRate = ((metrics.failed_requests / metrics.total_requests) * 100).toFixed(2);

  const getStatusColor = (rate: number) => {
    if (rate >= 99) return 'text-green-600';
    if (rate >= 95) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">API Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">
            Monitor API usage, performance metrics, and endpoint statistics.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <div className="flex space-x-3">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={realTimeMode}
                onChange={(e) => setRealTimeMode(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">Real-time</label>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Requests</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{formatNumber(metrics.total_requests)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className={cn('h-6 w-6', getStatusColor(parseFloat(successRate)))} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                  <dd className={cn('text-2xl font-semibold', getStatusColor(parseFloat(successRate)))}>
                    {successRate}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Response Time</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{metrics.average_response_time}ms</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ServerIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Requests/Min</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{metrics.requests_per_minute.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Request Volume Over Time */}
        <div className="bg-white p-6 rounded-lg shadow col-span-2">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Request Volume & Response Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Area 
                yAxisId="left" 
                type="monotone" 
                dataKey="requests" 
                stackId="1" 
                stroke="#6366F1" 
                fill="#6366F1" 
                fillOpacity={0.6}
                name="Requests"
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="response_time" 
                stroke="#EF4444" 
                strokeWidth={2}
                name="Avg Response Time (ms)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Code Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Status Code Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusCodeData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
              >
                {statusCodeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [formatNumber(value as number), 'Requests']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Device Type Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Client Device Types</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={deviceTypeData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
              >
                {deviceTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Requests']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Endpoints Table */}
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Top API Endpoints</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Performance metrics for most frequently accessed endpoints</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Response Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Errors
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {endpoints.map((endpoint, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {endpoint.endpoint}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                      endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                      endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    )}>
                      {endpoint.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(endpoint.requests)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {endpoint.avg_response_time}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      'text-sm font-medium',
                      getStatusColor(endpoint.success_rate)
                    )}>
                      {endpoint.success_rate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(endpoint.errors)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}