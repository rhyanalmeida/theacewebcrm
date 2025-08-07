import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyticsRequest {
  type: 'sales_pipeline' | 'activity_summary' | 'team_performance' | 'revenue_forecast' | 'custom_report';
  date_range?: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  user_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, date_range, filters = {}, user_id } = await req.json() as AnalyticsRequest;

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let reportData;

    switch (type) {
      case 'sales_pipeline':
        reportData = await generateSalesPipelineReport(supabase, date_range, filters);
        break;
      case 'activity_summary':
        reportData = await generateActivitySummaryReport(supabase, date_range, filters, user_id);
        break;
      case 'team_performance':
        reportData = await generateTeamPerformanceReport(supabase, date_range, filters);
        break;
      case 'revenue_forecast':
        reportData = await generateRevenueForecastReport(supabase, date_range, filters);
        break;
      case 'custom_report':
        reportData = await generateCustomReport(supabase, filters);
        break;
      default:
        throw new Error(`Unknown report type: ${type}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_type: type,
        generated_at: new Date().toISOString(),
        data: reportData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analytics report error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function generateSalesPipelineReport(supabase: any, dateRange: any, filters: any) {
  // Get deals by stage
  const { data: dealsByStage, error: stageError } = await supabase
    .from('deals')
    .select('stage, value, probability, created_at')
    .gte('created_at', dateRange?.start || '1970-01-01')
    .lte('created_at', dateRange?.end || new Date().toISOString());

  if (stageError) throw stageError;

  // Group by stage
  const pipeline = dealsByStage.reduce((acc: any, deal: any) => {
    const stage = deal.stage;
    if (!acc[stage]) {
      acc[stage] = {
        count: 0,
        total_value: 0,
        weighted_value: 0,
        average_probability: 0
      };
    }
    acc[stage].count += 1;
    acc[stage].total_value += deal.value || 0;
    acc[stage].weighted_value += (deal.value || 0) * (deal.probability / 100);
    acc[stage].average_probability += deal.probability || 0;
    return acc;
  }, {});

  // Calculate averages
  Object.keys(pipeline).forEach(stage => {
    pipeline[stage].average_probability = pipeline[stage].average_probability / pipeline[stage].count;
  });

  // Get conversion rates between stages
  const conversionRates = await calculateConversionRates(supabase, dateRange);

  // Get velocity metrics
  const velocity = await calculateSalesVelocity(supabase, dateRange);

  return {
    pipeline_by_stage: pipeline,
    conversion_rates: conversionRates,
    velocity_metrics: velocity,
    total_pipeline_value: Object.values(pipeline).reduce((sum: number, stage: any) => sum + stage.total_value, 0),
    total_weighted_value: Object.values(pipeline).reduce((sum: number, stage: any) => sum + stage.weighted_value, 0)
  };
}

async function generateActivitySummaryReport(supabase: any, dateRange: any, filters: any, userId?: string) {
  let query = supabase
    .from('activities')
    .select(`
      *,
      activity_types(name, icon),
      users!created_by(first_name, last_name)
    `)
    .gte('activity_date', dateRange?.start || '1970-01-01')
    .lte('activity_date', dateRange?.end || new Date().toISOString());

  if (userId) {
    query = query.eq('created_by', userId);
  }

  const { data: activities, error } = await query;
  if (error) throw error;

  // Group activities by type
  const byType = activities.reduce((acc: any, activity: any) => {
    const typeName = activity.activity_types?.name || 'Unknown';
    if (!acc[typeName]) {
      acc[typeName] = {
        count: 0,
        total_duration: 0,
        completed: 0
      };
    }
    acc[typeName].count += 1;
    acc[typeName].total_duration += activity.duration_minutes || 0;
    if (activity.is_completed) {
      acc[typeName].completed += 1;
    }
    return acc;
  }, {});

  // Group by user
  const byUser = activities.reduce((acc: any, activity: any) => {
    const userKey = activity.users ? `${activity.users.first_name} ${activity.users.last_name}` : 'System';
    if (!acc[userKey]) {
      acc[userKey] = {
        count: 0,
        completed: 0,
        total_duration: 0
      };
    }
    acc[userKey].count += 1;
    acc[userKey].total_duration += activity.duration_minutes || 0;
    if (activity.is_completed) {
      acc[userKey].completed += 1;
    }
    return acc;
  }, {});

  // Daily activity trend
  const dailyTrend = activities.reduce((acc: any, activity: any) => {
    const date = activity.activity_date.split('T')[0];
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += 1;
    return acc;
  }, {});

  return {
    total_activities: activities.length,
    by_type: byType,
    by_user: byUser,
    daily_trend: dailyTrend,
    completion_rate: activities.filter((a: any) => a.is_completed).length / activities.length * 100
  };
}

async function generateTeamPerformanceReport(supabase: any, dateRange: any, filters: any) {
  // Get all users with their activities and deals
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      email,
      user_roles(roles(name))
    `);

  if (usersError) throw usersError;

  const performanceData = [];

  for (const user of users) {
    // Get user's deals
    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .eq('owner_id', user.id)
      .gte('created_at', dateRange?.start || '1970-01-01')
      .lte('created_at', dateRange?.end || new Date().toISOString());

    // Get user's activities
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('created_by', user.id)
      .gte('activity_date', dateRange?.start || '1970-01-01')
      .lte('activity_date', dateRange?.end || new Date().toISOString());

    // Get user's leads
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('owner_id', user.id)
      .gte('created_at', dateRange?.start || '1970-01-01')
      .lte('created_at', dateRange?.end || new Date().toISOString());

    const wonDeals = deals?.filter(d => d.stage === 'won') || [];
    const totalDealsValue = deals?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;
    const wonDealsValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    performanceData.push({
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.user_roles?.[0]?.roles?.name
      },
      metrics: {
        total_deals: deals?.length || 0,
        won_deals: wonDeals.length,
        total_deals_value: totalDealsValue,
        won_deals_value: wonDealsValue,
        win_rate: deals?.length > 0 ? (wonDeals.length / deals.length) * 100 : 0,
        total_activities: activities?.length || 0,
        completed_activities: activities?.filter(a => a.is_completed).length || 0,
        total_leads: leads?.length || 0,
        converted_leads: leads?.filter(l => l.status === 'won').length || 0,
        lead_conversion_rate: leads?.length > 0 ? (leads.filter(l => l.status === 'won').length / leads.length) * 100 : 0
      }
    });
  }

  // Team totals
  const teamTotals = {
    total_team_deals_value: performanceData.reduce((sum, p) => sum + p.metrics.total_deals_value, 0),
    total_team_won_value: performanceData.reduce((sum, p) => sum + p.metrics.won_deals_value, 0),
    total_team_activities: performanceData.reduce((sum, p) => sum + p.metrics.total_activities, 0),
    average_win_rate: performanceData.reduce((sum, p) => sum + p.metrics.win_rate, 0) / performanceData.length
  };

  return {
    team_performance: performanceData,
    team_totals: teamTotals,
    top_performers: {
      by_revenue: performanceData.sort((a, b) => b.metrics.won_deals_value - a.metrics.won_deals_value).slice(0, 5),
      by_deals_count: performanceData.sort((a, b) => b.metrics.won_deals - a.metrics.won_deals).slice(0, 5),
      by_activities: performanceData.sort((a, b) => b.metrics.total_activities - a.metrics.total_activities).slice(0, 5)
    }
  };
}

