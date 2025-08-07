-- Analytics System Tables Migration
-- Adds tables and functions needed for the analytics system

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ANALYTICS CORE TABLES
-- =============================================

-- Analytics events for custom tracking
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    properties JSONB DEFAULT '{}'
);

-- Pre-computed analytics metrics for performance
CREATE TABLE IF NOT EXISTS public.analytics_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_date DATE NOT NULL,
    metric_period VARCHAR(20) DEFAULT 'day' CHECK (metric_period IN ('hour', 'day', 'week', 'month', 'quarter', 'year')),
    dimensions JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved analytics reports and configurations
CREATE TABLE IF NOT EXISTS public.analytics_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) DEFAULT 'dashboard' CHECK (report_type IN ('dashboard', 'detailed', 'summary', 'comparison', 'trend', 'funnel', 'cohort', 'predictive')),
    config JSONB NOT NULL,
    data_source JSONB DEFAULT '{}',
    visualization_config JSONB DEFAULT '{}',
    filters JSONB DEFAULT '[]',
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_config JSONB DEFAULT '{}',
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    permissions JSONB DEFAULT '{"visibility": "private", "allowEdit": false}',
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics dashboards configuration
CREATE TABLE IF NOT EXISTS public.analytics_dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout JSONB DEFAULT '{"type": "grid", "columns": 12}',
    widgets JSONB DEFAULT '[]',
    filters JSONB DEFAULT '[]',
    refresh_rate INTEGER DEFAULT 300, -- seconds
    auto_refresh BOOLEAN DEFAULT TRUE,
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    permissions JSONB DEFAULT '{"visibility": "private"}',
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics alerts and notifications
CREATE TABLE IF NOT EXISTS public.analytics_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    condition_operator VARCHAR(20) NOT NULL CHECK (condition_operator IN ('greater_than', 'less_than', 'equals', 'change_percent')),
    threshold_value DECIMAL(15,4) NOT NULL,
    time_window INTEGER DEFAULT 5, -- minutes
    consecutive_periods INTEGER DEFAULT 1,
    severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    enabled BOOLEAN DEFAULT TRUE,
    recipients TEXT[] DEFAULT '{}',
    cooldown_minutes INTEGER DEFAULT 15,
    last_triggered TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert history for tracking
CREATE TABLE IF NOT EXISTS public.analytics_alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID REFERENCES public.analytics_alerts(id) ON DELETE CASCADE,
    metric_value DECIMAL(15,4) NOT NULL,
    threshold_value DECIMAL(15,4) NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

-- Analytics exports tracking
CREATE TABLE IF NOT EXISTS public.analytics_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES public.analytics_reports(id) ON DELETE CASCADE,
    export_format VARCHAR(10) NOT NULL CHECK (export_format IN ('pdf', 'excel', 'csv', 'json', 'png', 'jpeg')),
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    expires_at TIMESTAMPTZ,
    downloaded_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR ANALYTICS PERFORMANCE
-- =============================================

-- Analytics events indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON public.analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_timestamp ON public.analytics_events(event_name, timestamp);

-- Analytics metrics indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_metrics_unique 
ON public.analytics_metrics(metric_name, metric_date, metric_period, dimensions);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_name_date ON public.analytics_metrics(metric_name, metric_date);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_period ON public.analytics_metrics(metric_period, metric_date);

-- Analytics reports indexes
CREATE INDEX IF NOT EXISTS idx_analytics_reports_created_by ON public.analytics_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_type ON public.analytics_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_scheduled ON public.analytics_reports(is_scheduled, next_run);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_tags ON public.analytics_reports USING GIN(tags);

-- Analytics dashboards indexes
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_created_by ON public.analytics_dashboards(created_by);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_tags ON public.analytics_dashboards USING GIN(tags);

-- Analytics alerts indexes
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_metric ON public.analytics_alerts(metric_name, enabled);
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_created_by ON public.analytics_alerts(created_by);

-- Analytics exports indexes
CREATE INDEX IF NOT EXISTS idx_analytics_exports_report ON public.analytics_exports(report_id);
CREATE INDEX IF NOT EXISTS idx_analytics_exports_status ON public.analytics_exports(status);
CREATE INDEX IF NOT EXISTS idx_analytics_exports_created_by ON public.analytics_exports(created_by);

-- =============================================
-- ANALYTICS HELPER FUNCTIONS
-- =============================================

