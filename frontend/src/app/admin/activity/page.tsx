'use client';

import { useState, useEffect } from 'react';
import {
  EyeIcon,
  UserIcon,
  DocumentIcon,
  CogIcon,
  ShieldCheckIcon,
  ClockIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { cn } from '@/utils/cn';

// Types
interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  description: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface ActivityStats {
  total_actions: number;
  unique_users: number;
  top_actions: { action: string; count: number }[];
  hourly_activity: { hour: string; count: number }[];
}

// Mock data - replace with real API calls
const mockActivityLogs: ActivityLog[] = [
  {
    id: '1',
    user_id: 'user-1',
    user_name: 'John Doe',
    user_email: 'john@example.com',
    action: 'user.login',
    resource_type: 'user',
    resource_id: 'user-1',
    description: 'User logged in successfully',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2024-01-21T14:30:00Z',
  },
  {
    id: '2',
    user_id: 'admin-1',
    user_name: 'Jane Admin',
    user_email: 'admin@example.com',
    action: 'user.create',
    resource_type: 'user',
    resource_id: 'user-5',
    description: 'Created new user account for Bob Wilson',
    ip_address: '10.0.0.5',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    created_at: '2024-01-21T14:25:00Z',
  },
  {
    id: '3',
    user_id: 'user-2',
    user_name: 'Alice Smith',
    user_email: 'alice@example.com',
    action: 'project.update',
    resource_type: 'project',
    resource_id: 'proj-123',
    description: 'Updated project status to "In Progress"',
    ip_address: '192.168.1.105',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2024-01-21T14:20:00Z',
  },
  {
    id: '4',
    user_id: 'admin-1',
    user_name: 'Jane Admin',
    user_email: 'admin@example.com',
    action: 'config.update',
    resource_type: 'system',
    resource_id: null,
    description: 'Updated email configuration settings',
    ip_address: '10.0.0.5',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    created_at: '2024-01-21T14:15:00Z',
  },
  {
    id: '5',
    user_id: 'user-3',
    user_name: 'Bob Wilson',
    user_email: 'bob@example.com',
    action: 'file.upload',
    resource_type: 'file',
    resource_id: 'file-789',
    description: 'Uploaded file: project-requirements.pdf',
    ip_address: '192.168.1.110',
    user_agent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
    created_at: '2024-01-21T14:10:00Z',
  },
];

const mockStats: ActivityStats = {
  total_actions: 1247,
  unique_users: 89,
  top_actions: [
    { action: 'user.login', count: 342 },
    { action: 'project.view', count: 234 },
    { action: 'file.download', count: 187 },
    { action: 'user.update', count: 156 },
    { action: 'project.update', count: 134 },
  ],
  hourly_activity: [
    { hour: '00', count: 12 },
    { hour: '01', count: 8 },
    { hour: '02', count: 5 },
    { hour: '03', count: 3 },
    { hour: '04', count: 7 },
    { hour: '05', count: 15 },
    { hour: '06', count: 28 },
    { hour: '07', count: 45 },
    { hour: '08', count: 67 },
    { hour: '09', count: 89 },
    { hour: '10', count: 94 },
    { hour: '11', count: 76 },
    { hour: '12', count: 82 },
    { hour: '13', count: 91 },
    { hour: '14', count: 98 },
    { hour: '15', count: 87 },
    { hour: '16', count: 73 },
    { hour: '17', count: 56 },
    { hour: '18', count: 34 },
    { hour: '19', count: 28 },
    { hour: '20', count: 19 },
    { hour: '21', count: 15 },
    { hour: '22', count: 11 },
    { hour: '23', count: 8 },
  ],
};

const actionIcons: Record<string, any> = {
  'user.login': UserIcon,
  'user.logout': UserIcon,
  'user.create': UserIcon,
  'user.update': UserIcon,
  'user.delete': UserIcon,
  'project.create': DocumentIcon,
  'project.update': DocumentIcon,
  'project.view': EyeIcon,
  'project.delete': DocumentIcon,
  'file.upload': DocumentIcon,
  'file.download': DocumentIcon,
  'file.delete': DocumentIcon,
  'config.update': CogIcon,
  'role.update': ShieldCheckIcon,
  default: ClockIcon,
};

const actionColors: Record<string, string> = {
  'user.login': 'text-green-600 bg-green-100',
  'user.logout': 'text-gray-600 bg-gray-100',
  'user.create': 'text-blue-600 bg-blue-100',
  'user.update': 'text-yellow-600 bg-yellow-100',
  'user.delete': 'text-red-600 bg-red-100',
  'project.create': 'text-green-600 bg-green-100',
  'project.update': 'text-blue-600 bg-blue-100',
  'project.view': 'text-gray-600 bg-gray-100',
  'project.delete': 'text-red-600 bg-red-100',
  'file.upload': 'text-green-600 bg-green-100',
  'file.download': 'text-blue-600 bg-blue-100',
  'file.delete': 'text-red-600 bg-red-100',
  'config.update': 'text-purple-600 bg-purple-100',
  'role.update': 'text-indigo-600 bg-indigo-100',
  default: 'text-gray-600 bg-gray-100',
};

export default function ActivityMonitor() {
  const [activities, setActivities] = useState<ActivityLog[]>(mockActivityLogs);
  const [stats] = useState<ActivityStats>(mockStats);
  const [filter, setFilter] = useState({
    user: '',
    action: '',
    resource_type: '',
    date_from: '',
    date_to: '',
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Auto refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // Simulate fetching new data
        console.log('Refreshing activity data...');
      }, 10000); // Refresh every 10 seconds
      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  const handleRefresh = () => {
    // Simulate data refresh
    console.log('Manually refreshing data...');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionIcon = (action: string) => {
    return actionIcons[action] || actionIcons.default;
  };

  const getActionColor = (action: string) => {
    return actionColors[action] || actionColors.default;
  };

  const filteredActivities = activities.filter(activity => {
    if (filter.user && !activity.user_name.toLowerCase().includes(filter.user.toLowerCase()) && !activity.user_email.toLowerCase().includes(filter.user.toLowerCase())) {
      return false;
    }
    if (filter.action && !activity.action.includes(filter.action)) {
      return false;
    }
    if (filter.resource_type && activity.resource_type !== filter.resource_type) {
      return false;
    }
    // Add date filtering logic here
    return true;
  });

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Activity Monitor</h1>
          <p className="mt-2 text-sm text-gray-700">
            Monitor user activities and system events in real-time.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <div className="flex space-x-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">Auto-refresh</label>
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Actions</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total_actions.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.unique_users}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <EyeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Most Common Action</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.top_actions[0]?.action}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hourly Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Activity by Hour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.hourly_activity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#6366F1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Actions</h3>
          <div className="space-y-4">
            {stats.top_actions.map((item, index) => (
              <div key={item.action} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center mr-3">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-700">{item.action}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <FunnelIcon className="h-5 w-5 mr-2" />
          Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <input
              type="text"
              value={filter.user}
              onChange={(e) => setFilter({...filter, user: e.target.value})}
              placeholder="Search by name or email"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filter.action}
              onChange={(e) => setFilter({...filter, action: e.target.value})}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All actions</option>
              <option value="user">User actions</option>
              <option value="project">Project actions</option>
              <option value="file">File actions</option>
              <option value="config">Config actions</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
            <select
              value={filter.resource_type}
              onChange={(e) => setFilter({...filter, resource_type: e.target.value})}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All types</option>
              <option value="user">User</option>
              <option value="project">Project</option>
              <option value="file">File</option>
              <option value="system">System</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <input
              type="date"
              value={filter.date_from}
              onChange={(e) => setFilter({...filter, date_from: e.target.value})}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Latest system activities and user actions</p>
        </div>
        <ul className="divide-y divide-gray-200">
          {filteredActivities.map((activity) => {
            const ActionIcon = getActionIcon(activity.action);
            const actionColor = getActionColor(activity.action);
            
            return (
              <li key={activity.id} className="px-4 py-4 hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className={cn('flex-shrink-0 rounded-full p-2', actionColor)}>
                    <ActionIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.user_name} 
                        <span className="text-gray-500">({activity.user_email})</span>
                      </p>
                      <div className="flex items-center text-sm text-gray-500">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {formatDate(activity.created_at)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center">
                        <ComputerDesktopIcon className="h-3 w-3 mr-1" />
                        {activity.ip_address}
                      </div>
                      <div className="flex items-center">
                        <GlobeAltIcon className="h-3 w-3 mr-1" />
                        {activity.user_agent.split(' ')[0]}
                      </div>
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        {activity.action}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}