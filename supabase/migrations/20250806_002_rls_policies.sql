-- Row Level Security (RLS) Policies for ACE CRM
-- Migration: RLS setup with user-based access control

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS FOR RLS
-- =============================================

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT r.name INTO user_role
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_uuid;
    
    RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_user_role(user_uuid) IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is manager
CREATE OR REPLACE FUNCTION public.is_manager(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_user_role(user_uuid) IN ('admin', 'super_admin', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns record or is admin/manager
CREATE OR REPLACE FUNCTION public.can_access_record(owner_id UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN owner_id = user_uuid OR public.is_manager(user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- USER MANAGEMENT POLICIES
-- =============================================

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can insert users" ON public.users
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete users" ON public.users
    FOR DELETE USING (public.is_admin());

-- Roles policies (admin only)
CREATE POLICY "Admins can manage roles" ON public.roles
    FOR ALL USING (public.is_admin());

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user roles" ON public.user_roles
    FOR ALL USING (public.is_admin());

-- =============================================
-- CRM ENTITY POLICIES
-- =============================================

-- Companies policies
CREATE POLICY "Users can view companies they own or manage" ON public.companies
    FOR SELECT USING (public.can_access_record(owner_id));

CREATE POLICY "Users can update companies they own" ON public.companies
    FOR UPDATE USING (owner_id = auth.uid() OR public.is_manager());

CREATE POLICY "Users can insert companies" ON public.companies
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can delete companies" ON public.companies
    FOR DELETE USING (public.is_manager());

-- Contacts policies
CREATE POLICY "Users can view contacts they own or manage" ON public.contacts
    FOR SELECT USING (public.can_access_record(owner_id));

CREATE POLICY "Users can update contacts they own" ON public.contacts
    FOR UPDATE USING (owner_id = auth.uid() OR public.is_manager());

CREATE POLICY "Users can insert contacts" ON public.contacts
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can delete contacts" ON public.contacts
    FOR DELETE USING (public.is_manager());

-- Leads policies
CREATE POLICY "Users can view leads they own or manage" ON public.leads
    FOR SELECT USING (public.can_access_record(owner_id));

CREATE POLICY "Users can update leads they own" ON public.leads
    FOR UPDATE USING (owner_id = auth.uid() OR public.is_manager());

CREATE POLICY "Users can insert leads" ON public.leads
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can delete leads" ON public.leads
    FOR DELETE USING (public.is_manager());

-- Deals policies
CREATE POLICY "Users can view deals they own or manage" ON public.deals
    FOR SELECT USING (public.can_access_record(owner_id));

CREATE POLICY "Users can update deals they own" ON public.deals
    FOR UPDATE USING (owner_id = auth.uid() OR public.is_manager());

CREATE POLICY "Users can insert deals" ON public.deals
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can delete deals" ON public.deals
    FOR DELETE USING (public.is_manager());

-- =============================================
-- PROJECT MANAGEMENT POLICIES
-- =============================================

-- Projects policies
CREATE POLICY "Users can view projects they manage or are assigned to" ON public.projects
    FOR SELECT USING (
        project_manager_id = auth.uid() 
        OR auth.uid() = ANY(team_members) 
        OR public.is_manager()
    );

CREATE POLICY "Project managers can update their projects" ON public.projects
    FOR UPDATE USING (project_manager_id = auth.uid() OR public.is_manager());

CREATE POLICY "Managers can insert projects" ON public.projects
    FOR INSERT WITH CHECK (public.is_manager());

CREATE POLICY "Managers can delete projects" ON public.projects
    FOR DELETE USING (public.is_manager());

-- Tasks policies
CREATE POLICY "Users can view tasks assigned to them or in their projects" ON public.tasks
    FOR SELECT USING (
        assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_id 
            AND (p.project_manager_id = auth.uid() OR auth.uid() = ANY(p.team_members))
        )
        OR public.is_manager()
    );

CREATE POLICY "Users can update tasks assigned to them or project managers" ON public.tasks
    FOR UPDATE USING (
        assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_id 
            AND p.project_manager_id = auth.uid()
        )
        OR public.is_manager()
    );

CREATE POLICY "Project managers can insert tasks" ON public.tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_id 
            AND (p.project_manager_id = auth.uid() OR public.is_manager())
        )
    );

