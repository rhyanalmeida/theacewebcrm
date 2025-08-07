/**
 * Predictive Analytics Service
 * Advanced forecasting and ML-powered predictions for CRM data
 */

import { 
  PredictionConfig, 
  PredictionResult, 
  PredictionType, 
  MLAlgorithm, 
  EvaluationMetric,
  TimeSeriesData,
  DateRangeConfig
} from '../types';

interface ModelMetrics {
  mse: number;
  rmse: number;
  mae: number;
  r2: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  auc_roc?: number;
}

interface TrainingResult {
  modelId: string;
  algorithm: MLAlgorithm;
  metrics: ModelMetrics;
  featureImportance: Array<{ feature: string; importance: number }>;
  trainingTime: number;
  hyperparameters: Record<string, any>;
}

interface ForecastResult {
  predictions: PredictionResult[];
  confidence: number;
  seasonality: {
    detected: boolean;
    period?: number;
    strength?: number;
  };
  trend: {
    direction: 'up' | 'down' | 'flat';
    strength: number;
  };
  anomalies: Array<{
    timestamp: Date;
    value: number;
    score: number;
  }>;
}

export class PredictiveAnalyticsService {
  private baseUrl: string;
  private modelCache: Map<string, any> = new Map();

  constructor(baseUrl: string = '/api/analytics/ml') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate sales forecast using time series analysis
   */
  async generateSalesForecast(
    historicalData: TimeSeriesData[],
    horizonDays: number = 30,
    algorithm: MLAlgorithm = 'prophet',
    confidence: number = 0.95
  ): Promise<ForecastResult> {
    try {
      const response = await fetch(`${this.baseUrl}/forecast/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: historicalData,
          horizon: horizonDays,
          algorithm,
          confidence
        })
      });

      if (!response.ok) {
        throw new Error(`Sales forecast failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        predictions: result.predictions.map((pred: any) => ({
          timestamp: new Date(pred.timestamp),
          predicted: pred.value,
          confidence_lower: pred.lower,
          confidence_upper: pred.upper,
          actual: pred.actual
        })),
        confidence: result.confidence,
        seasonality: result.seasonality,
        trend: result.trend,
        anomalies: result.anomalies.map((anomaly: any) => ({
          timestamp: new Date(anomaly.timestamp),
          value: anomaly.value,
          score: anomaly.score
        }))
      };
    } catch (error) {
      throw new Error(`Sales forecast generation failed: ${error}`);
    }
  }

