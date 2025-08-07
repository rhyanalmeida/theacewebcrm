import * as React from "react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react"

interface SidebarProps {
  children: React.ReactNode
  className?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
  position?: "left" | "right"
}

const SidebarContext = React.createContext<{
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  collapsible: boolean
}>({
  collapsed: false,
  setCollapsed: () => {},
  collapsible: false,
})

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, className, collapsible = true, defaultCollapsed = false, position = "left" }, ref) => {
    const [collapsed, setCollapsed] = React.useState(defaultCollapsed)
    const [isMobile, setIsMobile] = React.useState(false)
    const [mobileOpen, setMobileOpen] = React.useState(false)

    React.useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768)
        if (window.innerWidth >= 768) {
          setMobileOpen(false)
        }
      }
      
      checkMobile()
      window.addEventListener("resize", checkMobile)
      return () => window.removeEventListener("resize", checkMobile)
    }, [])

    const contextValue = React.useMemo(() => ({
      collapsed: isMobile ? false : collapsed,
      setCollapsed,
      collapsible: collapsible && !isMobile,
    }), [collapsed, collapsible, isMobile])

    if (isMobile) {
      return (
        <SidebarContext.Provider value={contextValue}>
          {/* Mobile menu button */}
          <div className="fixed top-4 left-4 z-50 md:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="bg-background shadow-md"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>

          {/* Mobile overlay */}
          {mobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}

          {/* Mobile sidebar */}
          <div
            ref={ref}
            className={cn(
              "fixed top-0 z-40 h-full w-64 transform border-r bg-background transition-transform duration-300 ease-in-out md:hidden",
              position === "left" ? "left-0" : "right-0",
              mobileOpen ? "translate-x-0" : position === "left" ? "-translate-x-full" : "translate-x-full",
              className
            )}
          >
            {children}
          </div>
        </SidebarContext.Provider>
      )
    }

    return (
      <SidebarContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn(
            "relative border-r bg-background transition-all duration-300 ease-in-out",
            collapsed ? "w-16" : "w-64",
            position === "right" && "border-r-0 border-l",
            className
          )}
        >
          {collapsible && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border bg-background shadow-md",
                position === "right" && "-left-3"
              )}
              onClick={() => setCollapsed(!collapsed)}
            >
              {position === "left" ? (
                collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />
              ) : (
                collapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
          {children}
        </div>
      </SidebarContext.Provider>
    )
  }
)
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { collapsed } = React.useContext(SidebarContext)
  
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center border-b px-4 py-4",
        collapsed && "justify-center px-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-auto py-2", className)}
    {...props}
  >
    {children}
  </div>
))
SidebarContent.displayName = "SidebarContent"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { collapsed } = React.useContext(SidebarContext)
  
  return (
    <div
      ref={ref}
      className={cn(
        "border-t p-4",
        collapsed && "px-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
SidebarFooter.displayName = "SidebarFooter"

interface SidebarItemProps {
  icon?: React.ReactNode
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  className?: string
  onClick?: () => void
}

const SidebarItem = React.forwardRef<HTMLDivElement, SidebarItemProps>(
  ({ icon, children, active = false, disabled = false, className, onClick, ...props }, ref) => {
    const { collapsed } = React.useContext(SidebarContext)

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center space-x-3 rounded-lg px-3 py-2 mx-2 my-1 text-sm transition-colors cursor-pointer",
          active 
            ? "bg-primary text-primary-foreground" 
            : "hover:bg-accent hover:text-accent-foreground",
          disabled && "opacity-50 cursor-not-allowed",
          collapsed && "justify-center space-x-0 px-2",
          className
        )}
        onClick={disabled ? undefined : onClick}
        {...props}
      >
        {icon && (
          <div className={cn("flex-shrink-0", collapsed ? "mx-auto" : "")}>
            {icon}
          </div>
        )}
        {!collapsed && (
          <span className="flex-1 truncate">{children}</span>
        )}
      </div>
    )
  }
)
SidebarItem.displayName = "SidebarItem"

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title?: string
  }
>(({ className, children, title, ...props }, ref) => {
  const { collapsed } = React.useContext(SidebarContext)

  return (
    <div ref={ref} className={cn("px-2 py-2", className)} {...props}>
      {title && !collapsed && (
        <h3 className="px-2 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
})
SidebarGroup.displayName = "SidebarGroup"

const useSidebar = () => React.useContext(SidebarContext)

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarItem,
  SidebarGroup,
  useSidebar,
}