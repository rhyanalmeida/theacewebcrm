import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError,
  InternalAxiosRequestConfig 
} from 'axios';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { API_BASE_URL, REQUEST_TIMEOUT, MAX_RETRIES, RETRY_DELAY } from '../config/api';
import { ApiResponse, LoginResponse } from '../types';

// Token management
const TOKEN_KEY = 'ace_crm_token';
const REFRESH_TOKEN_KEY = 'ace_crm_refresh_token';

class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();
        
        // Add offline detection
        if (!navigator.onLine) {
          throw new Error('No internet connection');
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Handle network errors
        if (!error.response) {
          if (error.code === 'ECONNABORTED') {
            toast.error('Request timeout. Please try again.');
          } else if (error.message === 'No internet connection') {
            toast.error('No internet connection. Please check your network.');
          } else {
            toast.error('Network error. Please check your connection.');
          }
          return Promise.reject(error);
        }

        // Handle 401 errors (Unauthorized)
        if (error.response.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return this.instance(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshAccessToken();
            this.processQueue(null, newToken);
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.instance(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.handleLogout();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle other HTTP errors
        this.handleHttpError(error);
        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  private handleHttpError(error: AxiosError<ApiResponse>) {
    const response = error.response;
    if (!response) return;

    const message = response.data?.message || 'An error occurred';

    switch (response.status) {
      case 400:
        toast.error(`Bad Request: ${message}`);
        break;
      case 403:
        toast.error('Access denied. You don\'t have permission to perform this action.');
        break;
      case 404:
        toast.error('Resource not found.');
        break;
      case 422:
        if (response.data?.errors) {
          response.data.errors.forEach(err => toast.error(err));
        } else {
          toast.error(`Validation Error: ${message}`);
        }
        break;
      case 429:
        toast.error('Too many requests. Please slow down.');
        break;
      case 500:
        toast.error('Server error. Please try again later.');
        break;
      case 503:
        toast.error('Service temporarily unavailable. Please try again later.');
        break;
      default:
        toast.error(message);
    }
  }

  // Token management methods
  public getAccessToken(): string | null {
    return Cookies.get(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  }

  public getRefreshToken(): string | null {
    return Cookies.get(REFRESH_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  public setTokens(accessToken: string, refreshToken: string): void {
    // Use secure cookies in production
    const secure = window.location.protocol === 'https:';
    
    Cookies.set(TOKEN_KEY, accessToken, { 
      expires: 7, 
      secure, 
      sameSite: 'strict' 
    });
    
    Cookies.set(REFRESH_TOKEN_KEY, refreshToken, { 
      expires: 30, 
      secure, 
      sameSite: 'strict' 
    });
    
    // Fallback to localStorage
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  public removeTokens(): void {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      this.setTokens(accessToken, newRefreshToken);
      
      return accessToken;
    } catch (error) {
      this.removeTokens();
      throw error;
    }
  }

  private handleLogout(): void {
    this.removeTokens();
    window.location.href = '/login';
  }

  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Retry logic for failed requests
  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    retries: number = MAX_RETRIES
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error as AxiosError)) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.retryRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: AxiosError): boolean {
    // Retry on network errors or 5xx server errors
    return !error.response || 
           (error.response.status >= 500 && error.response.status <= 599) ||
           error.code === 'ECONNABORTED';
  }

  // HTTP methods with retry logic
  public async get<T = any>(
    url: string, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.retryRequest(() => this.instance.get(url, config));
  }

  public async post<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.retryRequest(() => this.instance.post(url, data, config));
  }

  public async put<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.retryRequest(() => this.instance.put(url, data, config));
  }

  public async patch<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.retryRequest(() => this.instance.patch(url, data, config));
  }

  public async delete<T = any>(
    url: string, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.retryRequest(() => this.instance.delete(url, config));
  }

  // Upload method with progress tracking
  public async upload<T = any>(
    url: string,
    formData: FormData,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.instance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // Get instance for direct use
  public getInstance(): AxiosInstance {
    return this.instance;
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();
export default apiClient;