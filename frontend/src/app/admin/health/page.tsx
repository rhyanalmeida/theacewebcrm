'use client';

import { useState, useEffect } from 'react';
import {
  HeartIcon,
  ServerIcon,
  DatabaseIcon,
  CloudIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CpuChipIcon,
  CircleStackIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { cn } from '@/utils/cn';

// Types
interface ServiceHealth {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  uptime: number;
  response_time: number;
  last_check: string;
  description: string;
  icon: any;
  metrics?: {
    cpu_usage?: number;
    memory_usage?: number;
    disk_usage?: number;
    connections?: number;
  };
}

interface SystemMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  service: string;
  timestamp: string;
  resolved: boolean;
}

// Mock data
const mockServices: ServiceHealth[] = [
  {
    id: 'api',
    name: 'API Server',
    status: 'healthy',
    uptime: 99.9,
    response_time: 123,
    last_check: '2024-01-21T14:55:00Z',
    description: 'Main application API',
    icon: ServerIcon,
    metrics: {
      cpu_usage: 45,
      memory_usage: 67,
      connections: 234,
    },
  },
  {
    id: 'database',
    name: 'Database',
    status: 'healthy',
    uptime: 99.8,
    response_time: 45,
    last_check: '2024-01-21T14:54:30Z',
    description: 'PostgreSQL primary database',
    icon: DatabaseIcon,
    metrics: {
      cpu_usage: 23,
      memory_usage: 78,
      disk_usage: 45,
      connections: 67,
    },
  },
  {
    id: 'storage',
    name: 'File Storage',
    status: 'warning',
    uptime: 98.5,
    response_time: 234,
    last_check: '2024-01-21T14:54:00Z',
    description: 'Supabase storage service',
    icon: CloudIcon,
    metrics: {
      disk_usage: 89,
    },
  },
  {
    id: 'email',
    name: 'Email Service',
    status: 'healthy',
    uptime: 99.7,
    response_time: 567,
    last_check: '2024-01-21T14:53:45Z',
    description: 'SMTP email delivery',
    icon: ShieldCheckIcon,
  },
  {
    id: 'auth',
    name: 'Authentication',
    status: 'healthy',
    uptime: 99.9,
    response_time: 89,
    last_check: '2024-01-21T14:55:15Z',
    description: 'Supabase Auth service',
    icon: ShieldCheckIcon,
  },
  {
    id: 'cdn',
    name: 'CDN',
    status: 'critical',
    uptime: 95.2,
    response_time: 1234,
    last_check: '2024-01-21T14:52:00Z',
    description: 'Content delivery network',
    icon: WifiIcon,
  },
];

const mockMetrics: SystemMetrics[] = [
  { timestamp: '14:30', cpu: 45, memory: 67, disk: 34, network: 23 },
  { timestamp: '14:35', cpu: 52, memory: 69, disk: 34, network: 45 },
  { timestamp: '14:40', cpu: 48, memory: 71, disk: 35, network: 67 },
  { timestamp: '14:45', cpu: 41, memory: 68, disk: 35, network: 34 },
  { timestamp: '14:50', cpu: 39, memory: 66, disk: 36, network: 56 },
  { timestamp: '14:55', cpu: 43, memory: 70, disk: 36, network: 78 },
];

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'error',
    message: 'CDN response time exceeded 1000ms threshold',
    service: 'CDN',
    timestamp: '2024-01-21T14:52:00Z',
    resolved: false,
  },
  {
    id: '2',
    type: 'warning',
    message: 'File storage disk usage above 85%',
    service: 'File Storage',
    timestamp: '2024-01-21T14:45:00Z',
    resolved: false,
  },
  {
    id: '3',
    type: 'info',
    message: 'Database backup completed successfully',
    service: 'Database',
    timestamp: '2024-01-21T14:00:00Z',
    resolved: true,
  },
  {
    id: '4',
    type: 'warning',
    message: 'API server CPU usage spiked to 95%',
    service: 'API Server',
    timestamp: '2024-01-21T13:30:00Z',
    resolved: true,
  },
];

const statusColors = {
  healthy: 'text-green-600 bg-green-100',
  warning: 'text-yellow-600 bg-yellow-100',
  critical: 'text-red-600 bg-red-100',
  unknown: 'text-gray-600 bg-gray-100',
};

const statusIcons = {
  healthy: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  critical: XCircleIcon,
  unknown: ClockIcon,
};

const alertTypeColors = {
  info: 'text-blue-600 bg-blue-100',
  warning: 'text-yellow-600 bg-yellow-100',
  error: 'text-red-600 bg-red-100',
};

