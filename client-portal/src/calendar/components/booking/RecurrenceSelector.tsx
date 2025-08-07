'use client';

import React, { useState } from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { RecurrencePattern, RecurrenceFrequency } from '../../types';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { CalendarDays, Repeat, X } from 'lucide-react';

interface RecurrenceSelectorProps {
  value?: RecurrencePattern;
  onChange: (pattern?: RecurrencePattern) => void;
  startDate?: Date;
}

export const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({
  value,
  onChange,
  startDate = new Date()
}) => {
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(value?.frequency || RecurrenceFrequency.WEEKLY);
  const [interval, setInterval] = useState(value?.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(value?.daysOfWeek || [startDate.getDay()]);
  const [dayOfMonth, setDayOfMonth] = useState(value?.dayOfMonth || startDate.getDate());
  const [endType, setEndType] = useState<'never' | 'date' | 'count'>('never');
  const [endDate, setEndDate] = useState<Date | undefined>(value?.endDate);
  const [occurrences, setOccurrences] = useState(value?.occurrences || 10);
  const [exceptions, setExceptions] = useState<Date[]>(value?.exceptions || []);

  const weekDays = [
    { value: 0, label: 'Sun', name: 'Sunday' },
    { value: 1, label: 'Mon', name: 'Monday' },
    { value: 2, label: 'Tue', name: 'Tuesday' },
    { value: 3, label: 'Wed', name: 'Wednesday' },
    { value: 4, label: 'Thu', name: 'Thursday' },
    { value: 5, label: 'Fri', name: 'Friday' },
    { value: 6, label: 'Sat', name: 'Saturday' }
  ];

  const updatePattern = () => {
    const pattern: RecurrencePattern = {
      frequency,
      interval,
      daysOfWeek: frequency === RecurrenceFrequency.WEEKLY ? daysOfWeek : undefined,
      dayOfMonth: frequency === RecurrenceFrequency.MONTHLY ? dayOfMonth : undefined,
      endDate: endType === 'date' ? endDate : undefined,
      occurrences: endType === 'count' ? occurrences : undefined,
      exceptions
    };
    onChange(pattern);
  };

  React.useEffect(() => {
    updatePattern();
  }, [frequency, interval, daysOfWeek, dayOfMonth, endType, endDate, occurrences, exceptions]);

  const toggleDayOfWeek = (day: number) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter(d => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day].sort());
    }
  };

  const addException = (date: Date) => {
    if (!exceptions.find(d => d.toDateString() === date.toDateString())) {
      setExceptions([...exceptions, date]);
    }
  };

  const removeException = (date: Date) => {
    setExceptions(exceptions.filter(d => d.toDateString() !== date.toDateString()));
  };

  const getPreviewText = (): string => {
    const intervalText = interval === 1 ? '' : `every ${interval} `;
    
    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        return `Repeats ${intervalText}day${interval > 1 ? 's' : ''}`;
      
      case RecurrenceFrequency.WEEKLY:
        const dayNames = daysOfWeek.map(d => weekDays.find(wd => wd.value === d)?.label).join(', ');
        return `Repeats ${intervalText}week${interval > 1 ? 's' : ''} on ${dayNames}`;
      
      case RecurrenceFrequency.MONTHLY:
        return `Repeats ${intervalText}month${interval > 1 ? 's' : ''} on day ${dayOfMonth}`;
      
      case RecurrenceFrequency.YEARLY:
        return `Repeats ${intervalText}year${interval > 1 ? 's' : ''}`;
      
      default:
        return 'Custom recurrence';
    }
  };

  const generatePreviewDates = (): Date[] => {
    const dates: Date[] = [];
    let currentDate = new Date(startDate);
    
    for (let i = 0; i < Math.min(5, occurrences || 5); i++) {
      if (frequency === RecurrenceFrequency.WEEKLY && !daysOfWeek.includes(currentDate.getDay())) {
        // Find next valid day of week
        let nextDate = new Date(currentDate);
        while (!daysOfWeek.includes(nextDate.getDay())) {
          nextDate = addDays(nextDate, 1);
        }
        currentDate = nextDate;
      }
      
      dates.push(new Date(currentDate));
      
      // Calculate next occurrence
      switch (frequency) {
        case RecurrenceFrequency.DAILY:
          currentDate = addDays(currentDate, interval);
          break;
        case RecurrenceFrequency.WEEKLY:
          currentDate = addWeeks(currentDate, interval);
          break;
        case RecurrenceFrequency.MONTHLY:
          currentDate = addMonths(currentDate, interval);
          break;
        case RecurrenceFrequency.YEARLY:
          currentDate = addYears(currentDate, interval);
          break;
      }
    }
    
    return dates;
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
      <div className="flex items-center space-x-2">
        <Repeat className="w-4 h-4 text-primary" />
        <Label className="font-medium">Repeat Event</Label>
      </div>

      {/* Frequency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Repeats</Label>
          <Select value={frequency} onValueChange={(value) => setFrequency(value as RecurrenceFrequency)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={RecurrenceFrequency.DAILY}>Daily</SelectItem>
              <SelectItem value={RecurrenceFrequency.WEEKLY}>Weekly</SelectItem>
              <SelectItem value={RecurrenceFrequency.MONTHLY}>Monthly</SelectItem>
              <SelectItem value={RecurrenceFrequency.YEARLY}>Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Every</Label>
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              min="1"
              max="100"
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">
              {frequency === RecurrenceFrequency.DAILY ? 'day(s)' :
               frequency === RecurrenceFrequency.WEEKLY ? 'week(s)' :
               frequency === RecurrenceFrequency.MONTHLY ? 'month(s)' :
               'year(s)'}
            </span>
          </div>
        </div>
      </div>

      {/* Weekly options */}
      {frequency === RecurrenceFrequency.WEEKLY && (
        <div>
          <Label>Repeat on</Label>
          <div className="flex space-x-1 mt-2">
            {weekDays.map(day => (
              <Button
                key={day.value}
                variant={daysOfWeek.includes(day.value) ? "default" : "outline"}
                size="sm"
                className="w-10 h-10 p-0"
                onClick={() => toggleDayOfWeek(day.value)}
                type="button"
              >
                {day.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly options */}
      {frequency === RecurrenceFrequency.MONTHLY && (
        <div>
          <Label>Day of month</Label>
          <Select value={dayOfMonth.toString()} onValueChange={(value) => setDayOfMonth(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <SelectItem key={day} value={day.toString()}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* End conditions */}
      <div>
        <Label>Ends</Label>
        <div className="space-y-3 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="never"
              checked={endType === 'never'}
              onCheckedChange={() => setEndType('never')}
            />
            <Label htmlFor="never">Never</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="date"
              checked={endType === 'date'}
              onCheckedChange={() => setEndType('date')}
            />
            <Label htmlFor="date">On</Label>
            {endType === 'date' && (
              <Input
                type="date"
                value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                className="w-40"
              />
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="count"
              checked={endType === 'count'}
              onCheckedChange={() => setEndType('count')}
            />
            <Label htmlFor="count">After</Label>
            {endType === 'count' && (
              <div className="flex items-center space-x-1">
                <Input
                  type="number"
                  min="1"
                  max="999"
                  value={occurrences}
                  onChange={(e) => setOccurrences(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">occurrences</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Preview</Label>
        <div className="p-3 bg-background border rounded">
          <div className="text-sm font-medium mb-2">{getPreviewText()}</div>
          <div className="text-xs text-muted-foreground mb-2">Next occurrences:</div>
          <div className="space-y-1">
            {generatePreviewDates().map((date, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span>{format(date, 'EEEE, MMMM d, yyyy')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 p-0"
                  onClick={() => addException(date)}
                  type="button"
                >
                  Skip
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Exceptions */}
      {exceptions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Exceptions</Label>
          <div className="flex flex-wrap gap-2">
            {exceptions.map((date, index) => (
              <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                <CalendarDays className="w-3 h-3" />
                <span className="text-xs">{format(date, 'MMM d')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => removeException(date)}
                  type="button"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};