CREATE POLICY "Project managers can delete tasks" ON public.tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_id 
            AND (p.project_manager_id = auth.uid() OR public.is_manager())
        )
    );

-- =============================================
-- ACTIVITY POLICIES
-- =============================================

-- Activity types policies (admin only for system types)
CREATE POLICY "Everyone can view activity types" ON public.activity_types
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage activity types" ON public.activity_types
    FOR ALL USING (public.is_admin());

-- Activities policies
CREATE POLICY "Users can view activities they created or are related to" ON public.activities
    FOR SELECT USING (
        created_by = auth.uid()
        OR (related_to_type = 'contact' AND EXISTS (
            SELECT 1 FROM public.contacts c 
            WHERE c.id = related_to_id::UUID AND public.can_access_record(c.owner_id)
        ))
        OR (related_to_type = 'company' AND EXISTS (
            SELECT 1 FROM public.companies c 
            WHERE c.id = related_to_id::UUID AND public.can_access_record(c.owner_id)
        ))
        OR (related_to_type = 'lead' AND EXISTS (
            SELECT 1 FROM public.leads l 
            WHERE l.id = related_to_id::UUID AND public.can_access_record(l.owner_id)
        ))
        OR (related_to_type = 'deal' AND EXISTS (
            SELECT 1 FROM public.deals d 
            WHERE d.id = related_to_id::UUID AND public.can_access_record(d.owner_id)
        ))
        OR (related_to_type = 'project' AND EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = related_to_id::UUID AND (p.project_manager_id = auth.uid() OR auth.uid() = ANY(p.team_members))
        ))
        OR public.is_manager()
    );

CREATE POLICY "Users can update activities they created" ON public.activities
    FOR UPDATE USING (created_by = auth.uid() OR public.is_manager());

CREATE POLICY "Users can insert activities" ON public.activities
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete activities they created" ON public.activities
    FOR DELETE USING (created_by = auth.uid() OR public.is_manager());

-- =============================================
-- BILLING POLICIES
-- =============================================

-- Invoices policies
CREATE POLICY "Users can view invoices for companies they manage" ON public.invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.companies c 
            WHERE c.id = company_id AND public.can_access_record(c.owner_id)
        )
        OR public.is_manager()
    );

CREATE POLICY "Managers can manage invoices" ON public.invoices
    FOR ALL USING (public.is_manager());

-- Invoice items policies
CREATE POLICY "Users can view invoice items for accessible invoices" ON public.invoice_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.invoices i 
            JOIN public.companies c ON c.id = i.company_id
            WHERE i.id = invoice_id AND public.can_access_record(c.owner_id)
        )
        OR public.is_manager()
    );

CREATE POLICY "Managers can manage invoice items" ON public.invoice_items
    FOR ALL USING (public.is_manager());

-- =============================================
-- CONFIGURATION POLICIES
-- =============================================

-- Settings policies
CREATE POLICY "Everyone can view public settings" ON public.settings
    FOR SELECT USING (is_public = true);

CREATE POLICY "Admins can manage all settings" ON public.settings
    FOR ALL USING (public.is_admin());

-- Custom fields policies
CREATE POLICY "Everyone can view custom fields" ON public.custom_fields
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage custom fields" ON public.custom_fields
    FOR ALL USING (public.is_admin());

-- =============================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions on specific tables to anon for public access
GRANT SELECT ON public.settings TO anon;
GRANT SELECT ON public.custom_fields TO anon;
GRANT SELECT ON public.activity_types TO anon;