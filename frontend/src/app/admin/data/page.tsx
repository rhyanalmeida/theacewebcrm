'use client';

import { useState, useEffect } from 'react';
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  DocumentTextIcon,
  UsersIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

// Types
interface DataExport {
  id: string;
  name: string;
  type: 'users' | 'projects' | 'invoices' | 'files' | 'full_backup';
  format: 'csv' | 'json' | 'sql';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_size?: number;
  download_url?: string;
  created_at: string;
  expires_at: string;
  created_by: string;
}

interface DataImport {
  id: string;
  name: string;
  type: 'users' | 'projects' | 'invoices';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_size: number;
  records_total?: number;
  records_processed?: number;
  records_success?: number;
  records_failed?: number;
  error_message?: string;
  created_at: string;
  created_by: string;
}

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'users' | 'projects' | 'invoices' | 'files';
  fields: string[];
  filters: Record<string, any>;
}

// Mock data
const mockExports: DataExport[] = [
  {
    id: '1',
    name: 'All Users Export',
    type: 'users',
    format: 'csv',
    status: 'completed',
    file_size: 245760,
    download_url: '/exports/users-2024-01-21.csv',
    created_at: '2024-01-21T14:30:00Z',
    expires_at: '2024-01-28T14:30:00Z',
    created_by: 'admin@example.com',
  },
  {
    id: '2',
    name: 'Project Data Backup',
    type: 'projects',
    format: 'json',
    status: 'processing',
    created_at: '2024-01-21T15:00:00Z',
    expires_at: '2024-01-28T15:00:00Z',
    created_by: 'admin@example.com',
  },
  {
    id: '3',
    name: 'Invoice Export Q1',
    type: 'invoices',
    format: 'csv',
    status: 'failed',
    created_at: '2024-01-21T13:45:00Z',
    expires_at: '2024-01-28T13:45:00Z',
    created_by: 'manager@example.com',
  },
];

const mockImports: DataImport[] = [
  {
    id: '1',
    name: 'Customer Import - Jan 2024',
    type: 'users',
    status: 'completed',
    file_size: 156780,
    records_total: 234,
    records_processed: 234,
    records_success: 230,
    records_failed: 4,
    created_at: '2024-01-20T10:30:00Z',
    created_by: 'admin@example.com',
  },
  {
    id: '2',
    name: 'Project Migration',
    type: 'projects',
    status: 'processing',
    file_size: 892340,
    records_total: 89,
    records_processed: 45,
    records_success: 43,
    records_failed: 2,
    created_at: '2024-01-21T14:15:00Z',
    created_by: 'admin@example.com',
  },
  {
    id: '3',
    name: 'Legacy Invoice Data',
    type: 'invoices',
    status: 'failed',
    file_size: 445670,
    records_total: 567,
    records_processed: 234,
    records_success: 180,
    records_failed: 54,
    error_message: 'Invalid date format in row 235',
    created_at: '2024-01-21T11:20:00Z',
    created_by: 'manager@example.com',
  },
];

const mockTemplates: ExportTemplate[] = [
  {
    id: '1',
    name: 'Basic User Export',
    description: 'Export user information with contact details',
    type: 'users',
    fields: ['id', 'email', 'full_name', 'company_name', 'created_at'],
    filters: { status: 'active' },
  },
  {
    id: '2',
    name: 'Active Projects Report',
    description: 'All active projects with client information',
    type: 'projects',
    fields: ['id', 'name', 'client_name', 'status', 'progress', 'start_date', 'budget'],
    filters: { status: ['in-progress', 'planning'] },
  },
  {
    id: '3',
    name: 'Monthly Invoice Summary',
    description: 'Invoice data for monthly reporting',
    type: 'invoices',
    fields: ['invoice_number', 'client_name', 'amount', 'status', 'due_date', 'paid_date'],
    filters: { created_at: { from: '2024-01-01', to: '2024-01-31' } },
  },
];

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const statusIcons = {
  pending: ClockIcon,
  processing: ClockIcon,
  completed: CheckCircleIcon,
  failed: XCircleIcon,
};

const typeIcons = {
  users: UsersIcon,
  projects: FolderIcon,
  invoices: DocumentTextIcon,
  files: DocumentTextIcon,
  full_backup: DocumentTextIcon,
};

