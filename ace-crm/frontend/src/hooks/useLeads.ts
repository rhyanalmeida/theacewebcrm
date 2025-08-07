import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsService } from '../services/leads';
import { CACHE_KEYS } from '../config/api';
import { Lead, LeadForm, Deal, PaginationQuery, FilterQuery } from '../types';
import toast from 'react-hot-toast';

export const useLeads = (params?: PaginationQuery & FilterQuery) => {
  const queryClient = useQueryClient();

  // Get leads query
  const leadsQuery = useQuery({
    queryKey: [...CACHE_KEYS.leads, params],
    queryFn: () => leadsService.getLeads(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Get lead stats query
  const leadStatsQuery = useQuery({
    queryKey: [...CACHE_KEYS.leads, 'stats'],
    queryFn: () => leadsService.getLeadStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: (leadData: LeadForm) => leadsService.createLead(leadData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.leads });
      toast.success('Lead created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create lead');
    },
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LeadForm> }) =>
      leadsService.updateLead(id, data),
    onSuccess: (updatedLead) => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.leads });
      queryClient.setQueryData(['leads', updatedLead._id], updatedLead);
      toast.success('Lead updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update lead');
    },
  });

  // Delete lead mutation
  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) => leadsService.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.leads });
      toast.success('Lead deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete lead');
    },
  });

  // Convert lead to deal mutation
  const convertLeadMutation = useMutation({
    mutationFn: ({ id, dealData }: { 
      id: string; 
      dealData: { title: string; value: number; expectedCloseDate?: string; notes?: string; }
    }) => leadsService.convertLead(id, dealData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.leads });
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.deals });
      toast.success('Lead converted to deal successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to convert lead');
    },
  });

  // Bulk update leads mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (updates: Array<{ id: string; data: Partial<LeadForm> }>) =>
      leadsService.bulkUpdateLeads(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.leads });
      toast.success('Leads updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update leads');
    },
  });

  // Bulk delete leads mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => leadsService.bulkDeleteLeads(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.leads });
      toast.success('Leads deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete leads');
    },
  });

  return {
    // Data
    leads: leadsQuery.data?.data || [],
    leadStats: leadStatsQuery.data,
    meta: leadsQuery.data?.meta,

    // Loading states
    isLoading: leadsQuery.isLoading,
    isStatsLoading: leadStatsQuery.isLoading,
    isCreating: createLeadMutation.isPending,
    isUpdating: updateLeadMutation.isPending,
    isDeleting: deleteLeadMutation.isPending,
    isConverting: convertLeadMutation.isPending,
    isBulkUpdating: bulkUpdateMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,

    // Error states
    error: leadsQuery.error,
    statsError: leadStatsQuery.error,

    // Actions
    createLead: createLeadMutation.mutate,
    updateLead: updateLeadMutation.mutate,
    deleteLead: deleteLeadMutation.mutate,
    convertLead: convertLeadMutation.mutate,
    bulkUpdateLeads: bulkUpdateMutation.mutate,
    bulkDeleteLeads: bulkDeleteMutation.mutate,
    refetch: leadsQuery.refetch,
  };
};

export const useLead = (id: string) => {
  const queryClient = useQueryClient();

  const leadQuery = useQuery({
    queryKey: ['leads', id],
    queryFn: () => leadsService.getLeadById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const leadActivitiesQuery = useQuery({
    queryKey: ['leads', id, 'activities'],
    queryFn: () => leadsService.getLeadActivities(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const scoreLeadMutation = useMutation({
    mutationFn: () => leadsService.scoreLead(id),
    onSuccess: () => {
      toast.success('Lead scored successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to score lead');
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: (activity: {
      type: string;
      description: string;
      date: string;
      outcome?: string;
    }) => leadsService.addLeadActivity(id, activity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', id, 'activities'] });
      toast.success('Activity added successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add activity');
    },
  });

  return {
    lead: leadQuery.data,
    activities: leadActivitiesQuery.data || [],
    isLoading: leadQuery.isLoading,
    isActivitiesLoading: leadActivitiesQuery.isLoading,
    isScoring: scoreLeadMutation.isPending,
    isAddingActivity: addActivityMutation.isPending,
    error: leadQuery.error,
    scoreLead: scoreLeadMutation.mutate,
    scoreData: scoreLeadMutation.data,
    addActivity: addActivityMutation.mutate,
    refetch: leadQuery.refetch,
  };
};

export const useLeadSearch = () => {
  const searchLeadsMutation = useMutation({
    mutationFn: ({ query, limit }: { query: string; limit?: number }) =>
      leadsService.searchLeads(query, limit),
  });

  return {
    searchLeads: searchLeadsMutation.mutate,
    results: searchLeadsMutation.data || [],
    isSearching: searchLeadsMutation.isPending,
    searchError: searchLeadsMutation.error,
  };
};