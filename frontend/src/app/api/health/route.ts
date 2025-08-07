import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ACE CRM Frontend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      build: {
        nextVersion: process.env.npm_package_dependencies_next || 'unknown',
        buildTime: process.env.BUILD_TIME || 'unknown'
      },
      checks: {} as Record<string, any>
    };

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    let envVarsConfigured = 0;
    
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      health.checks[`env_${envVar.toLowerCase()}`] = {
        configured: !!value,
        value: value ? '***configured***' : 'not set'
      };
      
      if (value) {
        envVarsConfigured++;
      }
    }

    health.checks.environment = {
      status: envVarsConfigured === requiredEnvVars.length ? 'healthy' : 'degraded',
      configured: `${envVarsConfigured}/${requiredEnvVars.length}`,
      missing: requiredEnvVars.filter(env => !process.env[env])
    };

    // Check backend API connectivity
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (apiUrl) {
        const backendResponse = await fetch(`${apiUrl}/health`, {
          method: 'GET',
          headers: {
            'User-Agent': 'ACE-CRM-Frontend-HealthCheck'
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        health.checks.backend_api = {
          status: backendResponse.ok ? 'healthy' : 'unhealthy',
          url: apiUrl,
          responseStatus: backendResponse.status,
          responseTime: Date.now() - startTime
        };

        if (backendResponse.ok) {
          try {
            const backendHealth = await backendResponse.json();
            health.checks.backend_api.backendStatus = backendHealth.status;
          } catch (jsonError) {
            health.checks.backend_api.note = 'Backend responded but not with JSON';
          }
        }
      } else {
        health.checks.backend_api = {
          status: 'not_configured',
          message: 'NEXT_PUBLIC_API_URL not configured'
        };
      }
    } catch (apiError) {
      health.checks.backend_api = {
        status: 'unhealthy',
        error: apiError instanceof Error ? apiError.message : 'API connection failed',
        url: process.env.NEXT_PUBLIC_API_URL || 'not configured'
      };
    }

    // Check Supabase connectivity
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: {
            'apikey': supabaseKey,
            'User-Agent': 'ACE-CRM-Frontend-HealthCheck'
          },
          signal: AbortSignal.timeout(5000)
        });

        health.checks.supabase = {
          status: supabaseResponse.ok ? 'healthy' : 'unhealthy',
          url: supabaseUrl,
          responseStatus: supabaseResponse.status,
          responseTime: Date.now() - startTime
        };
      } else {
        health.checks.supabase = {
          status: 'not_configured',
          message: 'Supabase URL or key not configured'
        };
      }
    } catch (supabaseError) {
      health.checks.supabase = {
        status: 'unhealthy',
        error: supabaseError instanceof Error ? supabaseError.message : 'Supabase connection failed'
      };
    }

    // Determine overall health status
    const unhealthyChecks = Object.values(health.checks).filter(
      (check: any) => check.status === 'unhealthy'
    );

    if (unhealthyChecks.length > 0) {
      health.status = 'degraded';
    }

    health.responseTime = Date.now() - startTime;

    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(health, { status: statusCode });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'ACE CRM Frontend',
      error: error instanceof Error ? error.message : 'Health check failed',
      responseTime: Date.now() - startTime
    }, { status: 500 });
  }
}

// Readiness check for container orchestration
export async function HEAD() {
  try {
    // Quick readiness check - verify critical environment variables
    const critical = [
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_SUPABASE_URL'
    ];

    const ready = critical.every(env => !!process.env[env]);
    
    return new NextResponse(null, { 
      status: ready ? 200 : 503,
      headers: {
        'X-Ready': ready.toString(),
        'X-Service': 'ACE-CRM-Frontend'
      }
    });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}