export default function DataExportImport() {
  const [exports] = useState<DataExport[]>(mockExports);
  const [imports] = useState<DataImport[]>(mockImports);
  const [templates] = useState<ExportTemplate[]>(mockTemplates);
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'templates'>('export');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [exportForm, setExportForm] = useState({
    name: '',
    type: 'users' as DataExport['type'],
    format: 'csv' as DataExport['format'],
    template_id: '',
  });

  const [importForm, setImportForm] = useState({
    name: '',
    type: 'users' as DataImport['type'],
    file: null as File | null,
  });

  const handleExport = () => {
    console.log('Starting export:', exportForm);
    // Simulate export creation
    alert(`Export "${exportForm.name}" started successfully!`);
    setShowExportModal(false);
  };

  const handleImport = () => {
    if (!importForm.file) {
      alert('Please select a file to import');
      return;
    }
    console.log('Starting import:', importForm);
    alert(`Import "${importForm.name}" started successfully!`);
    setShowImportModal(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportForm({
        ...importForm,
        file,
        name: importForm.name || `Import ${file.name}`,
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setImportForm({
        ...importForm,
        file,
        name: importForm.name || `Import ${file.name}`,
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Data Export & Import</h1>
          <p className="mt-2 text-sm text-gray-700">
            Export data for analysis or backup, and import data from external sources.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <div className="flex space-x-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
            >
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              Import Data
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export Data
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'export', label: 'Exports', count: exports.length },
              { key: 'import', label: 'Imports', count: imports.length },
              { key: 'templates', label: 'Templates', count: templates.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={cn(
                  'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'export' && (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Export</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exports.map((exportItem) => {
                  const StatusIcon = statusIcons[exportItem.status];
                  const TypeIcon = typeIcons[exportItem.type];
                  
                  return (
                    <tr key={exportItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <TypeIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{exportItem.name}</div>
                            <div className="text-sm text-gray-500">{exportItem.format.toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {exportItem.type.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          statusColors[exportItem.status]
                        )}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {exportItem.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {exportItem.file_size ? formatBytes(exportItem.file_size) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(exportItem.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {exportItem.status === 'completed' && exportItem.download_url ? (
                          <a
                            href={exportItem.download_url}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4 inline" />
                          </a>
                        ) : null}
                        <button className="text-red-600 hover:text-red-900">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Import</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {imports.map((importItem) => {
                  const StatusIcon = statusIcons[importItem.status];
                  const TypeIcon = typeIcons[importItem.type];
                  const progress = importItem.records_total 
                    ? Math.round((importItem.records_processed || 0) / importItem.records_total * 100)
                    : 0;
                  
                  return (
                    <tr key={importItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <TypeIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{importItem.name}</div>
                            <div className="text-sm text-gray-500">{formatBytes(importItem.file_size)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {importItem.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          statusColors[importItem.status]
                        )}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {importItem.status}
                        </span>
                        {importItem.error_message && (
                          <div className="text-xs text-red-600 mt-1">{importItem.error_message}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {importItem.records_total ? (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>{importItem.records_processed} / {importItem.records_total}</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{width: `${progress}%`}}
                              />
                            </div>
                            {importItem.records_success && importItem.records_failed ? (
                              <div className="text-xs mt-1">
                                <span className="text-green-600">{importItem.records_success} success</span>
                                {', '}
                                <span className="text-red-600">{importItem.records_failed} failed</span>
                              </div>
                            ) : null}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(importItem.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-red-600 hover:text-red-900">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => {
              const TypeIcon = typeIcons[template.type];
              
              return (
                <div key={template.id} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-6">
                    <div className="flex items-center">
                      <TypeIcon className="h-8 w-8 text-gray-400" />
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500">{template.type} export</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-4">{template.description}</p>
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700">Fields ({template.fields.length}):</h4>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {template.fields.slice(0, 4).map(field => (
                          <span key={field} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {field}
                          </span>
                        ))}
                        {template.fields.length > 4 && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            +{template.fields.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <button 
                        onClick={() => {
                          setExportForm({
                            ...exportForm,
                            type: template.type,
                            template_id: template.id,
                            name: `${template.name} - ${new Date().toLocaleDateString()}`,
                          });
                          setShowExportModal(true);
                        }}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Use Template
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Export</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Export Name</label>
                <input
                  type="text"
                  value={exportForm.name}
                  onChange={(e) => setExportForm({...exportForm, name: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Data Type</label>
                <select
                  value={exportForm.type}
                  onChange={(e) => setExportForm({...exportForm, type: e.target.value as DataExport['type']})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="users">Users</option>
                  <option value="projects">Projects</option>
                  <option value="invoices">Invoices</option>
                  <option value="files">Files</option>
                  <option value="full_backup">Full Backup</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Format</label>
                <select
                  value={exportForm.format}
                  onChange={(e) => setExportForm({...exportForm, format: e.target.value as DataExport['format']})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                  <option value="sql">SQL</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
              >
                Start Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Import Data</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Import Name</label>
                <input
                  type="text"
                  value={importForm.name}
                  onChange={(e) => setImportForm({...importForm, name: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Data Type</label>
                <select
                  value={importForm.type}
                  onChange={(e) => setImportForm({...importForm, type: e.target.value as DataImport['type']})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="users">Users</option>
                  <option value="projects">Projects</option>
                  <option value="invoices">Invoices</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">File</label>
                <div 
                  className={cn(
                    'mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md',
                    dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <div className="space-y-1 text-center">
                    <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                        <span>Upload a file</span>
                        <input 
                          id="file-upload" 
                          name="file-upload" 
                          type="file" 
                          className="sr-only"
                          accept=".csv,.json,.xlsx"
                          onChange={handleFileSelect}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">CSV, JSON, XLSX up to 10MB</p>
                    {importForm.file && (
                      <div className="mt-2 text-sm text-gray-600">
                        Selected: {importForm.file.name} ({formatBytes(importForm.file.size)})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importForm.file}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:bg-gray-300"
              >
                Start Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}