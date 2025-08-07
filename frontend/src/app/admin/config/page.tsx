'use client';

import { useState, useEffect } from 'react';
import {
  CogIcon,
  ServerIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  DatabaseIcon,
  CloudIcon,
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

// Types
interface ConfigSection {
  id: string;
  name: string;
  description: string;
  icon: any;
  settings: ConfigSetting[];
}

interface ConfigSetting {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
  value: any;
  options?: { label: string; value: any }[];
  required?: boolean;
  sensitive?: boolean;
}

// Mock configuration data
const mockConfig: ConfigSection[] = [
  {
    id: 'general',
    name: 'General Settings',
    description: 'Basic application configuration',
    icon: CogIcon,
    settings: [
      {
        key: 'app_name',
        label: 'Application Name',
        description: 'The name displayed in the application header',
        type: 'text',
        value: 'ACE CRM',
        required: true,
      },
      {
        key: 'app_url',
        label: 'Application URL',
        description: 'The base URL for the application',
        type: 'text',
        value: 'https://crm.acewebdesigners.com',
        required: true,
      },
      {
        key: 'timezone',
        label: 'Default Timezone',
        description: 'Default timezone for the application',
        type: 'select',
        value: 'America/New_York',
        options: [
          { label: 'Eastern (America/New_York)', value: 'America/New_York' },
          { label: 'Central (America/Chicago)', value: 'America/Chicago' },
          { label: 'Mountain (America/Denver)', value: 'America/Denver' },
          { label: 'Pacific (America/Los_Angeles)', value: 'America/Los_Angeles' },
          { label: 'UTC', value: 'UTC' },
        ],
      },
      {
        key: 'maintenance_mode',
        label: 'Maintenance Mode',
        description: 'Enable maintenance mode to prevent user access',
        type: 'boolean',
        value: false,
      },
    ],
  },
  {
    id: 'email',
    name: 'Email Settings',
    description: 'Email server and notification configuration',
    icon: EnvelopeIcon,
    settings: [
      {
        key: 'smtp_host',
        label: 'SMTP Host',
        description: 'SMTP server hostname',
        type: 'text',
        value: 'smtp.mailgun.org',
        required: true,
      },
      {
        key: 'smtp_port',
        label: 'SMTP Port',
        description: 'SMTP server port',
        type: 'number',
        value: 587,
        required: true,
      },
      {
        key: 'smtp_username',
        label: 'SMTP Username',
        description: 'SMTP authentication username',
        type: 'text',
        value: 'postmaster@mg.acewebdesigners.com',
        required: true,
      },
      {
        key: 'smtp_password',
        label: 'SMTP Password',
        description: 'SMTP authentication password',
        type: 'text',
        value: '••••••••••••',
        required: true,
        sensitive: true,
      },
      {
        key: 'from_email',
        label: 'From Email',
        description: 'Default sender email address',
        type: 'text',
        value: 'noreply@acewebdesigners.com',
        required: true,
      },
      {
        key: 'from_name',
        label: 'From Name',
        description: 'Default sender name',
        type: 'text',
        value: 'ACE Web Designers',
        required: true,
      },
    ],
  },
  {
    id: 'security',
    name: 'Security Settings',
    description: 'Authentication and security configuration',
    icon: ShieldCheckIcon,
    settings: [
      {
        key: 'session_timeout',
        label: 'Session Timeout (minutes)',
        description: 'How long user sessions remain active',
        type: 'number',
        value: 120,
        required: true,
      },
      {
        key: 'password_min_length',
        label: 'Minimum Password Length',
        description: 'Minimum number of characters for passwords',
        type: 'number',
        value: 8,
        required: true,
      },
      {
        key: 'require_2fa',
        label: 'Require Two-Factor Authentication',
        description: 'Force all users to enable 2FA',
        type: 'boolean',
        value: false,
      },
      {
        key: 'login_attempts',
        label: 'Max Login Attempts',
        description: 'Number of failed attempts before account lockout',
        type: 'number',
        value: 5,
        required: true,
      },
      {
        key: 'lockout_duration',
        label: 'Lockout Duration (minutes)',
        description: 'How long accounts remain locked after failed attempts',
        type: 'number',
        value: 30,
        required: true,
      },
    ],
  },
  {
    id: 'api',
    name: 'API Settings',
    description: 'API configuration and rate limiting',
    icon: GlobeAltIcon,
    settings: [
      {
        key: 'api_rate_limit',
        label: 'Rate Limit (requests/minute)',
        description: 'Maximum API requests per minute per IP',
        type: 'number',
        value: 100,
        required: true,
      },
      {
        key: 'api_key_expiry',
        label: 'API Key Expiry (days)',
        description: 'How long API keys remain valid',
        type: 'number',
        value: 365,
        required: true,
      },
      {
        key: 'enable_cors',
        label: 'Enable CORS',
        description: 'Allow cross-origin requests',
        type: 'boolean',
        value: true,
      },
      {
        key: 'cors_origins',
        label: 'Allowed Origins',
        description: 'Comma-separated list of allowed origins for CORS',
        type: 'textarea',
        value: 'https://acewebdesigners.com,https://app.acewebdesigners.com',
      },
    ],
  },
  {
    id: 'storage',
    name: 'Storage Settings',
    description: 'File storage and backup configuration',
    icon: DatabaseIcon,
    settings: [
      {
        key: 'storage_driver',
        label: 'Storage Driver',
        description: 'Primary storage system for files',
        type: 'select',
        value: 'supabase',
        options: [
          { label: 'Supabase Storage', value: 'supabase' },
          { label: 'Amazon S3', value: 's3' },
          { label: 'Local Storage', value: 'local' },
        ],
      },
      {
        key: 'max_file_size',
        label: 'Max File Size (MB)',
        description: 'Maximum file size for uploads',
        type: 'number',
        value: 50,
        required: true,
      },
      {
        key: 'allowed_extensions',
        label: 'Allowed File Extensions',
        description: 'Comma-separated list of allowed file extensions',
        type: 'textarea',
        value: 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,ppt,pptx,txt,zip',
      },
      {
        key: 'backup_enabled',
        label: 'Enable Backups',
        description: 'Automatically backup data',
        type: 'boolean',
        value: true,
      },
      {
        key: 'backup_frequency',
        label: 'Backup Frequency',
        description: 'How often to create backups',
        type: 'select',
        value: 'daily',
        options: [
          { label: 'Hourly', value: 'hourly' },
          { label: 'Daily', value: 'daily' },
          { label: 'Weekly', value: 'weekly' },
          { label: 'Monthly', value: 'monthly' },
        ],
      },
    ],
  },
];

export default function SystemConfiguration() {
  const [config, setConfig] = useState<ConfigSection[]>(mockConfig);
  const [activeSection, setActiveSection] = useState<string>('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const activeConfigSection = config.find(section => section.id === activeSection);

  const handleSettingChange = (sectionId: string, settingKey: string, value: any) => {
    setConfig(prevConfig => 
      prevConfig.map(section => 
        section.id === sectionId
          ? {
              ...section,
              settings: section.settings.map(setting => 
                setting.key === settingKey
                  ? { ...setting, value }
                  : setting
              )
            }
          : section
      )
    );
    setHasChanges(true);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would make an actual API call to save the configuration
      console.log('Saving configuration:', config);
      
      setHasChanges(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (sectionId: string) => {
    // Simulate testing connection
    const section = config.find(s => s.id === sectionId);
    if (section) {
      alert(`Testing ${section.name} connection...`);
    }
  };

  const renderSetting = (setting: ConfigSetting, sectionId: string) => {
    const onChange = (value: any) => handleSettingChange(sectionId, setting.key, value);

    switch (setting.type) {
      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={setting.value}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              {setting.value ? 'Enabled' : 'Disabled'}
            </label>
          </div>
        );
      
      case 'select':
        return (
          <select
            value={setting.value}
            onChange={(e) => onChange(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            {setting.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'textarea':
        return (
          <textarea
            value={setting.value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required={setting.required}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={setting.value}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required={setting.required}
          />
        );
      
      default:
        return (
          <div className="relative">
            <input
              type={setting.sensitive ? 'password' : 'text'}
              value={setting.value}
              onChange={(e) => onChange(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required={setting.required}
            />
            {setting.sensitive && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <ShieldCheckIcon className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage application settings and configuration.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <div className="flex space-x-3">
            {saved && (
              <div className="flex items-center text-green-600">
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                <span className="text-sm">Settings saved</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={cn(
                'block rounded-md px-3 py-2 text-center text-sm font-semibold shadow-sm',
                hasChanges && !saving
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="mt-4 rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You have unsaved changes. Don't forget to save your configuration.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {config.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex items-center w-full px-3 py-2 text-sm font-medium rounded-md',
                    isActive
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {section.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-8">
          {activeConfigSection && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  {activeConfigSection.name}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {activeConfigSection.description}
                </p>
                {(activeSection === 'email' || activeSection === 'api') && (
                  <button
                    onClick={() => handleTestConnection(activeSection)}
                    className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Test Connection
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {activeConfigSection.settings.map((setting) => (
                  <div key={setting.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {setting.label}
                      {setting.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderSetting(setting, activeSection)}
                    <p className="mt-1 text-sm text-gray-500">{setting.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}