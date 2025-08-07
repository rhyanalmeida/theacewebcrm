'use client';

import React, { useMemo } from 'react';
import { useCalendar } from '../../hooks/use-calendar';
import { CalendarEvent } from '../../types';
import {
  format,
  isToday,
  isSameDay,
  differenceInMinutes,
  addMinutes
} from 'date-fns';
import { cn } from '../../../lib/utils';
import { Badge } from '../../../components/ui/badge';

interface PositionedEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  width: number;
  left: number;
  zIndex: number;
}

export const DayView: React.FC = () => {
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
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          hour,
          minute,
          isWorkingHour: hour >= parseInt(settings.workingHours.start.split(':')[0]) &&
                        hour < parseInt(settings.workingHours.end.split(':')[0])
        });
      }
    }
    return slots;
  }, [settings.workingHours]);

  const dayEvents = useMemo(() => {
    return events.filter(event => 
      !event.allDay && isSameDay(event.start, currentView.currentDate)
    ).sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events, currentView.currentDate]);

  const allDayEvents = useMemo(() => {
    return events.filter(event => 
      event.allDay && isSameDay(event.start, currentView.currentDate)
    );
  }, [events, currentView.currentDate]);

  const positionedEvents = useMemo((): PositionedEvent[] => {
    const positioned: PositionedEvent[] = [];
    const eventColumns: CalendarEvent[][] = [];

    // Sort events by start time
    const sortedEvents = [...dayEvents].sort((a, b) => a.start.getTime() - b.start.getTime());

    sortedEvents.forEach(event => {
      const dayStart = new Date(currentView.currentDate);
      dayStart.setHours(0, 0, 0, 0);
      
      const minutesFromStart = differenceInMinutes(event.start, dayStart);
      const durationMinutes = differenceInMinutes(event.end, event.start);
      
      const hourHeight = 60; // 60px per hour
      const top = (minutesFromStart / 60) * hourHeight;
      const height = Math.max((durationMinutes / 60) * hourHeight, 30);

      // Find a column for this event
      let columnIndex = 0;
      let placed = false;

      while (!placed) {
        if (!eventColumns[columnIndex]) {
          eventColumns[columnIndex] = [];
        }

        const column = eventColumns[columnIndex];
        const hasConflict = column.some(existingEvent => 
          event.start < existingEvent.end && event.end > existingEvent.start
        );

        if (!hasConflict) {
          column.push(event);
          placed = true;
        } else {
          columnIndex++;
        }
      }

      // Calculate overlapping events for width adjustment
      const overlappingEvents = sortedEvents.filter(e => 
        e.id !== event.id &&
        e.start < event.end &&
        e.end > event.start
      );

      const totalColumns = eventColumns.filter(col => col.length > 0).length;
      const width = 95 / Math.max(totalColumns, 1); // Leave 5% margin
      const left = (columnIndex * width) + 2.5; // 2.5% left margin

      positioned.push({
        event,
        top,
        height,
        width,
        left,
        zIndex: 10 + columnIndex
      });
    });

    return positioned;
  }, [dayEvents, currentView.currentDate]);

  const handleTimeSlotClick = (hour: number, minute: number) => {
    const eventStart = new Date(currentView.currentDate);
    eventStart.setHours(hour, minute, 0, 0);
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
        <div className="p-3 text-sm font-medium text-muted-foreground">
          All Day
        </div>
        <div className="pb-3 px-3 space-y-1">
          {allDayEvents.map(event => (
            <div
              key={event.id}
              onClick={() => handleEventClick(event)}
              className={cn(
                "p-2 rounded cursor-pointer hover:opacity-80 transition-opacity text-white text-sm",
                event.color ? `bg-[${event.color}]` : "bg-blue-500"
              )}
            >
              <div className="font-medium">{event.title}</div>
              {event.location && (
                <div className="text-xs opacity-90 mt-1">
                  📍 {event.location}
                </div>
              )}
              {event.attendees.length > 0 && (
                <div className="flex items-center mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {event.attendees.length} attendees
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayHeader = () => {
    const isCurrentDay = isToday(currentView.currentDate);

    return (
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={cn(
                "text-2xl font-bold",
                isCurrentDay && "bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center"
              )}
            >
              {format(currentView.currentDate, 'd')}
            </div>
            <div>
              <div className="text-lg font-semibold">
                {format(currentView.currentDate, 'EEEE')}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(currentView.currentDate, 'MMMM yyyy')}
              </div>
            </div>
          </div>
          
          {dayEvents.length > 0 && (
            <Badge variant="outline">
              {dayEvents.length} events
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const renderTimeGrid = () => {
    return (
      <div className="flex-1 flex overflow-auto">
        {/* Time column */}
        <div className="w-20 border-r bg-muted/20">
          {timeSlots.filter((_, index) => index % 2 === 0).map(slot => (
            <div
              key={slot.time}
              className={cn(
                "h-[60px] p-2 border-b text-xs text-muted-foreground flex items-start justify-end",
                slot.isWorkingHour && "bg-background"
              )}
            >
              {slot.hour > 0 && format(new Date().setHours(slot.hour, slot.minute), 'h:mm a')}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="flex-1 relative">
          {/* Grid lines */}
          <div className="h-full">
            {timeSlots.filter((_, index) => index % 2 === 0).map(slot => (
              <div
                key={slot.time}
                onClick={() => handleTimeSlotClick(slot.hour, slot.minute)}
                className={cn(
                  "h-[60px] border-b cursor-pointer hover:bg-muted/50 transition-colors relative",
                  slot.isWorkingHour && "bg-background"
                )}
              >
                {/* Half-hour divider */}
                <div className="absolute top-[30px] left-0 right-0 border-t border-border/50"></div>
              </div>
            ))}
          </div>

          {/* Events */}
          <div className="absolute inset-0 p-1">
            {positionedEvents.map(({ event, top, height, width, left, zIndex }) => (
              <div
                key={event.id}
                onClick={() => handleEventClick(event)}
                className="absolute cursor-pointer"
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
                    "h-full p-2 rounded text-white overflow-hidden shadow-sm border border-white/20",
                    event.color ? `bg-[${event.color}]` : "bg-blue-500",
                    "hover:opacity-80 transition-opacity"
                  )}
                >
                  <div className="font-medium text-sm mb-1 leading-tight">
                    {event.title}
                  </div>
                  <div className="text-xs opacity-90 mb-1">
                    {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                  </div>
                  {event.location && (
                    <div className="text-xs opacity-80 truncate mb-1">
                      📍 {event.location}
                    </div>
                  )}
                  {event.attendees.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <div className="text-xs opacity-80">
                        👥 {event.attendees.length}
                      </div>
                      {event.meetingRoom && (
                        <Badge variant="secondary" className="text-xs h-4 px-1">
                          {event.meetingRoom.name}
                        </Badge>
                      )}
                    </div>
                  )}
                  {event.videoCall && (
                    <div className="flex items-center mt-1">
                      <Badge variant="secondary" className="text-xs h-4 px-1">
                        {event.videoCall.platform}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Current time indicator for today */}
          {isToday(currentView.currentDate) && <CurrentTimeIndicator />}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {renderDayHeader()}
      {renderAllDayEvents()}
      {renderTimeGrid()}
    </div>
  );
};

const CurrentTimeIndicator: React.FC = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const top = (currentHour * 60) + currentMinute; // 60px per hour
  
  return (
    <div
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: `${top}px` }}
    >
      <div className="flex items-center">
        <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 border-2 border-white shadow-sm"></div>
        <div className="h-0.5 bg-red-500 flex-1 shadow-sm"></div>
      </div>
      <div
        className="absolute -top-2 -left-12 bg-red-500 text-white text-xs px-2 py-0.5 rounded shadow-sm"
        style={{ fontSize: '10px' }}
      >
        {format(now, 'h:mm a')}
      </div>
    </div>
  );
};