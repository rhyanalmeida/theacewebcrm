'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Card, CardContent } from '@/components/ui/Card';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  BuildingOfficeIcon 
} from '@heroicons/react/24/outline';
import { useCrmStore } from '@/store/crmStore';
import { Deal } from '@/types';

// Sample deals data
const sampleDeals: Deal[] = [
  {
    id: '1',
    title: 'Enterprise Software License',
    value: 75000,
    stage: 'prospect',
    probability: 25,
    expectedCloseDate: '2024-03-15',
    contactId: '1',
    companyId: '1',
    assignedTo: 'Sarah Johnson',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:15:00Z',
    notes: 'Large enterprise deal, needs technical review',
    tags: ['enterprise', 'software'],
  },
  {
    id: '2',
    title: 'Marketing Automation Setup',
    value: 25000,
    stage: 'qualification',
    probability: 60,
    expectedCloseDate: '2024-02-28',
    contactId: '2',
    companyId: '2',
    assignedTo: 'Mike Wilson',
    createdAt: '2024-01-10T09:20:00Z',
    updatedAt: '2024-01-22T11:45:00Z',
    notes: 'Ready for demo next week',
    tags: ['marketing', 'automation'],
  },
  {
    id: '3',
    title: 'Cloud Infrastructure Migration',
    value: 120000,
    stage: 'proposal',
    probability: 75,
    expectedCloseDate: '2024-02-15',
    contactId: '3',
    companyId: '3',
    assignedTo: 'Jane Doe',
    createdAt: '2024-01-05T16:10:00Z',
    updatedAt: '2024-01-24T13:30:00Z',
    notes: 'Proposal sent, waiting for feedback',
    tags: ['cloud', 'migration', 'high-value'],
  },
  {
    id: '4',
    title: 'CRM Integration Project',
    value: 45000,
    stage: 'negotiation',
    probability: 85,
    expectedCloseDate: '2024-02-10',
    contactId: '4',
    companyId: '4',
    assignedTo: 'Sarah Johnson',
    createdAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-25T10:20:00Z',
    notes: 'Final pricing negotiations in progress',
    tags: ['crm', 'integration'],
  },
  {
    id: '5',
    title: 'Website Redesign Package',
    value: 15000,
    stage: 'closed_won',
    probability: 100,
    expectedCloseDate: '2024-01-30',
    contactId: '5',
    companyId: '5',
    assignedTo: 'Mike Wilson',
    createdAt: '2023-12-15T14:30:00Z',
    updatedAt: '2024-01-28T16:45:00Z',
    notes: 'Deal closed successfully, project started',
    tags: ['website', 'design'],
  },
  {
    id: '6',
    title: 'Legacy System Update',
    value: 35000,
    stage: 'closed_lost',
    probability: 0,
    expectedCloseDate: '2024-01-20',
    contactId: '6',
    companyId: '6',
    assignedTo: 'Jane Doe',
    createdAt: '2023-12-10T11:15:00Z',
    updatedAt: '2024-01-22T09:30:00Z',
    notes: 'Lost to competitor, budget constraints',
    tags: ['legacy', 'systems'],
  },
];

const dealStages = [
  { 
    id: 'prospect', 
    name: 'Prospect', 
    color: 'bg-gray-50 border-gray-200',
    textColor: 'text-gray-600'
  },
  { 
    id: 'qualification', 
    name: 'Qualification', 
    color: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-600'
  },
  { 
    id: 'proposal', 
    name: 'Proposal', 
    color: 'bg-yellow-50 border-yellow-200',
    textColor: 'text-yellow-600'
  },
  { 
    id: 'negotiation', 
    name: 'Negotiation', 
    color: 'bg-orange-50 border-orange-200',
    textColor: 'text-orange-600'
  },
  { 
    id: 'closed_won', 
    name: 'Closed Won', 
    color: 'bg-green-50 border-green-200',
    textColor: 'text-green-600'
  },
  { 
    id: 'closed_lost', 
    name: 'Closed Lost', 
    color: 'bg-red-50 border-red-200',
    textColor: 'text-red-600'
  },
];

const getDealsByStage = (deals: Deal[], stage: string) => {
  return deals.filter(deal => deal.stage === stage);
};

const getStageValue = (deals: Deal[], stage: string) => {
  return deals
    .filter(deal => deal.stage === stage)
    .reduce((sum, deal) => sum + deal.value, 0);
};

const getProbabilityColor = (probability: number) => {
  if (probability >= 80) return 'text-green-600';
  if (probability >= 60) return 'text-yellow-600';
  if (probability >= 40) return 'text-orange-600';
  return 'text-red-600';
};

