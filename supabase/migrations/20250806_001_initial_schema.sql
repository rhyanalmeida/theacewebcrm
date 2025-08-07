-- ACE CRM Database Schema Migration for Supabase
-- PostgreSQL 15+ with UUID support and advanced features
-- Migration: Initial schema creation

-- Enable UUID generation and extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =============================================
-- CORE USER MANAGEMENT TABLES
-- =============================================

-- Users table for authentication and basic user info
-- Note: auth.users is handled by Supabase Auth, this extends it
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email CITEXT UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles for role-based access control
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User role assignments
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- =============================================
-- CRM CORE ENTITIES
-- =============================================

-- Companies/Organizations
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    website TEXT,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    annual_revenue DECIMAL(15,2),
    description TEXT,
    logo_url TEXT,
    address JSONB, -- {street, city, state, country, postal_code}
    social_media JSONB, -- {linkedin, twitter, facebook, instagram}
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
    owner_id UUID REFERENCES public.users(id),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts/People
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    email CITEXT UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    title VARCHAR(100),
    department VARCHAR(100),
    phone VARCHAR(20),
    mobile_phone VARCHAR(20),
    avatar_url TEXT,
    linkedin_url TEXT,
    address JSONB,
    birthday DATE,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'unqualified')),
    lead_source VARCHAR(100),
    owner_id UUID REFERENCES public.users(id),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads (potential customers)
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    lead_source VARCHAR(100),
    estimated_value DECIMAL(12,2),
    estimated_close_date DATE,
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    next_action TEXT,
    next_action_date TIMESTAMPTZ,
    owner_id UUID REFERENCES public.users(id),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals/Opportunities
CREATE TABLE public.deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deal_type VARCHAR(100), -- 'website_design', 'maintenance', 'consultation', etc.
    stage VARCHAR(50) DEFAULT 'discovery' CHECK (stage IN ('discovery', 'proposal', 'negotiation', 'contract', 'project', 'completed', 'lost')),
    value DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    close_date DATE,
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    next_action TEXT,
    next_action_date TIMESTAMPTZ,
    won_reason TEXT,
    lost_reason TEXT,
    competitor VARCHAR(255),
    owner_id UUID REFERENCES public.users(id),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROJECT MANAGEMENT
-- =============================================

-- Projects (work delivery)
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'on_hold', 'completed', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    start_date DATE,
    due_date DATE,
    completion_date DATE,
    budget DECIMAL(12,2),
    hours_estimated INTEGER,
    hours_actual INTEGER,
    project_manager_id UUID REFERENCES public.users(id),
    team_members UUID[], -- Array of user IDs
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project tasks
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES public.users(id),
    due_date TIMESTAMPTZ,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    order_index INTEGER DEFAULT 0,
    tags TEXT[],
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COMMUNICATION & ACTIVITIES
-- =============================================

-- Activity types
CREATE TABLE public.activity_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7), -- Hex color
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities (emails, calls, meetings, notes)
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_id UUID REFERENCES public.activity_types(id),
    subject VARCHAR(255) NOT NULL,
    body TEXT,
    activity_date TIMESTAMPTZ DEFAULT NOW(),
    duration_minutes INTEGER,
    
    -- Relations (polymorphic)
    related_to_type VARCHAR(50), -- 'contact', 'company', 'lead', 'deal', 'project'
    related_to_id UUID,
    
    -- Participants
    participants JSONB DEFAULT '[]', -- Array of contact/user references
    location TEXT,
    meeting_url TEXT,
    
    -- Email specific
    email_from TEXT,
    email_to TEXT[],
    email_cc TEXT[],
    email_bcc TEXT[],
    email_message_id TEXT,
    
    -- Call specific
    call_outcome VARCHAR(100),
    phone_number VARCHAR(20),
    
    -- Attachments
    attachments JSONB DEFAULT '[]',
    
    is_completed BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BILLING & INVOICING
-- =============================================

-- Invoices
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_date DATE,
    
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_rate DECIMAL(5,4) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    notes TEXT,
    terms TEXT,
    
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice line items
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SETTINGS & CONFIGURATION
-- =============================================

-- System settings
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category, key)
);

-- Custom fields for flexible data
CREATE TABLE public.custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'contact', 'company', 'lead', 'deal', 'project'
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL, -- 'text', 'number', 'date', 'select', 'multi_select', 'boolean'
    field_options JSONB, -- For select fields
    is_required BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_type, field_name)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_status ON public.users(status);

-- Company indexes
CREATE INDEX idx_companies_name ON public.companies(name);
CREATE INDEX idx_companies_owner_id ON public.companies(owner_id);
CREATE INDEX idx_companies_status ON public.companies(status);

-- Contact indexes
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX idx_contacts_owner_id ON public.contacts(owner_id);
CREATE INDEX idx_contacts_name ON public.contacts(first_name, last_name);

-- Lead indexes
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_owner_id ON public.leads(owner_id);
CREATE INDEX idx_leads_contact_id ON public.leads(contact_id);
CREATE INDEX idx_leads_close_date ON public.leads(estimated_close_date);

-- Deal indexes
CREATE INDEX idx_deals_stage ON public.deals(stage);
CREATE INDEX idx_deals_owner_id ON public.deals(owner_id);
CREATE INDEX idx_deals_company_id ON public.deals(company_id);
CREATE INDEX idx_deals_close_date ON public.deals(close_date);
CREATE INDEX idx_deals_value ON public.deals(value);

-- Project indexes
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_company_id ON public.projects(company_id);
CREATE INDEX idx_projects_manager_id ON public.projects(project_manager_id);
CREATE INDEX idx_projects_due_date ON public.projects(due_date);

-- Task indexes
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

-- Activity indexes
CREATE INDEX idx_activities_related ON public.activities(related_to_type, related_to_id);
CREATE INDEX idx_activities_date ON public.activities(activity_date);
CREATE INDEX idx_activities_created_by ON public.activities(created_by);

-- Invoice indexes
CREATE INDEX idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();