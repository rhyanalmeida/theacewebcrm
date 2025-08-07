import * as React from "react"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "../../lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
  active?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
  separator?: React.ReactNode
  showHome?: boolean
  onItemClick?: (item: BreadcrumbItem, index: number) => void
}

const Breadcrumb = React.forwardRef<HTMLNavElement, BreadcrumbProps>(
  ({ 
    items, 
    className, 
    separator = <ChevronRight className="h-4 w-4" />, 
    showHome = true,
    onItemClick,
    ...props 
  }, ref) => {
    const handleItemClick = (item: BreadcrumbItem, index: number) => {
      if (onItemClick && !item.active) {
        onItemClick(item, index)
      }
    }

    const allItems = showHome ? [{ label: "Home", icon: <Home className="h-4 w-4" />, href: "/" }, ...items] : items

    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}
        {...props}
      >
        <ol className="flex items-center space-x-1">
          {allItems.map((item, index) => (
            <li key={index} className="flex items-center space-x-1">
              {index > 0 && (
                <span className="mx-1 text-muted-foreground/60">
                  {separator}
                </span>
              )}
              <span
                className={cn(
                  "flex items-center space-x-1 transition-colors",
                  item.active
                    ? "text-foreground font-medium"
                    : "hover:text-foreground cursor-pointer",
                  !item.href && !onItemClick && "cursor-default"
                )}
                onClick={() => handleItemClick(item, index)}
              >
                {item.icon}
                <span>{item.label}</span>
              </span>
            </li>
          ))}
        </ol>
      </nav>
    )
  }
)
Breadcrumb.displayName = "Breadcrumb"

// Auto-generated breadcrumb from pathname
interface AutoBreadcrumbProps {
  pathname: string
  className?: string
  labelMap?: Record<string, string>
  excludePaths?: string[]
  onNavigate?: (path: string) => void
}

const AutoBreadcrumb: React.FC<AutoBreadcrumbProps> = ({
  pathname,
  className,
  labelMap = {},
  excludePaths = [],
  onNavigate
}) => {
  const pathSegments = pathname
    .split("/")
    .filter(Boolean)
    .filter(segment => !excludePaths.includes(segment))

  const items: BreadcrumbItem[] = pathSegments.map((segment, index) => {
    const path = "/" + pathSegments.slice(0, index + 1).join("/")
    const label = labelMap[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())
    const isActive = index === pathSegments.length - 1

    return {
      label,
      href: path,
      active: isActive
    }
  })

  const handleItemClick = (item: BreadcrumbItem) => {
    if (onNavigate && item.href && !item.active) {
      onNavigate(item.href)
    }
  }

  return (
    <Breadcrumb
      items={items}
      className={className}
      onItemClick={handleItemClick}
    />
  )
}

export { Breadcrumb, AutoBreadcrumb }