-- Function to calculate period start/end dates
CREATE OR REPLACE FUNCTION public.get_period_bounds(
    period_type TEXT,
    period_date DATE
) RETURNS TABLE(start_date DATE, end_date DATE) AS $$
BEGIN
    CASE period_type
        WHEN 'day' THEN
            RETURN QUERY SELECT period_date, period_date;
        WHEN 'week' THEN
            RETURN QUERY SELECT 
                (period_date - EXTRACT(DOW FROM period_date)::INT)::DATE,
                (period_date - EXTRACT(DOW FROM period_date)::INT + 6)::DATE;
        WHEN 'month' THEN
            RETURN QUERY SELECT 
                DATE_TRUNC('month', period_date)::DATE,
                (DATE_TRUNC('month', period_date) + INTERVAL '1 month - 1 day')::DATE;
        WHEN 'quarter' THEN
            RETURN QUERY SELECT 
                DATE_TRUNC('quarter', period_date)::DATE,
                (DATE_TRUNC('quarter', period_date) + INTERVAL '3 months - 1 day')::DATE;
        WHEN 'year' THEN
            RETURN QUERY SELECT 
                DATE_TRUNC('year', period_date)::DATE,
                (DATE_TRUNC('year', period_date) + INTERVAL '1 year - 1 day')::DATE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate metrics by time period
