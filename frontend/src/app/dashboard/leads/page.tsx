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
  EnvelopeIcon 
} from '@heroicons/react/24/outline';
import { useCrmStore } from '@/store/crmStore';
import { Lead } from '@/types';

// Sample leads data
const sampleLeads: Lead[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@techcorp.com',
    phone: '+1 (555) 123-4567',
    company: 'TechCorp Inc.',
    source: 'Website',
    status: 'new',
    score: 85,
    value: 25000,
    assignedTo: 'Sarah Johnson',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    notes: 'Interested in enterprise solution',
    tags: ['enterprise', 'high-priority'],
  },
  {
    id: '2',
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@innovate.com',
    phone: '+1 (555) 987-6543',
    company: 'Innovate Solutions',
    source: 'Referral',
    status: 'contacted',
    score: 72,
    value: 15000,
    assignedTo: 'Mike Wilson',
    createdAt: '2024-01-14T14:20:00Z',
    updatedAt: '2024-01-16T09:15:00Z',
    notes: 'Follow up next week',
    tags: ['follow-up'],
  },
  {
    id: '3',
    firstName: 'David',
    lastName: 'Brown',
    email: 'david.brown@startup.io',
    phone: '+1 (555) 456-7890',
    company: 'StartupIO',
    source: 'Social Media',
    status: 'qualified',
    score: 91,
    value: 35000,
    assignedTo: 'Sarah Johnson',
    createdAt: '2024-01-13T16:45:00Z',
    updatedAt: '2024-01-17T11:30:00Z',
    notes: 'Ready for proposal',
    tags: ['qualified', 'urgent'],
  },
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

const sourceOptions = [
  { value: '', label: 'All Sources' },
  { value: 'Website', label: 'Website' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Social Media', label: 'Social Media' },
  { value: 'Email', label: 'Email Campaign' },
  { value: 'Event', label: 'Event' },
  { value: 'Other', label: 'Other' },
];

const getStatusColor = (status: Lead['status']) => {
  const colors = {
    new: 'default',
    contacted: 'secondary',
    qualified: 'success',
    proposal: 'warning',
    negotiation: 'warning',
    closed_won: 'success',
    closed_lost: 'destructive',
  } as const;
  return colors[status] || 'default';
};

export default function LeadsPage() {
  const { leads, leadsLoading, setLeads, setLeadsLoading } = useCrmStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    // Load leads data
    setLeadsLoading(true);
    setTimeout(() => {
      setLeads(sampleLeads);
      setLeadsLoading(false);
    }, 1000);
  }, [setLeads, setLeadsLoading]);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || lead.status === statusFilter;
    const matchesSource = !sourceFilter || lead.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  });

  const columns = [
    {
      key: 'name' as keyof Lead,
      label: 'Name',
      render: (value: any, lead: Lead) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">
                {lead.firstName[0]}{lead.lastName[0]}
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {lead.firstName} {lead.lastName}
            </div>
            <div className="text-sm text-gray-500">{lead.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'company' as keyof Lead,
      label: 'Company',
      render: (value: string | undefined) => value || '-',
    },
    {
      key: 'source' as keyof Lead,
      label: 'Source',
      render: (value: string) => (
        <Badge variant="outline">{value}</Badge>
      ),
    },
    {
      key: 'status' as keyof Lead,
      label: 'Status',
      render: (value: Lead['status']) => (
        <Badge variant={getStatusColor(value)}>
          {value.replace('_', ' ').toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'score' as keyof Lead,
      label: 'Score',
      render: (value: number) => (
        <div className="flex items-center">
          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${value}%` }}
            ></div>
          </div>
          <span className="text-sm text-gray-600">{value}</span>
        </div>
      ),
    },
    {
      key: 'value' as keyof Lead,
      label: 'Value',
      render: (value: number | undefined) => 
        value ? `$${value.toLocaleString()}` : '-',
    },
    {
      key: 'assignedTo' as keyof Lead,
      label: 'Assigned To',
      render: (value: string | undefined) => value || 'Unassigned',
    },
    {
      key: 'actions' as keyof Lead,
      label: 'Actions',
      render: (value: any, lead: Lead) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedLead(lead);
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
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">
            Manage your sales leads and track their progress through the pipeline.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <FunnelIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Qualified</p>
                <p className="text-2xl font-bold text-gray-900">
                  {leads.filter(l => l.status === 'qualified').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <FunnelIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">23.5%</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100">
                <FunnelIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${leads.reduce((sum, lead) => sum + (lead.value || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <FunnelIcon className="h-6 w-6 text-purple-600" />
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
                placeholder="Search leads..."
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

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            data={filteredLeads}
            columns={columns}
            loading={leadsLoading}
            emptyMessage="No leads found. Create your first lead to get started."
          />
        </CardContent>
      </Card>

      {/* Lead Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedLead(null);
        }}
        title={selectedLead ? `${selectedLead.firstName} ${selectedLead.lastName}` : 'Lead Details'}
        size="lg"
      >
        {selectedLead && (
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    <span>{selectedLead.email}</span>
                  </div>
                  {selectedLead.phone && (
                    <div className="flex items-center space-x-3">
                      <PhoneIcon className="h-5 w-5 text-gray-400" />
                      <span>{selectedLead.phone}</span>
                    </div>
                  )}
                  {selectedLead.company && (
                    <div>
                      <span className="text-sm text-gray-500">Company: </span>
                      <span className="font-medium">{selectedLead.company}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Lead Details</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Status: </span>
                    <Badge variant={getStatusColor(selectedLead.status)}>
                      {selectedLead.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Source: </span>
                    <Badge variant="outline">{selectedLead.source}</Badge>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Score: </span>
                    <span className="font-medium">{selectedLead.score}</span>
                  </div>
                  {selectedLead.value && (
                    <div>
                      <span className="text-sm text-gray-500">Value: </span>
                      <span className="font-medium">${selectedLead.value.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedLead.notes && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-gray-600">{selectedLead.notes}</p>
              </div>
            )}

            {/* Tags */}
            {selectedLead.tags.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedLead.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button>Edit Lead</Button>
              <Button variant="outline">Convert to Contact</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Lead Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Lead"
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
          
          <Input label="Company" />
          
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
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Score" type="number" min="0" max="100" />
            <Input label="Estimated Value" type="number" min="0" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes about this lead..."
            />
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
              Create Lead
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}