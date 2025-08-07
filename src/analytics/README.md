# ACE CRM Analytics System

A comprehensive, enterprise-grade analytics platform built for the ACE CRM system. This analytics system provides advanced reporting, real-time insights, predictive analytics, and executive dashboards with AI-powered intelligence.

## 🚀 Features

### Core Analytics
- **Custom Report Builder**: Drag-and-drop interface for creating interactive reports
- **Advanced Dashboard**: Real-time metrics with interactive charts and visualizations
- **Export System**: PDF, Excel, CSV exports with scheduled delivery via email
- **Funnel Analysis**: Conversion tracking with detailed step-by-step analytics
- **Cohort Analysis**: Customer retention insights with visual heatmaps
- **Predictive Analytics**: ML-powered forecasting and predictions
- **Real-time Streaming**: WebSocket-based live metrics updates
- **Executive Dashboard**: High-level insights with AI-powered summaries

### Advanced Capabilities
- **Data Warehouse Integration**: Connect to BigQuery, Redshift, Snowflake, Databricks
- **Anomaly Detection**: Automated outlier detection in time series data
- **Customer Segmentation**: ML-based customer clustering and analysis
- **Lead Scoring**: Predictive scoring for conversion likelihood
- **Churn Prediction**: Early warning system for customer retention
- **Sales Forecasting**: Advanced time series forecasting with confidence intervals

## 📁 Project Structure

```
src/analytics/
├── components/           # React components
│   ├── charts/          # Chart components
│   ├── cohort/          # Cohort analysis components
│   ├── dashboard/       # Dashboard components
│   ├── exports/         # Export-related components
│   ├── funnel/          # Funnel analysis components
│   └── report-builder/  # Report builder components
├── services/            # Core services
│   ├── AnalyticsService.ts      # Main analytics service
│   ├── DataWarehouseService.ts  # Data warehouse integration
│   ├── ExportService.ts         # Export and scheduling
│   ├── PredictiveAnalytics.ts   # ML and forecasting
│   └── RealTimeService.ts       # WebSocket streaming
├── stores/              # State management
├── types/               # TypeScript definitions
├── utils/               # Utility functions
└── index.ts             # Main export file
```

## 🛠️ Installation

```bash
# Install dependencies
npm install

# For advanced analytics features, install optional dependencies
npm install @google-cloud/bigquery snowflake-sdk aws-sdk
npm install jspdf xlsx socket.io-client
npm install react-dnd react-dnd-html5-backend
```

## 🚀 Quick Start

### Basic Setup

```typescript
import { initializeAnalytics, AnalyticsDashboard } from '@/analytics';

// Initialize the analytics system
const analytics = initializeAnalytics({
  apiBaseUrl: '/api/analytics',
  wsUrl: 'ws://localhost:5000/ws/analytics',
  enableRealTime: true,
  enableCache: true
});

// Use in React component
function App() {
  return (
    <AnalyticsDashboard
      config={dashboardConfig}
      realTimeEnabled={true}
    />
  );
}
```

### Report Builder

```typescript
import { ReportBuilder } from '@/analytics';

function ReportsPage() {
  const handleSaveReport = (config) => {
    // Save report configuration
    console.log('Report saved:', config);
  };

  const handlePreviewReport = (config) => {
    // Preview report
    console.log('Preview report:', config);
  };

  return (
    <ReportBuilder
      onSaveReport={handleSaveReport}
      onPreviewReport={handlePreviewReport}
      availableMetrics={metrics}
      dataSources={dataSources}
    />
  );
}
```

### Funnel Analysis

```typescript
import { FunnelAnalysis } from '@/analytics';

function FunnelPage() {
  return (
    <FunnelAnalysis
      availableEvents={['signup', 'activation', 'purchase']}
      availableFields={['user_id', 'timestamp', 'event_name']}
      onConfigChange={(config) => console.log('Funnel config:', config)}
    />
  );
}
```

### Cohort Analysis

```typescript
import { CohortAnalysis } from '@/analytics';

function CohortPage() {
  return (
    <CohortAnalysis
      availableEvents={['signup', 'login', 'purchase']}
      availableFields={['user_id', 'timestamp', 'event_type']}
      onConfigChange={(config) => console.log('Cohort config:', config)}
    />
  );
}
```

