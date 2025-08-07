import * as React from "react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { Search, Plus, FileX, Wifi, AlertCircle, Database, Users, FolderOpen } from "lucide-react"

interface EmptyStateProps {
  className?: string
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary"
  }
  variant?: "default" | "search" | "error" | "offline" | "loading"
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ 
    className, 
    icon, 
    title, 
    description, 
    action, 
    variant = "default",
    ...props 
  }, ref) => {
    const getDefaultIcon = () => {
      switch (variant) {
        case "search":
          return <Search className="h-12 w-12 text-muted-foreground" />
        case "error":
          return <AlertCircle className="h-12 w-12 text-destructive" />
        case "offline":
          return <Wifi className="h-12 w-12 text-muted-foreground" />
        default:
          return <FileX className="h-12 w-12 text-muted-foreground" />
      }
    }

    return (
      <Card ref={ref} className={cn("border-dashed", className)} {...props}>
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="mb-4">
            {icon || getDefaultIcon()}
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
          )}
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || "default"}
            >
              {action.label}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }
)
EmptyState.displayName = "EmptyState"

// Predefined empty states for common CRM scenarios
const NoContactsState: React.FC<{
  onAddContact?: () => void
  className?: string
}> = ({ onAddContact, className }) => (
  <EmptyState
    className={className}
    icon={<Users className="h-12 w-12 text-muted-foreground" />}
    title="No contacts found"
    description="Start building your network by adding your first contact."
    action={onAddContact ? {
      label: "Add Contact",
      onClick: onAddContact
    } : undefined}
  />
)

const NoDealsState: React.FC<{
  onCreateDeal?: () => void
  className?: string
}> = ({ onCreateDeal, className }) => (
  <EmptyState
    className={className}
    icon={<Database className="h-12 w-12 text-muted-foreground" />}
    title="No deals in pipeline"
    description="Create your first deal to start tracking opportunities."
    action={onCreateDeal ? {
      label: "Create Deal",
      onClick: onCreateDeal
    } : undefined}
  />
)

const NoProjectsState: React.FC<{
  onCreateProject?: () => void
  className?: string
}> = ({ onCreateProject, className }) => (
  <EmptyState
    className={className}
    icon={<FolderOpen className="h-12 w-12 text-muted-foreground" />}
    title="No projects found"
    description="Organize your work by creating your first project."
    action={onCreateProject ? {
      label: "New Project",
      onClick: onCreateProject
    } : undefined}
  />
)

const SearchNoResultsState: React.FC<{
  searchTerm?: string
  onClearSearch?: () => void
  className?: string
}> = ({ searchTerm, onClearSearch, className }) => (
  <EmptyState
    className={className}
    variant="search"
    title={`No results found ${searchTerm ? `for "${searchTerm}"` : ""}`}
    description="Try adjusting your search terms or filters to find what you're looking for."
    action={onClearSearch ? {
      label: "Clear Search",
      onClick: onClearSearch,
      variant: "outline"
    } : undefined}
  />
)

const ErrorState: React.FC<{
  onRetry?: () => void
  error?: string
  className?: string
}> = ({ onRetry, error, className }) => (
  <EmptyState
    className={className}
    variant="error"
    title="Something went wrong"
    description={error || "An unexpected error occurred. Please try again."}
    action={onRetry ? {
      label: "Try Again",
      onClick: onRetry,
      variant: "outline"
    } : undefined}
  />
)

const OfflineState: React.FC<{
  onRetry?: () => void
  className?: string
}> = ({ onRetry, className }) => (
  <EmptyState
    className={className}
    variant="offline"
    title="You're offline"
    description="Please check your internet connection and try again."
    action={onRetry ? {
      label: "Retry",
      onClick: onRetry,
      variant: "outline"
    } : undefined}
  />
)

// Generic list empty state
interface ListEmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  createLabel?: string
  onCreate?: () => void
  className?: string
}

const ListEmptyState: React.FC<ListEmptyStateProps> = ({
  icon = <Plus className="h-12 w-12 text-muted-foreground" />,
  title,
  description,
  createLabel = "Create",
  onCreate,
  className
}) => (
  <EmptyState
    className={className}
    icon={icon}
    title={title}
    description={description}
    action={onCreate ? {
      label: createLabel,
      onClick: onCreate
    } : undefined}
  />
)

export {
  EmptyState,
  NoContactsState,
  NoDealsState,
  NoProjectsState,
  SearchNoResultsState,
  ErrorState,
  OfflineState,
  ListEmptyState,
}