import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ACE CRM Client Portal',
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
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
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

    // Check Supabase connectivity
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: {
            'apikey': supabaseKey,
            'User-Agent': 'ACE-CRM-ClientPortal-HealthCheck'
          },
          signal: AbortSignal.timeout(5000)
        });

        health.checks.supabase = {
          status: supabaseResponse.ok ? 'healthy' : 'unhealthy',
          url: supabaseUrl,
          responseStatus: supabaseResponse.status,
          responseTime: Date.now() - startTime
        };

        // Test a simple query if connection is successful
        if (supabaseResponse.ok) {
          try {
            // Import Supabase client dynamically to avoid build issues
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(supabaseUrl, supabaseKey);
            
            // Test auth functionality
            const { error } = await supabase.auth.getSession();
            health.checks.supabase_auth = {
              status: error ? 'degraded' : 'healthy',
              message: error ? error.message : 'Auth service responding',
              responseTime: Date.now() - startTime
            };
          } catch (authError) {
            health.checks.supabase_auth = {
              status: 'degraded',
              error: authError instanceof Error ? authError.message : 'Auth check failed'
            };
          }
        }
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

    // Check Stripe configuration
    try {
      const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      
      if (stripeKey) {
        const keyFormat = stripeKey.startsWith('pk_');
        health.checks.stripe = {
          status: keyFormat ? 'configured' : 'misconfigured',
          keyFormat: keyFormat ? 'valid' : 'invalid',
          message: keyFormat ? 'Stripe publishable key format valid' : 'Invalid Stripe key format'
        };
      } else {
        health.checks.stripe = {
          status: 'not_configured',
          message: 'Stripe publishable key not configured'
        };
      }
    } catch (stripeError) {
      health.checks.stripe = {
        status: 'unhealthy',
        error: stripeError instanceof Error ? stripeError.message : 'Stripe check failed'
      };
    }

    // Check file upload capabilities (basic check)
    try {
      health.checks.file_upload = {
        status: 'available',
        maxFileSize: '10MB', // This would be configurable
        supportedFormats: ['pdf', 'doc', 'docx', 'jpg', 'png']
      };
    } catch (uploadError) {
      health.checks.file_upload = {
        status: 'unavailable',
        error: uploadError instanceof Error ? uploadError.message : 'File upload check failed'
      };
    }

    // Check calendar integration readiness
    try {
      // This is a basic check - in production, you might want to verify calendar API access
      health.checks.calendar = {
        status: 'available',
        integrations: ['google_calendar', 'outlook'],
        booking_enabled: true
      };
    } catch (calendarError) {
      health.checks.calendar = {
        status: 'degraded',
        error: calendarError instanceof Error ? calendarError.message : 'Calendar check failed'
      };
    }

    // Determine overall health status
    const unhealthyChecks = Object.values(health.checks).filter(
      (check: any) => check.status === 'unhealthy'
    );

    const degradedChecks = Object.values(health.checks).filter(
      (check: any) => check.status === 'degraded'
    );

    if (unhealthyChecks.length > 0) {
      health.status = 'unhealthy';
    } else if (degradedChecks.length > 0) {
      health.status = 'degraded';
    }

    health.responseTime = Date.now() - startTime;

    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(health, { status: statusCode });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'ACE CRM Client Portal',
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
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    const ready = critical.every(env => !!process.env[env]);
    
    return new NextResponse(null, { 
      status: ready ? 200 : 503,
      headers: {
        'X-Ready': ready.toString(),
        'X-Service': 'ACE-CRM-ClientPortal'
      }
    });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}

// Liveness probe
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Alive': 'true',
      'X-Service': 'ACE-CRM-ClientPortal',
      'X-Timestamp': new Date().toISOString()
    }
  });
}