### Executive Dashboard

```typescript
import { ExecutiveDashboard } from '@/analytics';

function ExecutivePage() {
  const executiveConfig = {
    id: 'exec_dashboard',
    name: 'Executive Overview',
    kpis: [
      {
        id: 'revenue',
        title: 'Monthly Revenue',
        value: 125000,
        target: 150000,
        format: 'currency'
      },
      // ... more KPIs
    ],
    insights: [],
    summaries: []
  };

  return <ExecutiveDashboard config={executiveConfig} />;
}
```

## 📊 Using the Analytics Services

### Core Analytics Service

```typescript
import { analyticsService } from '@/analytics';

// Execute custom queries
const result = await analyticsService.executeQuery(
  'SELECT * FROM sales WHERE date >= ?',
  ['2024-01-01']
);

// Get time series data
const timeSeries = await analyticsService.getTimeSeries(
  'revenue',
  { type: 'relative', value: 'last_30_days' },
  'sum',
  'day'
);

// Calculate funnel conversion
const funnelData = await analyticsService.calculateFunnel(
  [
    { event: 'page_view' },
    { event: 'signup' },
    { event: 'purchase' }
  ],
  { type: 'relative', value: 'last_month' }
);
```

### Export Service

```typescript
import { exportService } from '@/analytics';

// Export to PDF
const pdfResult = await exportService.exportData(
  data,
  'pdf',
  {
    pdf: {
      pageSize: 'A4',
      orientation: 'portrait',
      header: 'Analytics Report'
    }
  }
);

// Schedule report delivery
const scheduleResult = await exportService.scheduleReport(
  reportConfig,
  {
    frequency: 'weekly',
    recipients: ['exec@company.com'],
    format: ['pdf', 'excel'],
    enabled: true
  }
);

// Send report via email
const emailResult = await exportService.emailReport(
  reportConfig,
  [pdfResult],
  ['recipient@company.com'],
  'Weekly analytics report attached.'
);
```

### Predictive Analytics

```typescript
import { predictiveAnalytics } from '@/analytics';

// Generate sales forecast
const forecast = await predictiveAnalytics.generateSalesForecast(
  historicalData,
  30, // 30 days
  'prophet',
  0.95 // 95% confidence
);

// Predict customer churn
const churnPredictions = await predictiveAnalytics.predictCustomerChurn(
  customerFeatures,
  'random_forest',
  0.5
);

// Generate lead scores
const leadScores = await predictiveAnalytics.generateLeadScores(
  leadFeatures,
  'gradient_boosting'
);

// Detect anomalies
const anomalies = await predictiveAnalytics.detectAnomalies(
  timeSeriesData,
  'isolation_forest',
  0.05
);
```

### Real-time Analytics

```typescript
import { realTimeService, metricsAggregator } from '@/analytics';

// Connect to real-time stream
await realTimeService.connect();

// Subscribe to metrics
const subscriptionId = realTimeService.subscribeToMetrics(
  ['active_users', 'revenue_today', 'conversion_rate'],
  (metrics) => {
    console.log('Real-time metrics:', metrics);
    metricsAggregator.addMetrics(metrics);
  }
);

// Set up alerts
const alertId = await realTimeService.setupMetricAlert(
  'response_time',
  500, // 500ms threshold
  'greater_than',
  (alert) => {
    console.log('Alert triggered:', alert);
  }
);

// Get aggregated data
const avgResponseTime = metricsAggregator.getAverage('response_time', 5); // last 5 minutes
const trend = metricsAggregator.getTrend('active_users', 15); // last 15 minutes
```

### Data Warehouse Integration

```typescript
import { dataWarehouseService } from '@/analytics';

// Add BigQuery connection
await dataWarehouseService.addConnection({
  id: 'bigquery_prod',
  name: 'Production BigQuery',
  type: 'bigquery',
  host: 'bigquery.googleapis.com',
  database: 'production_dataset',
  credentials: {
    type: 'service_account',
    keyFile: '/path/to/service-account.json'
  }
});

// Execute query on data warehouse
const result = await dataWarehouseService.executeQuery(
  'bigquery_prod',
  'SELECT user_id, revenue FROM user_metrics WHERE date >= @start_date',
  ['2024-01-01'],
  { cache: true, cacheTTL: 600000 }
);

// Bulk insert data
await dataWarehouseService.bulkInsert(
  'bigquery_prod',
  'analytics_events',
  eventData,
  {
    batchSize: 1000,
    onProgress: (completed, total) => {
      console.log(`Progress: ${completed}/${total}`);
    }
  }
);
```

