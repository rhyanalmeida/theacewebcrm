import * as React from "react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu"
import { Bell, Search, Settings, User, LogOut, Moon, Sun } from "lucide-react"
import { Badge } from "./badge"

interface HeaderProps {
  className?: string
  title?: string
  children?: React.ReactNode
  user?: {
    name: string
    email: string
    avatar?: string
    initials?: string
  }
  notifications?: Array<{
    id: string
    title: string
    description?: string
    unread?: boolean
    timestamp?: Date
  }>
  onSearch?: (query: string) => void
  onNotificationClick?: (notificationId: string) => void
  onUserAction?: (action: 'profile' | 'settings' | 'logout') => void
  showSearch?: boolean
  showNotifications?: boolean
  showThemeToggle?: boolean
  theme?: 'light' | 'dark'
  onThemeToggle?: () => void
}

const Header = React.forwardRef<HTMLDivElement, HeaderProps>(
  ({
    className,
    title,
    children,
    user,
    notifications = [],
    onSearch,
    onNotificationClick,
    onUserAction,
    showSearch = true,
    showNotifications = true,
    showThemeToggle = true,
    theme = 'light',
    onThemeToggle,
    ...props
  }, ref) => {
    const [searchQuery, setSearchQuery] = React.useState("")
    const unreadNotifications = notifications.filter(n => n.unread).length

    const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (onSearch && searchQuery.trim()) {
        onSearch(searchQuery.trim())
      }
    }

    return (
      <header
        ref={ref}
        className={cn(
          "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          className
        )}
        {...props}
      >
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Left section */}
          <div className="flex items-center space-x-4">
            {title && (
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            )}
            {children}
          </div>

          {/* Center section - Search */}
          {showSearch && onSearch && (
            <div className="flex-1 max-w-md mx-8">
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search..."
                    className="w-full rounded-md border border-input bg-background px-8 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
            </div>
          )}

          {/* Right section */}
          <div className="flex items-center space-x-2">
            {/* Theme toggle */}
            {showThemeToggle && onThemeToggle && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onThemeToggle}
                className="h-9 w-9"
              >
                {theme === 'light' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            )}

            {/* Notifications */}
            {showNotifications && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-4 w-4" />
                    {unreadNotifications > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
                      >
                        {unreadNotifications > 9 ? "9+" : unreadNotifications}
                      </Badge>
                    )}
                    <span className="sr-only">
                      {unreadNotifications > 0 ? `${unreadNotifications} unread notifications` : "Notifications"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-auto">
                      {notifications.slice(0, 5).map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className="cursor-pointer p-3 hover:bg-muted"
                          onClick={() => onNotificationClick?.(notification.id)}
                        >
                          <div className="flex items-start space-x-2 w-full">
                            {notification.unread && (
                              <div className="h-2 w-2 bg-blue-600 rounded-full mt-1 flex-shrink-0" />
                            )}
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium leading-none">
                                {notification.title}
                              </p>
                              {notification.description && (
                                <p className="text-xs text-muted-foreground">
                                  {notification.description}
                                </p>
                              )}
                              {notification.timestamp && (
                                <p className="text-xs text-muted-foreground">
                                  {notification.timestamp.toLocaleTimeString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      {notifications.length > 5 && (
                        <DropdownMenuItem className="justify-center py-2">
                          <span className="text-sm text-muted-foreground">
                            View all notifications
                          </span>
                        </DropdownMenuItem>
                      )}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>
                        {user.initials || user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onUserAction?.('profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUserAction?.('settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onUserAction?.('logout')}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>
    )
  }
)
Header.displayName = "Header"

export { Header }