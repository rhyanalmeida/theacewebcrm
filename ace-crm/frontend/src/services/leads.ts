import { apiClient } from './api';
import { API_ENDPOINTS } from '../config/api';
import { Lead, LeadForm, PaginationQuery, FilterQuery, ApiResponse, Deal } from '../types';

export const leadsService = {
  // Get all leads with pagination and filtering
  async getLeads(params?: PaginationQuery & FilterQuery): Promise<ApiResponse<Lead[]>> {
    const response = await apiClient.get<Lead[]>(API_ENDPOINTS.leads.list, {
      params
    });
    return response.data;
  },

  // Get lead by ID
  async getLeadById(id: string): Promise<Lead> {
    const response = await apiClient.get<Lead>(API_ENDPOINTS.leads.get(id));
    return response.data.data!;
  },

  // Create new lead
  async createLead(leadData: LeadForm): Promise<Lead> {
    const response = await apiClient.post<Lead>(
      API_ENDPOINTS.leads.create,
      leadData
    );
    return response.data.data!;
  },

  // Update lead
  async updateLead(id: string, leadData: Partial<LeadForm>): Promise<Lead> {
    const response = await apiClient.put<Lead>(
      API_ENDPOINTS.leads.update(id),
      leadData
    );
    return response.data.data!;
  },

  // Delete lead
  async deleteLead(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.leads.delete(id));
  },

  // Convert lead to deal
  async convertLead(id: string, dealData: {
    title: string;
    value: number;
    expectedCloseDate?: string;
    notes?: string;
  }): Promise<Deal> {
    const response = await apiClient.post<Deal>(
      API_ENDPOINTS.leads.convert(id),
      dealData
    );
    return response.data.data!;
  },

  // Search leads
  async searchLeads(query: string, limit?: number): Promise<Lead[]> {
    const response = await apiClient.get<Lead[]>(API_ENDPOINTS.leads.search, {
      params: { q: query, limit }
    });
    return response.data.data!;
  },

  // Get lead statistics
  async getLeadStats(dateRange?: { from: string; to: string }): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    conversionRate: number;
    totalValue: number;
    averageValue: number;
  }> {
    const response = await apiClient.get<{
      total: number;
      byStatus: Record<string, number>;
      bySource: Record<string, number>;
      conversionRate: number;
      totalValue: number;
      averageValue: number;
    }>(`${API_ENDPOINTS.leads.list}/stats`, {
      params: dateRange
    });
    return response.data.data!;
  },

  // Bulk operations
  async bulkUpdateLeads(updates: Array<{
    id: string;
    data: Partial<LeadForm>;
  }>): Promise<Lead[]> {
    const response = await apiClient.patch<Lead[]>(
      `${API_ENDPOINTS.leads.list}/bulk`,
      { updates }
    );
    return response.data.data!;
  },

  async bulkDeleteLeads(ids: string[]): Promise<void> {
    await apiClient.delete(`${API_ENDPOINTS.leads.list}/bulk`, {
      data: { ids }
    });
  },

  // Lead scoring and qualification
  async scoreLead(id: string): Promise<{
    score: number;
    factors: Array<{ name: string; weight: number; value: number }>;
  }> {
    const response = await apiClient.post<{
      score: number;
      factors: Array<{ name: string; weight: number; value: number }>;
    }>(`${API_ENDPOINTS.leads.get(id)}/score`);
    return response.data.data!;
  },

  // Lead nurturing
  async addLeadActivity(id: string, activity: {
    type: string;
    description: string;
    date: string;
    outcome?: string;
  }): Promise<void> {
    await apiClient.post(`${API_ENDPOINTS.leads.get(id)}/activities`, activity);
  },

  async getLeadActivities(id: string): Promise<Array<{
    id: string;
    type: string;
    description: string;
    date: string;
    outcome?: string;
    createdBy: string;
  }>> {
    const response = await apiClient.get<Array<{
      id: string;
      type: string;
      description: string;
      date: string;
      outcome?: string;
      createdBy: string;
    }>>(`${API_ENDPOINTS.leads.get(id)}/activities`);
    return response.data.data!;
  }
};