## 🎨 Customization

### Custom Chart Types

```typescript
import { ChartContainer } from '@/analytics';

function CustomChart({ data, title }) {
  return (
    <ChartContainer title={title} height={400}>
      <YourCustomVisualization data={data} />
    </ChartContainer>
  );
}
```

### Custom Analytics Service

```typescript
import { AnalyticsService } from '@/analytics';

class CustomAnalyticsService extends AnalyticsService {
  constructor() {
    super('/api/custom-analytics');
  }

  async customMetric(params) {
    return this.executeQuery('SELECT custom_calculation()', params);
  }
}
```

### Themes and Styling

```typescript
import { analyticsTheme } from '@/analytics';

// Customize theme
const customTheme = {
  ...analyticsTheme,
  colors: {
    ...analyticsTheme.colors,
    primary: '#your-primary-color'
  }
};
```

## 📱 Mobile Support

The analytics system is fully responsive and optimized for mobile devices:

- Touch-friendly interactions
- Responsive chart layouts
- Mobile-optimized dashboards
- Gesture support for chart navigation

## 🔒 Security

### Data Protection
- Row-level security for multi-tenant environments
- Encrypted data transmission
- Secure credential storage
- Role-based access control

### Privacy Compliance
- GDPR-compliant data handling
- Data anonymization options
- Audit trails for all analytics operations
- Configurable data retention policies

## 📈 Performance

### Optimization Features
- Intelligent query caching
- Connection pooling for data sources
- Lazy loading for large datasets
- Progressive data loading
- Real-time streaming with backpressure handling

### Scalability
- Horizontal scaling support
- Load balancing for analytics queries
- Distributed caching
- Database query optimization
- CDN support for static assets

## 🧪 Testing

```bash
# Run analytics tests
npm test src/analytics

# Run specific test suites
npm test src/analytics/services
npm test src/analytics/components
```

## 📚 API Reference

### AnalyticsService

| Method | Description | Parameters |
|--------|-------------|------------|
| `executeQuery()` | Execute custom SQL query | query, params, useCache |
| `getTimeSeries()` | Get time series data | metric, dateRange, aggregation |
| `calculateFunnel()` | Calculate conversion funnel | steps, dateRange, userIdField |
| `calculateCohort()` | Perform cohort analysis | cohortEvent, returnEvent, dateRange |

### ExportService

| Method | Description | Parameters |
|--------|-------------|------------|
| `exportData()` | Export data to various formats | data, format, options |
| `scheduleReport()` | Schedule automated reports | reportConfig, scheduleConfig |
| `emailReport()` | Send reports via email | reportConfig, recipients |

### PredictiveAnalyticsService

| Method | Description | Parameters |
|--------|-------------|------------|
| `generateSalesForecast()` | Forecast future sales | historicalData, horizon, algorithm |
| `predictCustomerChurn()` | Predict customer churn risk | customerFeatures, algorithm |
| `generateLeadScores()` | Score leads for conversion | leadFeatures, algorithm |
| `detectAnomalies()` | Detect data anomalies | data, algorithm, sensitivity |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Document all public APIs
- Use consistent code formatting
- Include performance considerations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Documentation

- [API Documentation](./docs/API.md)
- [Component Guide](./docs/COMPONENTS.md)
- [Performance Guide](./docs/PERFORMANCE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Check the [FAQ](./docs/FAQ.md)
- Review the [troubleshooting guide](./docs/TROUBLESHOOTING.md)

## 🎉 Acknowledgments

- Built with React, TypeScript, and modern web technologies
- Chart visualizations powered by Recharts
- Real-time capabilities using WebSockets
- Machine learning integrations for predictive analytics
- Enterprise-grade data warehouse connectors

---

**ACE CRM Analytics System** - Transforming data into actionable business insights.