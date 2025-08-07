'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { formatCurrency, formatNumber } from '@/utils/format';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  format?: 'currency' | 'number' | 'percentage' | 'text';
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  change,
  format = 'number',
  className,
}: StatsCardProps) {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'number':
        return formatNumber(val);
      case 'percentage':
        return `${val}%`;
      default:
        return val.toString();
    }
  };

  return (
    <Card className={cn('p-6', className)}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {formatValue(value)}
              </p>
              {change && (
                <span
                  className={cn(
                    'ml-2 text-sm font-medium',
                    change.type === 'increase'
                      ? 'text-green-600'
                      : 'text-red-600'
                  )}
                >
                  {change.type === 'increase' ? '+' : '-'}
                  {Math.abs(change.value)}%
                </span>
              )}
            </div>
          </div>
          <div className="rounded-full bg-blue-50 p-3">
            <div className="h-6 w-6 text-blue-600">{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}