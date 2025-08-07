'use client';

import React, { useMemo, useRef } from 'react';
import { useCalendar } from '../../hooks/use-calendar';
import { CalendarEvent } from '../../types';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
  differenceInMinutes,
  addMinutes
} from 'date-fns';
import { cn } from '../../../lib/utils';
import { Badge } from '../../../components/ui/badge';

interface WeekDay {
  date: Date;
  events: CalendarEvent[];
  isToday: boolean;
}

interface PositionedEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
}

export const WeekView: React.FC = () => {
  const {
    currentView,
    events,
    selectEvent,
    startCreatingEvent,
    settings
  } = useCalendar();

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        hour,
        isWorkingHour: hour >= parseInt(settings.workingHours.start.split(':')[0]) &&
                      hour < parseInt(settings.workingHours.end.split(':')[0])
      });
    }
    return slots;
  }, [settings.workingHours]);

  const weekData = useMemo((): WeekDay[] => {
    const weekStart = startOfWeek(currentView.currentDate, { 
      weekStartsOn: settings.firstDayOfWeek as 0 | 1 
    });
    const weekEnd = endOfWeek(currentView.currentDate, { 
      weekStartsOn: settings.firstDayOfWeek as 0 | 1 
    });
    
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return days.map((date): WeekDay => {
      const dayEvents = events.filter(event => 
        !event.allDay && (
          isSameDay(event.start, date) ||
          (event.start <= date && event.end >= date)
        )
      );

      return {
        date,
        events: dayEvents,
        isToday: isToday(date)
      };
    });
  }, [currentView.currentDate, events, settings.firstDayOfWeek]);

  const allDayEvents = useMemo(() => {
    return events.filter(event => event.allDay);
  }, [events]);

  const getEventPosition = (event: CalendarEvent, columnIndex: number): PositionedEvent => {
    const dayStart = new Date(event.start);
    dayStart.setHours(0, 0, 0, 0);
    
    const minutesFromStart = differenceInMinutes(event.start, dayStart);
    const durationMinutes = differenceInMinutes(event.end, event.start);
    
    const hourHeight = 60; // 60px per hour
    const top = (minutesFromStart / 60) * hourHeight;
    const height = Math.max((durationMinutes / 60) * hourHeight, 20);
    
    // Calculate left position and width for overlapping events
    const dayEvents = weekData[columnIndex]?.events || [];
    const overlappingEvents = dayEvents.filter(e => 
      e.id !== event.id &&
      e.start < event.end &&
      e.end > event.start
    );
    
    const totalOverlapping = overlappingEvents.length + 1;
    const eventIndex = overlappingEvents
      .filter(e => e.start <= event.start)
      .length;
    
    const columnWidth = 100 / 7; // 7 days in a week
    const eventWidth = columnWidth / Math.max(totalOverlapping, 1);
    const left = (columnIndex * columnWidth) + (eventIndex * eventWidth);
    
    return {
      event,
      top,
      height,
      left,
      width: eventWidth,
      zIndex: 10 + eventIndex
    };
  };

  const positionedEvents = useMemo(() => {
    const positioned: PositionedEvent[] = [];
    
    weekData.forEach((day, columnIndex) => {
      day.events.forEach(event => {
        positioned.push(getEventPosition(event, columnIndex));
      });
    });
    
    return positioned;
  }, [weekData]);

  const handleTimeSlotClick = (date: Date, hour: number) => {
    const eventStart = new Date(date);
    eventStart.setHours(hour, 0, 0, 0);
    const eventEnd = addMinutes(eventStart, 60);
    
    startCreatingEvent({
      start: eventStart,
      end: eventEnd,
      timezone: settings.timezone
    } as any);
  };

  const handleEventClick = (event: CalendarEvent) => {
    selectEvent(event);
  };

  const renderAllDayEvents = () => {
    if (allDayEvents.length === 0) return null;

    return (
      <div className="border-b bg-muted/20">
        <div className="p-2 text-sm font-medium text-muted-foreground">
          All Day
        </div>
        <div className="pb-2 px-2">
          {allDayEvents.map(event => (
            <div
              key={event.id}
              onClick={() => handleEventClick(event)}
              className="bg-primary text-primary-foreground text-xs p-2 mb-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
            >
              {event.title}
              {event.location && (
                <span className="ml-2 text-primary-foreground/80">
                  @ {event.location}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWeekHeader = () => {
    return (
      <div className="flex border-b bg-background">
        <div className="w-16 p-2 border-r"></div>
        {weekData.map((day, index) => (
          <div
            key={day.date.toISOString()}
            className={cn(
              "flex-1 p-2 text-center border-r",
              day.isToday && "bg-accent/50"
            )}
          >
            <div className="text-sm text-muted-foreground">
              {format(day.date, 'EEE')}
            </div>
            <div
              className={cn(
                "text-lg font-semibold",
                day.isToday && "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto"
              )}
            >
              {format(day.date, 'd')}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTimeGrid = () => {
    return (
      <div className="flex-1 flex overflow-auto">
        {/* Time column */}
        <div className="w-16 border-r bg-muted/20">
          {timeSlots.map(slot => (
            <div
              key={slot.time}
              className={cn(
                "h-[60px] p-2 border-b text-xs text-muted-foreground flex items-start justify-center",
                slot.isWorkingHour && "bg-background"
              )}
            >
              {slot.hour > 0 && format(new Date().setHours(slot.hour, 0), 'h a')}
            </div>
          ))}
        </div>

        {/* Week grid */}
        <div className="flex-1 relative">
          {/* Grid lines */}
          <div className="grid grid-cols-7 h-full">
            {weekData.map((day, dayIndex) => (
              <div key={day.date.toISOString()} className="border-r">
                {timeSlots.map(slot => (
                  <div
                    key={`${day.date.toISOString()}-${slot.time}`}
                    onClick={() => handleTimeSlotClick(day.date, slot.hour)}
                    className={cn(
                      "h-[60px] border-b cursor-pointer hover:bg-muted/50 transition-colors",
                      slot.isWorkingHour && "bg-background",
                      day.isToday && "bg-accent/20"
                    )}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Events */}
          <div className="absolute inset-0 pointer-events-none">
            {positionedEvents.map(({ event, top, height, left, width, zIndex }) => (
              <div
                key={event.id}
                onClick={() => handleEventClick(event)}
                className="absolute pointer-events-auto cursor-pointer"
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left: `${left}%`,
                  width: `${width}%`,
                  zIndex
                }}
              >
                <div
                  className={cn(
                    "h-full p-1 rounded text-xs text-white overflow-hidden",
                    event.color ? `bg-[${event.color}]` : "bg-blue-500",
                    "hover:opacity-80 transition-opacity shadow-sm border border-white/20"
                  )}
                >
                  <div className="font-medium truncate">
                    {event.title}
                  </div>
                  <div className="text-xs opacity-90 truncate">
                    {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                  </div>
                  {event.location && (
                    <div className="text-xs opacity-80 truncate">
                      {event.location}
                    </div>
                  )}
                  {event.attendees.length > 0 && (
                    <div className="flex items-center mt-1">
                      <Badge variant="secondary" className="text-xs h-4 px-1">
                        {event.attendees.length}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Current time indicator */}
          <CurrentTimeIndicator />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {renderWeekHeader()}
      {renderAllDayEvents()}
      {renderTimeGrid()}
    </div>
  );
};

const CurrentTimeIndicator: React.FC = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Only show if today is in the current week view
  const isCurrentWeek = true; // TODO: Check if today is in current week
  
  if (!isCurrentWeek) return null;
  
  const top = (currentHour * 60) + currentMinute; // 60px per hour
  
  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${top}px` }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
        <div className="h-0.5 bg-red-500 flex-1"></div>
      </div>
    </div>
  );
};