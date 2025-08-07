const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

class SwarmMonitor {
  constructor() {
    this.renderApiKey = process.env.RENDER_API_KEY || 'rnd_xjlZYC6KzvaCC8om8AkF8NPUPrgb';
    this.renderBaseUrl = 'https://api.render.com/v1';
    this.monitoringId = `monitor-${Date.now()}`;
    this.isMonitoring = false;
    this.services = new Map();
    this.workers = new Map();
    this.metrics = {
      performance: new Map(),
      health: new Map(),
      errors: new Map(),
      alerts: []
    };
    this.thresholds = this.loadThresholds();
    this.alertChannels = this.setupAlertChannels();
    this.startTime = Date.now();
  }

  async startMonitoring() {
    console.log('🔍 SWARM MONITORING INITIATED');
    console.log(`📊 Monitor ID: ${this.monitoringId}`);
    
    this.isMonitoring = true;
    
    try {
      // Initialize monitoring components
      await this.initializeMonitoring();
      
      // Start monitoring loops in parallel
      const monitoringPromises = [
        this.startHealthMonitoring(),
        this.startPerformanceMonitoring(), 
        this.startResourceMonitoring(),
        this.startSecurityMonitoring(),
        this.startAlertProcessing(),
        this.startMetricsCollection()
      ];

      await Promise.all(monitoringPromises);
      
      console.log('✅ SWARM MONITORING ACTIVE');
      
    } catch (error) {
      console.error('❌ SWARM MONITORING FAILED:', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  async initializeMonitoring() {
    console.log('🏗️ Initializing monitoring systems...');
    
    // Load current services and workers
    await this.loadCurrentServices();
    
    // Setup monitoring directories
    await this.setupMonitoringDirectories();
    
    // Initialize metrics collection
    await this.initializeMetrics();
    
    // Setup real-time connections
    await this.setupRealTimeConnections();
    
    console.log('✅ Monitoring systems initialized');
  }

  async loadCurrentServices() {
    try {
      const response = await axios.get(`${this.renderBaseUrl}/services`, {
        headers: {
          'Authorization': `Bearer ${this.renderApiKey}`
        }
      });

      // Filter services that belong to our hive
      const hiveServices = response.data.filter(service => 
        service.name.includes('ace-crm') && service.name.includes('hive')
      );

      hiveServices.forEach(service => {
        if (service.type === 'background_worker') {
          this.workers.set(service.id, {
            id: service.id,
            name: service.name,
            type: this.getWorkerType(service.name),
            status: service.serviceDetails?.state || 'unknown',
            url: service.serviceDetails?.url,
            lastCheck: Date.now(),
            metrics: {}
          });
        } else {
          this.services.set(service.id, {
            id: service.id,
            name: service.name,
            type: this.getServiceType(service.name),
            status: service.serviceDetails?.state || 'unknown',
            url: service.serviceDetails?.url,
            lastCheck: Date.now(),
            metrics: {}
          });
        }
      });

      console.log(`📋 Loaded ${this.services.size} services and ${this.workers.size} workers`);
      
    } catch (error) {
      console.error('❌ Failed to load current services:', error);
    }
  }

  getServiceType(serviceName) {
    if (serviceName.includes('backend')) return 'backend';
    if (serviceName.includes('frontend')) return 'frontend';
    if (serviceName.includes('portal')) return 'portal';
    return 'unknown';
  }

  getWorkerType(serviceName) {
    if (serviceName.includes('email')) return 'email';
    if (serviceName.includes('analytics')) return 'analytics';
    if (serviceName.includes('file')) return 'file';
    return 'unknown';
  }

  async setupMonitoringDirectories() {
    const dirs = ['logs/monitoring', 'metrics', 'alerts', 'reports'];
    
    for (const dir of dirs) {
      await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
    }
  }

  async initializeMetrics() {
    // Initialize metric collections
    this.metrics.performance = new Map();
    this.metrics.health = new Map();
    this.metrics.errors = new Map();
    this.metrics.alerts = [];

    // Load historical metrics if available
    try {
      const metricsPath = path.join(process.cwd(), 'metrics', 'historical.json');
      const historical = await fs.readFile(metricsPath, 'utf-8');
      const data = JSON.parse(historical);
      
      // Process historical data
      console.log('📊 Historical metrics loaded');
      
    } catch (error) {
      console.log('📊 Starting fresh metrics collection');
    }
  }

  async setupRealTimeConnections() {
    // Setup WebSocket connections for real-time monitoring
    console.log('🔗 Setting up real-time connections...');
  }

  async startHealthMonitoring() {
    console.log('💓 Starting health monitoring...');
    
    const healthCheck = async () => {
      if (!this.isMonitoring) return;
      
      const healthPromises = [];
      
      // Check services health
      for (const [id, service] of this.services.entries()) {
        if (service.url) {
          healthPromises.push(this.checkServiceHealth(id, service));
        }
      }

      // Check worker health
      for (const [id, worker] of this.workers.entries()) {
        healthPromises.push(this.checkWorkerHealth(id, worker));
      }

      try {
        await Promise.allSettled(healthPromises);
      } catch (error) {
        console.error('Health check error:', error);
      }

      // Schedule next health check
      setTimeout(healthCheck, this.thresholds.healthCheckInterval);
    };

    healthCheck();
  }

  async checkServiceHealth(id, service) {
    const startTime = performance.now();
    
    try {
      const healthUrl = `${service.url}${service.type === 'backend' ? '/api/health' : '/health'}`;
      const response = await axios.get(healthUrl, { 
        timeout: this.thresholds.healthCheckTimeout,
        validateStatus: (status) => status < 500
      });
      
      const responseTime = performance.now() - startTime;
      const isHealthy = response.status === 200;
      
      // Update service metrics
      this.updateServiceMetrics(id, {
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        lastCheck: Date.now(),
        httpStatus: response.status
      });

      // Check thresholds and alert if needed
      await this.checkHealthThresholds(id, service, responseTime, isHealthy);
      
    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      this.updateServiceMetrics(id, {
        status: 'unhealthy',
        responseTime,
        lastCheck: Date.now(),
        error: error.message
      });

      await this.createAlert({
        type: 'health_check_failed',
        serviceId: id,
        serviceName: service.name,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  async checkWorkerHealth(id, worker) {
    try {
      // Check worker health via Render API
      const response = await axios.get(`${this.renderBaseUrl}/services/${id}`, {
        headers: {
          'Authorization': `Bearer ${this.renderApiKey}`
        }
      });

      const isHealthy = response.data.serviceDetails?.state === 'running';
      
      this.updateWorkerMetrics(id, {
        status: isHealthy ? 'healthy' : 'unhealthy',
        lastCheck: Date.now(),
        state: response.data.serviceDetails?.state
      });

      if (!isHealthy) {
        await this.createAlert({
          type: 'worker_unhealthy',
          workerId: id,
          workerName: worker.name,
          state: response.data.serviceDetails?.state,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      this.updateWorkerMetrics(id, {
        status: 'error',
        lastCheck: Date.now(),
        error: error.message
      });
    }
  }

  async startPerformanceMonitoring() {
    console.log('⚡ Starting performance monitoring...');
    
    const performanceCheck = async () => {
      if (!this.isMonitoring) return;
      
      // Collect performance metrics for all services
      for (const [id, service] of this.services.entries()) {
        await this.collectPerformanceMetrics(id, service);
      }

      // Analyze performance trends
      await this.analyzePerformanceTrends();
      
      // Schedule next performance check
      setTimeout(performanceCheck, this.thresholds.performanceCheckInterval);
    };

    performanceCheck();
  }

  async collectPerformanceMetrics(id, service) {
    try {
      // Collect various performance metrics
      const metrics = await this.gatherServiceMetrics(service);
      
      this.updatePerformanceMetrics(id, metrics);
      
      // Check performance thresholds
      await this.checkPerformanceThresholds(id, service, metrics);
      
    } catch (error) {
      console.error(`Performance collection failed for ${service.name}:`, error);
    }
  }

  async gatherServiceMetrics(service) {
    // Simulate gathering metrics (in real implementation, this would 
    // integrate with actual monitoring services)
    return {
      responseTime: Math.random() * 1000,
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      requestRate: Math.random() * 100,
      errorRate: Math.random() * 5,
      timestamp: Date.now()
    };
  }

  async startResourceMonitoring() {
    console.log('💾 Starting resource monitoring...');
    
    const resourceCheck = async () => {
      if (!this.isMonitoring) return;
      
      // Monitor resource usage for auto-scaling decisions
      for (const [id, service] of this.services.entries()) {
        await this.monitorResourceUsage(id, service);
      }

      // Check if scaling is needed
      await this.checkScalingNeeds();
      
      setTimeout(resourceCheck, this.thresholds.resourceCheckInterval);
    };

    resourceCheck();
  }

  async monitorResourceUsage(id, service) {
    // Monitor CPU, memory, disk usage
    // Make scaling recommendations
  }

  async checkScalingNeeds() {
    // Analyze resource usage and make scaling decisions
    for (const [id, service] of this.services.entries()) {
      const metrics = this.metrics.performance.get(id);
      if (!metrics) continue;

      const latestMetrics = metrics[metrics.length - 1];
      if (!latestMetrics) continue;

      // Check if scaling up is needed
      if (latestMetrics.cpuUsage > this.thresholds.scaleUpCpuThreshold) {
        await this.createScalingAlert({
          type: 'scale_up_needed',
          serviceId: id,
          reason: 'high_cpu',
          value: latestMetrics.cpuUsage,
          timestamp: Date.now()
        });
      }

      // Check if scaling down is possible
      if (latestMetrics.cpuUsage < this.thresholds.scaleDownCpuThreshold) {
        await this.createScalingAlert({
          type: 'scale_down_possible',
          serviceId: id,
          reason: 'low_cpu',
          value: latestMetrics.cpuUsage,
          timestamp: Date.now()
        });
      }
    }
  }

  async startSecurityMonitoring() {
    console.log('🛡️ Starting security monitoring...');
    
    // Monitor for security threats, unusual patterns, etc.
    const securityCheck = async () => {
      if (!this.isMonitoring) return;
      
      await this.checkSecurityThreats();
      
      setTimeout(securityCheck, this.thresholds.securityCheckInterval);
    };

    securityCheck();
  }

  async checkSecurityThreats() {
    // Monitor for:
    // - Unusual traffic patterns
    // - Failed authentication attempts
    // - Suspicious API calls
    // - DDoS attacks
  }

  async startAlertProcessing() {
    console.log('🚨 Starting alert processing...');
    
    const alertProcessor = async () => {
      if (!this.isMonitoring) return;
      
      // Process pending alerts
      const pendingAlerts = this.metrics.alerts.filter(alert => !alert.processed);
      
      for (const alert of pendingAlerts) {
        await this.processAlert(alert);
      }
      
      // Clean up old alerts
      await this.cleanupOldAlerts();
      
      setTimeout(alertProcessor, this.thresholds.alertProcessingInterval);
    };

    alertProcessor();
  }

  async processAlert(alert) {
    try {
      // Send alert through configured channels
      for (const channel of this.alertChannels) {
        await this.sendAlert(channel, alert);
      }

      // Mark alert as processed
      alert.processed = true;
      alert.processedAt = Date.now();
      
      // Store alert for historical tracking
      await this.storeAlert(alert);
      
    } catch (error) {
      console.error('Alert processing failed:', error);
    }
  }

  async sendAlert(channel, alert) {
    switch (channel.type) {
      case 'webhook':
        await this.sendWebhookAlert(channel, alert);
        break;
      case 'email':
        await this.sendEmailAlert(channel, alert);
        break;
      default:
        console.log(`📢 ALERT [${alert.type}]:`, alert.message || alert);
    }
  }

  async sendWebhookAlert(channel, alert) {
    try {
      await axios.post(channel.url, {
        alert,
        timestamp: Date.now(),
        monitorId: this.monitoringId
      });
    } catch (error) {
      console.error('Webhook alert failed:', error);
    }
  }

  async sendEmailAlert(channel, alert) {
    // Implementation would depend on email service
    console.log(`📧 Email alert sent to ${channel.email}`);
  }

  async startMetricsCollection() {
    console.log('📊 Starting metrics collection...');
    
    const metricsCollector = async () => {
      if (!this.isMonitoring) return;
      
      // Aggregate and store metrics
      await this.aggregateMetrics();
      
      // Generate reports
      await this.generateReports();
      
      setTimeout(metricsCollector, this.thresholds.metricsCollectionInterval);
    };

    metricsCollector();
  }

  async aggregateMetrics() {
    // Aggregate metrics for reporting and analysis
    const aggregation = {
      timestamp: Date.now(),
      services: {},
      workers: {},
      summary: {}
    };

    // Aggregate service metrics
    for (const [id, service] of this.services.entries()) {
      const metrics = this.metrics.performance.get(id) || [];
      const healthMetrics = this.metrics.health.get(id) || [];
      
      aggregation.services[id] = {
        name: service.name,
        type: service.type,
        metrics: this.calculateAggregates(metrics),
        health: this.calculateHealthStatus(healthMetrics)
      };
    }

    // Store aggregated metrics
    await this.storeAggregatedMetrics(aggregation);
  }

  calculateAggregates(metrics) {
    if (metrics.length === 0) return {};
    
    const values = metrics.map(m => m.responseTime).filter(v => v !== undefined);
    
    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  calculateHealthStatus(healthMetrics) {
    if (healthMetrics.length === 0) return 'unknown';
    
    const latest = healthMetrics[healthMetrics.length - 1];
    return latest.status;
  }

  async generateReports() {
    const report = {
      generatedAt: Date.now(),
      monitoringDuration: Date.now() - this.startTime,
      summary: {
        totalServices: this.services.size,
        totalWorkers: this.workers.size,
        healthyServices: 0,
        unhealthyServices: 0,
        totalAlerts: this.metrics.alerts.length
      },
      services: {},
      workers: {},
      alerts: this.metrics.alerts.slice(-50) // Last 50 alerts
    };

    // Calculate health summary
    for (const [id, service] of this.services.entries()) {
      const healthMetrics = this.metrics.health.get(id) || [];
      const latestHealth = healthMetrics[healthMetrics.length - 1];
      
      if (latestHealth?.status === 'healthy') {
        report.summary.healthyServices++;
      } else {
        report.summary.unhealthyServices++;
      }
    }

    await this.storeReport(report);
  }

  updateServiceMetrics(id, metrics) {
    if (!this.metrics.health.has(id)) {
      this.metrics.health.set(id, []);
    }
    
    this.metrics.health.get(id).push(metrics);
    
    // Keep only last 1000 metrics
    const healthMetrics = this.metrics.health.get(id);
    if (healthMetrics.length > 1000) {
      healthMetrics.splice(0, healthMetrics.length - 1000);
    }
  }

  updateWorkerMetrics(id, metrics) {
    if (!this.metrics.health.has(id)) {
      this.metrics.health.set(id, []);
    }
    
    this.metrics.health.get(id).push(metrics);
  }

  updatePerformanceMetrics(id, metrics) {
    if (!this.metrics.performance.has(id)) {
      this.metrics.performance.set(id, []);
    }
    
    this.metrics.performance.get(id).push(metrics);
    
    // Keep only last 1000 metrics
    const performanceMetrics = this.metrics.performance.get(id);
    if (performanceMetrics.length > 1000) {
      performanceMetrics.splice(0, performanceMetrics.length - 1000);
    }
  }

  async createAlert(alert) {
    alert.id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    alert.processed = false;
    
    this.metrics.alerts.push(alert);
    
    console.log(`🚨 ALERT CREATED [${alert.type}]: ${alert.serviceName || alert.workerName}`);
  }

  async createScalingAlert(alert) {
    alert.id = `scaling-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    alert.processed = false;
    
    this.metrics.alerts.push(alert);
    
    console.log(`📈 SCALING ALERT [${alert.type}]: Service ${alert.serviceId}`);
  }

  async checkHealthThresholds(id, service, responseTime, isHealthy) {
    if (responseTime > this.thresholds.responseTimeAlert) {
      await this.createAlert({
        type: 'slow_response',
        serviceId: id,
        serviceName: service.name,
        responseTime,
        threshold: this.thresholds.responseTimeAlert,
        timestamp: Date.now()
      });
    }

    if (!isHealthy) {
      await this.createAlert({
        type: 'service_unhealthy',
        serviceId: id,
        serviceName: service.name,
        timestamp: Date.now()
      });
    }
  }

  async checkPerformanceThresholds(id, service, metrics) {
    if (metrics.errorRate > this.thresholds.errorRateAlert) {
      await this.createAlert({
        type: 'high_error_rate',
        serviceId: id,
        serviceName: service.name,
        errorRate: metrics.errorRate,
        threshold: this.thresholds.errorRateAlert,
        timestamp: Date.now()
      });
    }
  }

  async analyzePerformanceTrends() {
    // Analyze performance trends and predict issues
    for (const [id, metrics] of this.metrics.performance.entries()) {
      if (metrics.length < 10) continue; // Need enough data points
      
      const recentMetrics = metrics.slice(-10);
      const trend = this.calculateTrend(recentMetrics.map(m => m.responseTime));
      
      if (trend > this.thresholds.performanceDegradationThreshold) {
        const service = this.services.get(id);
        await this.createAlert({
          type: 'performance_degradation',
          serviceId: id,
          serviceName: service?.name,
          trend,
          timestamp: Date.now()
        });
      }
    }
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    // Simple linear regression slope
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  async cleanupOldAlerts() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    this.metrics.alerts = this.metrics.alerts.filter(alert => 
      alert.timestamp > cutoff
    );
  }

  async storeAlert(alert) {
    try {
      const alertPath = path.join(process.cwd(), 'alerts', `${alert.id}.json`);
      await fs.writeFile(alertPath, JSON.stringify(alert, null, 2));
    } catch (error) {
      console.error('Failed to store alert:', error);
    }
  }

  async storeAggregatedMetrics(aggregation) {
    try {
      const metricsPath = path.join(process.cwd(), 'metrics', `aggregated-${Date.now()}.json`);
      await fs.writeFile(metricsPath, JSON.stringify(aggregation, null, 2));
    } catch (error) {
      console.error('Failed to store aggregated metrics:', error);
    }
  }

  async storeReport(report) {
    try {
      const reportPath = path.join(process.cwd(), 'reports', `monitor-report-${Date.now()}.json`);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`📋 Monitoring report saved: ${reportPath}`);
    } catch (error) {
      console.error('Failed to store report:', error);
    }
  }

  loadThresholds() {
    return {
      healthCheckInterval: 30000, // 30 seconds
      healthCheckTimeout: 10000, // 10 seconds
      performanceCheckInterval: 60000, // 1 minute
      resourceCheckInterval: 60000, // 1 minute
      securityCheckInterval: 300000, // 5 minutes
      alertProcessingInterval: 5000, // 5 seconds
      metricsCollectionInterval: 300000, // 5 minutes
      
      responseTimeAlert: 2000, // 2 seconds
      errorRateAlert: 5, // 5%
      scaleUpCpuThreshold: 75, // 75%
      scaleDownCpuThreshold: 25, // 25%
      performanceDegradationThreshold: 0.1
    };
  }

  setupAlertChannels() {
    return [
      {
        type: 'console',
        enabled: true
      },
      {
        type: 'webhook',
        url: process.env.WEBHOOK_URL,
        enabled: !!process.env.WEBHOOK_URL
      },
      {
        type: 'email',
        email: process.env.ALERT_EMAIL,
        enabled: !!process.env.ALERT_EMAIL
      }
    ].filter(channel => channel.enabled);
  }

  async stopMonitoring() {
    console.log('⏹️ Stopping swarm monitoring...');
    this.isMonitoring = false;
    
    // Generate final report
    await this.generateReports();
    
    console.log('✅ Swarm monitoring stopped');
  }

  getMonitoringStatus() {
    return {
      monitoringId: this.monitoringId,
      isActive: this.isMonitoring,
      uptime: Date.now() - this.startTime,
      services: this.services.size,
      workers: this.workers.size,
      totalAlerts: this.metrics.alerts.length,
      recentAlerts: this.metrics.alerts.slice(-10)
    };
  }
}

// CLI Interface
if (require.main === module) {
  const monitor = new SwarmMonitor();
  
  monitor.startMonitoring()
    .then(() => {
      console.log('🔍 Swarm monitoring active');
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n🛑 Shutdown signal received');
        await monitor.stopMonitoring();
        process.exit(0);
      });
    })
    .catch(error => {
      console.error('💥 Monitoring startup failed:', error);
      process.exit(1);
    });
}

module.exports = SwarmMonitor;