async function generateRevenueForecastReport(supabase: any, dateRange: any, filters: any) {
  // Get all open deals
  const { data: openDeals, error } = await supabase
    .from('deals')
    .select('*')
    .neq('stage', 'won')
    .neq('stage', 'lost')
    .gte('created_at', dateRange?.start || '1970-01-01')
    .lte('created_at', dateRange?.end || new Date().toISOString());

  if (error) throw error;

  // Calculate forecast by probability bands
  const forecastBands = {
    high_probability: { min: 75, deals: [], total_value: 0, weighted_value: 0 },
    medium_probability: { min: 50, max: 74, deals: [], total_value: 0, weighted_value: 0 },
    low_probability: { min: 25, max: 49, deals: [], total_value: 0, weighted_value: 0 },
    very_low_probability: { min: 0, max: 24, deals: [], total_value: 0, weighted_value: 0 }
  };

  openDeals.forEach((deal: any) => {
    const probability = deal.probability || 0;
    const value = deal.value || 0;
    const weightedValue = value * (probability / 100);

    if (probability >= 75) {
      forecastBands.high_probability.deals.push(deal);
      forecastBands.high_probability.total_value += value;
      forecastBands.high_probability.weighted_value += weightedValue;
    } else if (probability >= 50) {
      forecastBands.medium_probability.deals.push(deal);
      forecastBands.medium_probability.total_value += value;
      forecastBands.medium_probability.weighted_value += weightedValue;
    } else if (probability >= 25) {
      forecastBands.low_probability.deals.push(deal);
      forecastBands.low_probability.total_value += value;
      forecastBands.low_probability.weighted_value += weightedValue;
    } else {
      forecastBands.very_low_probability.deals.push(deal);
      forecastBands.very_low_probability.total_value += value;
      forecastBands.very_low_probability.weighted_value += weightedValue;
    }
  });

  // Monthly forecast based on close dates
  const monthlyForecast = openDeals.reduce((acc: any, deal: any) => {
    if (!deal.close_date) return acc;
    
    const month = deal.close_date.substring(0, 7); // YYYY-MM format
    if (!acc[month]) {
      acc[month] = {
        deals_count: 0,
        total_value: 0,
        weighted_value: 0
      };
    }
    
    acc[month].deals_count += 1;
    acc[month].total_value += deal.value || 0;
    acc[month].weighted_value += (deal.value || 0) * ((deal.probability || 0) / 100);
    
    return acc;
  }, {});

  const totalWeightedForecast = Object.values(forecastBands).reduce(
    (sum: number, band: any) => sum + band.weighted_value, 0
  );

  return {
    forecast_summary: {
      total_pipeline_value: openDeals.reduce((sum, d) => sum + (d.value || 0), 0),
      total_weighted_forecast: totalWeightedForecast,
      total_deals_count: openDeals.length
    },
    probability_bands: forecastBands,
    monthly_forecast: monthlyForecast,
    best_case_scenario: forecastBands.high_probability.total_value + forecastBands.medium_probability.total_value,
    worst_case_scenario: forecastBands.high_probability.weighted_value,
    most_likely_scenario: totalWeightedForecast
  };
}

