/**
 * Real-Time Analytics Service
 * WebSocket-based streaming for live metrics and updates
 */

import { 
  RealTimeMetric, 
  AlertConfig, 
  AnalyticsEvent, 
  AnalyticsEventType 
} from '../types';

interface StreamSubscription {
  id: string;
  metrics: string[];
  filters: Record<string, any>;
  callback: (data: RealTimeMetric[]) => void;
  active: boolean;
}

interface AlertSubscription {
  id: string;
  alertIds: string[];
  callback: (alert: AlertConfig) => void;
  active: boolean;
}

interface WebSocketMessage {
  type: 'metrics' | 'alert' | 'event' | 'error' | 'heartbeat';
  payload: any;
  timestamp: number;
}

export class RealTimeAnalyticsService {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private subscriptions: Map<string, StreamSubscription> = new Map();
  private alertSubscriptions: Map<string, AlertSubscription> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private connectionCallbacks: Array<(connected: boolean) => void> = [];

  constructor(wsUrl: string = 'ws://localhost:5000/ws/analytics') {
    this.wsUrl = wsUrl;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log('Real-time analytics connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.notifyConnectionCallbacks(true);
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log('Real-time analytics disconnected', event.code, event.reason);
          this.isConnected = false;
          this.stopHeartbeat();
          this.notifyConnectionCallbacks(false);
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        // Timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
    this.stopHeartbeat();
    this.subscriptions.clear();
    this.alertSubscriptions.clear();
  }

  /**
   * Subscribe to real-time metrics
   */
  subscribeToMetrics(
    metrics: string[],
    callback: (data: RealTimeMetric[]) => void,
    filters: Record<string, any> = {}
  ): string {
    const subscriptionId = `metrics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: StreamSubscription = {
      id: subscriptionId,
      metrics,
      filters,
      callback,
      active: true
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Send subscription message to server
    if (this.isConnected) {
      this.sendMessage({
        type: 'subscribe',
        payload: {
          subscriptionId,
          metrics,
          filters
        }
      });
    }

    return subscriptionId;
  }

  /**
   * Subscribe to specific metrics with custom intervals
   */
  subscribeToMetricsWithInterval(
    metrics: string[],
    intervalMs: number,
    callback: (data: RealTimeMetric[]) => void
  ): string {
    const subscriptionId = this.subscribeToMetrics(metrics, callback, { interval: intervalMs });
    return subscriptionId;
  }

  /**
   * Unsubscribe from metrics
   */
  unsubscribeFromMetrics(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    subscription.active = false;
    this.subscriptions.delete(subscriptionId);

    // Send unsubscribe message to server
    if (this.isConnected) {
      this.sendMessage({
        type: 'unsubscribe',
        payload: { subscriptionId }
      });
    }

    return true;
  }

  /**
   * Subscribe to alerts
   */
  subscribeToAlerts(
    alertIds: string[],
    callback: (alert: AlertConfig) => void
  ): string {
    const subscriptionId = `alerts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: AlertSubscription = {
      id: subscriptionId,
      alertIds,
      callback,
      active: true
    };

    this.alertSubscriptions.set(subscriptionId, subscription);

    // Send alert subscription to server
    if (this.isConnected) {
      this.sendMessage({
        type: 'subscribe_alerts',
        payload: {
          subscriptionId,
          alertIds
        }
      });
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from alerts
   */
  unsubscribeFromAlerts(subscriptionId: string): boolean {
    const subscription = this.alertSubscriptions.get(subscriptionId);
    if (!subscription) return false;

    subscription.active = false;
    this.alertSubscriptions.delete(subscriptionId);

    // Send unsubscribe message to server
    if (this.isConnected) {
      this.sendMessage({
        type: 'unsubscribe_alerts',
        payload: { subscriptionId }
      });
    }

    return true;
  }

  /**
   * Get current real-time metrics
   */
  async getCurrentMetrics(metrics: string[]): Promise<RealTimeMetric[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to real-time service');
    }

    return new Promise((resolve, reject) => {
      const requestId = `request_${Date.now()}`;
      
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      const messageHandler = (event: MessageEvent) => {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type === 'metrics_response' && message.payload.requestId === requestId) {
          clearTimeout(timeout);
          this.ws?.removeEventListener('message', messageHandler);
          resolve(message.payload.metrics);
        }
      };

      this.ws?.addEventListener('message', messageHandler);

      this.sendMessage({
        type: 'get_metrics',
        payload: {
          requestId,
          metrics
        }
      });
    });
  }

  /**
   * Send custom analytics event
   */
  sendEvent(eventType: AnalyticsEventType, payload: any): void {
    if (!this.isConnected) return;

    const event: AnalyticsEvent = {
      type: eventType,
      payload,
      timestamp: new Date(),
      source: 'client'
    };

    this.sendMessage({
      type: 'event',
      payload: event
    });
  }

  /**
   * Set up metric thresholds for alerts
   */
  async setupMetricAlert(
    metricName: string,
    threshold: number,
    operator: 'greater_than' | 'less_than' | 'equals',
    callback: (alert: AlertConfig) => void
  ): Promise<string> {
    const alertConfig: AlertConfig = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${metricName} Alert`,
      metric: metricName,
      condition: {
        operator,
        timeWindow: 5, // 5 minutes
        consecutive: 1
      },
      threshold,
      severity: 'warning',
      enabled: true,
      recipients: [],
      cooldown: 15 // 15 minutes
    };

    // Subscribe to this specific alert
    this.subscribeToAlerts([alertConfig.id], callback);

    // Send alert configuration to server
    this.sendMessage({
      type: 'setup_alert',
      payload: alertConfig
    });

    return alertConfig.id;
  }

  /**
   * Remove metric alert
   */
  removeMetricAlert(alertId: string): void {
    this.sendMessage({
      type: 'remove_alert',
      payload: { alertId }
    });
  }

  /**
   * Get connection status
   */
  isConnectedToStream(): boolean {
    return this.isConnected;
  }

  /**
   * Add connection status callback
   */
  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionCallbacks.push(callback);
  }

  /**
   * Remove connection status callback
   */
  removeConnectionCallback(callback: (connected: boolean) => void): void {
    const index = this.connectionCallbacks.indexOf(callback);
    if (index > -1) {
      this.connectionCallbacks.splice(index, 1);
    }
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): { metrics: number; alerts: number } {
    return {
      metrics: Array.from(this.subscriptions.values()).filter(s => s.active).length,
      alerts: Array.from(this.alertSubscriptions.values()).filter(s => s.active).length
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      switch (message.type) {
        case 'metrics':
          this.handleMetricsUpdate(message.payload);
          break;
        case 'alert':
          this.handleAlert(message.payload);
          break;
        case 'event':
          this.handleAnalyticsEvent(message.payload);
          break;
        case 'heartbeat':
          // Server heartbeat received, no action needed
          break;
        case 'error':
          console.error('Server error:', message.payload);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle metrics update
   */
  private handleMetricsUpdate(payload: any): void {
    const { subscriptionId, metrics } = payload;
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (subscription && subscription.active) {
      const realTimeMetrics: RealTimeMetric[] = metrics.map((metric: any) => ({
        id: metric.id,
        name: metric.name,
        value: metric.value,
        timestamp: new Date(metric.timestamp),
        change: metric.change || 0,
        changeType: metric.change > 0 ? 'increase' : metric.change < 0 ? 'decrease' : 'neutral'
      }));

      subscription.callback(realTimeMetrics);
    }
  }

  /**
   * Handle alert notification
   */
  private handleAlert(payload: AlertConfig): void {
    for (const subscription of this.alertSubscriptions.values()) {
      if (subscription.active && subscription.alertIds.includes(payload.id)) {
        subscription.callback(payload);
      }
    }
  }

  /**
   * Handle analytics event
   */
  private handleAnalyticsEvent(event: AnalyticsEvent): void {
    // Emit custom event for listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('analytics-event', { detail: event }));
    }
  }

  /**
   * Send message to WebSocket server
   */
  private sendMessage(message: any): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({
        ...message,
        timestamp: Date.now()
      }));
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect().catch(() => {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          } else {
            console.error('Max reconnection attempts reached');
          }
        });
      }
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendMessage({ type: 'heartbeat', payload: {} });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Notify connection callbacks
   */
  private notifyConnectionCallbacks(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }
}

/**
 * Real-time metrics aggregator for client-side calculations
 */
export class MetricsAggregator {
  private metrics: Map<string, RealTimeMetric[]> = new Map();
  private maxHistory = 1000; // Keep last 1000 data points per metric

  /**
   * Add metrics data
   */
  addMetrics(metrics: RealTimeMetric[]): void {
    metrics.forEach(metric => {
      const history = this.metrics.get(metric.id) || [];
      history.push(metric);
      
      // Keep only recent data
      if (history.length > this.maxHistory) {
        history.splice(0, history.length - this.maxHistory);
      }
      
      this.metrics.set(metric.id, history);
    });
  }

  /**
   * Get latest value for a metric
   */
  getLatestValue(metricId: string): number | null {
    const history = this.metrics.get(metricId);
    if (!history || history.length === 0) return null;
    return history[history.length - 1].value;
  }

  /**
   * Calculate average over time window
   */
  getAverage(metricId: string, timeWindowMinutes: number): number | null {
    const history = this.metrics.get(metricId);
    if (!history || history.length === 0) return null;

    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentData = history.filter(m => m.timestamp >= cutoffTime);
    
    if (recentData.length === 0) return null;
    
    const sum = recentData.reduce((acc, m) => acc + m.value, 0);
    return sum / recentData.length;
  }

  /**
   * Get trend direction over time window
   */
  getTrend(metricId: string, timeWindowMinutes: number): 'up' | 'down' | 'flat' | null {
    const history = this.metrics.get(metricId);
    if (!history || history.length < 2) return null;

    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentData = history.filter(m => m.timestamp >= cutoffTime);
    
    if (recentData.length < 2) return null;

    const firstValue = recentData[0].value;
    const lastValue = recentData[recentData.length - 1].value;
    const changePercent = ((lastValue - firstValue) / firstValue) * 100;

    if (Math.abs(changePercent) < 1) return 'flat';
    return changePercent > 0 ? 'up' : 'down';
  }

  /**
   * Detect anomalies using simple threshold-based detection
   */
  detectSimpleAnomalies(
    metricId: string, 
    thresholdStdDev: number = 2
  ): Array<{ timestamp: Date; value: number; severity: 'low' | 'medium' | 'high' }> {
    const history = this.metrics.get(metricId);
    if (!history || history.length < 10) return [];

    // Calculate mean and standard deviation
    const values = history.map(m => m.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const anomalies: Array<{ timestamp: Date; value: number; severity: 'low' | 'medium' | 'high' }> = [];

    history.forEach(metric => {
      const deviation = Math.abs(metric.value - mean) / stdDev;
      if (deviation > thresholdStdDev) {
        const severity: 'low' | 'medium' | 'high' = 
          deviation > thresholdStdDev * 2 ? 'high' : 
          deviation > thresholdStdDev * 1.5 ? 'medium' : 'low';
          
        anomalies.push({
          timestamp: metric.timestamp,
          value: metric.value,
          severity
        });
      }
    });

    return anomalies;
  }

  /**
   * Clear all metrics data
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Clear specific metric data
   */
  clearMetric(metricId: string): void {
    this.metrics.delete(metricId);
  }

  /**
   * Get all available metric IDs
   */
  getAvailableMetrics(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get metric history
   */
  getHistory(metricId: string, limit?: number): RealTimeMetric[] {
    const history = this.metrics.get(metricId) || [];
    return limit ? history.slice(-limit) : history;
  }
}

// Global instances
export const realTimeService = new RealTimeAnalyticsService();
export const metricsAggregator = new MetricsAggregator();