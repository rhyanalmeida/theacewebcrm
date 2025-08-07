'use client';

import { useState, useEffect } from 'react';
import {
  BanknotesIcon,
  CreditCardIcon,
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/utils/cn';

// Types
interface Subscription {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  plan_name: string;
  plan_price: number;
  billing_cycle: 'monthly' | 'yearly';
  status: 'active' | 'canceled' | 'past_due' | 'trial';
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  canceled_at?: string;
}

interface Invoice {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  invoice_number: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'canceled';
  due_date: string;
  paid_date?: string;
  created_at: string;
}

interface BillingStats {
  total_revenue: number;
  monthly_recurring_revenue: number;
  active_subscriptions: number;
  churn_rate: number;
  conversion_rate: number;
}

// Mock data
const mockSubscriptions: Subscription[] = [
  {
    id: 'sub_1',
    user_id: 'user_1',
    user_name: 'John Doe',
    user_email: 'john@acme.com',
    plan_name: 'Pro Plan',
    plan_price: 99,
    billing_cycle: 'monthly',
    status: 'active',
    current_period_start: '2024-01-01T00:00:00Z',
    current_period_end: '2024-02-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'sub_2',
    user_id: 'user_2',
    user_name: 'Jane Smith',
    user_email: 'jane@techcorp.com',
    plan_name: 'Enterprise',
    plan_price: 299,
    billing_cycle: 'monthly',
    status: 'active',
    current_period_start: '2024-01-15T00:00:00Z',
    current_period_end: '2024-02-15T00:00:00Z',
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'sub_3',
    user_id: 'user_3',
    user_name: 'Bob Wilson',
    user_email: 'bob@startup.io',
    plan_name: 'Starter',
    plan_price: 29,
    billing_cycle: 'monthly',
    status: 'past_due',
    current_period_start: '2024-01-10T00:00:00Z',
    current_period_end: '2024-02-10T00:00:00Z',
    created_at: '2024-01-10T00:00:00Z',
  },
];

const mockInvoices: Invoice[] = [
  {
    id: 'inv_1',
    user_id: 'user_1',
    user_name: 'John Doe',
    user_email: 'john@acme.com',
    invoice_number: 'INV-2024-001',
    amount: 99,
    status: 'paid',
    due_date: '2024-02-01T00:00:00Z',
    paid_date: '2024-01-28T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'inv_2',
    user_id: 'user_2',
    user_name: 'Jane Smith',
    user_email: 'jane@techcorp.com',
    invoice_number: 'INV-2024-002',
    amount: 299,
    status: 'paid',
    due_date: '2024-02-15T00:00:00Z',
    paid_date: '2024-02-10T00:00:00Z',
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'inv_3',
    user_id: 'user_3',
    user_name: 'Bob Wilson',
    user_email: 'bob@startup.io',
    invoice_number: 'INV-2024-003',
    amount: 29,
    status: 'failed',
    due_date: '2024-02-10T00:00:00Z',
    created_at: '2024-01-10T00:00:00Z',
  },
];

const mockBillingStats: BillingStats = {
  total_revenue: 145680,
  monthly_recurring_revenue: 12890,
  active_subscriptions: 156,
  churn_rate: 3.2,
  conversion_rate: 12.8,
};

const revenueData = [
  { month: 'Jan', revenue: 8500, subscriptions: 85 },
  { month: 'Feb', revenue: 9200, subscriptions: 92 },
  { month: 'Mar', revenue: 10100, subscriptions: 101 },
  { month: 'Apr', revenue: 11300, subscriptions: 113 },
  { month: 'May', revenue: 12100, subscriptions: 121 },
  { month: 'Jun', revenue: 12890, subscriptions: 156 },
];

const planDistribution = [
  { name: 'Starter', value: 45, color: '#10B981' },
  { name: 'Pro', value: 78, color: '#6366F1' },
  { name: 'Enterprise', value: 33, color: '#8B5CF6' },
];

const statusColors = {
  active: 'bg-green-100 text-green-800',
  canceled: 'bg-gray-100 text-gray-800',
  past_due: 'bg-red-100 text-red-800',
  trial: 'bg-yellow-100 text-yellow-800',
};

const invoiceStatusColors = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  canceled: 'bg-gray-100 text-gray-800',
};

export default function BillingManagement() {
  const [subscriptions] = useState<Subscription[]>(mockSubscriptions);
  const [invoices] = useState<Invoice[]>(mockInvoices);
  const [stats] = useState<BillingStats>(mockBillingStats);
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'invoices'>('subscriptions');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.plan_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleExportData = (type: 'subscriptions' | 'invoices') => {
    // Simulate data export
    alert(`Exporting ${type} data...`);
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscriptions</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage subscriptions, invoices, and billing analytics.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={() => handleExportData(activeTab)}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BanknotesIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.total_revenue)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">MRR</dt>
                  <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.monthly_recurring_revenue)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Subs</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.active_subscriptions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Churn Rate</dt>
                  <dd className="text-lg font-medium text-red-600">{stats.churn_rate}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Conversion</dt>
                  <dd className="text-lg font-medium text-green-600">{stats.conversion_rate}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue & Subscriptions Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2} name="Revenue ($)" />
              <Line yAxisId="right" type="monotone" dataKey="subscriptions" stroke="#10B981" strokeWidth={2} name="Subscriptions" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Plan Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={planDistribution}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
              >
                {planDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={cn(
                'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === 'subscriptions'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              Subscriptions ({subscriptions.length})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={cn(
                'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === 'invoices'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              Invoices ({invoices.length})
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400 pl-3" />
              <input
                type="text"
                className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              <option value="all">All Status</option>
              {activeTab === 'subscriptions' && (
                <>
                  <option value="active">Active</option>
                  <option value="canceled">Canceled</option>
                  <option value="past_due">Past Due</option>
                  <option value="trial">Trial</option>
                </>
              )}
              {activeTab === 'invoices' && (
                <>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="canceled">Canceled</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6">
          {activeTab === 'subscriptions' && (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Current Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubscriptions.map((subscription) => (
                    <tr key={subscription.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{subscription.user_name}</div>
                          <div className="text-sm text-gray-500">{subscription.user_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subscription.plan_name}
                        <div className="text-xs text-gray-500">{subscription.billing_cycle}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          statusColors[subscription.status]
                        )}>
                          {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(subscription.plan_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{invoice.user_name}</div>
                          <div className="text-sm text-gray-500">{invoice.user_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          invoiceStatusColors[invoice.status]
                        )}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.due_date)}
                        {invoice.paid_date && (
                          <div className="text-xs text-green-600">Paid: {formatDate(invoice.paid_date)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}