async function generateCustomReport(supabase: any, filters: any) {
  // This would be implemented based on specific custom reporting needs
  // For now, return a basic structure
  return {
    message: "Custom report functionality would be implemented based on specific requirements",
    available_entities: ["users", "companies", "contacts", "leads", "deals", "projects", "activities"],
    filters_applied: filters
  };
}

async function calculateConversionRates(supabase: any, dateRange: any) {
  // Implementation for calculating conversion rates between deal stages
  const stages = ['discovery', 'proposal', 'negotiation', 'contract', 'won'];
  const conversionRates: any = {};

  for (let i = 0; i < stages.length - 1; i++) {
    const fromStage = stages[i];
    const toStage = stages[i + 1];

    const { data: fromDeals } = await supabase
      .from('deals')
      .select('id')
      .eq('stage', fromStage);

    const { data: toDeals } = await supabase
      .from('deals')
      .select('id')
      .eq('stage', toStage);

    conversionRates[`${fromStage}_to_${toStage}`] = {
      from_count: fromDeals?.length || 0,
      to_count: toDeals?.length || 0,
      rate: fromDeals?.length > 0 ? ((toDeals?.length || 0) / fromDeals.length) * 100 : 0
    };
  }

  return conversionRates;
}

async function calculateSalesVelocity(supabase: any, dateRange: any) {
  const { data: wonDeals } = await supabase
    .from('deals')
    .select('created_at, close_date, value')
    .eq('stage', 'won')
    .not('close_date', 'is', null)
    .gte('close_date', dateRange?.start || '1970-01-01')
    .lte('close_date', dateRange?.end || new Date().toISOString());

  if (!wonDeals || wonDeals.length === 0) {
    return { average_days_to_close: 0, velocity_score: 0 };
  }

  const totalDays = wonDeals.reduce((sum, deal) => {
    const created = new Date(deal.created_at);
    const closed = new Date(deal.close_date);
    const days = Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);

  const averageDays = totalDays / wonDeals.length;
  const totalValue = wonDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const velocityScore = totalValue / averageDays; // Revenue per day

  return {
    average_days_to_close: averageDays,
    velocity_score: velocityScore,
    total_won_deals: wonDeals.length,
    total_won_value: totalValue
  };
}