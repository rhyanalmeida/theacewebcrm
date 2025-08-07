import { apiClient } from './api';
import { API_ENDPOINTS } from '../config/api';
import { LoginForm, RegisterForm, LoginResponse, User } from '../types';

export const authService = {
  // Authentication methods
  async login(credentials: LoginForm): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.auth.login,
      credentials
    );
    
    // Store tokens
    if (response.data.success && response.data.data) {
      const { accessToken, refreshToken } = response.data.data;
      apiClient.setTokens(accessToken, refreshToken);
    }
    
    return response.data.data!;
  },

  async register(userData: RegisterForm): Promise<User> {
    const response = await apiClient.post<User>(
      API_ENDPOINTS.auth.register,
      userData
    );
    return response.data.data!;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.auth.logout);
    } finally {
      // Always remove tokens, even if API call fails
      apiClient.removeTokens();
    }
  },

  async refreshToken(): Promise<string> {
    const refreshToken = apiClient.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<{ accessToken: string; refreshToken: string }>(
      API_ENDPOINTS.auth.refresh,
      { refreshToken }
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data.data!;
    apiClient.setTokens(accessToken, newRefreshToken);
    
    return accessToken;
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get<User>(API_ENDPOINTS.auth.profile);
    return response.data.data!;
  },

  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>(
      API_ENDPOINTS.auth.profile,
      userData
    );
    return response.data.data!;
  },

  async changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> {
    await apiClient.post(API_ENDPOINTS.auth.changePassword, passwordData);
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.auth.forgotPassword, { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.auth.resetPassword, { 
      token, 
      password 
    });
  },

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await apiClient.post<{ valid: boolean }>(
        API_ENDPOINTS.auth.validateToken,
        { token }
      );
      return response.data.data?.valid || false;
    } catch (error) {
      return false;
    }
  },

  // Utility methods
  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  },

  getAccessToken(): string | null {
    return apiClient.getAccessToken();
  },

  removeTokens(): void {
    apiClient.removeTokens();
  }
};