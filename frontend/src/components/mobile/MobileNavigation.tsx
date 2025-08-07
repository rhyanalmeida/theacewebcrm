'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  Users, 
  Target, 
  Handshake, 
  Building, 
  FolderOpen,
  Menu,
  X,
  Search,
  Bell,
  Settings,
  User,
  Plus,
  Phone,
  Mail,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  color?: string;
}

const mainNavItems: NavItem[] = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/contacts', icon: Users, label: 'Contacts', badge: 3 },
  { href: '/leads', icon: Target, label: 'Leads', badge: 8 },
  { href: '/deals', icon: Handshake, label: 'Deals', badge: 2 },
  { href: '/companies', icon: Building, label: 'Companies' },
  { href: '/projects', icon: FolderOpen, label: 'Projects' },
];

const quickActions = [
  { href: '/contacts/new', icon: Users, label: 'New Contact', color: 'bg-blue-500' },
  { href: '/leads/new', icon: Target, label: 'New Lead', color: 'bg-green-500' },
  { href: '/deals/new', icon: Handshake, label: 'New Deal', color: 'bg-purple-500' },
  { href: '/companies/new', icon: Building, label: 'New Company', color: 'bg-orange-500' },
];

export function MobileNavigation() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsQuickActionsOpen(false);
  }, [pathname]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.mobile-nav')) {
        setIsMenuOpen(false);
        setIsQuickActionsOpen(false);
      }
    };

    if (isMenuOpen || isQuickActionsOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen, isQuickActionsOpen]);

  return (
    <>
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 lg:hidden">
        <div className="container flex h-14 items-center px-4">
          <Button
            variant="ghost"
            size="sm"
            className="mobile-nav mr-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex-1 flex items-center space-x-2">
            <div className="font-semibold text-lg">ACE CRM</div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="relative">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                5
              </Badge>
            </Button>
            <Button variant="ghost" size="sm">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)} />
          
          <nav className="mobile-nav fixed left-0 top-0 z-50 h-full w-72 bg-white shadow-xl">
            <div className="flex h-14 items-center border-b px-6">
              <div className="font-semibold text-lg">ACE CRM</div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setIsMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto py-6">
              <div className="space-y-2 px-3">
                {mainNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge variant={isActive ? 'default' : 'secondary'} className="h-5 px-2">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-8 border-t pt-6">
                <div className="px-6 mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Quick Actions
                  </h4>
                </div>
                <div className="space-y-2 px-3">
                  {quickActions.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <div className={`p-1 rounded-md ${action.color}`}>
                        <action.icon className="h-4 w-4 text-white" />
                      </div>
                      <span>{action.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-8 border-t pt-6">
                <div className="space-y-2 px-3">
                  <Link
                    href="/settings"
                    className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                  </Link>
                </div>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 lg:hidden">
        <div className="flex items-center justify-around py-2">
          {mainNavItems.slice(0, 4).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center space-y-1 px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.badge && (
                    <Badge className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
          
          <button
            onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
            className="mobile-nav flex flex-col items-center space-y-1 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            <div className={`p-2 rounded-full transition-colors ${
              isQuickActionsOpen ? 'bg-blue-600 text-white' : 'bg-gray-100'
            }`}>
              <Plus className={`h-4 w-4 transition-transform ${
                isQuickActionsOpen ? 'rotate-45' : ''
              }`} />
            </div>
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Quick Actions Popup */}
      {isQuickActionsOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsQuickActionsOpen(false)} />
          
          <div className="mobile-nav fixed bottom-20 left-4 right-4 bg-white rounded-xl shadow-lg p-4">
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center space-y-2 p-4 rounded-lg border-2 border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className={`p-3 rounded-full ${action.color}`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{action.label}</span>
                </Link>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-3 gap-3">
                <button className="flex flex-col items-center space-y-1 p-3 rounded-lg hover:bg-gray-50">
                  <Phone className="h-5 w-5 text-gray-600" />
                  <span className="text-xs text-gray-600">Call</span>
                </button>
                <button className="flex flex-col items-center space-y-1 p-3 rounded-lg hover:bg-gray-50">
                  <Mail className="h-5 w-5 text-gray-600" />
                  <span className="text-xs text-gray-600">Email</span>
                </button>
                <button className="flex flex-col items-center space-y-1 p-3 rounded-lg hover:bg-gray-50">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <span className="text-xs text-gray-600">Schedule</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for bottom navigation */}
      <div className="h-20 lg:hidden" />
    </>
  );
}