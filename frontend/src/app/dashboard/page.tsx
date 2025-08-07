'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import {
  UsersIcon,
  UserPlusIcon,
  CurrencyDollarIcon,
  FolderIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowUpIcon,
} from '@heroicons/react/24/outline';
import { useCrmStore } from '@/store/crmStore';

// Sample data - in production this would come from API
const statsData = {
  totalContacts: 1245,
  totalLeads: 89,
  totalDeals: 45,
  totalProjects: 12,
  monthlyRevenue: 125400,
  conversionRate: 23.5,
  dealsValue: 450000,
  activeProjects: 8,
};

const revenueData = [
  { month: 'Jan', revenue: 85000 },
  { month: 'Feb', revenue: 92000 },
  { month: 'Mar', revenue: 78000 },
  { month: 'Apr', revenue: 105000 },
  { month: 'May', revenue: 118000 },
  { month: 'Jun', revenue: 125400 },
];

const leadSourceData = [
  { name: 'Website', value: 35, color: '#3B82F6' },
  { name: 'Referral', value: 25, color: '#10B981' },
  { name: 'Social Media', value: 20, color: '#F59E0B' },
  { name: 'Email', value: 15, color: '#EF4444' },
  { name: 'Other', value: 5, color: '#6B7280' },
];

const dealStageData = [
  { stage: 'Prospect', count: 12 },
  { stage: 'Qualification', count: 8 },
  { stage: 'Proposal', count: 15 },
  { stage: 'Negotiation', count: 6 },
  { stage: 'Closed Won', count: 4 },
];

const recentActivities = [
  {
    id: 1,
    type: 'deal',
    message: 'New deal "Enterprise Solution" created for $45,000',
    time: '2 hours ago',
    user: 'John Doe',
  },
  {
    id: 2,
    type: 'lead',
    message: 'Lead "Sarah Johnson" converted to contact',
    time: '4 hours ago',
    user: 'Jane Smith',
  },
  {
    id: 3,
    type: 'contact',
    message: 'Meeting scheduled with "Tech Corp" for next week',
    time: '6 hours ago',
    user: 'Mike Wilson',
  },
  {
    id: 4,
    type: 'project',
    message: 'Project "CRM Integration" marked as completed',
    time: '1 day ago',
    user: 'Sarah Davis',
  },
];

export default function DashboardPage() {
  const { stats, setStats, setStatsLoading } = useCrmStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    const loadDashboardData = async () => {
      setStatsLoading(true);
      
      // In production, this would be an API call
      setTimeout(() => {
        setStats(statsData);
        setStatsLoading(false);
        setLoading(false);
      }, 1000);
    };

    loadDashboardData();
  }, [setStats, setStatsLoading]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Contacts',
      value: statsData.totalContacts.toLocaleString(),
      icon: UsersIcon,
      change: '+12%',
      changeType: 'positive' as const,
      color: 'blue',
    },
    {
      title: 'Active Leads',
      value: statsData.totalLeads.toLocaleString(),
      icon: UserPlusIcon,
      change: '+8%',
      changeType: 'positive' as const,
      color: 'green',
    },
    {
      title: 'Deals Value',
      value: `$${(statsData.dealsValue / 1000).toFixed(0)}K`,
      icon: CurrencyDollarIcon,
      change: '+23%',
      changeType: 'positive' as const,
      color: 'yellow',
    },
    {
      title: 'Active Projects',
      value: statsData.activeProjects.toLocaleString(),
      icon: FolderIcon,
      change: '-2%',
      changeType: 'negative' as const,
      color: 'purple',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your CRM.</p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <div className="flex items-center mt-1">
                    {stat.changeType === 'positive' ? (
                      <TrendingUpIcon className="h-4 w-4 text-green-600 mr-1" />
                    ) : (
                      <TrendingDownIcon className="h-4 w-4 text-red-600 mr-1" />
                    )}
                    <span className={`text-sm ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">from last month</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Monthly Revenue</span>
              <Badge variant="success">+18.5%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadSourceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {leadSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deal Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle>Deal Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dealStageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <ArrowUpIcon className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">
                      {activity.time} • by {activity.user}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}