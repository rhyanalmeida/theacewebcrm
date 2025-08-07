import * as React from "react"
import { cn } from "../../lib/utils"

// Spinner component
interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
  variant?: "default" | "primary" | "secondary"
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", variant = "default", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4 border-2",
      md: "h-6 w-6 border-2", 
      lg: "h-8 w-8 border-3"
    }

    const variantClasses = {
      default: "border-muted-foreground border-t-foreground",
      primary: "border-primary/30 border-t-primary",
      secondary: "border-secondary/30 border-t-secondary"
    }

    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full border-solid",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Spinner.displayName = "Spinner"

// Loading overlay component
interface LoadingOverlayProps {
  loading: boolean
  children: React.ReactNode
  className?: string
  spinnerSize?: "sm" | "md" | "lg"
  message?: string
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading,
  children,
  className,
  spinnerSize = "md",
  message
}) => {
  return (
    <div className={cn("relative", className)}>
      {children}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-2">
            <Spinner size={spinnerSize} variant="primary" />
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Skeleton components for loading states
const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
})
Skeleton.displayName = "Skeleton"

// Skeleton variants for common patterns
const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 1, 
  className 
}) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i} 
        className={cn(
          "h-4",
          i === lines - 1 ? "w-3/4" : "w-full"
        )} 
      />
    ))}
  </div>
)

const SkeletonAvatar: React.FC<{ size?: "sm" | "md" | "lg"; className?: string }> = ({ 
  size = "md", 
  className 
}) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  }

  return (
    <Skeleton 
      className={cn("rounded-full", sizeClasses[size], className)} 
    />
  )
}

const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("space-y-3 p-4", className)}>
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-20 w-full" />
    <div className="flex space-x-2">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
)

const SkeletonTable: React.FC<{ 
  rows?: number 
  columns?: number
  className?: string 
}> = ({ rows = 5, columns = 4, className }) => (
  <div className={cn("space-y-3", className)}>
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={`header-${i}`} className="h-6 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={`row-${i}`} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, j) => (
          <Skeleton key={`cell-${i}-${j}`} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
)

// Pulse loading animation for buttons
interface LoadingButtonProps {
  loading: boolean
  children: React.ReactNode
  className?: string
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  children,
  className
}) => (
  <div className={cn("relative", className)}>
    <div className={cn("transition-opacity", loading && "opacity-50")}>
      {children}
    </div>
    {loading && (
      <div className="absolute inset-0 flex items-center justify-center">
        <Spinner size="sm" variant="primary" />
      </div>
    )}
  </div>
)

// Progress bar component
interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  showValue?: boolean
  size?: "sm" | "md" | "lg"
  variant?: "default" | "success" | "warning" | "destructive"
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  className,
  showValue = false,
  size = "md",
  variant = "default"
}) => {
  const percentage = Math.min((value / max) * 100, 100)
  
  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3"
  }

  const variantClasses = {
    default: "bg-primary",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    destructive: "bg-destructive"
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className={cn(
        "w-full rounded-full bg-muted overflow-hidden",
        sizeClasses[size]
      )}>
        <div
          className={cn(
            "h-full transition-all duration-300 ease-in-out",
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <div className="text-sm text-muted-foreground text-right">
          {value} / {max}
        </div>
      )}
    </div>
  )
}

export {
  Spinner,
  LoadingOverlay,
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTable,
  LoadingButton,
  ProgressBar,
}