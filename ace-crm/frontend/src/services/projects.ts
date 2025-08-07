import { apiClient } from './api';
import { API_ENDPOINTS } from '../config/api';
import { Project, PaginationQuery, FilterQuery, ApiResponse } from '../types';

export const projectsService = {
  // Get all projects with pagination and filtering
  async getProjects(params?: PaginationQuery & FilterQuery): Promise<ApiResponse<Project[]>> {
    const response = await apiClient.get<Project[]>(API_ENDPOINTS.projects.list, {
      params
    });
    return response.data;
  },

  // Get project by ID
  async getProjectById(id: string): Promise<Project> {
    const response = await apiClient.get<Project>(API_ENDPOINTS.projects.get(id));
    return response.data.data!;
  },

  // Create new project
  async createProject(projectData: Partial<Project>): Promise<Project> {
    const response = await apiClient.post<Project>(
      API_ENDPOINTS.projects.create,
      projectData
    );
    return response.data.data!;
  },

  // Update project
  async updateProject(id: string, projectData: Partial<Project>): Promise<Project> {
    const response = await apiClient.put<Project>(
      API_ENDPOINTS.projects.update(id),
      projectData
    );
    return response.data.data!;
  },

  // Delete project
  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.projects.delete(id));
  },

  // Search projects
  async searchProjects(query: string, limit?: number): Promise<Project[]> {
    const response = await apiClient.get<Project[]>(API_ENDPOINTS.projects.search, {
      params: { q: query, limit }
    });
    return response.data.data!;
  }
};