export default function SystemHealthMonitor() {
  const [services] = useState<ServiceHealth[]>(mockServices);
  const [metrics] = useState<SystemMetrics[]>(mockMetrics);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Auto refresh simulation
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setLastUpdated(new Date());
      // In a real app, this would refresh the data
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getOverallHealth = () => {
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const warningCount = services.filter(s => s.status === 'warning').length;
    const criticalCount = services.filter(s => s.status === 'critical').length;

    if (criticalCount > 0) return 'critical';
    if (warningCount > 0) return 'warning';
    return 'healthy';
  };

  const handleResolveAlert = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  };

  const handleRunHealthCheck = () => {
    alert('Running comprehensive health check...');
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const overallHealth = getOverallHealth();
  const OverallStatusIcon = statusIcons[overallHealth];

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">System Health Monitor</h1>
          <p className="mt-2 text-sm text-gray-700">
            Monitor system services, performance metrics, and alerts.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">Auto-refresh</label>
            </div>
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
            <button
              onClick={handleRunHealthCheck}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              <HeartIcon className="h-4 w-4 mr-2" />
              Run Health Check
            </button>
          </div>
        </div>
      </div>

      {/* Overall Status */}
      <div className="mt-8">
        <div className={cn(
          'rounded-lg p-6 flex items-center justify-center',
          statusColors[overallHealth]
        )}>
          <OverallStatusIcon className="h-8 w-8 mr-3" />
          <div>
            <h2 className="text-xl font-semibold">
              System Status: {overallHealth.charAt(0).toUpperCase() + overallHealth.slice(1)}
            </h2>
            <p className="text-sm mt-1">
              {services.filter(s => s.status === 'healthy').length} of {services.length} services operational
            </p>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => {
          const StatusIcon = statusIcons[service.status];
          const ServiceIcon = service.icon;
          
          return (
            <div key={service.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ServiceIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">{service.name}</h3>
                      <div className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        statusColors[service.status]
                      )}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {service.status}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Uptime:</span>
                    <span className="ml-1 font-medium">{service.uptime}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Response:</span>
                    <span className="ml-1 font-medium">{service.response_time}ms</span>
                  </div>
                </div>

                {service.metrics && (
                  <div className="mt-4 space-y-2">
                    {service.metrics.cpu_usage && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center">
                          <CpuChipIcon className="h-4 w-4 mr-1" />
                          CPU
                        </span>
                        <span className="font-medium">{service.metrics.cpu_usage}%</span>
                      </div>
                    )}
                    {service.metrics.memory_usage && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center">
                          <CircleStackIcon className="h-4 w-4 mr-1" />
                          Memory
                        </span>
                        <span className="font-medium">{service.metrics.memory_usage}%</span>
                      </div>
                    )}
                    {service.metrics.disk_usage && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center">
                          <DatabaseIcon className="h-4 w-4 mr-1" />
                          Disk
                        </span>
                        <span className={cn(
                          'font-medium',
                          service.metrics.disk_usage > 85 ? 'text-red-600' : ''
                        )}>
                          {service.metrics.disk_usage}%
                        </span>
                      </div>
                    )}
                    {service.metrics.connections && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Connections:</span>
                        <span className="font-medium">{service.metrics.connections}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-400">
                  Last checked: {formatTimestamp(service.last_check)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Metrics Chart */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Performance (Last 30 minutes)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={metrics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip formatter={(value: number, name: string) => [`${value}%`, name.toUpperCase()]} />
            <Area type="monotone" dataKey="cpu" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} name="cpu" />
            <Area type="monotone" dataKey="memory" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} name="memory" />
            <Area type="monotone" dataKey="network" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="network" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Alerts */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Active Alerts</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {alerts.filter(a => !a.resolved).length} active alerts
            </p>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {alerts.filter(alert => !alert.resolved).map((alert) => (
                <li key={alert.id} className="px-4 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        alertTypeColors[alert.type]
                      )}>
                        {alert.type}
                      </span>
                      <div>
                        <p className="text-sm text-gray-900">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {alert.service} • {formatTimestamp(alert.timestamp)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="text-sm text-indigo-600 hover:text-indigo-900"
                    >
                      Resolve
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Events</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Last 10 system events</p>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {alerts.slice(-5).reverse().map((alert) => (
                <li key={alert.id} className="px-4 py-4">
                  <div className="flex items-start space-x-3">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      alert.resolved ? 'bg-gray-100 text-gray-600' : alertTypeColors[alert.type]
                    )}>
                      {alert.resolved ? 'resolved' : alert.type}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.service} • {formatTimestamp(alert.timestamp)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}