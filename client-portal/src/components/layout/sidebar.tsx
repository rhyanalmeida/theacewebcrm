'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthContext } from '@/components/auth/auth-provider'
import { useNotificationStore } from '@/stores/notification-store'
import {
  Home,
  FolderOpen,
  MessageSquare,
  CreditCard,
  HelpCircle,
  Settings,
  LogOut,
  Bell,
  User,
  FileText,
  Star,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react'
import { BRAND_CONFIG } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Files', href: '/files', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: CreditCard },
  { name: 'Support', href: '/support', icon: HelpCircle },
  { name: 'Feedback', href: '/feedback', icon: Star },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Knowledge Base', href: '/knowledge', icon: HelpCircle },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { profile, signOut } = useAuthContext()
  const { unreadCount } = useNotificationStore()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          className
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <img
                src={BRAND_CONFIG.logo}
                alt={BRAND_CONFIG.name}
                className="h-8 w-8"
              />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {BRAND_CONFIG.name}
              </span>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                )}
                onClick={() => setMobileOpen(false)}
              >
                <Icon
                  className={cn(
                    'mr-3 flex-shrink-0 h-5 w-5',
                    collapsed && 'mr-0'
                  )}
                />
                {!collapsed && (
                  <>
                    {item.name}
                    {item.name === 'Support' && unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {unreadCount}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          {!collapsed && (
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {profile?.email}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Link
              href="/notifications"
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
                collapsed && 'justify-center'
              )}
              onClick={() => setMobileOpen(false)}
            >
              <Bell className={cn('h-5 w-5', collapsed ? 'mr-0' : 'mr-3')} />
              {!collapsed && (
                <>
                  Notifications
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {unreadCount}
                    </Badge>
                  )}
                </>
              )}
            </Link>

            <Link
              href="/settings"
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
                collapsed && 'justify-center'
              )}
              onClick={() => setMobileOpen(false)}
            >
              <Settings className={cn('h-5 w-5', collapsed ? 'mr-0' : 'mr-3')} />
              {!collapsed && 'Settings'}
            </Link>

            <Button
              variant="ghost"
              onClick={handleSignOut}
              className={cn(
                'w-full justify-start text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
                collapsed && 'justify-center'
              )}
            >
              <LogOut className={cn('h-5 w-5', collapsed ? 'mr-0' : 'mr-3')} />
              {!collapsed && 'Sign out'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}