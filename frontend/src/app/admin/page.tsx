'use client';

import { useState, useEffect } from 'react';
import {
  UsersIcon,
  BanknotesIcon,
  TicketIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

// Mock data - replace with real API calls
const stats = [
  { name: 'Total Users', value: '2,847', change: '+12%', changeType: 'increase', icon: UsersIcon },
  { name: 'Revenue', value: '$45,231', change: '+8.2%', changeType: 'increase', icon: BanknotesIcon },
  { name: 'Support Tickets', value: '23', change: '-5%', changeType: 'decrease', icon: TicketIcon },
  { name: 'API Requests', value: '1.2M', change: '+23%', changeType: 'increase', icon: ChartBarIcon },
];

const revenueData = [
  { name: 'Jan', value: 32000 },
  { name: 'Feb', value: 42000 },
  { name: 'Mar', value: 38000 },
  { name: 'Apr', value: 45000 },
  { name: 'May', value: 48000 },
  { name: 'Jun', value: 52000 },
];

const userActivityData = [
  { name: 'Mon', active: 234, inactive: 45 },
  { name: 'Tue', active: 256, inactive: 32 },
  { name: 'Wed', active: 298, inactive: 28 },
  { name: 'Thu', active: 267, inactive: 41 },
  { name: 'Fri', active: 289, inactive: 35 },
  { name: 'Sat', active: 198, inactive: 52 },
  { name: 'Sun', active: 167, inactive: 68 },
];

const systemHealth = [
  { name: 'API Server', status: 'healthy', uptime: '99.9%' },
  { name: 'Database', status: 'healthy', uptime: '99.8%' },
  { name: 'File Storage', status: 'warning', uptime: '98.5%' },
  { name: 'Email Service', status: 'healthy', uptime: '99.7%' },
];

const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

export default function AdminDashboard() {
  const [systemAlerts] = useState([
    { id: 1, type: 'warning', message: 'High CPU usage on server-02', time: '5 minutes ago' },
    { id: 2, type: 'info', message: 'Database backup completed successfully', time: '2 hours ago' },
    { id: 3, type: 'error', message: 'Failed email delivery to 3 recipients', time: '4 hours ago' },
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">System overview and key metrics</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* User Activity Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userActivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="active" fill="#10B981" name="Active" />
              <Bar dataKey="inactive" fill="#6B7280" name="Inactive" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Health & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Health */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">System Health</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {systemHealth.map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      service.status === 'healthy' ? 'bg-green-400' :
                      service.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                    }`} />
                    <span className="text-sm font-medium text-gray-900">{service.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{service.uptime}</span>
                    {service.status === 'healthy' ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Alerts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {systemAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start">
                  <div className={`w-3 h-3 rounded-full mt-1 mr-3 ${
                    alert.type === 'error' ? 'bg-red-400' :
                    alert.type === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}