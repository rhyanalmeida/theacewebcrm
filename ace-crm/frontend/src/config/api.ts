export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Auth endpoints
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    profile: '/auth/profile',
    changePassword: '/auth/change-password',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    validateToken: '/auth/validate-token',
  },
  
  // User endpoints
  users: {
    list: '/users',
    create: '/users',
    get: (id: string) => `/users/${id}`,
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`,
    status: (id: string) => `/users/${id}/status`,
    stats: '/users/stats',
    search: '/users/search',
  },
  
  // Contact endpoints
  contacts: {
    list: '/contacts',
    create: '/contacts',
    get: (id: string) => `/contacts/${id}`,
    update: (id: string) => `/contacts/${id}`,
    delete: (id: string) => `/contacts/${id}`,
    search: '/contacts/search',
  },
  
  // Lead endpoints
  leads: {
    list: '/leads',
    create: '/leads',
    get: (id: string) => `/leads/${id}`,
    update: (id: string) => `/leads/${id}`,
    delete: (id: string) => `/leads/${id}`,
    convert: (id: string) => `/leads/${id}/convert`,
    search: '/leads/search',
  },
  
  // Deal endpoints
  deals: {
    list: '/deals',
    create: '/deals',
    get: (id: string) => `/deals/${id}`,
    update: (id: string) => `/deals/${id}`,
    delete: (id: string) => `/deals/${id}`,
    search: '/deals/search',
  },
  
  // Company endpoints
  companies: {
    list: '/companies',
    create: '/companies',
    get: (id: string) => `/companies/${id}`,
    update: (id: string) => `/companies/${id}`,
    delete: (id: string) => `/companies/${id}`,
    search: '/companies/search',
  },
  
  // Project endpoints
  projects: {
    list: '/projects',
    create: '/projects',
    get: (id: string) => `/projects/${id}`,
    update: (id: string) => `/projects/${id}`,
    delete: (id: string) => `/projects/${id}`,
    search: '/projects/search',
  },
  
  // File upload endpoints
  files: {
    upload: '/files/upload',
    download: (id: string) => `/files/${id}`,
    delete: (id: string) => `/files/${id}`,
  }
};

export const CACHE_KEYS = {
  users: ['users'],
  contacts: ['contacts'],
  leads: ['leads'],
  deals: ['deals'],
  companies: ['companies'],
  projects: ['projects'],
  profile: ['auth', 'profile'],
  userStats: ['users', 'stats'],
};

export const CACHE_TIMES = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 15 * 60 * 1000, // 15 minutes
  LONG: 60 * 60 * 1000, // 1 hour
};

export const REQUEST_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000; // 1 second