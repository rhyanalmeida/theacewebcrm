import { apiClient } from './api';
import { API_ENDPOINTS } from '../config/api';
import { Deal, PaginationQuery, FilterQuery, ApiResponse } from '../types';

export const dealsService = {
  // Get all deals with pagination and filtering
  async getDeals(params?: PaginationQuery & FilterQuery): Promise<ApiResponse<Deal[]>> {
    const response = await apiClient.get<Deal[]>(API_ENDPOINTS.deals.list, {
      params
    });
    return response.data;
  },

  // Get deal by ID
  async getDealById(id: string): Promise<Deal> {
    const response = await apiClient.get<Deal>(API_ENDPOINTS.deals.get(id));
    return response.data.data!;
  },

  // Create new deal
  async createDeal(dealData: Partial<Deal>): Promise<Deal> {
    const response = await apiClient.post<Deal>(
      API_ENDPOINTS.deals.create,
      dealData
    );
    return response.data.data!;
  },

  // Update deal
  async updateDeal(id: string, dealData: Partial<Deal>): Promise<Deal> {
    const response = await apiClient.put<Deal>(
      API_ENDPOINTS.deals.update(id),
      dealData
    );
    return response.data.data!;
  },

  // Delete deal
  async deleteDeal(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.deals.delete(id));
  },

  // Search deals
  async searchDeals(query: string, limit?: number): Promise<Deal[]> {
    const response = await apiClient.get<Deal[]>(API_ENDPOINTS.deals.search, {
      params: { q: query, limit }
    });
    return response.data.data!;
  },

  // Deal pipeline and statistics
  async getDealStats(dateRange?: { from: string; to: string }): Promise<{
    total: number;
    byStage: Record<string, number>;
    totalValue: number;
    averageValue: number;
    winRate: number;
    averageDealCycle: number;
  }> {
    const response = await apiClient.get<{
      total: number;
      byStage: Record<string, number>;
      totalValue: number;
      averageValue: number;
      winRate: number;
      averageDealCycle: number;
    }>(`${API_ENDPOINTS.deals.list}/stats`, {
      params: dateRange
    });
    return response.data.data!;
  },

  async getPipelineData(): Promise<Array<{
    stage: string;
    deals: Deal[];
    totalValue: number;
    count: number;
  }>> {
    const response = await apiClient.get<Array<{
      stage: string;
      deals: Deal[];
      totalValue: number;
      count: number;
    }>>(`${API_ENDPOINTS.deals.list}/pipeline`);
    return response.data.data!;
  }
};