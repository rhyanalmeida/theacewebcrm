import { apiClient } from './api';
import { API_ENDPOINTS } from '../config/api';
import { User, RegisterForm, PaginationQuery, FilterQuery, ApiResponse } from '../types';

export const usersService = {
  // Get all users with pagination and filtering
  async getUsers(params?: PaginationQuery & FilterQuery): Promise<ApiResponse<User[]>> {
    const response = await apiClient.get<User[]>(API_ENDPOINTS.users.list, {
      params
    });
    return response.data;
  },

  // Get user by ID
  async getUserById(id: string): Promise<User> {
    const response = await apiClient.get<User>(API_ENDPOINTS.users.get(id));
    return response.data.data!;
  },

  // Create new user
  async createUser(userData: RegisterForm): Promise<User> {
    const response = await apiClient.post<User>(
      API_ENDPOINTS.users.create,
      userData
    );
    return response.data.data!;
  },

  // Update user
  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>(
      API_ENDPOINTS.users.update(id),
      userData
    );
    return response.data.data!;
  },

  // Delete user
  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.users.delete(id));
  },

  // Toggle user status (activate/deactivate)
  async toggleUserStatus(id: string, isActive: boolean): Promise<User> {
    const response = await apiClient.patch<User>(
      API_ENDPOINTS.users.status(id),
      { isActive }
    );
    return response.data.data!;
  },

  // Get user statistics
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
    byDepartment: Record<string, number>;
  }> {
    const response = await apiClient.get<{
      total: number;
      active: number;
      inactive: number;
      byRole: Record<string, number>;
      byDepartment: Record<string, number>;
    }>(API_ENDPOINTS.users.stats);
    return response.data.data!;
  },

  // Search users
  async searchUsers(query: string, limit?: number): Promise<User[]> {
    const response = await apiClient.get<User[]>(API_ENDPOINTS.users.search, {
      params: { q: query, limit }
    });
    return response.data.data!;
  }
};