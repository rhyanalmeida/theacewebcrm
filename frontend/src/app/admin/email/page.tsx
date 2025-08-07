'use client';

import { useState, useEffect } from 'react';
import {
  EnvelopeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  CodeBracketIcon,
  SwatchIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

// Types
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  type: 'welcome' | 'password_reset' | 'invoice' | 'notification' | 'marketing' | 'system';
  html_content: string;
  text_content: string;
  variables: string[];
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  preview_image?: string;
}

// Mock data
const mockTemplates: EmailTemplate[] = [
  {
    id: '1',
    name: 'Welcome Email',
    subject: 'Welcome to {{app_name}}!',
    type: 'welcome',
    html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #6366F1;">Welcome {{user_name}}!</h1>
      <p>Thanks for joining {{app_name}}. We're excited to have you on board.</p>
      <div style="background: #F3F4F6; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <h3>Getting Started:</h3>
        <ul>
          <li>Complete your profile</li>
          <li>Set up your first project</li>
          <li>Invite team members</li>
        </ul>
      </div>
      <a href="{{dashboard_url}}" style="background: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
    </div>`,
    text_content: 'Welcome {{user_name}}! Thanks for joining {{app_name}}. Visit {{dashboard_url}} to get started.',
    variables: ['user_name', 'app_name', 'dashboard_url'],
    is_active: true,
    usage_count: 245,
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-15T14:30:00Z',
  },
  {
    id: '2',
    name: 'Password Reset',
    subject: 'Reset Your Password',
    type: 'password_reset',
    html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Password Reset Request</h1>
      <p>Hi {{user_name}},</p>
      <p>You requested to reset your password. Click the button below to create a new password:</p>
      <a href="{{reset_url}}" style="background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
      <p><small>This link will expire in 24 hours. If you didn't request this, please ignore this email.</small></p>
    </div>`,
    text_content: 'Hi {{user_name}}, reset your password at: {{reset_url}}',
    variables: ['user_name', 'reset_url'],
    is_active: true,
    usage_count: 67,
    created_at: '2024-01-08T12:00:00Z',
    updated_at: '2024-01-08T12:00:00Z',
  },
  {
    id: '3',
    name: 'Invoice Ready',
    subject: 'Your Invoice is Ready - {{invoice_number}}',
    type: 'invoice',
    html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Invoice {{invoice_number}}</h1>
      <p>Hi {{customer_name}},</p>
      <p>Your invoice for {{amount}} is now ready.</p>
      <div style="border: 1px solid #E5E7EB; padding: 20px; margin: 20px 0;">
        <h3>Invoice Details:</h3>
        <p><strong>Amount:</strong> {{amount}}</p>
        <p><strong>Due Date:</strong> {{due_date}}</p>
        <p><strong>Description:</strong> {{description}}</p>
      </div>
      <a href="{{invoice_url}}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Invoice</a>
    </div>`,
    text_content: 'Invoice {{invoice_number}} for {{amount}} is ready. View at: {{invoice_url}}',
    variables: ['customer_name', 'invoice_number', 'amount', 'due_date', 'description', 'invoice_url'],
    is_active: true,
    usage_count: 134,
    created_at: '2024-01-05T15:00:00Z',
    updated_at: '2024-01-12T11:20:00Z',
  },
  {
    id: '4',
    name: 'Project Update',
    subject: 'Project Update: {{project_name}}',
    type: 'notification',
    html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Project Update</h1>
      <p>Hi {{client_name}},</p>
      <p>There's been an update to your project "{{project_name}}".</p>
      <p><strong>Status:</strong> {{project_status}}</p>
      <p><strong>Progress:</strong> {{progress}}% complete</p>
      <p>{{update_message}}</p>
      <a href="{{project_url}}" style="background: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Project</a>
    </div>`,
    text_content: 'Project update for {{project_name}}: {{update_message}}. View at: {{project_url}}',
    variables: ['client_name', 'project_name', 'project_status', 'progress', 'update_message', 'project_url'],
    is_active: false,
    usage_count: 89,
    created_at: '2024-01-03T09:30:00Z',
    updated_at: '2024-01-18T16:45:00Z',
  },
];

