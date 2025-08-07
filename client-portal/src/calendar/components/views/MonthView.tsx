'use client';

import React, { useMemo } from 'react';
import { useCalendar } from '../../hooks/use-calendar';
import { CalendarEvent } from '../../types';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns';
import { cn } from '../../../lib/utils';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

interface DayEvents {
  date: Date;
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

export const MonthView: React.FC = () => {
  const {
    currentView,
    events,
    selectEvent,
    startCreatingEvent,
    goToDate,
    changeView,
    settings
  } = useCalendar();

  const monthData = useMemo(() => {
    const monthStart = startOfMonth(currentView.currentDate);
    const monthEnd = endOfMonth(currentView.currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: settings.firstDayOfWeek as 0 | 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: settings.firstDayOfWeek as 0 | 1 });

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map((date): DayEvents => {
      const dayEvents = events.filter(event => 
        isSameDay(event.start, date) || 
        (event.allDay && isSameDay(event.start, date))
      );

      return {
        date,
        events: dayEvents,
        isCurrentMonth: isSameMonth(date, currentView.currentDate),
        isToday: isToday(date),
        isSelected: currentView.selectedDate ? isSameDay(date, currentView.selectedDate) : false
      };
    });
  }, [currentView.currentDate, currentView.selectedDate, events, settings.firstDayOfWeek]);

  const handleDayClick = (dayData: DayEvents) => {
    goToDate(dayData.date);
    
    if (dayData.events.length === 1) {
      selectEvent(dayData.events[0]);
    } else if (dayData.events.length === 0) {
      // Create new event for this day
      const eventStart = new Date(dayData.date);
      eventStart.setHours(9, 0, 0, 0); // Default to 9 AM
      const eventEnd = new Date(dayData.date);
      eventEnd.setHours(10, 0, 0, 0); // Default to 10 AM

      startCreatingEvent({
        start: eventStart,
        end: eventEnd,
        timezone: settings.timezone
      } as any);
    }
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    selectEvent(event);
  };

  const renderWeekHeader = () => {
    const firstWeek = monthData.slice(0, 7);
    return (
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {firstWeek.map((dayData) => (
          <div
            key={dayData.date.toISOString()}
            className="p-2 text-center text-sm font-medium text-muted-foreground"
          >
            {format(dayData.date, 'EEE')}
          </div>
        ))}
      </div>
    );
  };

  const renderEvent = (event: CalendarEvent) => {
    const isAllDay = event.allDay;
    const eventColors = {
      meeting: 'bg-blue-500',
      appointment: 'bg-green-500',
      call: 'bg-yellow-500',
      task: 'bg-purple-500',
      reminder: 'bg-orange-500',
      block_time: 'bg-gray-500',
      out_of_office: 'bg-red-500'
    };

    return (
      <div
        key={event.id}
        onClick={(e) => handleEventClick(event, e)}
        className={cn(
          "text-xs p-1 mb-1 rounded cursor-pointer truncate text-white",
          event.color ? `bg-[${event.color}]` : eventColors[event.type] || 'bg-blue-500',
          "hover:opacity-80 transition-opacity"
        )}
        title={`${event.title}${event.location ? ` - ${event.location}` : ''}`}
      >
        {!isAllDay && (
          <span className="mr-1">
            {format(event.start, 'h:mm a')}
          </span>
        )}
        {event.title}
        {event.meetingRoom && (
          <Badge variant="secondary" className="ml-1 text-xs">
            {event.meetingRoom.name}
          </Badge>
        )}
      </div>
    );
  };

  const renderDay = (dayData: DayEvents) => {
    const maxVisibleEvents = 3;
    const visibleEvents = dayData.events.slice(0, maxVisibleEvents);
    const hiddenCount = dayData.events.length - maxVisibleEvents;

    return (
      <div
        key={dayData.date.toISOString()}
        onClick={() => handleDayClick(dayData)}
        className={cn(
          "min-h-[120px] p-2 border-r border-b cursor-pointer hover:bg-muted/50 transition-colors",
          !dayData.isCurrentMonth && "bg-muted/30 text-muted-foreground",
          dayData.isSelected && "bg-primary/10 ring-2 ring-primary/50",
          dayData.isToday && "bg-accent/50"
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            className={cn(
              "text-sm font-medium",
              dayData.isToday && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs"
            )}
          >
            {format(dayData.date, 'd')}
          </span>
          
          {dayData.events.length > 0 && (
            <Badge variant="outline" className="text-xs h-4 px-1">
              {dayData.events.length}
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          {visibleEvents.map(renderEvent)}
          
          {hiddenCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs p-0 h-5 w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                changeView('day');
                goToDate(dayData.date);
              }}
            >
              +{hiddenCount} more
            </Button>
          )}
        </div>
      </div>
    );
  };

  const weeks = [];
  for (let i = 0; i < monthData.length; i += 7) {
    weeks.push(monthData.slice(i, i + 7));
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {renderWeekHeader()}
      
      <div className="flex-1 overflow-auto">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map(renderDay)}
          </div>
        ))}
      </div>
    </div>
  );
};