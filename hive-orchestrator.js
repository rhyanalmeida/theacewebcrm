#!/usr/bin/env node

const HiveSwarmDeployer = require('./swarm-deploy');
const SwarmMonitor = require('./swarm-monitor');
const AutoScaler = require('./auto-scale');
const SwarmIntelligence = require('./swarm-intelligence');
const fs = require('fs').promises;
const path = require('path');

class HiveOrchestrator {
  constructor() {
    this.orchestratorId = `hive-queen-${Date.now()}`;
    this.systems = new Map();
    this.isActive = false;
    this.startTime = Date.now();
    this.config = null;
    this.status = {
      deployment: 'inactive',
      monitoring: 'inactive', 
      scaling: 'inactive',
      intelligence: 'inactive'
    };
  }

  async initializeHive() {
    console.log('👑 HIVE QUEEN ORCHESTRATOR INITIALIZING');
    console.log(`🔱 Queen ID: ${this.orchestratorId}`);
    console.log('═══════════════════════════════════════');
    
    try {
      // Load hive configuration
      await this.loadHiveConfiguration();
      
      // Initialize all hive systems
      await this.initializeHiveSystems();
      
      // Start hive orchestration
      await this.startHiveOrchestration();
      
      console.log('✅ HIVE QUEEN ORCHESTRATOR FULLY ACTIVE');
      console.log(`🐝 Total Systems: ${this.systems.size}`);
      console.log(`⏰ Initialization Time: ${(Date.now() - this.startTime) / 1000}s`);
      
      return this.getHiveStatus();
      
    } catch (error) {
      console.error('❌ HIVE INITIALIZATION FAILED:', error);
      throw error;
    }
  }

