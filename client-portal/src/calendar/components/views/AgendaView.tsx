'use client';

import React, { useMemo } from 'react';
import { useCalendar } from '../../hooks/use-calendar';
import { CalendarEvent, EventStatus } from '../../types';
import { format, isSameDay, isToday, isTomorrow, isYesterday, addDays } from 'date-fns';
import { cn } from '../../../lib/utils';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Video, 
  Clock, 
  CheckCircle,
  AlertCircle,
  XCircle,
  User
} from 'lucide-react';

interface AgendaDay {
  date: Date;
  events: CalendarEvent[];
  isToday: boolean;
  isPast: boolean;
}

export const AgendaView: React.FC = () => {
  const {
    events,
    selectEvent,
    startEditingEvent,
    currentView
  } = useCalendar();

  // Group events by date for the next 30 days
  const agendaData = useMemo((): AgendaDay[] => {
    const days: AgendaDay[] = [];
    const today = new Date();
    
    // Get events for the next 30 days
    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      const dayEvents = events
        .filter(event => isSameDay(event.start, date))
        .sort((a, b) => {
          // Sort all-day events first, then by start time
          if (a.allDay && !b.allDay) return -1;
          if (!a.allDay && b.allDay) return 1;
          return a.start.getTime() - b.start.getTime();
        });

      if (dayEvents.length > 0 || i < 7) { // Always show next 7 days
        days.push({
          date,
          events: dayEvents,
          isToday: isToday(date),
          isPast: date < today
        });
      }
    }

    return days;
  }, [events]);

  const getDateLabel = (date: Date): string => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE');
  };

  const getStatusIcon = (status: EventStatus) => {
    switch (status) {
      case EventStatus.CONFIRMED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case EventStatus.TENTATIVE:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case EventStatus.CANCELLED:
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getEventColor = (event: CalendarEvent): string => {
    if (event.color) return event.color;
    
    const typeColors = {
      meeting: 'bg-blue-500',
      appointment: 'bg-green-500',
      call: 'bg-yellow-500',
      task: 'bg-purple-500',
      reminder: 'bg-orange-500',
      block_time: 'bg-gray-500',
      out_of_office: 'bg-red-500'
    };
    
    return typeColors[event.type] || 'bg-blue-500';
  };

  const handleEventClick = (event: CalendarEvent) => {
    selectEvent(event);
  };

  const renderEvent = (event: CalendarEvent) => {
    const eventColor = getEventColor(event);
    const isPast = event.end < new Date();

    return (
      <div
        key={event.id}
        onClick={() => handleEventClick(event)}
        className={cn(
          "p-4 border rounded-lg cursor-pointer hover:shadow-md transition-all duration-200",
          "bg-background border-border",
          isPast && "opacity-60"
        )}
      >
        <div className="flex items-start space-x-3">
          {/* Event color indicator */}
          <div
            className={cn("w-1 h-16 rounded-full", eventColor.replace('bg-', 'bg-'))}
          />
          
          <div className="flex-1 min-w-0">
            {/* Event title and status */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold truncate">
                  {event.title}
                </h3>
                {getStatusIcon(event.status)}
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {event.type}
                </Badge>
              </div>
            </div>

            {/* Event time */}
            <div className="flex items-center space-x-2 mt-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {event.allDay ? (
                <span>All day</span>
              ) : (
                <span>
                  {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                  {event.timezone && event.timezone !== 'UTC' && (
                    <span className="ml-1">({event.timezone})</span>
                  )}
                </span>
              )}
            </div>

            {/* Event location */}
            {event.location && (
              <div className="flex items-center space-x-2 mt-1 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {/* Meeting room */}
            {event.meetingRoom && (
              <div className="flex items-center space-x-2 mt-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{event.meetingRoom.name}</span>
                <Badge variant="secondary" className="text-xs">
                  Capacity: {event.meetingRoom.capacity}
                </Badge>
              </div>
            )}

            {/* Attendees */}
            {event.attendees.length > 0 && (
              <div className="flex items-center space-x-2 mt-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center space-x-1">
                  {event.attendees.slice(0, 3).map(attendee => (
                    <Badge
                      key={attendee.id}
                      variant={attendee.status === 'accepted' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {attendee.name || attendee.email.split('@')[0]}
                    </Badge>
                  ))}
                  {event.attendees.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{event.attendees.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Video call */}
            {event.videoCall && (
              <div className="flex items-center space-x-2 mt-2">
                <Video className="w-4 h-4 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs">
                  {event.videoCall.platform.replace('_', ' ').toUpperCase()}
                </Badge>
                {event.videoCall.joinUrl && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(event.videoCall!.joinUrl, '_blank');
                    }}
                  >
                    Join Meeting
                  </Button>
                )}
              </div>
            )}

            {/* Organizer */}
            {event.organizer && (
              <div className="flex items-center space-x-2 mt-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>Organized by {event.organizer.name || event.organizer.email}</span>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="mt-2 text-sm text-muted-foreground">
                <p className="line-clamp-2">{event.description}</p>
              </div>
            )}

            {/* Quick actions */}
            <div className="flex items-center justify-end space-x-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  startEditingEvent(event);
                }}
                className="h-7 px-2 text-xs"
              >
                Edit
              </Button>
              {!isPast && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Quick reschedule functionality
                  }}
                >
                  Reschedule
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDay = (day: AgendaDay) => {
    return (
      <div key={day.date.toISOString()} className="mb-8">
        {/* Day header */}
        <div className={cn(
          "flex items-center space-x-3 mb-4 pb-2 border-b",
          day.isToday && "border-primary"
        )}>
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-full border-2",
            day.isToday ? "bg-primary text-primary-foreground border-primary" : "border-border"
          )}>
            <span className="text-lg font-bold">
              {format(day.date, 'd')}
            </span>
          </div>
          
          <div>
            <h2 className={cn(
              "text-xl font-semibold",
              day.isToday && "text-primary"
            )}>
              {getDateLabel(day.date)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {format(day.date, 'MMMM d, yyyy')}
            </p>
          </div>

          {day.events.length > 0 && (
            <Badge variant="outline">
              {day.events.length} {day.events.length === 1 ? 'event' : 'events'}
            </Badge>
          )}
        </div>

        {/* Events */}
        {day.events.length > 0 ? (
          <div className="space-y-3">
            {day.events.map(renderEvent)}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No events scheduled</p>
          </div>
        )}
      </div>
    );
  };

  if (agendaData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold mb-2">No upcoming events</h2>
        <p className="text-muted-foreground mb-4">
          You don't have any events in the next 30 days.
        </p>
        <Button onClick={() => startCreatingEvent()}>
          <Plus className="w-4 h-4 mr-2" />
          Create your first event
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        {agendaData.map(renderDay)}
      </div>
    </div>
  );
};