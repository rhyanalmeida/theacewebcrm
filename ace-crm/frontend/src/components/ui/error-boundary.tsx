import * as React from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "./button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showDetails?: boolean
}

interface ErrorFallbackProps {
  error?: Error
  errorInfo?: React.ErrorInfo
  resetError: () => void
  showDetails?: boolean
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  showDetails = false
}) => {
  const [showErrorDetails, setShowErrorDetails] = React.useState(false)

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. You can try refreshing the page or contact support if the problem persists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={resetError} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="flex-1"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>
          
          {showDetails && error && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="w-full"
              >
                {showErrorDetails ? 'Hide' : 'Show'} Error Details
              </Button>
              
              {showErrorDetails && (
                <div className="rounded-md bg-muted p-3 text-xs">
                  <div className="font-mono">
                    <div className="font-semibold text-destructive mb-2">
                      {error.name}: {error.message}
                    </div>
                    {error.stack && (
                      <pre className="whitespace-pre-wrap text-muted-foreground">
                        {error.stack}
                      </pre>
                    )}
                    {errorInfo && errorInfo.componentStack && (
                      <div className="mt-2">
                        <div className="font-semibold mb-1">Component Stack:</div>
                        <pre className="whitespace-pre-wrap text-muted-foreground">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Main Error Boundary component
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to external service
    this.props.onError?.(error, errorInfo)
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          showDetails={this.props.showDetails}
        />
      )
    }

    return this.props.children
  }
}

// Hook for functional components to catch and handle errors
interface UseErrorHandlerOptions {
  onError?: (error: Error) => void
  resetOnPropsChange?: boolean
}

const useErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const catchError = React.useCallback((error: Error) => {
    setError(error)
    options.onError?.(error)
  }, [options])

  // Auto reset on prop changes if specified
  React.useEffect(() => {
    if (options.resetOnPropsChange && error) {
      resetError()
    }
  }, [options.resetOnPropsChange, error, resetError])

  return { error, resetError, catchError }
}

// HOC to wrap components with error boundary
function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} ref={ref} />
    </ErrorBoundary>
  ))

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Async error boundary for handling Promise rejections
const AsyncErrorBoundary: React.FC<ErrorBoundaryProps> = (props) => {
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = new Error(event.reason)
      error.name = 'UnhandledPromiseRejection'
      props.onError?.(error, { componentStack: '' })
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [props])

  return <ErrorBoundary {...props} />
}

export {
  ErrorBoundary,
  DefaultErrorFallback,
  useErrorHandler,
  withErrorBoundary,
  AsyncErrorBoundary,
  type ErrorFallbackProps,
}