  /**
   * Predict customer churn probability
   */
  async predictCustomerChurn(
    customerFeatures: Record<string, any>[],
    algorithm: MLAlgorithm = 'random_forest',
    threshold: number = 0.5
  ): Promise<Array<{
    customerId: string;
    churnProbability: number;
    risk: 'low' | 'medium' | 'high';
    factors: Array<{ feature: string; impact: number }>;
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/predict/churn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: customerFeatures,
          algorithm,
          threshold
        })
      });

      if (!response.ok) {
        throw new Error(`Churn prediction failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return result.predictions.map((pred: any) => ({
        customerId: pred.customer_id,
        churnProbability: pred.probability,
        risk: pred.probability > 0.7 ? 'high' : pred.probability > 0.4 ? 'medium' : 'low',
        factors: pred.feature_importance
      }));
    } catch (error) {
      throw new Error(`Churn prediction failed: ${error}`);
    }
  }

  /**
   * Predict deal closure probability and value
   */
  async predictDealOutcome(
    dealFeatures: Record<string, any>[],
    predictValue: boolean = true
  ): Promise<Array<{
    dealId: string;
    closureProbability: number;
    predictedValue?: number;
    expectedCloseDate?: Date;
    riskFactors: string[];
    recommendations: string[];
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/predict/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: dealFeatures,
          predict_value: predictValue
        })
      });

      if (!response.ok) {
        throw new Error(`Deal prediction failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return result.predictions.map((pred: any) => ({
        dealId: pred.deal_id,
        closureProbability: pred.closure_probability,
        predictedValue: pred.predicted_value,
        expectedCloseDate: pred.expected_close_date ? new Date(pred.expected_close_date) : undefined,
        riskFactors: pred.risk_factors,
        recommendations: pred.recommendations
      }));
    } catch (error) {
      throw new Error(`Deal prediction failed: ${error}`);
    }
  }

  /**
   * Generate lead scoring based on conversion likelihood
   */
  async generateLeadScores(
    leadFeatures: Record<string, any>[],
    algorithm: MLAlgorithm = 'gradient_boosting'
  ): Promise<Array<{
    leadId: string;
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    conversionProbability: number;
    keyFactors: Array<{ factor: string; weight: number }>;
    nextBestActions: string[];
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/score/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: leadFeatures,
          algorithm
        })
      });

      if (!response.ok) {
        throw new Error(`Lead scoring failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return result.scores.map((score: any) => {
        const gradeMap = { A: 90, B: 80, C: 70, D: 60, F: 0 };
        const grade = Object.entries(gradeMap).find(([_, threshold]) => score.score >= threshold)?.[0] || 'F';
        
        return {
          leadId: score.lead_id,
          score: score.score,
          grade: grade as 'A' | 'B' | 'C' | 'D' | 'F',
          conversionProbability: score.conversion_probability,
          keyFactors: score.feature_weights,
          nextBestActions: score.recommendations
        };
      });
    } catch (error) {
      throw new Error(`Lead scoring failed: ${error}`);
    }
  }

  /**
   * Detect anomalies in time series data
   */
  async detectAnomalies(
    data: TimeSeriesData[],
    algorithm: MLAlgorithm = 'isolation_forest',
    sensitivity: number = 0.05
  ): Promise<Array<{
    timestamp: Date;
    value: number;
    isAnomaly: boolean;
    anomalyScore: number;
    severity: 'low' | 'medium' | 'high';
    possibleCauses: string[];
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/anomalies/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: data.map(d => ({
            timestamp: d.timestamp,
            value: d.value,
            metadata: d.metadata
          })),
          algorithm,
          sensitivity
        })
      });

      if (!response.ok) {
        throw new Error(`Anomaly detection failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return result.anomalies.map((anomaly: any) => ({
        timestamp: new Date(anomaly.timestamp),
        value: anomaly.value,
        isAnomaly: anomaly.is_anomaly,
        anomalyScore: anomaly.score,
        severity: anomaly.score > 0.8 ? 'high' : anomaly.score > 0.5 ? 'medium' : 'low',
        possibleCauses: anomaly.possible_causes || []
      }));
    } catch (error) {
      throw new Error(`Anomaly detection failed: ${error}`);
    }
  }

  /**
   * Perform customer segmentation using clustering
   */
  async segmentCustomers(
    customerFeatures: Record<string, any>[],
    numSegments: number = 5,
    algorithm: MLAlgorithm = 'kmeans'
  ): Promise<{
    segments: Array<{
      segmentId: number;
      name: string;
      size: number;
      characteristics: Record<string, any>;
      customers: string[];
    }>;
    silhouetteScore: number;
    recommendations: Record<number, string[]>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/segment/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: customerFeatures,
          num_segments: numSegments,
          algorithm
        })
      });

      if (!response.ok) {
        throw new Error(`Customer segmentation failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        segments: result.segments.map((segment: any) => ({
          segmentId: segment.id,
          name: segment.name,
          size: segment.size,
          characteristics: segment.characteristics,
          customers: segment.customer_ids
        })),
        silhouetteScore: result.silhouette_score,
        recommendations: result.recommendations
      };
    } catch (error) {
      throw new Error(`Customer segmentation failed: ${error}`);
    }
  }

  /**
   * Train a custom prediction model
   */
  async trainModel(config: PredictionConfig, trainingData: any[]): Promise<TrainingResult> {
    try {
      const response = await fetch(`${this.baseUrl}/models/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          data: trainingData
        })
      });

      if (!response.ok) {
        throw new Error(`Model training failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Cache the trained model
      this.modelCache.set(result.model_id, result);
      
      return {
        modelId: result.model_id,
        algorithm: config.algorithm,
        metrics: result.metrics,
        featureImportance: result.feature_importance,
        trainingTime: result.training_time,
        hyperparameters: result.hyperparameters
      };
    } catch (error) {
      throw new Error(`Model training failed: ${error}`);
    }
  }

  /**
   * Make predictions using a trained model
   */
  async predict(modelId: string, data: any[]): Promise<PredictionResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models/${modelId}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });

      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return result.predictions.map((pred: any) => ({
        timestamp: new Date(pred.timestamp),
        predicted: pred.value,
        confidence_lower: pred.confidence_lower,
        confidence_upper: pred.confidence_upper,
        actual: pred.actual
      }));
    } catch (error) {
      throw new Error(`Prediction failed: ${error}`);
    }
  }

  /**
   * Get revenue prediction with confidence intervals
   */
  async predictRevenue(
    historicalRevenue: TimeSeriesData[],
    horizonMonths: number = 6,
    includeSeasonality: boolean = true
  ): Promise<{
    predictions: PredictionResult[];
    totalPredicted: number;
    growthRate: number;
    confidence: number;
    factors: Array<{ name: string; impact: number }>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/forecast/revenue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: historicalRevenue,
          horizon: horizonMonths,
          include_seasonality: includeSeasonality
        })
      });

      if (!response.ok) {
        throw new Error(`Revenue prediction failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      const predictions = result.predictions.map((pred: any) => ({
        timestamp: new Date(pred.timestamp),
        predicted: pred.value,
        confidence_lower: pred.lower,
        confidence_upper: pred.upper,
        actual: pred.actual
      }));

      const totalPredicted = predictions.reduce((sum, pred) => sum + pred.predicted, 0);
      const lastActual = historicalRevenue[historicalRevenue.length - 1]?.value || 0;
      const growthRate = lastActual > 0 ? ((totalPredicted / horizonMonths - lastActual) / lastActual) * 100 : 0;

      return {
        predictions,
        totalPredicted,
        growthRate,
        confidence: result.confidence,
        factors: result.contributing_factors || []
      };
    } catch (error) {
      throw new Error(`Revenue prediction failed: ${error}`);
    }
  }

  /**
   * Get A/B test recommendations using predictive modeling
   */
  async getABTestRecommendations(
    testData: Array<{
      variant: string;
      metrics: Record<string, number>;
      sampleSize: number;
    }>,
    confidence: number = 0.95
  ): Promise<{
    recommendedVariant: string;
    expectedLift: number;
    significance: number;
    requiredSampleSize: number;
    projectedRevenue: number;
    riskAssessment: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/abtest/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_data: testData,
          confidence
        })
      });

      if (!response.ok) {
        throw new Error(`A/B test recommendation failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        recommendedVariant: result.recommended_variant,
        expectedLift: result.expected_lift,
        significance: result.significance,
        requiredSampleSize: result.required_sample_size,
        projectedRevenue: result.projected_revenue,
        riskAssessment: result.risk_assessment
      };
    } catch (error) {
      throw new Error(`A/B test recommendation failed: ${error}`);
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelMetrics(modelId: string): Promise<ModelMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/models/${modelId}/metrics`);
      
      if (!response.ok) {
        throw new Error(`Failed to get model metrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get model metrics: ${error}`);
    }
  }

  /**
   * Get available trained models
   */
  async getModels(): Promise<Array<{
    id: string;
    name: string;
    type: PredictionType;
    algorithm: MLAlgorithm;
    accuracy: number;
    createdAt: Date;
    lastUsed?: Date;
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/models`);
      
      if (!response.ok) {
        throw new Error(`Failed to get models: ${response.statusText}`);
      }

      const result = await response.json();
      
      return result.models.map((model: any) => ({
        id: model.id,
        name: model.name,
        type: model.type,
        algorithm: model.algorithm,
        accuracy: model.accuracy,
        createdAt: new Date(model.created_at),
        lastUsed: model.last_used ? new Date(model.last_used) : undefined
      }));
    } catch (error) {
      throw new Error(`Failed to get models: ${error}`);
    }
  }

  /**
   * Delete a trained model
   */
  async deleteModel(modelId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/models/${modelId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete model: ${response.statusText}`);
      }

      // Remove from cache
      this.modelCache.delete(modelId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete model'
      };
    }
  }

  /**
   * Simple linear regression for quick predictions
   */
  simpleLinearRegression(data: Array<{ x: number; y: number }>): {
    slope: number;
    intercept: number;
    r2: number;
    predict: (x: number) => number;
  } {
    const n = data.length;
    if (n === 0) throw new Error('No data provided');

    const sumX = data.reduce((sum, point) => sum + point.x, 0);
    const sumY = data.reduce((sum, point) => sum + point.y, 0);
    const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumX2 = data.reduce((sum, point) => sum + point.x * point.x, 0);
    const sumY2 = data.reduce((sum, point) => sum + point.y * point.y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const meanY = sumY / n;
    const ssTotal = data.reduce((sum, point) => sum + Math.pow(point.y - meanY, 2), 0);
    const ssResidual = data.reduce((sum, point) => {
      const predicted = slope * point.x + intercept;
      return sum + Math.pow(point.y - predicted, 2);
    }, 0);
    const r2 = 1 - (ssResidual / ssTotal);

    return {
      slope,
      intercept,
      r2,
      predict: (x: number) => slope * x + intercept
    };
  }

  /**
   * Calculate moving average for trend analysis
   */
  calculateMovingAverage(data: number[], windowSize: number): number[] {
    if (windowSize <= 0 || windowSize > data.length) {
      throw new Error('Invalid window size');
    }

    const result: number[] = [];
    for (let i = windowSize - 1; i < data.length; i++) {
      const window = data.slice(i - windowSize + 1, i + 1);
      const average = window.reduce((sum, value) => sum + value, 0) / windowSize;
      result.push(average);
    }

    return result;
  }

  /**
   * Calculate exponential moving average
   */
  calculateExponentialMovingAverage(data: number[], alpha: number = 0.3): number[] {
    if (alpha <= 0 || alpha > 1) {
      throw new Error('Alpha must be between 0 and 1');
    }

    const result: number[] = [data[0]];
    for (let i = 1; i < data.length; i++) {
      result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
    }

    return result;
  }
}

export const predictiveAnalytics = new PredictiveAnalyticsService();