// Comprehensive Uptime Monitoring and Alerting System
const axios = require('axios');
const nodemailer = require('nodemailer');
const { Webhook } = require('discord-webhook-node');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const { auditLoggerInstance } = require('../audit/audit-logging');
const { DataDogMetrics } = require('./datadog-setup');
const { reportError, reportSecurityIncident } = require('./sentry-setup');

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class UptimeMonitor {
  constructor() {
    this.services = [];
    this.alertChannels = [];
    this.monitoringActive = false;
    this.checkInterval = 60000; // 1 minute
    this.alertThreshold = 3; // Alert after 3 consecutive failures
    this.serviceStatus = new Map();
    
    this.setupAlertChannels();
    this.initializeServices();
  }

  // Setup alert notification channels
  setupAlertChannels() {
    // Email notifications
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      const emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      
      this.alertChannels.push({
        type: 'email',
        client: emailTransporter,
        recipients: (process.env.ALERT_EMAILS || '').split(',').filter(Boolean)
      });
    }

    // Discord notifications
    if (process.env.DISCORD_WEBHOOK_URL) {
      const discordHook = new Webhook(process.env.DISCORD_WEBHOOK_URL);
      
      this.alertChannels.push({
        type: 'discord',
        client: discordHook
      });
    }

    // Slack notifications (webhook URL)
    if (process.env.SLACK_WEBHOOK_URL) {
      this.alertChannels.push({
        type: 'slack',
        webhookUrl: process.env.SLACK_WEBHOOK_URL
      });
    }

    // SMS notifications (Twilio)
    if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
      const twilio = require('twilio')(
        process.env.TWILIO_SID,
        process.env.TWILIO_TOKEN
      );
      
      this.alertChannels.push({
        type: 'sms',
        client: twilio,
        recipients: (process.env.ALERT_PHONE_NUMBERS || '').split(',').filter(Boolean)
      });
    }

    console.log(`✅ Configured ${this.alertChannels.length} alert channels`);
  }

  // Initialize services to monitor
  initializeServices() {
    this.services = [
      {
        id: 'frontend',
        name: 'Frontend Application',
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
        type: 'http',
        method: 'GET',
        expectedStatus: [200, 201, 302],
        timeout: 10000,
        critical: true,
        checkPath: '/health'
      },
      {
        id: 'backend',
        name: 'Backend API',
        url: process.env.BACKEND_URL || 'http://localhost:5000',
        type: 'http',
        method: 'GET',
        expectedStatus: [200],
        timeout: 5000,
        critical: true,
        checkPath: '/api/health'
      },
      {
        id: 'database',
        name: 'Supabase Database',
        url: process.env.SUPABASE_URL,
        type: 'http',
        method: 'GET',
        expectedStatus: [200],
        timeout: 5000,
        critical: true,
        checkPath: '/rest/v1/',
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        }
      },
      {
        id: 'stripe',
        name: 'Stripe API',
        url: 'https://api.stripe.com',
        type: 'http',
        method: 'GET',
        expectedStatus: [200, 401], // 401 is expected without auth
        timeout: 5000,
        critical: false,
        checkPath: '/v1/account'
      },
      {
        id: 'email',
        name: 'Email Service',
        url: process.env.SMTP_HOST,
        type: 'tcp',
        port: process.env.SMTP_PORT || 587,
        timeout: 5000,
        critical: false
      }
    ].filter(service => service.url); // Only include services with URLs
    
    // Initialize status tracking
    this.services.forEach(service => {
      this.serviceStatus.set(service.id, {
        status: 'unknown',
        consecutiveFailures: 0,
        lastCheck: null,
        lastSuccess: null,
        lastFailure: null,
        responseTime: 0,
        uptime: 100,
        totalChecks: 0,
        successfulChecks: 0
      });
    });
    
    console.log(`✅ Initialized monitoring for ${this.services.length} services`);
  }

  // Perform health check for a service
  async checkService(service) {
    const startTime = Date.now();
    const status = this.serviceStatus.get(service.id);
    
    try {
      let isHealthy = false;
      let responseTime = 0;
      let errorMessage = null;
      
      if (service.type === 'http') {
        const response = await axios({
          method: service.method || 'GET',
          url: service.url + (service.checkPath || ''),
          timeout: service.timeout,
          headers: service.headers || {},
          validateStatus: (status) => service.expectedStatus.includes(status)
        });
        
        responseTime = Date.now() - startTime;
        isHealthy = service.expectedStatus.includes(response.status);
        
        if (!isHealthy) {
          errorMessage = `Unexpected status code: ${response.status}`;
        }
        
      } else if (service.type === 'tcp') {
        // TCP connection check
        const net = require('net');
        const socket = new net.Socket();
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            socket.destroy();
            reject(new Error('TCP connection timeout'));
          }, service.timeout);
          
          socket.connect(service.port, service.url, () => {
            clearTimeout(timeout);
            socket.destroy();
            responseTime = Date.now() - startTime;
            isHealthy = true;
            resolve();
          });
          
          socket.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      }
      
      // Update status
      status.lastCheck = new Date();
      status.responseTime = responseTime;
      status.totalChecks++;
      
      if (isHealthy) {
        status.status = 'up';
        status.consecutiveFailures = 0;
        status.lastSuccess = new Date();
        status.successfulChecks++;
        
        // Calculate uptime percentage
        status.uptime = (status.successfulChecks / status.totalChecks) * 100;
        
        // Log metrics
        DataDogMetrics.gauge(`service.${service.id}.response_time`, responseTime);
        DataDogMetrics.gauge(`service.${service.id}.status`, 1);
        DataDogMetrics.gauge(`service.${service.id}.uptime`, status.uptime);
        
      } else {
        throw new Error(errorMessage || 'Health check failed');
      }
      
      return {
        service: service.id,
        status: 'up',
        responseTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Update status
      status.lastCheck = new Date();
      status.responseTime = responseTime;
      status.totalChecks++;
      status.status = 'down';
      status.consecutiveFailures++;
      status.lastFailure = new Date();
      
      // Calculate uptime percentage
      status.uptime = (status.successfulChecks / status.totalChecks) * 100;
      
      // Log metrics
      DataDogMetrics.gauge(`service.${service.id}.response_time`, responseTime);
      DataDogMetrics.gauge(`service.${service.id}.status`, 0);
      DataDogMetrics.gauge(`service.${service.id}.uptime`, status.uptime);
      DataDogMetrics.increment(`service.${service.id}.failures`);
      
      // Check if alert threshold reached
      if (status.consecutiveFailures >= this.alertThreshold) {
        await this.sendAlert(service, status, error.message);
      }
      
      // Log audit event
      await auditLoggerInstance.logSystemEvent('service_health_check_failed', {
        serviceId: service.id,
        serviceName: service.name,
        errorMessage: error.message,
        consecutiveFailures: status.consecutiveFailures,
        responseTime
      });
      
      return {
        service: service.id,
        status: 'down',
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Send alerts through configured channels
  async sendAlert(service, status, errorMessage) {
    const alertData = {
      serviceId: service.id,
      serviceName: service.name,
      serviceUrl: service.url,
      status: status.status,
      errorMessage,
      consecutiveFailures: status.consecutiveFailures,
      lastSuccess: status.lastSuccess,
      uptime: status.uptime.toFixed(2),
      timestamp: new Date().toISOString()
    };
    
    const alertMessage = this.formatAlertMessage(alertData);
    
    console.log(`🚨 ALERT: ${service.name} is ${status.status.toUpperCase()}`);
    
    // Send through all configured channels
    const alertPromises = this.alertChannels.map(async (channel) => {
      try {
        switch (channel.type) {
          case 'email':
            await this.sendEmailAlert(channel, alertData, alertMessage);
            break;
          case 'discord':
            await this.sendDiscordAlert(channel, alertData);
            break;
          case 'slack':
            await this.sendSlackAlert(channel, alertData);
            break;
          case 'sms':
            await this.sendSMSAlert(channel, alertData);
            break;
        }
      } catch (alertError) {
        console.error(`❌ Failed to send ${channel.type} alert:`, alertError.message);
        await reportError(alertError, { operation: 'alert_notification', channel: channel.type });
      }
    });
    
    await Promise.allSettled(alertPromises);
    
    // Store alert in database
    await this.storeAlert(alertData);
    
    // Report security incident for critical services
    if (service.critical) {
      await reportSecurityIncident({
        type: 'service_outage',
        details: alertData
      }, null, 'error');
    }
  }

  // Format alert message
  formatAlertMessage(alertData) {
    return `
🚨 SERVICE ALERT

Service: ${alertData.serviceName}
Status: ${alertData.status.toUpperCase()}
Error: ${alertData.errorMessage}
Consecutive Failures: ${alertData.consecutiveFailures}
Uptime: ${alertData.uptime}%
Last Success: ${alertData.lastSuccess || 'Never'}
Time: ${alertData.timestamp}

Please investigate immediately.
    `.trim();
  }

  // Email alert
  async sendEmailAlert(channel, alertData, message) {
    const subject = `🚨 ${alertData.serviceName} is ${alertData.status.toUpperCase()}`;
    
    await channel.client.sendMail({
      from: process.env.ALERT_FROM_EMAIL || process.env.SMTP_USER,
      to: channel.recipients.join(','),
      subject,
      text: message,
      html: this.formatHtmlAlert(alertData)
    });
  }

  // Discord alert
  async sendDiscordAlert(channel, alertData) {
    const embed = {
      title: `🚨 Service Alert: ${alertData.serviceName}`,
      color: alertData.status === 'down' ? 0xff0000 : 0x00ff00, // Red for down, green for up
      fields: [
        { name: 'Status', value: alertData.status.toUpperCase(), inline: true },
        { name: 'Error', value: alertData.errorMessage || 'N/A', inline: true },
        { name: 'Failures', value: alertData.consecutiveFailures.toString(), inline: true },
        { name: 'Uptime', value: `${alertData.uptime}%`, inline: true },
        { name: 'Last Success', value: alertData.lastSuccess || 'Never', inline: true },
        { name: 'URL', value: alertData.serviceUrl, inline: false }
      ],
      timestamp: alertData.timestamp
    };
    
    await channel.client.send('', { embeds: [embed] });
  }

  // Slack alert
  async sendSlackAlert(channel, alertData) {
    const payload = {
      text: `🚨 ${alertData.serviceName} is ${alertData.status.toUpperCase()}`,
      attachments: [{
        color: alertData.status === 'down' ? 'danger' : 'good',
        fields: [
          { title: 'Service', value: alertData.serviceName, short: true },
          { title: 'Status', value: alertData.status.toUpperCase(), short: true },
          { title: 'Error', value: alertData.errorMessage || 'N/A', short: false },
          { title: 'Consecutive Failures', value: alertData.consecutiveFailures, short: true },
          { title: 'Uptime', value: `${alertData.uptime}%`, short: true }
        ],
        ts: Math.floor(new Date(alertData.timestamp).getTime() / 1000)
      }]
    };
    
    await axios.post(channel.webhookUrl, payload);
  }

  // SMS alert
  async sendSMSAlert(channel, alertData) {
    const message = `ALERT: ${alertData.serviceName} is ${alertData.status.toUpperCase()}. Error: ${alertData.errorMessage}`;
    
    for (const phoneNumber of channel.recipients) {
      await channel.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
    }
  }

  // HTML format for email alerts
  formatHtmlAlert(alertData) {
    const statusColor = alertData.status === 'down' ? '#ff4444' : '#44ff44';
    
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: ${statusColor};">🚨 Service Alert</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Service:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${alertData.serviceName}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Status:</strong></td><td style="padding: 8px; border: 1px solid #ddd; color: ${statusColor};">${alertData.status.toUpperCase()}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Error:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${alertData.errorMessage}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Consecutive Failures:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${alertData.consecutiveFailures}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Uptime:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${alertData.uptime}%</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Last Success:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${alertData.lastSuccess || 'Never'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Time:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${alertData.timestamp}</td></tr>
      </table>
      <p style="margin-top: 20px; color: #666;">Please investigate this issue immediately.</p>
    </div>
    `;
  }

  // Store alert in database
  async storeAlert(alertData) {
    try {
      const { error } = await supabase
        .from('uptime_alerts')
        .insert([{
          service_id: alertData.serviceId,
          service_name: alertData.serviceName,
          status: alertData.status,
          error_message: alertData.errorMessage,
          consecutive_failures: alertData.consecutiveFailures,
          uptime_percentage: parseFloat(alertData.uptime),
          created_at: alertData.timestamp
        }]);
      
      if (error) {
        console.error('Failed to store alert:', error);
      }
    } catch (error) {
      console.error('Failed to store alert:', error);
    }
  }

  // Run health checks for all services
  async runHealthChecks() {
    console.log('🏥 Running health checks...');
    
    const checkPromises = this.services.map(service => 
      this.checkService(service).catch(error => ({
        service: service.id,
        error: error.message
      }))
    );
    
    const results = await Promise.all(checkPromises);
    
    // Store results in database
    await this.storeHealthCheckResults(results);
    
    return results;
  }

  // Store health check results
  async storeHealthCheckResults(results) {
    try {
      const records = results.map(result => ({
        service_id: result.service,
        status: result.status || 'error',
        response_time: result.responseTime || 0,
        error_message: result.error || null,
        checked_at: result.timestamp || new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('uptime_checks')
        .insert(records);
      
      if (error) {
        console.error('Failed to store health check results:', error);
      }
    } catch (error) {
      console.error('Failed to store health check results:', error);
    }
  }

  // Get service status summary
  getStatusSummary() {
    const summary = {
      totalServices: this.services.length,
      upServices: 0,
      downServices: 0,
      averageResponseTime: 0,
      averageUptime: 0,
      services: []
    };
    
    let totalResponseTime = 0;
    let totalUptime = 0;
    
    this.services.forEach(service => {
      const status = this.serviceStatus.get(service.id);
      
      const serviceInfo = {
        id: service.id,
        name: service.name,
        url: service.url,
        status: status.status,
        responseTime: status.responseTime,
        uptime: status.uptime,
        lastCheck: status.lastCheck,
        consecutiveFailures: status.consecutiveFailures
      };
      
      summary.services.push(serviceInfo);
      
      if (status.status === 'up') {
        summary.upServices++;
      } else {
        summary.downServices++;
      }
      
      totalResponseTime += status.responseTime;
      totalUptime += status.uptime;
    });
    
    summary.averageResponseTime = totalResponseTime / this.services.length;
    summary.averageUptime = totalUptime / this.services.length;
    
    return summary;
  }

  // Start monitoring
  startMonitoring() {
    if (this.monitoringActive) {
      console.log('⚠️ Monitoring is already active');
      return;
    }
    
    this.monitoringActive = true;
    console.log('🚀 Starting uptime monitoring...');
    
    // Schedule regular health checks
    cron.schedule('*/1 * * * *', async () => { // Every minute
      if (this.monitoringActive) {
        try {
          await this.runHealthChecks();
        } catch (error) {
          console.error('Health check failed:', error);
          await reportError(error, { operation: 'health_check' });
        }
      }
    });
    
    // Generate daily reports
    cron.schedule('0 9 * * *', async () => { // Daily at 9 AM
      if (this.monitoringActive) {
        await this.generateDailyReport();
      }
    });
    
    // Run initial health check
    setTimeout(() => {
      this.runHealthChecks();
    }, 1000);
    
    console.log('✅ Uptime monitoring started');
  }

  // Stop monitoring
  stopMonitoring() {
    this.monitoringActive = false;
    console.log('🛑 Uptime monitoring stopped');
  }

  // Generate daily uptime report
  async generateDailyReport() {
    const summary = this.getStatusSummary();
    const report = {
      date: new Date().toDateString(),
      summary,
      timestamp: new Date().toISOString()
    };
    
    // Send daily report via email
    if (this.alertChannels.some(c => c.type === 'email')) {
      const emailChannel = this.alertChannels.find(c => c.type === 'email');
      
      try {
        await emailChannel.client.sendMail({
          from: process.env.ALERT_FROM_EMAIL || process.env.SMTP_USER,
          to: emailChannel.recipients.join(','),
          subject: `📊 Daily Uptime Report - ${report.date}`,
          html: this.formatDailyReportHtml(report)
        });
        
        console.log('📧 Daily uptime report sent');
      } catch (error) {
        console.error('Failed to send daily report:', error);
      }
    }
    
    return report;
  }

  // Format daily report HTML
  formatDailyReportHtml(report) {
    const servicesTable = report.summary.services.map(service => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${service.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd; color: ${service.status === 'up' ? 'green' : 'red'};">${service.status.toUpperCase()}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${service.uptime.toFixed(2)}%</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${service.responseTime}ms</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${service.consecutiveFailures}</td>
      </tr>
    `).join('');
    
    return `
    <div style="font-family: Arial, sans-serif; max-width: 800px;">
      <h2>📊 Daily Uptime Report - ${report.date}</h2>
      
      <h3>Summary</h3>
      <ul>
        <li><strong>Total Services:</strong> ${report.summary.totalServices}</li>
        <li><strong>Services Up:</strong> <span style="color: green;">${report.summary.upServices}</span></li>
        <li><strong>Services Down:</strong> <span style="color: red;">${report.summary.downServices}</span></li>
        <li><strong>Average Response Time:</strong> ${report.summary.averageResponseTime.toFixed(2)}ms</li>
        <li><strong>Average Uptime:</strong> ${report.summary.averageUptime.toFixed(2)}%</li>
      </ul>
      
      <h3>Service Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 8px; border: 1px solid #ddd;">Service</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Status</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Uptime</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Response Time</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Failures</th>
          </tr>
        </thead>
        <tbody>
          ${servicesTable}
        </tbody>
      </table>
      
      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        Generated at ${report.timestamp}
      </p>
    </div>
    `;
  }
}

// Initialize and export monitoring system
const uptimeMonitor = new UptimeMonitor();

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  uptimeMonitor.startMonitoring();
}

module.exports = {
  UptimeMonitor,
  uptimeMonitor
};