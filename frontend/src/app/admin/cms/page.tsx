'use client';

import { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

// Types
interface ContentItem {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  type: 'page' | 'post' | 'faq' | 'policy' | 'guide';
  status: 'draft' | 'published' | 'archived';
  category: string;
  tags: string[];
  author_name: string;
  featured_image?: string;
  seo_title?: string;
  seo_description?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  post_count: number;
}

// Mock data
const mockContent: ContentItem[] = [
  {
    id: '1',
    title: 'Getting Started with ACE CRM',
    content: 'Complete guide to setting up and using ACE CRM for your business needs...',
    excerpt: 'Learn the basics of ACE CRM and how to get started with your first project.',
    type: 'guide',
    status: 'published',
    category: 'Documentation',
    tags: ['getting-started', 'tutorial', 'basics'],
    author_name: 'Jane Smith',
    view_count: 1247,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T14:30:00Z',
    published_at: '2024-01-16T09:00:00Z',
    seo_title: 'ACE CRM Getting Started Guide | Complete Tutorial',
    seo_description: 'Learn how to use ACE CRM with our comprehensive getting started guide.',
  },
  {
    id: '2',
    title: 'Privacy Policy',
    content: 'This privacy policy describes how we collect, use, and protect your information...',
    excerpt: 'Our commitment to protecting your privacy and data.',
    type: 'policy',
    status: 'published',
    category: 'Legal',
    tags: ['privacy', 'policy', 'legal'],
    author_name: 'Legal Team',
    view_count: 567,
    created_at: '2024-01-10T12:00:00Z',
    updated_at: '2024-01-18T16:15:00Z',
    published_at: '2024-01-10T12:00:00Z',
  },
  {
    id: '3',
    title: 'How to Reset Your Password',
    content: 'Step-by-step instructions for resetting your password...',
    excerpt: 'Having trouble logging in? Here\'s how to reset your password.',
    type: 'faq',
    status: 'published',
    category: 'Support',
    tags: ['password', 'account', 'help'],
    author_name: 'Support Team',
    view_count: 892,
    created_at: '2024-01-12T14:00:00Z',
    updated_at: '2024-01-12T14:00:00Z',
    published_at: '2024-01-12T15:00:00Z',
  },
  {
    id: '4',
    title: 'Advanced Project Management Features',
    content: 'Explore advanced features for managing complex projects...',
    excerpt: 'Take your project management to the next level with these advanced features.',
    type: 'guide',
    status: 'draft',
    category: 'Documentation',
    tags: ['advanced', 'projects', 'features'],
    author_name: 'John Doe',
    view_count: 0,
    created_at: '2024-01-20T11:00:00Z',
    updated_at: '2024-01-21T16:30:00Z',
  },
];

const mockCategories: Category[] = [
  { id: '1', name: 'Documentation', description: 'User guides and tutorials', post_count: 15 },
  { id: '2', name: 'Support', description: 'FAQ and help articles', post_count: 23 },
  { id: '3', name: 'Legal', description: 'Policies and legal documents', post_count: 8 },
  { id: '4', name: 'Updates', description: 'Product updates and announcements', post_count: 12 },
];

const typeColors = {
  page: 'bg-blue-100 text-blue-800',
  post: 'bg-green-100 text-green-800',
  faq: 'bg-yellow-100 text-yellow-800',
  policy: 'bg-red-100 text-red-800',
  guide: 'bg-purple-100 text-purple-800',
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-red-100 text-red-800',
};

export default function ContentManagement() {
  const [content, setContent] = useState<ContentItem[]>(mockContent);
  const [categories] = useState<Category[]>(mockCategories);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesType && matchesStatus && matchesCategory;
  });

  const handleCreateContent = () => {
    setEditingItem(null);
    setShowEditor(true);
  };

  const handleEditContent = (item: ContentItem) => {
    setEditingItem(item);
    setShowEditor(true);
  };

  const handleDeleteContent = (id: string) => {
    if (confirm('Are you sure you want to delete this content item?')) {
      setContent(content.filter(item => item.id !== id));
    }
  };

  const handlePublishToggle = (id: string) => {
    setContent(content.map(item => {
      if (item.id === id) {
        const newStatus = item.status === 'published' ? 'draft' : 'published';
        return {
          ...item,
          status: newStatus as 'draft' | 'published' | 'archived',
          published_at: newStatus === 'published' ? new Date().toISOString() : item.published_at,
        };
      }
      return item;
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Create and manage website content, documentation, and support materials.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={handleCreateContent}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <PlusIcon className="h-4 w-4 mr-2 inline" />
            Create Content
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-4">
        {[
          { label: 'Total Content', value: content.length, icon: DocumentTextIcon },
          { label: 'Published', value: content.filter(c => c.status === 'published').length, icon: EyeIcon },
          { label: 'Drafts', value: content.filter(c => c.status === 'draft').length, icon: PencilIcon },
          { label: 'Categories', value: categories.length, icon: TagIcon },
        ].map((stat, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.label}</dt>
                    <dd className="text-lg font-medium text-gray-900">{stat.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Categories Overview */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            <TagIcon className="h-5 w-5 mr-2" />
            Content Categories
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            {categories.map(category => (
              <div key={category.id} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900">{category.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                <p className="text-sm font-medium text-gray-700 mt-2">{category.post_count} items</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400 pl-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search content..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="all">All Types</option>
              <option value="page">Pages</option>
              <option value="post">Posts</option>
              <option value="faq">FAQ</option>
              <option value="policy">Policies</option>
              <option value="guide">Guides</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
                setStatusFilter('all');
                setCategoryFilter('all');
              }}
              className="w-full rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredContent.map((item) => (
            <li key={item.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      typeColors[item.type]
                    )}>
                      {item.type}
                    </span>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      statusColors[item.status]
                    )}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{item.excerpt}</p>
                  <div className="flex items-center space-x-6 mt-3 text-sm text-gray-500">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-1" />
                      {item.author_name}
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {formatDate(item.updated_at)}
                    </div>
                    <div className="flex items-center">
                      <EyeIcon className="h-4 w-4 mr-1" />
                      {item.view_count} views
                    </div>
                    <div className="flex items-center">
                      <TagIcon className="h-4 w-4 mr-1" />
                      {item.category}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePublishToggle(item.id)}
                    className={cn(
                      'inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md',
                      item.status === 'published'
                        ? 'text-red-700 bg-red-100 hover:bg-red-200'
                        : 'text-green-700 bg-green-100 hover:bg-green-200'
                    )}
                  >
                    {item.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => handleEditContent(item)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteContent(item.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Simple Editor Modal Placeholder */}
      {showEditor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingItem ? 'Edit Content' : 'Create New Content'}
              </h3>
              <div className="text-center py-12 text-gray-500">
                <DocumentTextIcon className="h-12 w-12 mx-auto mb-4" />
                <p>Full content editor would be implemented here.</p>
                <p className="text-sm">Features: Rich text editor, image uploads, SEO settings, etc.</p>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}