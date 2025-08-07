const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class AutoScaler extends EventEmitter {
  constructor() {
    super();
    this.renderApiKey = process.env.RENDER_API_KEY || 'rnd_xjlZYC6KzvaCC8om8AkF8NPUPrgb';
    this.renderBaseUrl = 'https://api.render.com/v1';
    this.scalingId = `scaler-${Date.now()}`;
    this.isActive = false;
    this.services = new Map();
    this.scalingHistory = [];
    this.metrics = new Map();
    this.predictions = new Map();
    this.scalingRules = this.loadScalingRules();
    this.cooldownPeriods = new Map();
    this.startTime = Date.now();
  }

  async startAutoScaling() {
    console.log('🔄 AUTO-SCALING SYSTEM INITIATED');
    console.log(`📊 Scaler ID: ${this.scalingId}`);
    
    this.isActive = true;
    
    try {
      // Initialize auto-scaling system
      await this.initializeAutoScaler();
      
      // Start scaling loops in parallel
      const scalingPromises = [
        this.startMetricsCollection(),
        this.startScalingAnalysis(),
        this.startPredictiveScaling(),
        this.startCostOptimization(),
        this.startScalingExecution(),
        this.startPerformanceTracking()
      ];

      await Promise.all(scalingPromises);
      
      console.log('✅ AUTO-SCALING SYSTEM ACTIVE');
      
    } catch (error) {
      console.error('❌ AUTO-SCALING STARTUP FAILED:', error);
      this.isActive = false;
      throw error;
    }
  }

  async initializeAutoScaler() {
    console.log('🏗️ Initializing auto-scaling system...');
    
    // Load current services and their configurations
    await this.loadServices();
    
    // Initialize metrics collection
    await this.initializeMetrics();
    
    // Load historical scaling data
    await this.loadScalingHistory();
    
    // Setup scaling directories
    await this.setupScalingDirectories();
    
    console.log('✅ Auto-scaling system initialized');
  }

  async loadServices() {
    try {
      const response = await axios.get(`${this.renderBaseUrl}/services`, {
        headers: {
          'Authorization': `Bearer ${this.renderApiKey}`
        }
      });

      // Filter hive services
      const hiveServices = response.data.filter(service => 
        service.name.includes('ace-crm') && service.name.includes('hive')
      );

      hiveServices.forEach(service => {
        const serviceConfig = {
          id: service.id,
          name: service.name,
          type: this.getServiceType(service.name),
          currentInstances: service.serviceDetails?.numInstances || 1,
          minInstances: this.getMinInstances(service.name),
          maxInstances: this.getMaxInstances(service.name),
          targetUtilization: this.getTargetUtilization(service.name),
          scalingRules: this.getServiceScalingRules(service.name),
          lastScaling: null,
          cooldownUntil: 0,
          metrics: [],
          status: service.serviceDetails?.state || 'unknown'
        };

        this.services.set(service.id, serviceConfig);
      });

      console.log(`📋 Loaded ${this.services.size} services for auto-scaling`);
      
    } catch (error) {
      console.error('❌ Failed to load services:', error);
      throw error;
    }
  }

  getServiceType(serviceName) {
    if (serviceName.includes('backend')) return 'backend';
    if (serviceName.includes('frontend')) return 'frontend';
    if (serviceName.includes('portal')) return 'portal';
    if (serviceName.includes('worker')) return 'worker';
    return 'unknown';
  }

  getMinInstances(serviceName) {
    if (serviceName.includes('backend')) return 2;
    if (serviceName.includes('frontend')) return 1;
    if (serviceName.includes('portal')) return 2;
    if (serviceName.includes('worker')) return 1;
    return 1;
  }

  getMaxInstances(serviceName) {
    if (serviceName.includes('backend')) return 10;
    if (serviceName.includes('frontend')) return 5;
    if (serviceName.includes('portal')) return 8;
    if (serviceName.includes('worker')) return 6;
    return 3;
  }

  getTargetUtilization(serviceName) {
    if (serviceName.includes('backend')) return 70; // 70% CPU
    if (serviceName.includes('frontend')) return 60;
    if (serviceName.includes('portal')) return 65;
    if (serviceName.includes('worker')) return 75;
    return 70;
  }

  getServiceScalingRules(serviceName) {
    const baseRules = {
      scaleUpThresholds: {
        cpu: 75,
        memory: 80,
        responseTime: 2000,
        errorRate: 5
      },
      scaleDownThresholds: {
        cpu: 30,
        memory: 40,
        responseTime: 500,
        errorRate: 1
      },
      cooldownPeriod: 300000, // 5 minutes
      scaleStepSize: 1,
      maxScaleUpSteps: 3,
      maxScaleDownSteps: 1
    };

    // Customize rules per service type
    if (serviceName.includes('worker')) {
      baseRules.scaleUpThresholds.cpu = 85;
      baseRules.scaleDownThresholds.cpu = 20;
      baseRules.cooldownPeriod = 180000; // 3 minutes for workers
    }

    return baseRules;
  }

  async initializeMetrics() {
    // Initialize metric collections for each service
    for (const [id, service] of this.services.entries()) {
      this.metrics.set(id, {
        cpu: [],
        memory: [],
        responseTime: [],
        errorRate: [],
        requestRate: [],
        queueSize: []
      });
    }
  }

  async loadScalingHistory() {
    try {
      const historyPath = path.join(process.cwd(), 'scaling-history.json');
      const historyData = await fs.readFile(historyPath, 'utf-8');
      this.scalingHistory = JSON.parse(historyData);
      
      console.log(`📊 Loaded ${this.scalingHistory.length} historical scaling events`);
    } catch (error) {
      console.log('📊 Starting fresh scaling history');
      this.scalingHistory = [];
    }
  }

  async setupScalingDirectories() {
    const dirs = ['logs/scaling', 'scaling-history', 'predictions'];
    
    for (const dir of dirs) {
      await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
    }
  }

  async startMetricsCollection() {
    console.log('📊 Starting metrics collection for scaling...');
    
    const metricsCollector = async () => {
      if (!this.isActive) return;
      
      // Collect metrics for all services
      const metricsPromises = Array.from(this.services.keys()).map(id => 
        this.collectServiceMetrics(id)
      );

      try {
        await Promise.all(metricsPromises);
      } catch (error) {
        console.error('Metrics collection error:', error);
      }

      // Schedule next collection
      setTimeout(metricsCollector, this.scalingRules.metricsInterval);
    };

    metricsCollector();
  }

  async collectServiceMetrics(serviceId) {
    try {
      const service = this.services.get(serviceId);
      if (!service) return;

      // In a real implementation, these would come from monitoring services
      // For now, we'll simulate realistic metrics
      const currentMetrics = await this.gatherRealTimeMetrics(serviceId, service);
      
      // Store metrics
      for (const [metricType, value] of Object.entries(currentMetrics)) {
        if (this.metrics.get(serviceId)[metricType]) {
          this.metrics.get(serviceId)[metricType].push({
            value,
            timestamp: Date.now()
          });
          
          // Keep only last 1000 data points
          const metricArray = this.metrics.get(serviceId)[metricType];
          if (metricArray.length > 1000) {
            metricArray.splice(0, metricArray.length - 1000);
          }
        }
      }

      // Update service with latest metrics
      service.latestMetrics = currentMetrics;
      
    } catch (error) {
      console.error(`Failed to collect metrics for ${serviceId}:`, error);
    }
  }

  async gatherRealTimeMetrics(serviceId, service) {
    // Simulate realistic metrics based on time of day and service type
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 9 && hour <= 17;
    const loadMultiplier = isBusinessHours ? 1.5 : 0.5;
    
    let baseLoad = 40;
    if (service.type === 'backend') baseLoad = 50;
    if (service.type === 'worker') baseLoad = 35;
    
    // Add some randomness to simulate real-world variations
    const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
    
    return {
      cpu: Math.min(100, (baseLoad * loadMultiplier * randomFactor)),
      memory: Math.min(100, (baseLoad * 0.8 * loadMultiplier * randomFactor)),
      responseTime: Math.max(100, 500 + (Math.random() * 1000 * loadMultiplier)),
      errorRate: Math.max(0, Math.random() * 3 * (loadMultiplier - 0.5)),
      requestRate: Math.max(1, 50 * loadMultiplier * randomFactor),
      queueSize: Math.max(0, Math.random() * 100 * loadMultiplier)
    };
  }

  async startScalingAnalysis() {
    console.log('🧮 Starting scaling analysis...');
    
    const scalingAnalyzer = async () => {
      if (!this.isActive) return;
      
      // Analyze each service for scaling needs
      for (const [id, service] of this.services.entries()) {
        await this.analyzeScalingNeeds(id, service);
      }
      
      setTimeout(scalingAnalyzer, this.scalingRules.analysisInterval);
    };

    scalingAnalyzer();
  }

  async analyzeScalingNeeds(serviceId, service) {
    try {
      const latestMetrics = service.latestMetrics;
      if (!latestMetrics) return;

      const scalingRules = service.scalingRules;
      const currentTime = Date.now();
      
      // Check if service is in cooldown period
      if (currentTime < service.cooldownUntil) {
        return;
      }

      // Check for scale-up conditions
      const shouldScaleUp = this.checkScaleUpConditions(latestMetrics, scalingRules);
      if (shouldScaleUp && service.currentInstances < service.maxInstances) {
        await this.queueScalingAction({
          serviceId,
          action: 'scale_up',
          currentInstances: service.currentInstances,
          targetInstances: Math.min(
            service.maxInstances,
            service.currentInstances + scalingRules.scaleStepSize
          ),
          reason: shouldScaleUp.reason,
          metrics: latestMetrics,
          timestamp: currentTime
        });
        return;
      }

      // Check for scale-down conditions (only if not recently scaled up)
      const shouldScaleDown = this.checkScaleDownConditions(latestMetrics, scalingRules);
      if (shouldScaleDown && service.currentInstances > service.minInstances) {
        await this.queueScalingAction({
          serviceId,
          action: 'scale_down',
          currentInstances: service.currentInstances,
          targetInstances: Math.max(
            service.minInstances,
            service.currentInstances - scalingRules.scaleStepSize
          ),
          reason: shouldScaleDown.reason,
          metrics: latestMetrics,
          timestamp: currentTime
        });
      }
      
    } catch (error) {
      console.error(`Scaling analysis failed for ${serviceId}:`, error);
    }
  }

  checkScaleUpConditions(metrics, rules) {
    const conditions = [];
    
    if (metrics.cpu > rules.scaleUpThresholds.cpu) {
      conditions.push(`CPU usage ${metrics.cpu.toFixed(1)}% > ${rules.scaleUpThresholds.cpu}%`);
    }
    
    if (metrics.memory > rules.scaleUpThresholds.memory) {
      conditions.push(`Memory usage ${metrics.memory.toFixed(1)}% > ${rules.scaleUpThresholds.memory}%`);
    }
    
    if (metrics.responseTime > rules.scaleUpThresholds.responseTime) {
      conditions.push(`Response time ${metrics.responseTime.toFixed(0)}ms > ${rules.scaleUpThresholds.responseTime}ms`);
    }
    
    if (metrics.errorRate > rules.scaleUpThresholds.errorRate) {
      conditions.push(`Error rate ${metrics.errorRate.toFixed(2)}% > ${rules.scaleUpThresholds.errorRate}%`);
    }

    if (conditions.length >= 2) { // Require at least 2 conditions for scale-up
      return {
        reason: conditions.join(', ')
      };
    }
    
    return null;
  }

  checkScaleDownConditions(metrics, rules) {
    // Be more conservative with scale-down - require all conditions to be met
    const conditions = [];
    
    if (metrics.cpu < rules.scaleDownThresholds.cpu) {
      conditions.push(`CPU usage ${metrics.cpu.toFixed(1)}% < ${rules.scaleDownThresholds.cpu}%`);
    } else {
      return null; // If CPU is not low, don't scale down
    }
    
    if (metrics.memory < rules.scaleDownThresholds.memory) {
      conditions.push(`Memory usage ${metrics.memory.toFixed(1)}% < ${rules.scaleDownThresholds.memory}%`);
    }
    
    if (metrics.responseTime < rules.scaleDownThresholds.responseTime) {
      conditions.push(`Response time ${metrics.responseTime.toFixed(0)}ms < ${rules.scaleDownThresholds.responseTime}ms`);
    }
    
    if (metrics.errorRate < rules.scaleDownThresholds.errorRate) {
      conditions.push(`Error rate ${metrics.errorRate.toFixed(2)}% < ${rules.scaleDownThresholds.errorRate}%`);
    }

    if (conditions.length >= 3) { // Require at least 3 conditions for scale-down
      return {
        reason: conditions.join(', ')
      };
    }
    
    return null;
  }

  async queueScalingAction(action) {
    // Add to scaling queue and emit event
    this.emit('scaling_needed', action);
    
    console.log(`📈 SCALING ACTION QUEUED: ${action.action} for service ${action.serviceId}`);
    console.log(`   Current: ${action.currentInstances} → Target: ${action.targetInstances}`);
    console.log(`   Reason: ${action.reason}`);
  }

  async startScalingExecution() {
    console.log('⚡ Starting scaling execution...');
    
    // Listen for scaling events
    this.on('scaling_needed', async (action) => {
      await this.executeScalingAction(action);
    });
  }

  async executeScalingAction(action) {
    try {
      const service = this.services.get(action.serviceId);
      if (!service) {
        throw new Error(`Service not found: ${action.serviceId}`);
      }

      console.log(`🔄 EXECUTING SCALING ACTION: ${action.action}`);
      console.log(`   Service: ${service.name}`);
      console.log(`   ${action.currentInstances} → ${action.targetInstances} instances`);

      // Execute the scaling via Render API
      const scalingResult = await this.scaleService(action.serviceId, action.targetInstances);
      
      // Update service configuration
      service.currentInstances = action.targetInstances;
      service.lastScaling = Date.now();
      service.cooldownUntil = Date.now() + service.scalingRules.cooldownPeriod;

      // Record scaling event
      const scalingEvent = {
        id: `scaling-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        serviceId: action.serviceId,
        serviceName: service.name,
        action: action.action,
        fromInstances: action.currentInstances,
        toInstances: action.targetInstances,
        reason: action.reason,
        metrics: action.metrics,
        executedAt: Date.now(),
        success: true,
        renderResponse: scalingResult
      };

      this.scalingHistory.push(scalingEvent);
      
      // Store scaling history
      await this.saveScalingHistory();
      
      console.log(`✅ SCALING COMPLETED: ${service.name} now has ${action.targetInstances} instances`);
      
      // Emit scaling completed event
      this.emit('scaling_completed', scalingEvent);
      
    } catch (error) {
      console.error(`❌ SCALING FAILED:`, error);
      
      // Record failed scaling event
      const failedEvent = {
        id: `scaling-failed-${Date.now()}`,
        serviceId: action.serviceId,
        action: action.action,
        reason: action.reason,
        executedAt: Date.now(),
        success: false,
        error: error.message
      };

      this.scalingHistory.push(failedEvent);
      await this.saveScalingHistory();
      
      this.emit('scaling_failed', failedEvent);
    }
  }

  async scaleService(serviceId, targetInstances) {
    try {
      const response = await axios.patch(
        `${this.renderBaseUrl}/services/${serviceId}`,
        {
          numInstances: targetInstances
        },
        {
          headers: {
            'Authorization': `Bearer ${this.renderApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
      
    } catch (error) {
      throw new Error(`Render API scaling failed: ${error.message}`);
    }
  }

  async startPredictiveScaling() {
    console.log('🔮 Starting predictive scaling...');
    
    const predictor = async () => {
      if (!this.isActive) return;
      
      // Generate predictions for each service
      for (const [id, service] of this.services.entries()) {
        await this.generateScalingPredictions(id, service);
      }
      
      setTimeout(predictor, this.scalingRules.predictionInterval);
    };

    predictor();
  }

  async generateScalingPredictions(serviceId, service) {
    try {
      const metrics = this.metrics.get(serviceId);
      if (!metrics || !metrics.cpu.length) return;

      // Simple time-series prediction based on recent trends
      const predictions = {
        nextHour: this.predictLoad(metrics.cpu, 60), // Next hour
        next6Hours: this.predictLoad(metrics.cpu, 360), // Next 6 hours
        nextDay: this.predictLoad(metrics.cpu, 1440), // Next day
        generatedAt: Date.now()
      };

      this.predictions.set(serviceId, predictions);
      
      // Check if we should proactively scale based on predictions
      await this.checkPredictiveScaling(serviceId, service, predictions);
      
    } catch (error) {
      console.error(`Prediction generation failed for ${serviceId}:`, error);
    }
  }

  predictLoad(cpuMetrics, minutesAhead) {
    if (cpuMetrics.length < 10) return null;
    
    // Take last 20 data points for prediction
    const recentMetrics = cpuMetrics.slice(-20);
    const values = recentMetrics.map(m => m.value);
    
    // Simple linear trend + seasonal adjustment
    const trend = this.calculateTrend(values);
    const lastValue = values[values.length - 1];
    const seasonal = this.calculateSeasonalAdjustment(minutesAhead);
    
    const predicted = Math.max(0, Math.min(100, lastValue + (trend * minutesAhead) + seasonal));
    
    return {
      value: predicted,
      confidence: this.calculateConfidence(values),
      trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable'
    };
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

  calculateSeasonalAdjustment(minutesAhead) {
    const hour = new Date(Date.now() + (minutesAhead * 60000)).getHours();
    
    // Business hours adjustment
    if (hour >= 9 && hour <= 17) {
      return 15; // Higher load during business hours
    } else if (hour >= 18 && hour <= 22) {
      return 5; // Moderate evening load
    } else {
      return -10; // Lower load at night/early morning
    }
  }

  calculateConfidence(values) {
    if (values.length < 3) return 0.5;
    
    // Calculate variance
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower variance = higher confidence
    return Math.max(0.3, Math.min(0.95, 1 - (stdDev / 50)));
  }

  async checkPredictiveScaling(serviceId, service, predictions) {
    const nextHourPrediction = predictions.nextHour;
    if (!nextHourPrediction || nextHourPrediction.confidence < 0.7) return;
    
    const currentTime = Date.now();
    if (currentTime < service.cooldownUntil) return;
    
    // If we predict high load with high confidence, proactively scale up
    if (nextHourPrediction.value > service.scalingRules.scaleUpThresholds.cpu && 
        nextHourPrediction.trend === 'increasing' &&
        service.currentInstances < service.maxInstances) {
      
      await this.queueScalingAction({
        serviceId,
        action: 'predictive_scale_up',
        currentInstances: service.currentInstances,
        targetInstances: Math.min(
          service.maxInstances,
          service.currentInstances + 1
        ),
        reason: `Predictive scaling: Expected ${nextHourPrediction.value.toFixed(1)}% CPU in next hour`,
        metrics: { predictive: nextHourPrediction },
        timestamp: currentTime
      });
    }
  }

  async startCostOptimization() {
    console.log('💰 Starting cost optimization...');
    
    const costOptimizer = async () => {
      if (!this.isActive) return;
      
      await this.optimizeCosts();
      
      setTimeout(costOptimizer, this.scalingRules.costOptimizationInterval);
    };

    costOptimizer();
  }

  async optimizeCosts() {
    // Analyze cost vs performance trade-offs
    // Look for opportunities to scale down during low-usage periods
    // Suggest more cost-effective instance types
    
    const costAnalysis = {
      totalInstances: 0,
      estimatedMonthlyCost: 0,
      optimizationOpportunities: []
    };

    for (const [id, service] of this.services.entries()) {
      costAnalysis.totalInstances += service.currentInstances;
      
      // Estimate cost (rough calculation)
      const instanceCost = this.getInstanceCost(service.type);
      costAnalysis.estimatedMonthlyCost += service.currentInstances * instanceCost;
      
      // Check for optimization opportunities
      const recentMetrics = this.metrics.get(id);
      if (recentMetrics && recentMetrics.cpu.length > 10) {
        const avgCpu = this.calculateAverageMetric(recentMetrics.cpu, 60); // Last hour
        
        if (avgCpu < 20 && service.currentInstances > service.minInstances) {
          costAnalysis.optimizationOpportunities.push({
            serviceId: id,
            serviceName: service.name,
            opportunity: 'scale_down',
            potentialSavings: instanceCost,
            reason: `Average CPU ${avgCpu.toFixed(1)}% is very low`
          });
        }
      }
    }

    // Store cost analysis
    await this.storeCostAnalysis(costAnalysis);
  }

  getInstanceCost(serviceType) {
    // Rough Render.com pricing estimates (monthly)
    switch (serviceType) {
      case 'backend': return 7; // Starter plan
      case 'frontend': return 0; // Static site (free tier)
      case 'portal': return 7; // Starter plan
      case 'worker': return 7; // Starter plan
      default: return 7;
    }
  }

  calculateAverageMetric(metricArray, minutes) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const recentMetrics = metricArray.filter(m => m.timestamp > cutoff);
    
    if (recentMetrics.length === 0) return 0;
    
    return recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
  }

  async startPerformanceTracking() {
    console.log('📈 Starting performance tracking...');
    
    const performanceTracker = async () => {
      if (!this.isActive) return;
      
      await this.trackScalingPerformance();
      
      setTimeout(performanceTracker, this.scalingRules.performanceTrackingInterval);
    };

    performanceTracker();
  }

  async trackScalingPerformance() {
    // Track how effective our scaling decisions have been
    const recentScalingEvents = this.scalingHistory
      .filter(event => event.executedAt > Date.now() - (24 * 60 * 60 * 1000)) // Last 24 hours
      .filter(event => event.success);

    const performance = {
      totalScalingEvents: recentScalingEvents.length,
      scaleUpEvents: recentScalingEvents.filter(e => e.action === 'scale_up').length,
      scaleDownEvents: recentScalingEvents.filter(e => e.action === 'scale_down').length,
      predictiveEvents: recentScalingEvents.filter(e => e.action === 'predictive_scale_up').length,
      averageResponseTimeImprovement: 0,
      costImpact: 0
    };

    // Calculate performance metrics
    for (const event of recentScalingEvents) {
      // Track improvements in response time after scaling
      // This would require comparing metrics before and after scaling
    }

    await this.storePerformanceMetrics(performance);
  }

  loadScalingRules() {
    return {
      metricsInterval: 30000, // 30 seconds
      analysisInterval: 60000, // 1 minute
      predictionInterval: 300000, // 5 minutes
      costOptimizationInterval: 3600000, // 1 hour
      performanceTrackingInterval: 600000, // 10 minutes
      
      // Machine learning parameters
      minDataPointsForPrediction: 10,
      predictionHorizon: 3600000, // 1 hour
      confidenceThreshold: 0.7
    };
  }

  async saveScalingHistory() {
    try {
      const historyPath = path.join(process.cwd(), 'scaling-history.json');
      
      // Keep only last 1000 events
      if (this.scalingHistory.length > 1000) {
        this.scalingHistory = this.scalingHistory.slice(-1000);
      }
      
      await fs.writeFile(historyPath, JSON.stringify(this.scalingHistory, null, 2));
    } catch (error) {
      console.error('Failed to save scaling history:', error);
    }
  }

  async storeCostAnalysis(analysis) {
    try {
      const analysisPath = path.join(process.cwd(), 'logs/scaling', `cost-analysis-${Date.now()}.json`);
      await fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2));
    } catch (error) {
      console.error('Failed to store cost analysis:', error);
    }
  }

  async storePerformanceMetrics(metrics) {
    try {
      const metricsPath = path.join(process.cwd(), 'logs/scaling', `performance-${Date.now()}.json`);
      await fs.writeFile(metricsPath, JSON.stringify(metrics, null, 2));
    } catch (error) {
      console.error('Failed to store performance metrics:', error);
    }
  }

  async stopAutoScaling() {
    console.log('⏹️ Stopping auto-scaling...');
    this.isActive = false;
    
    // Save final state
    await this.saveScalingHistory();
    
    console.log('✅ Auto-scaling stopped');
  }

  getScalingStatus() {
    return {
      scalingId: this.scalingId,
      isActive: this.isActive,
      uptime: Date.now() - this.startTime,
      services: this.services.size,
      totalInstances: Array.from(this.services.values()).reduce((sum, s) => sum + s.currentInstances, 0),
      recentScalingEvents: this.scalingHistory.slice(-10),
      predictions: Object.fromEntries(this.predictions)
    };
  }

  // Manual scaling methods
  async manualScale(serviceId, targetInstances) {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    if (targetInstances < service.minInstances || targetInstances > service.maxInstances) {
      throw new Error(`Invalid instance count: must be between ${service.minInstances} and ${service.maxInstances}`);
    }

    await this.executeScalingAction({
      serviceId,
      action: 'manual_scale',
      currentInstances: service.currentInstances,
      targetInstances,
      reason: 'Manual scaling request',
      metrics: {},
      timestamp: Date.now()
    });
  }

  async setScalingRules(serviceId, rules) {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    service.scalingRules = { ...service.scalingRules, ...rules };
    console.log(`✅ Updated scaling rules for ${service.name}`);
  }
}

// CLI Interface
if (require.main === module) {
  const autoScaler = new AutoScaler();
  
  autoScaler.startAutoScaling()
    .then(() => {
      console.log('🔄 Auto-scaling system active');
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n🛑 Shutdown signal received');
        await autoScaler.stopAutoScaling();
        process.exit(0);
      });
    })
    .catch(error => {
      console.error('💥 Auto-scaling startup failed:', error);
      process.exit(1);
    });
}

module.exports = AutoScaler;