const templateTypeColors = {
  welcome: 'bg-green-100 text-green-800',
  password_reset: 'bg-red-100 text-red-800',
  invoice: 'bg-blue-100 text-blue-800',
  notification: 'bg-yellow-100 text-yellow-800',
  marketing: 'bg-purple-100 text-purple-800',
  system: 'bg-gray-100 text-gray-800',
};

export default function EmailTemplateEditor() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(mockTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');
  const [testEmail, setTestEmail] = useState('');

  const [editorData, setEditorData] = useState({
    name: '',
    subject: '',
    type: 'notification' as EmailTemplate['type'],
    html_content: '',
    text_content: '',
    variables: [] as string[],
  });

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setEditorData({
      name: '',
      subject: '',
      type: 'notification',
      html_content: '',
      text_content: '',
      variables: [],
    });
    setShowEditor(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setEditorData({
      name: template.name,
      subject: template.subject,
      type: template.type,
      html_content: template.html_content,
      text_content: template.text_content,
      variables: [...template.variables],
    });
    setShowEditor(true);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  const handleDuplicateTemplate = (template: EmailTemplate) => {
    const newTemplate: EmailTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTemplates([...templates, newTemplate]);
  };

  const handleToggleActive = (id: string) => {
    setTemplates(templates.map(t => 
      t.id === id ? { ...t, is_active: !t.is_active } : t
    ));
  };

  const handleSaveTemplate = () => {
    if (editingTemplate) {
      setTemplates(templates.map(t => 
        t.id === editingTemplate.id 
          ? { 
              ...t, 
              ...editorData, 
              updated_at: new Date().toISOString() 
            }
          : t
      ));
    } else {
      const newTemplate: EmailTemplate = {
        id: Date.now().toString(),
        ...editorData,
        is_active: true,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTemplates([...templates, newTemplate]);
    }
    setShowEditor(false);
  };

  const handleSendTest = () => {
    if (!testEmail || !selectedTemplate) return;
    alert(`Test email sent to ${testEmail}`);
    setTestEmail('');
  };

  const extractVariables = (content: string) => {
    const matches = content.match(/{{[^}]+}}/g) || [];
    return [...new Set(matches.map(match => match.slice(2, -2)))];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="mt-2 text-sm text-gray-700">
            Create and manage email templates for automated communications.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={handleCreateTemplate}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <PlusIcon className="h-4 w-4 mr-2 inline" />
            Create Template
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Templates List */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Templates</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">{templates.length} templates</p>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {templates.map((template) => (
                  <li key={template.id} className={cn(
                    'px-4 py-4 hover:bg-gray-50 cursor-pointer',
                    selectedTemplate?.id === template.id ? 'bg-indigo-50 border-r-4 border-indigo-500' : ''
                  )}
                  onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            templateTypeColors[template.type]
                          )}>
                            {template.type.replace('_', ' ')}
                          </span>
                          {!template.is_active && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{template.subject}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Used {template.usage_count} times
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTemplate(template);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateTemplate(template);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {selectedTemplate.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Last updated {formatDate(selectedTemplate.updated_at)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleToggleActive(selectedTemplate.id)}
                      className={cn(
                        'inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md',
                        selectedTemplate.is_active
                          ? 'text-red-700 bg-red-100 hover:bg-red-200'
                          : 'text-green-700 bg-green-100 hover:bg-green-200'
                      )}
                    >
                      {selectedTemplate.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleEditTemplate(selectedTemplate)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <PencilIcon className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200">
                {/* Preview Mode Toggle */}
                <div className="px-4 py-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setPreviewMode('html')}
                        className={cn(
                          'px-3 py-2 text-sm font-medium rounded-md',
                          previewMode === 'html'
                            ? 'bg-white text-gray-900 shadow'
                            : 'text-gray-500 hover:text-gray-700'
                        )}
                      >
                        <EyeIcon className="h-4 w-4 mr-2 inline" />
                        HTML Preview
                      </button>
                      <button
                        onClick={() => setPreviewMode('text')}
                        className={cn(
                          'px-3 py-2 text-sm font-medium rounded-md',
                          previewMode === 'text'
                            ? 'bg-white text-gray-900 shadow'
                            : 'text-gray-500 hover:text-gray-700'
                        )}
                      >
                        <CodeBracketIcon className="h-4 w-4 mr-2 inline" />
                        Text Version
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="test@example.com"
                        className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <button
                        onClick={handleSendTest}
                        disabled={!testEmail}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300"
                      >
                        <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                        Test
                      </button>
                    </div>
                  </div>
                </div>

                {/* Template Info */}
                <div className="px-4 py-4 border-b border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong className="text-gray-700">Subject:</strong>
                      <p className="mt-1">{selectedTemplate.subject}</p>
                    </div>
                    <div>
                      <strong className="text-gray-700">Variables:</strong>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedTemplate.variables.map(variable => (
                          <span key={variable} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {'{{'}{variable}{'}}'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <strong className="text-gray-700">Usage:</strong>
                      <p className="mt-1">{selectedTemplate.usage_count} times</p>
                    </div>
                  </div>
                </div>

                {/* Content Preview */}
                <div className="p-4">
                  {previewMode === 'html' ? (
                    <div 
                      className="border border-gray-200 rounded p-4 bg-white"
                      dangerouslySetInnerHTML={{ __html: selectedTemplate.html_content }}
                    />
                  ) : (
                    <div className="border border-gray-200 rounded p-4 bg-gray-50 whitespace-pre-wrap font-mono text-sm">
                      {selectedTemplate.text_content}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <EnvelopeIcon className="h-12 w-12 text-gray-400 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No template selected</h3>
              <p className="mt-2 text-sm text-gray-500">Choose a template from the list to preview it.</p>
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Editor Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Template Name</label>
                    <input
                      type="text"
                      value={editorData.name}
                      onChange={(e) => setEditorData({...editorData, name: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subject Line</label>
                    <input
                      type="text"
                      value={editorData.subject}
                      onChange={(e) => setEditorData({...editorData, subject: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Template Type</label>
                    <select
                      value={editorData.type}
                      onChange={(e) => setEditorData({...editorData, type: e.target.value as EmailTemplate['type']})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="welcome">Welcome</option>
                      <option value="password_reset">Password Reset</option>
                      <option value="invoice">Invoice</option>
                      <option value="notification">Notification</option>
                      <option value="marketing">Marketing</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">HTML Content</label>
                    <textarea
                      value={editorData.html_content}
                      onChange={(e) => {
                        const newContent = e.target.value;
                        setEditorData({
                          ...editorData, 
                          html_content: newContent,
                          variables: extractVariables(newContent)
                        });
                      }}
                      rows={10}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Text Content</label>
                    <textarea
                      value={editorData.text_content}
                      onChange={(e) => setEditorData({...editorData, text_content: e.target.value})}
                      rows={4}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                  <div className="border border-gray-200 rounded p-4 bg-white max-h-96 overflow-y-auto">
                    {editorData.html_content ? (
                      <div dangerouslySetInnerHTML={{ __html: editorData.html_content }} />
                    ) : (
                      <p className="text-gray-500 text-sm">Enter HTML content to see preview</p>
                    )}
                  </div>
                  {editorData.variables.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Variables Found:</h5>
                      <div className="flex flex-wrap gap-1">
                        {editorData.variables.map(variable => (
                          <span key={variable} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {'{{'}{variable}{'}}'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}