'use client';

import React from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { DashboardChart } from '@/components/dashboard/DashboardChart';
import { 
  UserGroupIcon, 
  UserIcon, 
  ChartBarIcon, 
  FolderIcon,
  CurrencyDollarIcon,
  TrendingUpIcon
} from '@heroicons/react/24/outline';

// Mock data - replace with real API calls
const stats = [
  {
    title: 'Total Contacts',
    value: 2847,
    icon: <UserIcon />,
    change: { value: 12, type: 'increase' as const },
  },
  {
    title: 'Active Leads',
    value: 324,
    icon: <UserGroupIcon />,
    change: { value: 8, type: 'increase' as const },
  },
  {
    title: 'Open Deals',
    value: 156,
    icon: <ChartBarIcon />,
    change: { value: 3, type: 'decrease' as const },
  },
  {
    title: 'Active Projects',
    value: 42,
    icon: <FolderIcon />,
    change: { value: 15, type: 'increase' as const },
  },
  {
    title: 'Revenue',
    value: 485720,
    icon: <CurrencyDollarIcon />,
    format: 'currency' as const,
    change: { value: 22, type: 'increase' as const },
  },
  {
    title: 'Conversion Rate',
    value: 24.5,
    icon: <TrendingUpIcon />,
    format: 'percentage' as const,
    change: { value: 5, type: 'increase' as const },
  },
];

const salesData = [
  { name: 'Jan', value: 45000 },
  { name: 'Feb', value: 52000 },
  { name: 'Mar', value: 48000 },
  { name: 'Apr', value: 61000 },
  { name: 'May', value: 55000 },
  { name: 'Jun', value: 67000 },
];

const leadSourceData = [
  { name: 'Website', value: 35 },
  { name: 'Social Media', value: 28 },
  { name: 'Email Campaign', value: 20 },
  { name: 'Referrals', value: 17 },
];

const dealStageData = [
  { name: 'Prospect', value: 45 },
  { name: 'Qualified', value: 32 },
  { name: 'Proposal', value: 28 },
  { name: 'Negotiation', value: 18 },
  { name: 'Closed Won', value: 12 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Get an overview of your CRM performance and key metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            change={stat.change}
            format={stat.format}
          />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <DashboardChart
          title="Sales Revenue Trend"
          data={salesData}
          type="area"
          color="#3B82F6"
        />
        
        <DashboardChart
          title="Lead Sources"
          data={leadSourceData}
          type="pie"
        />
        
        <DashboardChart
          title="Deal Pipeline"
          data={dealStageData}
          type="bar"
          color="#10B981"
        />
        
        <DashboardChart
          title="Monthly Performance"
          data={salesData}
          type="line"
          color="#8B5CF6"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Activity
          </h3>
          <div className="mt-5">
            <div className="flow-root">
              <ul className="-mb-8">
                {[
                  {
                    id: 1,
                    content: 'New lead created: John Smith from TechCorp',
                    time: '2 hours ago',
                    type: 'lead',
                  },
                  {
                    id: 2,
                    content: 'Deal moved to negotiation stage: $45,000 deal with Acme Inc',
                    time: '4 hours ago',
                    type: 'deal',
                  },
                  {
                    id: 3,
                    content: 'Contact updated: Jane Doe contact information',
                    time: '6 hours ago',
                    type: 'contact',
                  },
                  {
                    id: 4,
                    content: 'Project completed: Website redesign for ClientCorp',
                    time: '1 day ago',
                    type: 'project',
                  },
                ].map((item, itemIdx) => (
                  <li key={item.id}>
                    <div className="relative pb-8">
                      {itemIdx !== 3 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                            <UserIcon className="w-5 h-5 text-white" aria-hidden="true" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">{item.content}</p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            {item.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}