import axios from 'axios';
import { ApiResponse, PaginatedResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private api;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        return parsed.state?.token || null;
      }
    } catch (error) {
      console.error('Error parsing auth token:', error);
    }
    return null;
  }

  private handleUnauthorized() {
    localStorage.removeItem('auth-storage');
    window.location.href = '/auth/login';
  }

  // Generic GET request
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const response = await this.api.get<ApiResponse<T>>(endpoint, { params });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'API request failed');
    }

    return response.data.data!;
  }

  // Generic POST request
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.api.post<ApiResponse<T>>(endpoint, data);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'API request failed');
    }

    return response.data.data!;
  }

  // Generic PUT request
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.api.put<ApiResponse<T>>(endpoint, data);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'API request failed');
    }

    return response.data.data!;
  }

  // Generic DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.api.delete<ApiResponse<T>>(endpoint);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'API request failed');
    }

    return response.data.data!;
  }

  // Paginated GET request
  async getPaginated<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<PaginatedResponse<T>> {
    const response = await this.api.get<ApiResponse<PaginatedResponse<T>>>(endpoint, { params });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'API request failed');
    }

    return response.data.data!;
  }
}

export const apiClient = new ApiClient();