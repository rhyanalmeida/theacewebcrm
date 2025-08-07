import axios from 'axios';
import { LoginCredentials, RegisterData, User, ApiResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  private api = axios.create({
    baseURL: `${API_URL}/auth`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth-storage');
      if (token) {
        const authData = JSON.parse(token);
        if (authData.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`;
        }
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth-storage');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post<ApiResponse<AuthResponse>>('/login', credentials);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Login failed');
    }

    return response.data.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.api.post<ApiResponse<AuthResponse>>('/register', data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Registration failed');
    }

    return response.data.data;
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await this.api.post<ApiResponse<AuthResponse>>('/refresh');
    
    if (!response.data.success || !response.data.data) {
      throw new Error('Token refresh failed');
    }

    return response.data.data;
  }

  async forgotPassword(email: string): Promise<void> {
    const response = await this.api.post<ApiResponse<void>>('/forgot-password', { email });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Password reset request failed');
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const response = await this.api.post<ApiResponse<void>>('/reset-password', {
      token,
      password,
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Password reset failed');
    }
  }

  logout(): void {
    localStorage.removeItem('auth-storage');
  }
}

export const authService = new AuthService();