  async loadHiveConfiguration() {
    try {
      const configPath = path.join(process.cwd(), 'hive-config.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configData);
      
      console.log(`📋 Loaded hive configuration: ${this.config.hive.name} v${this.config.hive.version}`);
      
    } catch (error) {
      console.error('❌ Failed to load hive configuration:', error);
      throw new Error('Hive configuration is required for orchestration');
    }
  }

  async initializeHiveSystems() {
    console.log('🏗️ Initializing hive systems...');
    
    // Initialize Swarm Intelligence (Queen Brain)
    console.log('🧠 Initializing Swarm Intelligence...');
    const swarmAI = new SwarmIntelligence();
    this.systems.set('intelligence', swarmAI);
    
    // Initialize Swarm Deployer
    console.log('🚀 Initializing Swarm Deployer...');
    const deployer = new HiveSwarmDeployer();
    this.systems.set('deployer', deployer);
    
    // Initialize Swarm Monitor
    console.log('🔍 Initializing Swarm Monitor...');
    const monitor = new SwarmMonitor();
    this.systems.set('monitor', monitor);
    
    // Initialize Auto Scaler
    console.log('⚡ Initializing Auto Scaler...');
    const scaler = new AutoScaler();
    this.systems.set('scaler', scaler);
    
    console.log('✅ All hive systems initialized');
  }

  async startHiveOrchestration() {
    console.log('🎼 Starting hive orchestration...');
    this.isActive = true;
    
    // Start systems in optimal order with coordination
    await this.startSystemsWithCoordination();
    
    // Setup inter-system communication
    await this.setupSystemCoordination();
    
    // Start hive management loops
    await this.startHiveManagement();
    
    console.log('✅ Hive orchestration active');
  }

  async startSystemsWithCoordination() {
    // Start Swarm Intelligence first (the brain)
    console.log('🧠 Starting Swarm Intelligence...');
    const intelligence = this.systems.get('intelligence');
    await intelligence.initializeHiveMind();
    this.status.intelligence = 'active';
    
    // Start other systems in parallel with intelligence coordination
    const startupPromises = [
      this.startMonitoring(),
      this.startScaling(),
      this.prepareDeployment()
    ];
    
    await Promise.all(startupPromises);
  }

  async startMonitoring() {
    console.log('🔍 Starting monitoring system...');
    const monitor = this.systems.get('monitor');
    await monitor.startMonitoring();
    this.status.monitoring = 'active';
    console.log('✅ Monitoring system active');
  }

  async startScaling() {
    console.log('⚡ Starting auto-scaling system...');
    const scaler = this.systems.get('scaler');
    await scaler.startAutoScaling();
    this.status.scaling = 'active';
    console.log('✅ Auto-scaling system active');
  }

  async prepareDeployment() {
    console.log('🚀 Preparing deployment system...');
    // Deployer is prepared but not executed until commanded
    this.status.deployment = 'ready';
    console.log('✅ Deployment system ready');
  }

  async setupSystemCoordination() {
    console.log('🔗 Setting up inter-system coordination...');
    
    const intelligence = this.systems.get('intelligence');
    const monitor = this.systems.get('monitor');
    const scaler = this.systems.get('scaler');
    
    // Intelligence receives input from monitoring
    monitor.on('alert', (alert) => {
      intelligence.makeDecision({
        type: 'alert_response',
        context: alert,
        priority: 'high'
      });
    });
    
    // Intelligence coordinates scaling decisions
    intelligence.on('swarm_decision', (decision) => {
      if (decision.recommendation.includes('scale')) {
        this.executeScalingDecision(decision);
      }
    });
    
    // Scaler reports to intelligence
    scaler.on('scaling_completed', (event) => {
      intelligence.collectiveMemory.set(`scaling_event_${event.id}`, {
        ...event,
        outcome: 'completed'
      });
    });
    
    // Monitor tracks scaling performance
    scaler.on('scaling_completed', (event) => {
      console.log(`📊 Scaling event tracked: ${event.serviceName} → ${event.toInstances} instances`);
    });
    
    console.log('✅ Inter-system coordination established');
  }

  async executeScalingDecision(decision) {
    console.log(`⚡ Executing scaling decision: ${decision.recommendation}`);
    
    const scaler = this.systems.get('scaler');
    
    // Extract scaling parameters from decision
    if (decision.context.serviceId && decision.context.targetInstances) {
      try {
        await scaler.manualScale(
          decision.context.serviceId,
          decision.context.targetInstances
        );
        
        console.log('✅ Scaling decision executed successfully');
        
      } catch (error) {
        console.error('❌ Scaling decision execution failed:', error);
      }
    }
  }

  async startHiveManagement() {
    console.log('👑 Starting hive management...');
    
    // Start management loops in parallel
    const managementPromises = [
      this.startHealthManagement(),
      this.startPerformanceManagement(),
      this.startResourceManagement(),
      this.startIntelligenceManagement()
    ];
    
    await Promise.all(managementPromises);
  }

  async startHealthManagement() {
    const healthManager = async () => {
      if (!this.isActive) return;
      
      // Check health of all systems
      await this.checkSystemsHealth();
      
      // Auto-heal if necessary
      await this.performAutoHealing();
      
      setTimeout(healthManager, 30000); // Every 30 seconds
    };
    
    healthManager();
  }

  async checkSystemsHealth() {
    for (const [systemName, system] of this.systems.entries()) {
      try {
        // Check if system is responsive
        if (typeof system.getStatus === 'function') {
          const status = system.getStatus();
          
          if (status.isActive === false) {
            console.warn(`⚠️ System ${systemName} appears inactive`);
            await this.attemptSystemRecovery(systemName, system);
          }
        }
      } catch (error) {
        console.error(`❌ Health check failed for ${systemName}:`, error);
      }
    }
  }

  async attemptSystemRecovery(systemName, system) {
    console.log(`🔧 Attempting recovery for ${systemName}...`);
    
    try {
      // Attempt to restart the system
      if (typeof system.start === 'function') {
        await system.start();
        console.log(`✅ Successfully recovered ${systemName}`);
      } else if (typeof system.restart === 'function') {
        await system.restart();
        console.log(`✅ Successfully restarted ${systemName}`);
      }
    } catch (error) {
      console.error(`❌ Failed to recover ${systemName}:`, error);
      
      // Alert the intelligence system about the failure
      const intelligence = this.systems.get('intelligence');
      if (intelligence) {
        intelligence.makeDecision({
          type: 'system_failure',
          context: {
            failedSystem: systemName,
            error: error.message
          },
          priority: 'critical'
        });
      }
    }
  }

  async performAutoHealing() {
    // Implement auto-healing logic based on detected issues
    // This would integrate with monitoring data and intelligence decisions
  }

  async startPerformanceManagement() {
    const performanceManager = async () => {
      if (!this.isActive) return;
      
      // Monitor overall hive performance
      await this.monitorHivePerformance();
      
      // Optimize performance if needed
      await this.optimizeHivePerformance();
      
      setTimeout(performanceManager, 60000); // Every minute
    };
    
    performanceManager();
  }

  async monitorHivePerformance() {
    const performance = {
      timestamp: Date.now(),
      systems: {},
      overall: {
        uptime: Date.now() - this.startTime,
        activeSystemsCount: 0,
        totalMemoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };
    
    // Collect performance data from each system
    for (const [systemName, system] of this.systems.entries()) {
      try {
        if (typeof system.getStatus === 'function') {
          const status = system.getStatus();
          performance.systems[systemName] = status;
          
          if (status.isActive) {
            performance.overall.activeSystemsCount++;
          }
        }
      } catch (error) {
        performance.systems[systemName] = { error: error.message };
      }
    }
    
    // Store performance data
    await this.storePerformanceData(performance);
  }

  async optimizeHivePerformance() {
    // Implement performance optimization strategies
    // This would be coordinated by the intelligence system
    
    const intelligence = this.systems.get('intelligence');
    if (intelligence) {
      await intelligence.makeDecision({
        type: 'performance_optimization',
        context: {
          currentPerformance: await this.getCurrentPerformanceMetrics()
        },
        priority: 'normal'
      });
    }
  }

  async getCurrentPerformanceMetrics() {
    return {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
      systemsActive: Array.from(this.systems.keys()).filter(name => 
        this.status[name] === 'active'
      ).length
    };
  }

  async startResourceManagement() {
    const resourceManager = async () => {
      if (!this.isActive) return;
      
      // Monitor resource usage
      await this.monitorResourceUsage();
      
      // Optimize resource allocation
      await this.optimizeResourceAllocation();
      
      setTimeout(resourceManager, 120000); // Every 2 minutes
    };
    
    resourceManager();
  }

  async monitorResourceUsage() {
    const usage = {
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      systemResources: {}
    };
    
    // Collect resource usage from each system
    for (const [systemName, system] of this.systems.entries()) {
      if (typeof system.getResourceUsage === 'function') {
        usage.systemResources[systemName] = system.getResourceUsage();
      }
    }
    
    await this.storeResourceData(usage);
  }

  async optimizeResourceAllocation() {
    // Implement resource optimization based on usage patterns
  }

  async startIntelligenceManagement() {
    const intelligenceManager = async () => {
      if (!this.isActive) return;
      
      // Monitor intelligence system performance
      const intelligence = this.systems.get('intelligence');
      if (intelligence) {
        const status = intelligence.getIntelligenceStatus();
        
        // Check if intelligence needs optimization
        if (status.recentDecisions.length > 100) {
          // Intelligence is very active, might need optimization
          console.log('🧠 High intelligence activity detected, optimizing...');
        }
      }
      
      setTimeout(intelligenceManager, 300000); // Every 5 minutes
    };
    
    intelligenceManager();
  }

  // External API methods
  async deployHive() {
    console.log('🚀 EXECUTING HIVE DEPLOYMENT');
    
    const deployer = this.systems.get('deployer');
    const intelligence = this.systems.get('intelligence');
    
    try {
      // Get deployment strategy from intelligence
      if (intelligence) {
        const decision = await intelligence.makeDecision({
          type: 'deployment_strategy',
          context: {
            environment: 'production',
            risk_level: 'medium',
            complexity: 'high'
          },
          priority: 'high'
        });
        
        console.log(`🧠 Intelligence recommended: ${decision.recommendation}`);
      }
      
      // Execute deployment
      const deploymentResult = await deployer.deploySwarm();
      this.status.deployment = 'active';
      
      console.log('✅ HIVE DEPLOYMENT COMPLETED');
      return deploymentResult;
      
    } catch (error) {
      console.error('❌ HIVE DEPLOYMENT FAILED:', error);
      this.status.deployment = 'failed';
      throw error;
    }
  }

  async getHiveStatus() {
    const status = {
      orchestratorId: this.orchestratorId,
      isActive: this.isActive,
      uptime: Date.now() - this.startTime,
      configuration: this.config?.hive?.name || 'unknown',
      systems: this.status,
      systemDetails: {}
    };
    
    // Get detailed status from each system
    for (const [systemName, system] of this.systems.entries()) {
      try {
        if (typeof system.getStatus === 'function') {
          status.systemDetails[systemName] = system.getStatus();
        } else if (typeof system.getIntelligenceStatus === 'function') {
          status.systemDetails[systemName] = system.getIntelligenceStatus();
        } else if (typeof system.getScalingStatus === 'function') {
          status.systemDetails[systemName] = system.getScalingStatus();
        } else if (typeof system.getMonitoringStatus === 'function') {
          status.systemDetails[systemName] = system.getMonitoringStatus();
        }
      } catch (error) {
        status.systemDetails[systemName] = { error: error.message };
      }
    }
    
    return status;
  }

  async stopHive() {
    console.log('⏹️ STOPPING HIVE ORCHESTRATOR');
    this.isActive = false;
    
    // Stop all systems gracefully
    const shutdownPromises = [];
    
    for (const [systemName, system] of this.systems.entries()) {
      console.log(`⏹️ Stopping ${systemName}...`);
      
      if (typeof system.stop === 'function') {
        shutdownPromises.push(system.stop());
      } else if (typeof system.stopMonitoring === 'function') {
        shutdownPromises.push(system.stopMonitoring());
      } else if (typeof system.stopAutoScaling === 'function') {
        shutdownPromises.push(system.stopAutoScaling());
      } else if (typeof system.stopSwarmIntelligence === 'function') {
        shutdownPromises.push(system.stopSwarmIntelligence());
      }
    }
    
    try {
      await Promise.all(shutdownPromises);
      console.log('✅ All systems stopped gracefully');
    } catch (error) {
      console.error('⚠️ Some systems failed to stop gracefully:', error);
    }
    
    // Save final state
    await this.saveFinalState();
    
    console.log('✅ HIVE ORCHESTRATOR STOPPED');
  }

  async saveFinalState() {
    const finalState = {
      orchestratorId: this.orchestratorId,
      shutdownAt: Date.now(),
      totalUptime: Date.now() - this.startTime,
      finalStatus: await this.getHiveStatus()
    };
    
    try {
      const statePath = path.join(process.cwd(), 'logs', `hive-final-state-${Date.now()}.json`);
      await fs.writeFile(statePath, JSON.stringify(finalState, null, 2));
      console.log(`💾 Final state saved: ${statePath}`);
    } catch (error) {
      console.error('❌ Failed to save final state:', error);
    }
  }

  async storePerformanceData(data) {
    try {
      const perfPath = path.join(process.cwd(), 'logs', 'performance', `perf-${Date.now()}.json`);
      await fs.mkdir(path.dirname(perfPath), { recursive: true });
      await fs.writeFile(perfPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to store performance data:', error);
    }
  }

  async storeResourceData(data) {
    try {
      const resourcePath = path.join(process.cwd(), 'logs', 'resources', `resources-${Date.now()}.json`);
      await fs.mkdir(path.dirname(resourcePath), { recursive: true });
      await fs.writeFile(resourcePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to store resource data:', error);
    }
  }

  // Emergency procedures
  async emergencyShutdown() {
    console.log('🚨 EMERGENCY SHUTDOWN INITIATED');
    
    this.isActive = false;
    
    // Force stop all systems immediately
    for (const [systemName, system] of this.systems.entries()) {
      console.log(`🚨 Force stopping ${systemName}...`);
      
      // Don't wait for graceful shutdown in emergency
      if (typeof system.stop === 'function') {
        system.stop().catch(err => console.error(`Emergency stop failed for ${systemName}:`, err));
      }
    }
    
    console.log('🚨 EMERGENCY SHUTDOWN COMPLETED');
  }

  async systemRecovery() {
    console.log('🔧 INITIATING SYSTEM RECOVERY');
    
    // Attempt to restart failed systems
    for (const [systemName, status] of Object.entries(this.status)) {
      if (status === 'failed' || status === 'inactive') {
        console.log(`🔧 Attempting to recover ${systemName}...`);
        
        const system = this.systems.get(systemName);
        if (system) {
          await this.attemptSystemRecovery(systemName, system);
        }
      }
    }
    
    console.log('✅ SYSTEM RECOVERY COMPLETED');
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const hive = new HiveOrchestrator();
  
  async function executeCommand() {
    switch (command) {
      case 'init':
        await hive.initializeHive();
        break;
        
      case 'deploy':
        await hive.initializeHive();
        await hive.deployHive();
        break;
        
      case 'status':
        await hive.initializeHive();
        const status = await hive.getHiveStatus();
        console.log(JSON.stringify(status, null, 2));
        break;
        
      case 'stop':
        await hive.initializeHive();
        await hive.stopHive();
        process.exit(0);
        break;
        
      case 'emergency':
        await hive.emergencyShutdown();
        process.exit(0);
        break;
        
      default:
        console.log('👑 HIVE ORCHESTRATOR COMMANDS:');
        console.log('  init     - Initialize hive systems');
        console.log('  deploy   - Full hive deployment');
        console.log('  status   - Get hive status');
        console.log('  stop     - Graceful shutdown');
        console.log('  emergency - Emergency shutdown');
        break;
    }
  }
  
  executeCommand()
    .then(() => {
      if (!['stop', 'emergency'].includes(command)) {
        console.log('👑 Hive Orchestrator running...');
        
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
          console.log('\n🛑 Shutdown signal received');
          await hive.stopHive();
          process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
          console.log('\n🛑 Terminate signal received');
          await hive.emergencyShutdown();
          process.exit(0);
        });
      }
    })
    .catch(error => {
      console.error('💥 Hive orchestrator failed:', error);
      process.exit(1);
    });
}

module.exports = HiveOrchestrator;