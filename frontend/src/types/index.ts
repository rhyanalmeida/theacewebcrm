// User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'user';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// CRM Entity Types
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  tags: string[];
  status: 'active' | 'inactive';
  source: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  lastContact?: string;
  notes?: string;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  score: number;
  value?: number;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  tags: string[];
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: 'prospect' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  expectedCloseDate: string;
  contactId?: string;
  companyId?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  tags: string[];
}

export interface Company {
  id: string;
  name: string;
  industry?: string;
  size?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: Address;
  status: 'prospect' | 'client' | 'inactive';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  tags: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  startDate: string;
  endDate?: string;
  budget?: number;
  companyId?: string;
  assignedTo?: string;
  teamMembers: string[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// UI State Types
export interface FilterState {
  search: string;
  status?: string;
  assignedTo?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  tags: string[];
}

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
}

// Dashboard Types
export interface DashboardStats {
  totalContacts: number;
  totalLeads: number;
  totalDeals: number;
  totalProjects: number;
  dealsValue: number;
  monthlyRevenue: number;
  conversionRate: number;
  activeProjects: number;
}

export interface ChartData {
  name: string;
  value: number;
  date?: string;
}

// Form Types
export interface ContactFormData extends Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> {}
export interface LeadFormData extends Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> {}
export interface DealFormData extends Omit<Deal, 'id' | 'createdAt' | 'updatedAt'> {}
export interface CompanyFormData extends Omit<Company, 'id' | 'createdAt' | 'updatedAt'> {}
export interface ProjectFormData extends Omit<Project, 'id' | 'createdAt' | 'updatedAt'> {}

// Table Types
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  onSort?: (field: keyof T, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: T) => void;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}