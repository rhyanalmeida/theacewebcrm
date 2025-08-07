'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  UsersIcon,
  UserIcon,
  BuildingOfficeIcon 
} from '@heroicons/react/24/outline';
import { useCrmStore } from '@/store/crmStore';
import { Contact } from '@/types';

// Sample contacts data
const sampleContacts: Contact[] = [
  {
    id: '1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@acme.com',
    phone: '+1 (555) 234-5678',
    company: 'Acme Corporation',
    position: 'Marketing Director',
    tags: ['decision-maker', 'marketing'],
    status: 'active',
    source: 'Referral',
    assignedTo: 'John Smith',
    createdAt: '2024-01-10T08:30:00Z',
    updatedAt: '2024-01-18T14:20:00Z',
    lastContact: '2024-01-18T14:20:00Z',
    notes: 'Very responsive, interested in our premium package',
  },
  {
    id: '2',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@techstart.io',
    phone: '+1 (555) 345-6789',
    company: 'TechStart',
    position: 'CEO',
    tags: ['ceo', 'startup', 'urgent'],
    status: 'active',
    source: 'Website',
    assignedTo: 'Jane Doe',
    createdAt: '2024-01-12T10:15:00Z',
    updatedAt: '2024-01-17T16:45:00Z',
    lastContact: '2024-01-16T09:30:00Z',
    notes: 'Startup founder looking for scalable solutions',
  },
  {
    id: '3',
    firstName: 'Emily',
    lastName: 'Rodriguez',
    email: 'emily.rodriguez@globaltech.com',
    phone: '+1 (555) 456-7890',
    company: 'GlobalTech Solutions',
    position: 'Operations Manager',
    tags: ['operations', 'enterprise'],
    status: 'active',
    source: 'Event',
    assignedTo: 'Mike Wilson',
    createdAt: '2024-01-08T12:00:00Z',
    updatedAt: '2024-01-19T11:15:00Z',
    lastContact: '2024-01-19T11:15:00Z',
    notes: 'Met at trade show, needs implementation timeline',
  },
  {
    id: '4',
    firstName: 'David',
    lastName: 'Thompson',
    email: 'david.thompson@oldcorp.com',
    company: 'OldCorp Industries',
    position: 'IT Manager',
    tags: ['it', 'legacy-systems'],
    status: 'inactive',
    source: 'Cold Email',
    assignedTo: 'Sarah Davis',
    createdAt: '2023-12-15T09:20:00Z',
    updatedAt: '2024-01-05T13:40:00Z',
    lastContact: '2023-12-20T10:30:00Z',
    notes: 'Not interested at this time, follow up in Q2',
  },
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const sourceOptions = [
  { value: '', label: 'All Sources' },
  { value: 'Website', label: 'Website' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Social Media', label: 'Social Media' },
  { value: 'Event', label: 'Event' },
  { value: 'Cold Email', label: 'Cold Email' },
  { value: 'Other', label: 'Other' },
];

const getStatusColor = (status: Contact['status']) => {
  return status === 'active' ? 'success' : 'secondary';
};

export default function ContactsPage() {
  const { contacts, contactsLoading, setContacts, setContactsLoading } = useCrmStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    // Load contacts data
    setContactsLoading(true);
    setTimeout(() => {
      setContacts(sampleContacts);
      setContactsLoading(false);
    }, 1000);
  }, [setContacts, setContactsLoading]);

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.position || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || contact.status === statusFilter;
    const matchesSource = !sourceFilter || contact.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  });

  const columns = [
    {
      key: 'name' as keyof Contact,
      label: 'Contact',
      render: (value: any, contact: Contact) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">
                {contact.firstName[0]}{contact.lastName[0]}
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {contact.firstName} {contact.lastName}
            </div>
            <div className="text-sm text-gray-500">{contact.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'company' as keyof Contact,
      label: 'Company',
      render: (value: string | undefined, contact: Contact) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {value || '-'}
          </div>
          {contact.position && (
            <div className="text-sm text-gray-500">{contact.position}</div>
          )}
        </div>
      ),
    },
    {
      key: 'phone' as keyof Contact,
      label: 'Phone',
      render: (value: string | undefined) => value || '-',
    },
    {
      key: 'source' as keyof Contact,
      label: 'Source',
      render: (value: string) => (
        <Badge variant="outline">{value}</Badge>
      ),
    },
    {
      key: 'status' as keyof Contact,
      label: 'Status',
      render: (value: Contact['status']) => (
        <Badge variant={getStatusColor(value)}>
          {value.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'assignedTo' as keyof Contact,
      label: 'Assigned To',
      render: (value: string | undefined) => value || 'Unassigned',
    },
    {
      key: 'lastContact' as keyof Contact,
      label: 'Last Contact',
      render: (value: string | undefined) => {
        if (!value) return '-';
        const date = new Date(value);
        return date.toLocaleDateString();
      },
    },
    {
      key: 'actions' as keyof Contact,
      label: 'Actions',
      render: (value: any, contact: Contact) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedContact(contact);
              setIsViewModalOpen(true);
            }}
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600">
            Manage your customer contacts and maintain relationships.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Contacts</p>
                <p className="text-2xl font-bold text-gray-900">{contacts.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {contacts.filter(c => c.status === 'active').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <UserIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Companies</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(contacts.map(c => c.company).filter(Boolean)).size}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100">
                <BuildingOfficeIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Recent Activity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {contacts.filter(c => {
                    if (!c.lastContact) return false;
                    const lastContact = new Date(c.lastContact);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return lastContact > weekAgo;
                  }).length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <UsersIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="Filter by status"
            />
            
            <Select
              options={sourceOptions}
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              placeholder="Filter by source"
            />
            
            <Button variant="outline">
              <FunnelIcon className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            data={filteredContacts}
            columns={columns}
            loading={contactsLoading}
            emptyMessage="No contacts found. Add your first contact to get started."
          />
        </CardContent>
      </Card>

      {/* Contact Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedContact(null);
        }}
        title={selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : 'Contact Details'}
        size="lg"
      >
        {selectedContact && (
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    <span>{selectedContact.email}</span>
                  </div>
                  {selectedContact.phone && (
                    <div className="flex items-center space-x-3">
                      <PhoneIcon className="h-5 w-5 text-gray-400" />
                      <span>{selectedContact.phone}</span>
                    </div>
                  )}
                  {selectedContact.company && (
                    <div>
                      <span className="text-sm text-gray-500">Company: </span>
                      <span className="font-medium">{selectedContact.company}</span>
                    </div>
                  )}
                  {selectedContact.position && (
                    <div>
                      <span className="text-sm text-gray-500">Position: </span>
                      <span className="font-medium">{selectedContact.position}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Details</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Status: </span>
                    <Badge variant={getStatusColor(selectedContact.status)}>
                      {selectedContact.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Source: </span>
                    <Badge variant="outline">{selectedContact.source}</Badge>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Assigned to: </span>
                    <span className="font-medium">{selectedContact.assignedTo || 'Unassigned'}</span>
                  </div>
                  {selectedContact.lastContact && (
                    <div>
                      <span className="text-sm text-gray-500">Last contact: </span>
                      <span className="font-medium">
                        {new Date(selectedContact.lastContact).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedContact.notes && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-gray-600">{selectedContact.notes}</p>
              </div>
            )}

            {/* Tags */}
            {selectedContact.tags.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedContact.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button>Edit Contact</Button>
              <Button variant="outline">Create Deal</Button>
              <Button variant="outline">Log Activity</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Contact Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Contact"
        size="lg"
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" required />
            <Input label="Last Name" required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" required />
            <Input label="Phone" type="tel" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Company" />
            <Input label="Position" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Source"
              options={sourceOptions.filter(opt => opt.value)}
              required
            />
            <Select
              label="Status"
              options={statusOptions.filter(opt => opt.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes about this contact..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <Input placeholder="e.g. decision-maker, urgent, follow-up" />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Create Contact
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}