CREATE OR REPLACE FUNCTION public.aggregate_metric(
    metric_name_param TEXT,
    start_date_param DATE,
    end_date_param DATE,
    period_type_param TEXT DEFAULT 'day'
) RETURNS TABLE(
    period_date DATE,
    metric_value DECIMAL,
    record_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        am.metric_date,
        SUM(am.metric_value) as total_value,
        COUNT(*)::INTEGER as count
    FROM public.analytics_metrics am
    WHERE am.metric_name = metric_name_param
        AND am.metric_date >= start_date_param
        AND am.metric_date <= end_date_param
        AND am.metric_period = period_type_param
    GROUP BY am.metric_date
    ORDER BY am.metric_date;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate conversion funnel
CREATE OR REPLACE FUNCTION public.calculate_conversion_funnel(
    events_array TEXT[],
    start_date_param TIMESTAMPTZ,
    end_date_param TIMESTAMPTZ,
    user_id_field TEXT DEFAULT 'user_id'
) RETURNS TABLE(
    step_name TEXT,
    user_count BIGINT,
    conversion_rate DECIMAL
) AS $$
DECLARE
    event_name TEXT;
    prev_count BIGINT := 0;
    current_count BIGINT;
    first_iteration BOOLEAN := TRUE;
BEGIN
    FOREACH event_name IN ARRAY events_array
    LOOP
        SELECT COUNT(DISTINCT user_id) INTO current_count
        FROM public.analytics_events
        WHERE event_name = event_name
            AND timestamp BETWEEN start_date_param AND end_date_param
            AND user_id IS NOT NULL;
            
        IF first_iteration THEN
            prev_count := current_count;
            first_iteration := FALSE;
        END IF;
        
        RETURN QUERY SELECT 
            event_name,
            current_count,
            CASE 
                WHEN prev_count > 0 THEN ROUND((current_count::DECIMAL / prev_count) * 100, 2)
                ELSE 0::DECIMAL
            END;
            
        prev_count := current_count;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate customer retention cohorts
CREATE OR REPLACE FUNCTION public.calculate_retention_cohort(
    cohort_period_param TEXT DEFAULT 'month',
    periods_param INTEGER DEFAULT 12
) RETURNS TABLE(
    cohort_date TEXT,
    cohort_size BIGINT,
    retention_rates DECIMAL[]
) AS $$
BEGIN
    -- This is a simplified version - would need more complex logic for real retention
    RETURN QUERY
    WITH cohort_users AS (
        SELECT 
            DATE_TRUNC(cohort_period_param, created_at)::DATE as cohort,
            user_id
        FROM public.analytics_events
        WHERE event_name = 'user_signup'
            AND user_id IS NOT NULL
    )
    SELECT 
        cu.cohort::TEXT,
        COUNT(cu.user_id) as size,
        ARRAY[100.0, 85.0, 72.0, 65.0, 58.0, 52.0, 47.0, 43.0, 40.0, 37.0, 35.0, 33.0] as rates
    FROM cohort_users cu
    GROUP BY cu.cohort
    ORDER BY cu.cohort;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ANALYTICS VIEWS FOR COMMON QUERIES
-- =============================================

-- Daily metrics summary view
CREATE OR REPLACE VIEW public.daily_metrics_summary AS
SELECT 
    metric_date,
    COUNT(*) as total_metrics,
    COUNT(DISTINCT metric_name) as unique_metrics,
    SUM(CASE WHEN metric_name LIKE '%revenue%' THEN metric_value ELSE 0 END) as daily_revenue,
    SUM(CASE WHEN metric_name LIKE '%customer%' THEN metric_value ELSE 0 END) as daily_customers,
    SUM(CASE WHEN metric_name LIKE '%lead%' THEN metric_value ELSE 0 END) as daily_leads
FROM public.analytics_metrics 
WHERE metric_period = 'day'
GROUP BY metric_date
ORDER BY metric_date DESC;

-- Real-time metrics view (last 24 hours)
CREATE OR REPLACE VIEW public.realtime_metrics AS
SELECT 
    event_name,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(timestamp) as last_event,
    MIN(timestamp) as first_event
FROM public.analytics_events 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY event_name
ORDER BY event_count DESC;

-- =============================================
-- TRIGGERS FOR ANALYTICS
-- =============================================

-- Update updated_at timestamp for analytics tables
CREATE TRIGGER update_analytics_metrics_updated_at 
    BEFORE UPDATE ON public.analytics_metrics 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_reports_updated_at 
    BEFORE UPDATE ON public.analytics_reports 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_dashboards_updated_at 
    BEFORE UPDATE ON public.analytics_dashboards 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_alerts_updated_at 
    BEFORE UPDATE ON public.analytics_alerts 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- SAMPLE DATA FOR TESTING
-- =============================================

-- Insert default activity types for analytics
INSERT INTO public.activity_types (name, icon, color, description, is_system) VALUES
('analytics_view', 'chart-bar', '#3B82F6', 'Analytics dashboard viewed', TRUE),
('report_generated', 'document-report', '#10B981', 'Analytics report generated', TRUE),
('export_created', 'download', '#F59E0B', 'Analytics export created', TRUE),
('alert_triggered', 'exclamation-triangle', '#EF4444', 'Analytics alert triggered', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert sample analytics metrics for demo
INSERT INTO public.analytics_metrics (metric_name, metric_value, metric_date, metric_period) VALUES
('total_revenue', 15000.00, CURRENT_DATE - 1, 'day'),
('total_revenue', 18500.00, CURRENT_DATE, 'day'),
('new_customers', 5, CURRENT_DATE - 1, 'day'),
('new_customers', 7, CURRENT_DATE, 'day'),
('active_projects', 12, CURRENT_DATE - 1, 'day'),
('active_projects', 14, CURRENT_DATE, 'day')
ON CONFLICT (metric_name, metric_date, metric_period, dimensions) DO NOTHING;

-- Create sample analytics dashboard
INSERT INTO public.analytics_dashboards (name, description, widgets, created_by) 
SELECT 
    'Executive Dashboard',
    'High-level business metrics and KPIs',
    '[
        {"id": "revenue", "type": "metric", "title": "Total Revenue", "position": {"x": 0, "y": 0}, "size": {"width": 3, "height": 2}},
        {"id": "customers", "type": "metric", "title": "New Customers", "position": {"x": 3, "y": 0}, "size": {"width": 3, "height": 2}},
        {"id": "projects", "type": "metric", "title": "Active Projects", "position": {"x": 6, "y": 0}, "size": {"width": 3, "height": 2}},
        {"id": "revenue_chart", "type": "chart", "title": "Revenue Trend", "position": {"x": 0, "y": 2}, "size": {"width": 6, "height": 4}}
    ]'::jsonb,
    (SELECT id FROM public.users LIMIT 1)
WHERE EXISTS (SELECT 1 FROM public.users);

-- Grant necessary permissions for analytics tables
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_alerts ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized based on your needs)
CREATE POLICY "Users can view their own analytics data" ON public.analytics_events
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert analytics events" ON public.analytics_events
    FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can view all metrics" ON public.analytics_metrics
    FOR SELECT USING (true);

CREATE POLICY "Users can view reports they created or public reports" ON public.analytics_reports
    FOR SELECT USING (
        created_by = auth.uid() OR 
        (permissions->>'visibility')::text IN ('public', 'team')
    );

CREATE POLICY "Users can create reports" ON public.analytics_reports
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own reports" ON public.analytics_reports
    FOR UPDATE USING (created_by = auth.uid());

-- Similar policies for other tables...
CREATE POLICY "Users can view dashboards they created or public dashboards" ON public.analytics_dashboards
    FOR SELECT USING (
        created_by = auth.uid() OR 
        (permissions->>'visibility')::text IN ('public', 'team')
    );

COMMIT;