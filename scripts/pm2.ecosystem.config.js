module.exports = {
  apps: [
    {
      name: 'ace-crm-backend',
      script: './ace-crm/backend/dist/server.js',
      cwd: '/mnt/c/Users/rhyan/Downloads/THE ACE CRM',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        LOG_LEVEL: 'info'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
        LOG_LEVEL: 'debug'
      },
      // Logging
      log_file: '/var/log/ace-crm/backend-combined.log',
      out_file: '/var/log/ace-crm/backend-out.log',
      error_file: '/var/log/ace-crm/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Process management
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Memory management
      max_memory_restart: '500M',
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_http: 'http://localhost:5000/api/health',
      
      // Performance monitoring
      pmx: true,
      
      // Auto restart on file changes (development only)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Process lifecycle
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
      
      // Resource limits
      node_args: '--max-old-space-size=512',
      
      // Cron restart (optional - restart daily at 2 AM)
      cron_restart: '0 2 * * *'
    },
    
    {
      name: 'ace-crm-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/mnt/c/Users/rhyan/Downloads/THE ACE CRM/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: 1
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      
      // Logging
      log_file: '/var/log/ace-crm/frontend-combined.log',
      out_file: '/var/log/ace-crm/frontend-out.log',
      error_file: '/var/log/ace-crm/frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Process management
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Memory management
      max_memory_restart: '750M',
      
      // Health monitoring
      health_check_grace_period: 5000,
      health_check_http: 'http://localhost:3000/api/health',
      
      // Process lifecycle
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Resource limits
      node_args: '--max-old-space-size=768',
      
      // Watch mode disabled for production
      watch: false
    },
    
    {
      name: 'ace-crm-client-portal',
      script: 'npm',
      args: 'start',
      cwd: '/mnt/c/Users/rhyan/Downloads/THE ACE CRM/client-portal',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        NEXT_TELEMETRY_DISABLED: 1
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      
      // Logging
      log_file: '/var/log/ace-crm/client-portal-combined.log',
      out_file: '/var/log/ace-crm/client-portal-out.log',
      error_file: '/var/log/ace-crm/client-portal-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Process management
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Memory management
      max_memory_restart: '750M',
      
      // Health monitoring
      health_check_grace_period: 5000,
      health_check_http: 'http://localhost:3001/api/health',
      
      // Process lifecycle
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Resource limits
      node_args: '--max-old-space-size=768',
      
      // Watch mode disabled for production
      watch: false
    }
  ],
  
  // PM2 Deploy configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/ace-crm.git',
      path: '/var/www/ace-crm',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install nodejs npm -y'
    },
    staging: {
      user: 'deploy',
      host: 'your-staging-server.com',
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/ace-crm.git',
      path: '/var/www/ace-crm-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
    }
  }
};