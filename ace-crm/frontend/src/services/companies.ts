import { apiClient } from './api';
import { API_ENDPOINTS } from '../config/api';
import { Company, PaginationQuery, FilterQuery, ApiResponse } from '../types';

export const companiesService = {
  // Get all companies with pagination and filtering
  async getCompanies(params?: PaginationQuery & FilterQuery): Promise<ApiResponse<Company[]>> {
    const response = await apiClient.get<Company[]>(API_ENDPOINTS.companies.list, {
      params
    });
    return response.data;
  },

  // Get company by ID
  async getCompanyById(id: string): Promise<Company> {
    const response = await apiClient.get<Company>(API_ENDPOINTS.companies.get(id));
    return response.data.data!;
  },

  // Create new company
  async createCompany(companyData: Partial<Company>): Promise<Company> {
    const response = await apiClient.post<Company>(
      API_ENDPOINTS.companies.create,
      companyData
    );
    return response.data.data!;
  },

  // Update company
  async updateCompany(id: string, companyData: Partial<Company>): Promise<Company> {
    const response = await apiClient.put<Company>(
      API_ENDPOINTS.companies.update(id),
      companyData
    );
    return response.data.data!;
  },

  // Delete company
  async deleteCompany(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.companies.delete(id));
  },

  // Search companies
  async searchCompanies(query: string, limit?: number): Promise<Company[]> {
    const response = await apiClient.get<Company[]>(API_ENDPOINTS.companies.search, {
      params: { q: query, limit }
    });
    return response.data.data!;
  }
};