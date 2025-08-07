import { Request } from 'express';
import { Database } from '../config/supabase';

// User roles enum
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user'
}

// Lead status enum
export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL_SENT = 'proposal_sent',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost'
}

// Deal stage enum
export enum DealStage {
  PROSPECTING = 'prospecting',
  QUALIFICATION = 'qualification',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost'
}

// Project status enum
export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled'
}

// Base interfaces
export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  phoneNumber?: string;
  department?: string;
  isActive: boolean;
  lastLogin?: Date;
  refreshToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContact {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  company?: string;
  position?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  notes?: string;
  tags?: string[];
  owner: string; // User ID
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILead {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  company?: string;
  status: LeadStatus;
  source?: string;
  value?: number;
  notes?: string;
  tags?: string[];
  owner: string; // User ID
  createdBy: string;
  updatedBy: string;
  convertedTo?: string; // Deal ID if converted
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeal {
  title: string;
  description?: string;
  value: number;
  stage: DealStage;
  probability?: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  contact: string; // Contact ID
  company: string; // Company ID
  owner: string; // User ID
  notes?: string;
  tags?: string[];
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICompany {
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  phoneNumber?: string;
  email?: string;
  notes?: string;
  tags?: string[];
  owner: string; // User ID
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProject {
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  budget?: number;
  actualCost?: number;
  client: string; // Company ID
  assignedUsers: string[]; // User IDs
  manager: string; // User ID
  notes?: string;
  tags?: string[];
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Request interfaces
export interface AuthRequest extends Request {
  user?: IUser;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface FilterQuery {
  search?: string;
  status?: string;
  role?: string;
  owner?: string;
  createdBy?: string;
  tags?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginResponse {
  user: Omit<IUser, 'password' | 'refreshToken'>;
  accessToken: string;
  refreshToken: string;
}

// JWT payload interface
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Validation schemas types
export interface CreateUserSchema {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  phoneNumber?: string;
  department?: string;
}

export interface UpdateUserSchema {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  department?: string;
}

export interface LoginSchema {
  email: string;
  password: string;
}

export interface ChangePasswordSchema {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}