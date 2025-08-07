-- Storage Configuration for ACE CRM
-- Migration: File storage buckets and policies

-- =============================================
-- STORAGE BUCKETS
-- =============================================

-- Create main files bucket for general uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ace-crm-files',
    'ace-crm-files',
    false,
    52428800, -- 50MB limit
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
    ]
);

-- Create avatars bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    2097152, -- 2MB limit
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
    ]
);

-- Create company logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'company-logos',
    'company-logos',
    true,
    5242880, -- 5MB limit
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml'
    ]
);

-- Create project files bucket for project-specific uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'project-files',
    'project-files',
    false,
    104857600, -- 100MB limit
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'application/zip',
        'application/x-rar-compressed'
    ]
);

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Avatars bucket policies (public read, user can upload their own)
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.uid()::TEXT = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::TEXT = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::TEXT = (storage.foldername(name))[1]
    );

-- Company logos bucket policies (public read, managers can upload)
CREATE POLICY "Company logos are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'company-logos');

CREATE POLICY "Managers can upload company logos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'company-logos' 
        AND public.is_manager()
    );

CREATE POLICY "Managers can update company logos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'company-logos' 
        AND public.is_manager()
    );

CREATE POLICY "Managers can delete company logos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'company-logos' 
        AND public.is_manager()
    );

-- General files bucket policies (private, owner-based access)
CREATE POLICY "Users can view files they uploaded or have access to" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'ace-crm-files' 
        AND (
            auth.uid()::TEXT = (storage.foldername(name))[1]
            OR public.is_manager()
            OR EXISTS (
                -- User has access to the related entity
                SELECT 1 FROM public.companies c 
                WHERE c.id::TEXT = (storage.foldername(name))[2]
                AND public.can_access_record(c.owner_id)
            )
        )
    );

CREATE POLICY "Users can upload files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'ace-crm-files' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can update files they uploaded" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'ace-crm-files' 
        AND (
            auth.uid()::TEXT = (storage.foldername(name))[1]
            OR public.is_manager()
        )
    );

CREATE POLICY "Users can delete files they uploaded" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'ace-crm-files' 
        AND (
            auth.uid()::TEXT = (storage.foldername(name))[1]
            OR public.is_manager()
        )
    );

-- Project files bucket policies (project team access)
CREATE POLICY "Project team can view project files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'project-files' 
        AND (
            public.is_manager()
            OR EXISTS (
                SELECT 1 FROM public.projects p 
                WHERE p.id::TEXT = (storage.foldername(name))[1]
                AND (
                    p.project_manager_id = auth.uid()
                    OR auth.uid() = ANY(p.team_members)
                )
            )
        )
    );

CREATE POLICY "Project team can upload project files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'project-files' 
        AND EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id::TEXT = (storage.foldername(name))[1]
            AND (
                p.project_manager_id = auth.uid()
                OR auth.uid() = ANY(p.team_members)
                OR public.is_manager()
            )
        )
    );

CREATE POLICY "Project team can update project files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'project-files' 
        AND (
            public.is_manager()
            OR EXISTS (
                SELECT 1 FROM public.projects p 
                WHERE p.id::TEXT = (storage.foldername(name))[1]
                AND (
                    p.project_manager_id = auth.uid()
                    OR auth.uid() = ANY(p.team_members)
                )
            )
        )
    );

CREATE POLICY "Project team can delete project files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'project-files' 
        AND (
            public.is_manager()
            OR EXISTS (
                SELECT 1 FROM public.projects p 
                WHERE p.id::TEXT = (storage.foldername(name))[1]
                AND p.project_manager_id = auth.uid()
            )
        )
    );

-- =============================================
-- FILE MANAGEMENT FUNCTIONS
-- =============================================

-- Function to get file URL
CREATE OR REPLACE FUNCTION public.get_file_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN 'https://' || current_setting('app.settings.supabase_url', true) || '/storage/v1/object/public/' || bucket_name || '/' || file_path;
END;
$$ LANGUAGE plpgsql;

-- Function to delete file and update references
CREATE OR REPLACE FUNCTION public.delete_file_and_references(bucket_name TEXT, file_path TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    file_url TEXT;
BEGIN
    -- Construct file URL
    file_url := public.get_file_url(bucket_name, file_path);
    
    -- Delete file from storage
    DELETE FROM storage.objects 
    WHERE bucket_id = bucket_name AND name = file_path;
    
    -- Update references based on bucket
    IF bucket_name = 'avatars' THEN
        UPDATE public.users SET avatar_url = NULL WHERE avatar_url = file_url;
    ELSIF bucket_name = 'company-logos' THEN
        UPDATE public.companies SET logo_url = NULL WHERE logo_url = file_url;
    END IF;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up orphaned files (called by cron job)
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_files()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    file_record RECORD;
BEGIN
    -- Only admins can run cleanup
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    
    -- Clean up avatar files not referenced by users
    FOR file_record IN 
        SELECT bucket_id, name 
        FROM storage.objects 
        WHERE bucket_id = 'avatars'
        AND NOT EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.avatar_url LIKE '%' || name
        )
    LOOP
        DELETE FROM storage.objects 
        WHERE bucket_id = file_record.bucket_id AND name = file_record.name;
        deleted_count := deleted_count + 1;
    END LOOP;
    
    -- Clean up company logo files not referenced by companies
    FOR file_record IN 
        SELECT bucket_id, name 
        FROM storage.objects 
        WHERE bucket_id = 'company-logos'
        AND NOT EXISTS (
            SELECT 1 FROM public.companies c 
            WHERE c.logo_url LIKE '%' || name
        )
    LOOP
        DELETE FROM storage.objects 
        WHERE bucket_id = file_record.bucket_id AND name = file_record.name;
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;