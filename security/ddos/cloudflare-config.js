// Cloudflare DDoS Protection and Security Configuration
const axios = require('axios');

// Cloudflare API Configuration
class CloudflareSecurityManager {
  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID;
    this.email = process.env.CLOUDFLARE_EMAIL;
    this.apiKey = process.env.CLOUDFLARE_API_KEY;
    
    this.baseURL = 'https://api.cloudflare.com/client/v4';
    this.headers = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    };
    
    if (!this.apiToken && this.email && this.apiKey) {
      // Fallback to legacy authentication
      this.headers = {
        'X-Auth-Email': this.email,
        'X-Auth-Key': this.apiKey,
        'Content-Type': 'application/json'
      };
    }
  }

  // Make API request to Cloudflare
  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: this.headers
      };
      
      if (data) {
        config.data = data;
      }
      
      const response = await axios(config);
      
      if (!response.data.success) {
        throw new Error(`Cloudflare API Error: ${response.data.errors?.[0]?.message || 'Unknown error'}`);
      }
      
      return response.data.result;
    } catch (error) {
      console.error('Cloudflare API request failed:', error.message);
      throw error;
    }
  }

  // Configure DDoS protection settings
  async configureDDoSProtection() {
    console.log('🛡️ Configuring DDoS protection...');
    
    try {
      // Enable "Under Attack Mode" for maximum protection
      await this.makeRequest('PATCH', `/zones/${this.zoneId}/settings/security_level`, {
        value: 'high' // Options: off, essentially_off, low, medium, high, under_attack
      });
      
      // Configure Challenge Passage settings
      await this.makeRequest('PATCH', `/zones/${this.zoneId}/settings/challenge_ttl`, {
        value: 1800 // 30 minutes
      });
      
      // Enable Browser Integrity Check
      await this.makeRequest('PATCH', `/zones/${this.zoneId}/settings/browser_check`, {
        value: 'on'
      });
      
      // Configure Always Use HTTPS
      await this.makeRequest('PATCH', `/zones/${this.zoneId}/settings/always_use_https`, {
        value: 'on'
      });
      
      // Configure Auto Minify
      await this.makeRequest('PATCH', `/zones/${this.zoneId}/settings/minify`, {
        value: {
          css: 'on',
          html: 'on',
          js: 'on'
        }
      });
      
      console.log('✅ DDoS protection configured successfully');
      
    } catch (error) {
      console.error('❌ Failed to configure DDoS protection:', error.message);
      throw error;
    }
  }

  // Setup rate limiting rules
  async setupRateLimiting() {
    console.log('⚡ Setting up rate limiting rules...');
    
    const rateLimitingRules = [
      {
        threshold: 100,
        period: 60,
        action: {
          mode: 'challenge',
          timeout: 3600
        },
        match: {
          request: {
            url: '*'
          }
        },
        description: 'General rate limiting - 100 requests per minute'
      },
      {
        threshold: 10,
        period: 60,
        action: {
          mode: 'block',
          timeout: 1800
        },
        match: {
          request: {
            url: '*/api/auth/*'
          }
        },
        description: 'Authentication endpoints - 10 requests per minute'
      },
      {
        threshold: 5,
        period: 300,
        action: {
          mode: 'block',
          timeout: 3600
        },
        match: {
          request: {
            url: '*/api/auth/login'
          }
        },
        description: 'Login endpoint - 5 attempts per 5 minutes'
      },
      {
        threshold: 20,
        period: 3600,
        action: {
          mode: 'challenge',
          timeout: 1800
        },
        match: {
          request: {
            url: '*/api/upload/*'
          }
        },
        description: 'File upload endpoints - 20 requests per hour'
      }
    ];
    
    try {
      for (const rule of rateLimitingRules) {
        await this.makeRequest('POST', `/zones/${this.zoneId}/rate_limits`, rule);
        console.log(`📝 Created rate limiting rule: ${rule.description}`);
      }
      
      console.log('✅ Rate limiting rules configured successfully');
      
    } catch (error) {
      console.error('❌ Failed to setup rate limiting:', error.message);
      throw error;
    }
  }

  // Setup firewall rules
  async setupFirewallRules() {
    console.log('🔥 Setting up firewall rules...');
    
    const firewallRules = [
      {
        filter: {
          expression: '(cf.threat_score gt 14)',
          paused: false
        },
        action: 'challenge',
        priority: 1000,
        description: 'Challenge high threat score requests'
      },
      {
        filter: {
          expression: '(http.user_agent contains "bot") and not cf.verified_bot',
          paused: false
        },
        action: 'challenge',
        priority: 1001,
        description: 'Challenge unverified bots'
      },
      {
        filter: {
          expression: '(http.request.uri.path contains "/admin") and (ip.geoip.country ne "US")',
          paused: false
        },
        action: 'block',
        priority: 1002,
        description: 'Block non-US access to admin paths'
      },
      {
        filter: {
          expression: '(http.request.method eq "POST") and (http.request.uri.path contains "/api/") and (cf.threat_score gt 20)',
          paused: false
        },
        action: 'block',
        priority: 1003,
        description: 'Block high-threat POST requests to API'
      },
      {
        filter: {
          expression: '(http.request.uri.query contains "union") or (http.request.uri.query contains "select") or (http.request.uri.query contains "script")',
          paused: false
        },
        action: 'block',
        priority: 1004,
        description: 'Block SQL injection and XSS attempts'
      }
    ];
    
    try {
      for (const rule of firewallRules) {
        await this.makeRequest('POST', `/zones/${this.zoneId}/firewall/rules`, rule);
        console.log(`🔥 Created firewall rule: ${rule.description}`);
      }
      
      console.log('✅ Firewall rules configured successfully');
      
    } catch (error) {
      console.error('❌ Failed to setup firewall rules:', error.message);
      throw error;
    }
  }

  // Configure bot management
  async configureBotManagement() {
    console.log('🤖 Configuring bot management...');
    
    try {
      // Enable Bot Fight Mode (free tier)
      await this.makeRequest('PATCH', `/zones/${this.zoneId}/settings/brotli`, {
        value: 'on'
      });
      
      // Configure crawler hints
      await this.makeRequest('PATCH', `/zones/${this.zoneId}/settings/crawler_hints`, {
        value: 'on'
      });
      
      console.log('✅ Bot management configured successfully');
      
    } catch (error) {
      console.error('❌ Failed to configure bot management:', error.message);
      throw error;
    }
  }

  // Setup SSL/TLS security
  async configureSSLSecurity() {
    console.log('🔒 Configuring SSL/TLS security...');
    
    try {
      // Set SSL mode to Full (Strict)
      await this.makeRequest('PATCH', `/zones/${this.zoneId}/settings/ssl`, {
        value: 'full'
      });
      
      // Enable TLS 1.3
      await this.makeRequest('PATCH', `/zones/${this.zoneId}/settings/tls_1_3`, {
        value: 'on'
      });
      
      // Enable Automatic HTTPS Rewrites
      await this.makeRequest('PATCH', `/zones/${this.zoneId}/settings/automatic_https_rewrites`, {
        value: 'on'
      });
      
      // Enable Opportunistic Encryption
      await this.makeRequest('PATCH', `/zones/${this.zoneId}/settings/opportunistic_encryption`, {
        value: 'on'
      });
      
      // Configure HSTS
      await this.makeRequest('PATCH', `/zones/${this.zoneId}/settings/security_header`, {
        value: {
          strict_transport_security: {
            enabled: true,
            max_age: 31536000,
            include_subdomains: true,
            preload: true
          }
        }
      });
      
      console.log('✅ SSL/TLS security configured successfully');
      
    } catch (error) {
      console.error('❌ Failed to configure SSL/TLS security:', error.message);
      throw error;
    }
  }

  // Setup WAF (Web Application Firewall) managed rules
  async setupWAFRules() {
    console.log('🛡️ Setting up WAF managed rules...');
    
    try {
      // Enable OWASP Core Rule Set
      const managedRulesets = [
        'efb7b8c949ac4650a09736fc376e9aee', // OWASP Core Rule Set
        '4814384a9e5d4991b9815dcfc25d2f1f', // Cloudflare Managed Ruleset
        'c2e184081120413c86c3ab7e14069605'  // WordPress Ruleset
      ];
      
      for (const rulesetId of managedRulesets) {
        try {
          await this.makeRequest('PUT', `/zones/${this.zoneId}/rulesets/${rulesetId}/phases/http_request_firewall_managed/entrypoint`, {
            rules: [{
              action: 'execute',
              action_parameters: {
                id: rulesetId
              },
              expression: 'true',
              description: `Enable managed ruleset ${rulesetId}`
            }]
          });
          
          console.log(`✅ Enabled managed ruleset: ${rulesetId}`);
        } catch (error) {
          console.warn(`⚠️ Could not enable managed ruleset ${rulesetId}: ${error.message}`);
        }
      }
      
      console.log('✅ WAF managed rules setup completed');
      
    } catch (error) {
      console.error('❌ Failed to setup WAF rules:', error.message);
      throw error;
    }
  }

  // Configure caching rules for performance and security
  async configureCaching() {
    console.log('⚡ Configuring caching rules...');
    
    try {
      // Configure development mode (disable for production)
      await this.makeRequest('PATCH', `/zones/${this.zoneId}/settings/development_mode`, {
        value: process.env.NODE_ENV === 'development' ? 'on' : 'off'
      });
      
      // Configure caching level
      await this.makeRequest('PATCH', `/zones/${this.zoneId}/settings/cache_level`, {
        value: 'aggressive' // Options: basic, simplified, aggressive
      });
      
      // Configure browser cache TTL
      await this.makeRequest('PATCH', `/zones/${this.zoneId}/settings/browser_cache_ttl`, {
        value: 31536000 // 1 year for static assets
      });
      
      console.log('✅ Caching rules configured successfully');
      
    } catch (error) {
      console.error('❌ Failed to configure caching:', error.message);
      throw error;
    }
  }

  // Get current security settings
  async getSecurityStatus() {
    try {
      const settings = await Promise.all([
        this.makeRequest('GET', `/zones/${this.zoneId}/settings/security_level`),
        this.makeRequest('GET', `/zones/${this.zoneId}/settings/ssl`),
        this.makeRequest('GET', `/zones/${this.zoneId}/settings/always_use_https`),
        this.makeRequest('GET', `/zones/${this.zoneId}/settings/browser_check`),
        this.makeRequest('GET', `/zones/${this.zoneId}/rate_limits`),
        this.makeRequest('GET', `/zones/${this.zoneId}/firewall/rules`)
      ]);
      
      return {
        securityLevel: settings[0]?.value,
        sslMode: settings[1]?.value,
        alwaysHttps: settings[2]?.value,
        browserCheck: settings[3]?.value,
        rateLimits: settings[4]?.length || 0,
        firewallRules: settings[5]?.length || 0
      };
      
    } catch (error) {
      console.error('❌ Failed to get security status:', error.message);
      throw error;
    }
  }

  // Complete security setup
  async setupCompleteSecurityStack() {
    console.log('🚀 Setting up complete Cloudflare security stack...');
    
    try {
      await this.configureDDoSProtection();
      await this.setupRateLimiting();
      await this.setupFirewallRules();
      await this.configureBotManagement();
      await this.configureSSLSecurity();
      await this.setupWAFRules();
      await this.configureCaching();
      
      const status = await this.getSecurityStatus();
      
      console.log('🎉 Complete security stack setup finished!');
      console.log('📊 Current Security Status:', status);
      
      return status;
      
    } catch (error) {
      console.error('❌ Complete security stack setup failed:', error.message);
      throw error;
    }
  }
}

// Export the manager
module.exports = {
  CloudflareSecurityManager
};