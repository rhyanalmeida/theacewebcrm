-- Authentication and User Management Functions for Supabase
-- Migration: Auth triggers and user profile management

-- =============================================
-- AUTO USER PROFILE CREATION
-- =============================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
BEGIN
    -- Get default user role
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'user' LIMIT 1;
    
    -- If no default role exists, create one
    IF default_role_id IS NULL THEN
        INSERT INTO public.roles (name, description, permissions)
        VALUES ('user', 'Default user role', '{"read": true, "write": false}')
        RETURNING id INTO default_role_id;
    END IF;

    -- Insert user profile
    INSERT INTO public.users (
        id,
        email,
        first_name,
        last_name,
        email_verified,
        created_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'First'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'Last'),
        NEW.email_confirmed_at IS NOT NULL,
        NEW.created_at
    );

    -- Assign default role
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, default_role_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- USER PROFILE UPDATE FUNCTIONS
-- =============================================

-- Function to sync auth.users changes to public.users
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users
    SET
        email = NEW.email,
        email_verified = NEW.email_confirmed_at IS NOT NULL,
        last_login_at = CASE 
            WHEN NEW.last_sign_in_at > OLD.last_sign_in_at 
            THEN NEW.last_sign_in_at 
            ELSE last_login_at 
        END,
        updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- =============================================
-- USER ROLE MANAGEMENT FUNCTIONS
-- =============================================

-- Function to assign role to user
CREATE OR REPLACE FUNCTION public.assign_user_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    role_record RECORD;
    existing_assignment UUID;
BEGIN
    -- Check if caller is admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Insufficient permissions to assign roles';
    END IF;

    -- Get role ID
    SELECT id, name INTO role_record FROM public.roles WHERE name = role_name;
    
    IF role_record.id IS NULL THEN
        RAISE EXCEPTION 'Role % does not exist', role_name;
    END IF;

    -- Check if assignment already exists
    SELECT id INTO existing_assignment 
    FROM public.user_roles 
    WHERE user_id = user_uuid AND role_id = role_record.id;

    IF existing_assignment IS NOT NULL THEN
        RETURN FALSE; -- Already assigned
    END IF;

    -- Create assignment
    INSERT INTO public.user_roles (user_id, role_id, assigned_by)
    VALUES (user_uuid, role_record.id, auth.uid());

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove role from user
CREATE OR REPLACE FUNCTION public.remove_user_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    role_record RECORD;
BEGIN
    -- Check if caller is admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Insufficient permissions to remove roles';
    END IF;

    -- Get role ID
    SELECT id INTO role_record FROM public.roles WHERE name = role_name;
    
    IF role_record.id IS NULL THEN
        RAISE EXCEPTION 'Role % does not exist', role_name;
    END IF;

    -- Remove assignment
    DELETE FROM public.user_roles 
    WHERE user_id = user_uuid AND role_id = role_record.id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- USER STATUS MANAGEMENT
-- =============================================

-- Function to activate/deactivate user
CREATE OR REPLACE FUNCTION public.set_user_status(user_uuid UUID, new_status TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if caller is admin or the user themselves (for limited status changes)
    IF NOT (public.is_admin() OR (auth.uid() = user_uuid AND new_status = 'active')) THEN
        RAISE EXCEPTION 'Insufficient permissions to change user status';
    END IF;

    -- Validate status
    IF new_status NOT IN ('active', 'inactive', 'suspended') THEN
        RAISE EXCEPTION 'Invalid status: %', new_status;
    END IF;

    -- Update status
    UPDATE public.users
    SET status = new_status, updated_at = NOW()
    WHERE id = user_uuid;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- AUDIT FUNCTIONS
-- =============================================

-- Function to log user login
CREATE OR REPLACE FUNCTION public.log_user_login(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.users
    SET last_login_at = NOW(), updated_at = NOW()
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DEFAULT ROLES AND SETTINGS
-- =============================================

-- Insert default roles if they don't exist
INSERT INTO public.roles (name, description, permissions) 
VALUES 
    ('super_admin', 'Super Administrator with full access', '{"*": true}'),
    ('admin', 'Administrator with management access', '{"read": true, "write": true, "manage": true}'),
    ('manager', 'Manager with team oversight', '{"read": true, "write": true, "manage_team": true}'),
    ('user', 'Standard user with basic access', '{"read": true, "write": true}'),
    ('viewer', 'Read-only access', '{"read": true}')
ON CONFLICT (name) DO NOTHING;

-- Insert default activity types
INSERT INTO public.activity_types (name, icon, color, description, is_system)
VALUES
    ('Email', 'mail', '#3B82F6', 'Email communication', true),
    ('Phone Call', 'phone', '#10B981', 'Phone conversation', true),
    ('Meeting', 'calendar', '#F59E0B', 'Face-to-face or virtual meeting', true),
    ('Note', 'file-text', '#6B7280', 'General note or comment', true),
    ('Task', 'check-square', '#8B5CF6', 'Task or to-do item', true),
    ('Proposal', 'file', '#EF4444', 'Proposal or quote sent', true),
    ('Contract', 'file-signature', '#059669', 'Contract signed', true),
    ('Follow-up', 'clock', '#F97316', 'Follow-up activity', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default system settings
INSERT INTO public.settings (category, key, value, description, is_public)
VALUES
    ('system', 'company_name', '"ACE Web Designers"', 'Company name for branding', true),
    ('system', 'default_currency', '"USD"', 'Default currency for deals and invoices', false),
    ('system', 'default_timezone', '"UTC"', 'Default timezone for new users', true),
    ('system', 'default_language', '"en"', 'Default language for new users', true),
    ('crm', 'default_lead_status', '"new"', 'Default status for new leads', false),
    ('crm', 'default_deal_stage', '"discovery"', 'Default stage for new deals', false),
    ('crm', 'default_project_status', '"planned"', 'Default status for new projects', false),
    ('billing', 'invoice_terms', '"Payment due within 30 days"', 'Default invoice payment terms', false),
    ('billing', 'tax_rate', '0.0875', 'Default tax rate (8.75%)', false),
    ('notifications', 'email_notifications', 'true', 'Enable email notifications', false),
    ('security', 'require_2fa', 'false', 'Require two-factor authentication', false)
ON CONFLICT (category, key) DO NOTHING;