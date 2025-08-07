import * as React from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts"
import { cn } from "../../lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"

// Common chart colors for consistent theming
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#8dd1e1",
  "#d084d0"
]

// Base chart container component
interface ChartContainerProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  height?: number
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  className,
  title,
  description,
  height = 300
}) => {
  if (title || description) {
    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <ResponsiveContainer width="100%" height={height}>
            {children}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}

// Line Chart component
interface LineChartProps {
  data: any[]
  dataKey: string
  xKey: string
  className?: string
  title?: string
  description?: string
  height?: number
  color?: string
  showGrid?: boolean
  showTooltip?: boolean
  showLegend?: boolean
}

const SimpleLineChart: React.FC<LineChartProps> = ({
  data,
  dataKey,
  xKey,
  className,
  title,
  description,
  height = 300,
  color = CHART_COLORS[0],
  showGrid = true,
  showTooltip = true,
  showLegend = false
}) => (
  <ChartContainer
    title={title}
    description={description}
    height={height}
    className={className}
  >
    <LineChart data={data}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
      <XAxis dataKey={xKey} />
      <YAxis />
      {showTooltip && <Tooltip />}
      {showLegend && <Legend />}
      <Line
        type="monotone"
        dataKey={dataKey}
        stroke={color}
        strokeWidth={2}
        dot={{ r: 4 }}
        activeDot={{ r: 6 }}
      />
    </LineChart>
  </ChartContainer>
)

// Area Chart component
interface AreaChartProps {
  data: any[]
  dataKey: string
  xKey: string
  className?: string
  title?: string
  description?: string
  height?: number
  color?: string
  showGrid?: boolean
  showTooltip?: boolean
}

const SimpleAreaChart: React.FC<AreaChartProps> = ({
  data,
  dataKey,
  xKey,
  className,
  title,
  description,
  height = 300,
  color = CHART_COLORS[0],
  showGrid = true,
  showTooltip = true
}) => (
  <ChartContainer
    title={title}
    description={description}
    height={height}
    className={className}
  >
    <AreaChart data={data}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
      <XAxis dataKey={xKey} />
      <YAxis />
      {showTooltip && <Tooltip />}
      <Area
        type="monotone"
        dataKey={dataKey}
        stroke={color}
        fill={color}
        fillOpacity={0.3}
        strokeWidth={2}
      />
    </AreaChart>
  </ChartContainer>
)

// Bar Chart component
interface BarChartProps {
  data: any[]
  dataKey: string
  xKey: string
  className?: string
  title?: string
  description?: string
  height?: number
  color?: string
  showGrid?: boolean
  showTooltip?: boolean
}

const SimpleBarChart: React.FC<BarChartProps> = ({
  data,
  dataKey,
  xKey,
  className,
  title,
  description,
  height = 300,
  color = CHART_COLORS[0],
  showGrid = true,
  showTooltip = true
}) => (
  <ChartContainer
    title={title}
    description={description}
    height={height}
    className={className}
  >
    <BarChart data={data}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
      <XAxis dataKey={xKey} />
      <YAxis />
      {showTooltip && <Tooltip />}
      <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} />
    </BarChart>
  </ChartContainer>
)

// Pie Chart component
interface PieChartProps {
  data: Array<{ name: string; value: number }>
  className?: string
  title?: string
  description?: string
  height?: number
  showTooltip?: boolean
  showLegend?: boolean
  innerRadius?: number
  outerRadius?: number
}

const SimplePieChart: React.FC<PieChartProps> = ({
  data,
  className,
  title,
  description,
  height = 300,
  showTooltip = true,
  showLegend = true,
  innerRadius = 0,
  outerRadius = 80
}) => (
  <ChartContainer
    title={title}
    description={description}
    height={height}
    className={className}
  >
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        paddingAngle={2}
        dataKey="value"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
        ))}
      </Pie>
      {showTooltip && <Tooltip />}
      {showLegend && <Legend />}
    </PieChart>
  </ChartContainer>
)

// Multi-series Line Chart
interface MultiLineChartProps {
  data: any[]
  series: Array<{ key: string; name?: string; color?: string }>
  xKey: string
  className?: string
  title?: string
  description?: string
  height?: number
  showGrid?: boolean
  showTooltip?: boolean
  showLegend?: boolean
}

const MultiLineChart: React.FC<MultiLineChartProps> = ({
  data,
  series,
  xKey,
  className,
  title,
  description,
  height = 300,
  showGrid = true,
  showTooltip = true,
  showLegend = true
}) => (
  <ChartContainer
    title={title}
    description={description}
    height={height}
    className={className}
  >
    <LineChart data={data}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
      <XAxis dataKey={xKey} />
      <YAxis />
      {showTooltip && <Tooltip />}
      {showLegend && <Legend />}
      {series.map((serie, index) => (
        <Line
          key={serie.key}
          type="monotone"
          dataKey={serie.key}
          name={serie.name || serie.key}
          stroke={serie.color || CHART_COLORS[index % CHART_COLORS.length]}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      ))}
    </LineChart>
  </ChartContainer>
)

// Dashboard metric card with trend
interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: "increase" | "decrease" | "neutral"
  }
  className?: string
  icon?: React.ReactNode
  trend?: any[]
  trendKey?: string
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  className,
  icon,
  trend,
  trendKey = "value"
}) => {
  const getChangeColor = () => {
    if (!change) return ""
    switch (change.type) {
      case "increase": return "text-green-600"
      case "decrease": return "text-red-600"
      default: return "text-muted-foreground"
    }
  }

  const getChangeIcon = () => {
    if (!change) return null
    return change.type === "increase" ? "↗" : change.type === "decrease" ? "↘" : "→"
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium">{title}</h3>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <div className="flex items-baseline space-x-3">
          <div className="text-2xl font-bold">{value}</div>
          {change && (
            <div className={cn("text-xs flex items-center", getChangeColor())}>
              <span className="mr-1">{getChangeIcon()}</span>
              {Math.abs(change.value)}%
            </div>
          )}
        </div>
        {trend && trend.length > 0 && (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={60}>
              <AreaChart data={trend}>
                <Area
                  type="monotone"
                  dataKey={trendKey}
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export {
  ChartContainer,
  SimpleLineChart,
  SimpleAreaChart,
  SimpleBarChart,
  SimplePieChart,
  MultiLineChart,
  MetricCard,
  CHART_COLORS,
}