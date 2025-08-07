'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  KeyIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

// Types
interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  user_count: number;
  created_at: string;
  updated_at: string;
  is_system: boolean;
}

interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
}

// Mock data - replace with real API calls
const mockPermissions: Permission[] = [
  // User Management
  { id: 'users.view', name: 'View Users', description: 'Can view user list and details', category: 'User Management' },
  { id: 'users.create', name: 'Create Users', description: 'Can create new users', category: 'User Management' },
  { id: 'users.update', name: 'Edit Users', description: 'Can edit existing users', category: 'User Management' },
  { id: 'users.delete', name: 'Delete Users', description: 'Can delete users', category: 'User Management' },
  
  // Project Management
  { id: 'projects.view', name: 'View Projects', description: 'Can view project list and details', category: 'Project Management' },
  { id: 'projects.create', name: 'Create Projects', description: 'Can create new projects', category: 'Project Management' },
  { id: 'projects.update', name: 'Edit Projects', description: 'Can edit existing projects', category: 'Project Management' },
  { id: 'projects.delete', name: 'Delete Projects', description: 'Can delete projects', category: 'Project Management' },
  
  // Billing
  { id: 'billing.view', name: 'View Billing', description: 'Can view billing information', category: 'Billing' },
  { id: 'billing.manage', name: 'Manage Billing', description: 'Can manage billing and invoices', category: 'Billing' },
  
  // Support
  { id: 'support.view', name: 'View Support', description: 'Can view support tickets', category: 'Support' },
  { id: 'support.manage', name: 'Manage Support', description: 'Can manage and respond to tickets', category: 'Support' },
  
  // System
  { id: 'system.config', name: 'System Config', description: 'Can modify system configuration', category: 'System' },
  { id: 'system.analytics', name: 'View Analytics', description: 'Can view system analytics', category: 'System' },
  { id: 'system.admin', name: 'Admin Access', description: 'Full administrative access', category: 'System' },
];

const mockRoles: Role[] = [
  {
    id: '1',
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    permissions: mockPermissions.map(p => p.id),
    user_count: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_system: true,
  },
  {
    id: '2',
    name: 'Project Manager',
    description: 'Can manage projects and view user information',
    permissions: ['projects.view', 'projects.create', 'projects.update', 'users.view', 'support.view'],
    user_count: 5,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-15T12:00:00Z',
    is_system: false,
  },
  {
    id: '3',
    name: 'Client',
    description: 'Basic client access to view their own data',
    permissions: ['projects.view'],
    user_count: 47,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-10T15:30:00Z',
    is_system: true,
  },
  {
    id: '4',
    name: 'Support Agent',
    description: 'Can manage support tickets and view user information',
    permissions: ['support.view', 'support.manage', 'users.view', 'projects.view'],
    user_count: 8,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-18T09:00:00Z',
    is_system: false,
  },
];

export default function RolesManagement() {
  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [permissions] = useState<Permission[]>(mockPermissions);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    permissions: [],
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(permissions.map(p => p.category)))];
  
  const filteredPermissions = selectedCategory === 'all' 
    ? permissions 
    : permissions.filter(p => p.category === selectedCategory);

  const handleCreateRole = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      permissions: [],
    });
    setShowModal(true);
  };

  const handleEditRole = (role: Role) => {
    if (role.is_system) {
      alert('System roles cannot be edited');
      return;
    }
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permissions: [...role.permissions],
    });
    setShowModal(true);
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.is_system) {
      alert('System roles cannot be deleted');
      return;
    }
    if (confirm('Are you sure you want to delete this role? All users with this role will lose their permissions.')) {
      setRoles(roles.filter(role => role.id !== roleId));
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingRole) {
      setRoles(roles.map(role => 
        role.id === editingRole.id 
          ? { 
              ...role, 
              name: formData.name,
              description: formData.description,
              permissions: formData.permissions,
              updated_at: new Date().toISOString() 
            }
          : role
      ));
    } else {
      const newRole: Role = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
        user_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_system: false,
      };
      setRoles([...roles, newRole]);
    }
    
    setShowModal(false);
  };

  const getPermissionsByCategory = (perms: string[]) => {
    const grouped: Record<string, Permission[]> = {};
    perms.forEach(permId => {
      const perm = permissions.find(p => p.id === permId);
      if (perm) {
        if (!grouped[perm.category]) {
          grouped[perm.category] = [];
        }
        grouped[perm.category].push(perm);
      }
    });
    return grouped;
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage user roles and their associated permissions.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={handleCreateRole}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <PlusIcon className="h-4 w-4 mr-2 inline" />
            Add Role
          </button>
        </div>
      </div>

      {/* Roles List */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const permsByCategory = getPermissionsByCategory(role.permissions);
          return (
            <div key={role.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <ShieldCheckIcon className="h-8 w-8 text-indigo-600" />
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">{role.name}</h3>
                      {role.is_system && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          System Role
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditRole(role)}
                      className="text-indigo-600 hover:text-indigo-900"
                      disabled={role.is_system}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={role.is_system}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-4">{role.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-500">
                    <UserGroupIcon className="h-4 w-4 mr-1" />
                    {role.user_count} users
                  </div>
                  <div className="flex items-center text-gray-500">
                    <KeyIcon className="h-4 w-4 mr-1" />
                    {role.permissions.length} permissions
                  </div>
                </div>
                
                {/* Permission Summary */}
                <div className="mt-4 space-y-2">
                  {Object.entries(permsByCategory).map(([category, perms]) => (
                    <div key={category} className="text-xs">
                      <span className="font-medium text-gray-700">{category}:</span>
                      <span className="ml-1 text-gray-500">
                        {perms.length} permission{perms.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowModal(false)}>
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <input
                      type="text"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                {/* Permission Selection */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">Permissions</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category === 'all' ? 'All Categories' : category}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                      {filteredPermissions.map((permission) => {
                        const isChecked = formData.permissions.includes(permission.id);
                        return (
                          <div
                            key={permission.id}
                            className={cn(
                              'p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50',
                              isChecked ? 'bg-indigo-50' : ''
                            )}
                            onClick={() => handlePermissionToggle(permission.id)}
                          >
                            <div className="flex items-start">
                              <div className="flex items-center h-5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handlePermissionToggle(permission.id)}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {permission.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {permission.description}
                                </div>
                                <div className="text-xs text-indigo-600 mt-1">
                                  {permission.category}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Selected: {formData.permissions.length} permissions
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                    >
                      {editingRole ? 'Update' : 'Create'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}