export default function DealsPage() {
  const { deals, dealsLoading, setDeals, setDealsLoading } = useCrmStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);

  useEffect(() => {
    // Load deals data
    setDealsLoading(true);
    setTimeout(() => {
      setDeals(sampleDeals);
      setDealsLoading(false);
    }, 1000);
  }, [setDeals, setDealsLoading]);

  const filteredDeals = deals.filter(deal => 
    deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (deal.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (deal.assignedTo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (draggedDeal && draggedDeal.stage !== targetStage) {
      // Update deal stage
      const updatedDeals = deals.map(deal => 
        deal.id === draggedDeal.id 
          ? { ...deal, stage: targetStage as Deal['stage'] }
          : deal
      );
      setDeals(updatedDeals);
    }
    setDraggedDeal(null);
  };

  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const wonDeals = deals.filter(deal => deal.stage === 'closed_won');
  const totalWonValue = wonDeals.reduce((sum, deal) => sum + deal.value, 0);

  if (dealsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
          <p className="text-gray-600">
            Track deals through your sales pipeline and manage opportunities.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Deal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Pipeline</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalValue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Won Deals</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalWonValue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100">
                <CurrencyDollarIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Average Deal</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${deals.length > 0 ? Math.round(totalValue / deals.length).toLocaleString() : '0'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search deals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 min-h-screen">
        {dealStages.map(stage => {
          const stageDeals = getDealsByStage(filteredDeals, stage.id);
          const stageValue = getStageValue(filteredDeals, stage.id);

          return (
            <div
              key={stage.id}
              className={`${stage.color} border-2 border-dashed rounded-lg p-4`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Stage Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-semibold ${stage.textColor}`}>
                    {stage.name}
                  </h3>
                  <Badge variant="outline" className={stage.textColor}>
                    {stageDeals.length}
                  </Badge>
                </div>
                <p className={`text-sm ${stage.textColor}`}>
                  ${stageValue.toLocaleString()}
                </p>
              </div>

              {/* Deals */}
              <div className="space-y-3">
                {stageDeals.map(deal => (
                  <Card
                    key={deal.id}
                    className="cursor-move hover:shadow-md transition-shadow"
                    draggable
                    onDragStart={() => handleDragStart(deal)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                            {deal.title}
                          </h4>
                          <p className="text-lg font-bold text-gray-900">
                            ${deal.value.toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className={`font-medium ${getProbabilityColor(deal.probability)}`}>
                            {deal.probability}% probability
                          </span>
                        </div>

                        <div className="space-y-2">
                          {deal.assignedTo && (
                            <div className="flex items-center text-xs text-gray-500">
                              <UserIcon className="h-3 w-3 mr-1" />
                              {deal.assignedTo}
                            </div>
                          )}
                          
                          <div className="flex items-center text-xs text-gray-500">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {new Date(deal.expectedCloseDate).toLocaleDateString()}
                          </div>
                        </div>

                        {deal.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {deal.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {deal.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{deal.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDeal(deal);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <EyeIcon className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <PencilIcon className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedDeal(null);
        }}
        title={selectedDeal?.title || 'Deal Details'}
        size="lg"
      >
        {selectedDeal && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Deal Information</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Value: </span>
                    <span className="text-lg font-bold text-gray-900">
                      ${selectedDeal.value.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Stage: </span>
                    <Badge variant="outline">
                      {selectedDeal.stage.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Probability: </span>
                    <span className={`font-medium ${getProbabilityColor(selectedDeal.probability)}`}>
                      {selectedDeal.probability}%
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Expected Close: </span>
                    <span className="font-medium">
                      {new Date(selectedDeal.expectedCloseDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Assignment</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Assigned to: </span>
                    <span className="font-medium">{selectedDeal.assignedTo || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Created: </span>
                    <span className="font-medium">
                      {new Date(selectedDeal.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Last updated: </span>
                    <span className="font-medium">
                      {new Date(selectedDeal.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {selectedDeal.notes && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-gray-600">{selectedDeal.notes}</p>
              </div>
            )}

            {selectedDeal.tags.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDeal.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button>Edit Deal</Button>
              <Button variant="outline">Log Activity</Button>
              <Button variant="outline">Send Proposal</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Deal Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Deal"
        size="lg"
      >
        <form className="space-y-4">
          <Input label="Deal Title" required />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Value" type="number" min="0" required />
            <Input label="Probability %" type="number" min="0" max="100" />
          </div>
          
          <Input label="Expected Close Date" type="date" required />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact" placeholder="Search contacts..." />
            <Input label="Company" placeholder="Search companies..." />
          </div>
          
          <Input label="Assigned To" placeholder="Select team member..." />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes about this deal..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <Input placeholder="e.g. enterprise, urgent, high-value" />
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
              Create Deal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}