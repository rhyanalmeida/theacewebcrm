'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, MoreVertical, Search, Filter, SortAsc } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// Mobile-optimized list component with virtual scrolling
export function MobileList<T>({
  items,
  renderItem,
  searchKey,
  sortKey,
  filterFn,
  onItemClick,
  emptyMessage = 'No items found',
  loading = false,
  itemHeight = 80,
  searchPlaceholder = 'Search...'
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  searchKey?: keyof T;
  sortKey?: keyof T;
  filterFn?: (item: T, query: string) => boolean;
  onItemClick?: (item: T, index: number) => void;
  emptyMessage?: string;
  loading?: boolean;
  itemHeight?: number;
  searchPlaceholder?: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAscending, setSortAscending] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort items
  const processedItems = useMemo(() => {
    let filtered = items;

    // Apply search filter
    if (searchQuery && (searchKey || filterFn)) {
      filtered = items.filter(item => {
        if (filterFn) {
          return filterFn(item, searchQuery);
        }
        if (searchKey) {
          const value = item[searchKey];
          return String(value).toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
      });
    }

    // Apply sorting
    if (sortKey) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];
        
        if (aValue < bValue) return sortAscending ? -1 : 1;
        if (aValue > bValue) return sortAscending ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [items, searchQuery, searchKey, filterFn, sortKey, sortAscending]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {sortKey && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortAscending(!sortAscending)}
          >
            <SortAsc className={`w-4 h-4 ${!sortAscending ? 'rotate-180' : ''}`} />
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Results count */}
      {searchQuery && (
        <div className="text-sm text-gray-600">
          {processedItems.length} of {items.length} items
        </div>
      )}

      {/* List items */}
      <div className="space-y-2">
        {processedItems.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            {emptyMessage}
          </Card>
        ) : (
          processedItems.map((item, index) => (
            <div
              key={index}
              onClick={() => onItemClick?.(item, index)}
              className={onItemClick ? 'cursor-pointer' : ''}
            >
              {renderItem(item, index)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Mobile-optimized form component
export function MobileForm({
  children,
  onSubmit,
  title,
  onBack,
  actions
}: {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  title?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {(title || onBack) && (
        <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
          <div className="flex items-center">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            {title && (
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            )}
          </div>
        </div>
      )}

      {/* Form content */}
      <form onSubmit={onSubmit} className="p-4">
        <div className="space-y-4">
          {children}
        </div>
        
        {/* Actions */}
        {actions && (
          <div className="sticky bottom-0 bg-white border-t p-4 mt-6 -mx-4">
            {actions}
          </div>
        )}
      </form>
    </div>
  );
}

// Mobile-optimized input component
export function MobileInput({
  label,
  error,
  required,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        {...props}
        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${props.className || ''}`}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// Mobile-optimized select component
export function MobileSelect({
  label,
  error,
  required,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        {...props}
        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${props.className || ''}`}
      >
        {children}
      </select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// Mobile-optimized textarea component
export function MobileTextarea({
  label,
  error,
  required,
  rows = 4,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        {...props}
        rows={rows}
        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${props.className || ''}`}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// Mobile-optimized card component
export function MobileCard({
  children,
  className = '',
  hover = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
}) {
  return (
    <Card
      className={`p-4 ${hover ? 'hover:shadow-md transition-shadow' : ''} ${className}`}
      {...props}
    >
      {children}
    </Card>
  );
}

// Mobile-optimized action sheet
export function MobileActionSheet({
  isOpen,
  onClose,
  title,
  actions
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actions: Array<{
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    destructive?: boolean;
    disabled?: boolean;
  }>;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4">
        {title && (
          <div className="text-center pb-4 border-b mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
        )}
        
        <div className="space-y-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                onClose();
              }}
              disabled={action.disabled}
              className={`w-full flex items-center space-x-3 p-4 rounded-lg transition-colors ${
                action.destructive
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-900 hover:bg-gray-50'
              } ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {action.icon && <action.icon className="w-5 h-5" />}
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// Mobile-optimized pull to refresh
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY);
      setPullDistance(distance);

      if (distance > 0) {
        e.preventDefault();
      }
    }
  }, [startY]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setStartY(0);
    setPullDistance(0);
  }, [pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isRefreshing, pullDistance };
}

// Mobile-optimized infinite scroll
export function useInfiniteScroll(
  loadMore: () => Promise<void>,
  hasMore: boolean,
  threshold = 200
) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleScroll = async () => {
      if (
        window.innerHeight + window.scrollY >= 
        document.documentElement.scrollHeight - threshold &&
        hasMore &&
        !isLoading
      ) {
        setIsLoading(true);
        try {
          await loadMore();
        } finally {
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore, hasMore, isLoading, threshold]);

  return { isLoading };
}