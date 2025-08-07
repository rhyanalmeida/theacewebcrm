'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { CalendarEvent, ReminderMethod } from '../../types';
import { useCalendar } from '../../hooks/use-calendar';
import { format, differenceInMinutes, isPast, addMinutes } from 'date-fns';
import { 
  Bell, 
  Clock, 
  Mail, 
  Smartphone, 
  X, 
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  Video,
  MapPin
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../../lib/utils';

interface Reminder {
  id: string;
  eventId: string;
  event: CalendarEvent;
  method: ReminderMethod;
  triggerTime: Date;
  isTriggered: boolean;
  isSent: boolean;
  isDismissed: boolean;
}

interface ReminderNotificationProps {
  reminder: Reminder;
  onDismiss: (reminderId: string) => void;
  onSnooze: (reminderId: string, minutes: number) => void;
  onJoinMeeting: (event: CalendarEvent) => void;
}

const ReminderNotification: React.FC<ReminderNotificationProps> = ({
  reminder,
  onDismiss,
  onSnooze,
  onJoinMeeting
}) => {
  const { event } = reminder;
  const minutesToEvent = differenceInMinutes(event.start, new Date());
  const isHappening = minutesToEvent <= 0 && minutesToEvent > -60; // Currently happening
  const isLate = minutesToEvent < 0;

  const getUrgencyColor = () => {
    if (isLate) return 'border-red-500';
    if (minutesToEvent <= 5) return 'border-orange-500';
    if (minutesToEvent <= 15) return 'border-yellow-500';
    return 'border-blue-500';
  };

  const getUrgencyIcon = () => {
    if (isLate) return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (minutesToEvent <= 5) return <Clock className="w-5 h-5 text-orange-500" />;
    return <Bell className="w-5 h-5 text-blue-500" />;
  };

  const getTimeText = () => {
    if (isLate) return `Started ${Math.abs(minutesToEvent)} minutes ago`;
    if (minutesToEvent === 0) return 'Starting now';
    if (minutesToEvent <= 60) return `In ${minutesToEvent} minutes`;
    return `At ${format(event.start, 'h:mm a')}`;
  };

  return (
    <Card className={cn('border-l-4 shadow-lg', getUrgencyColor())}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getUrgencyIcon()}
            <CardTitle className="text-base">{event.title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onDismiss(reminder.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Time and urgency */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="w-4 h-4" />
            <span className={cn(
              "font-medium",
              isLate ? "text-red-600" : 
              minutesToEvent <= 5 ? "text-orange-600" : 
              "text-foreground"
            )}>
              {getTimeText()}
            </span>
          </div>
          
          {isHappening && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              HAPPENING NOW
            </Badge>
          )}
        </div>

        {/* Event details */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Calendar className="w-3 h-3" />
            <span>
              {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
              {event.allDay && ' (All day)'}
            </span>
          </div>

          {event.location && (
            <div className="flex items-center space-x-2">
              <MapPin className="w-3 h-3" />
              <span>{event.location}</span>
            </div>
          )}

          {event.attendees.length > 0 && (
            <div className="flex items-center space-x-2">
              <User className="w-3 h-3" />
              <span>
                {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {event.videoCall && (
            <div className="flex items-center space-x-2">
              <Video className="w-3 h-3" />
              <span>{event.videoCall.platform.replace('_', ' ').toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSnooze(reminder.id, 5)}
              className="text-xs"
            >
              Snooze 5m
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSnooze(reminder.id, 15)}
              className="text-xs"
            >
              Snooze 15m
            </Button>
          </div>
          
          <div className="flex space-x-2">
            {event.videoCall && (
              <Button
                size="sm"
                onClick={() => onJoinMeeting(event)}
                className="text-xs"
              >
                <Video className="w-3 h-3 mr-1" />
                Join
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => onDismiss(reminder.id)}
              className="text-xs"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Got it
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ReminderSystem: React.FC = () => {
  const { events } = useCalendar();
  const [activeReminders, setActiveReminders] = useState<Reminder[]>([]);
  const [reminderHistory, setReminderHistory] = useState<Reminder[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // Generate reminders from events
  useEffect(() => {
    const generateReminders = () => {
      const now = new Date();
      const reminders: Reminder[] = [];
      
      events.forEach(event => {
        if (isPast(event.end)) return; // Skip past events
        
        event.reminders.forEach(reminder => {
          const triggerTime = new Date(event.start.getTime() - (reminder.minutes * 60 * 1000));
          
          // Only include upcoming reminders
          if (triggerTime > addMinutes(now, -60)) { // Include reminders from last hour
            reminders.push({
              id: `${event.id}-${reminder.minutes}-${reminder.method}`,
              eventId: event.id,
              event,
              method: reminder.method as ReminderMethod,
              triggerTime,
              isTriggered: triggerTime <= now,
              isSent: false,
              isDismissed: false
            });
          }
        });
      });
      
      // Sort by trigger time
      reminders.sort((a, b) => a.triggerTime.getTime() - b.triggerTime.getTime());
      
      // Separate active and historical reminders
      const active = reminders.filter(r => !r.isDismissed && (r.isTriggered || differenceInMinutes(r.triggerTime, now) <= 60));
      const history = reminders.filter(r => r.isDismissed || differenceInMinutes(now, r.triggerTime) > 60);
      
      setActiveReminders(active);
      setReminderHistory(history);
    };
    
    generateReminders();
    
    // Update reminders every minute
    const interval = setInterval(generateReminders, 60000);
    return () => clearInterval(interval);
  }, [events]);

  // Send notifications for triggered reminders
  useEffect(() => {
    activeReminders.forEach(reminder => {
      if (reminder.isTriggered && !reminder.isSent) {
        sendNotification(reminder);
        // Mark as sent
        setActiveReminders(prev => 
          prev.map(r => 
            r.id === reminder.id ? { ...r, isSent: true } : r
          )
        );
      }
    });
  }, [activeReminders]);

  const sendNotification = (reminder: Reminder) => {
    const { event, method } = reminder;
    const minutesToEvent = differenceInMinutes(event.start, new Date());
    
    switch (method) {
      case ReminderMethod.POPUP:
        if (notificationPermission === 'granted') {
          const notification = new Notification(event.title, {
            body: `Starting ${minutesToEvent <= 0 ? 'now' : `in ${minutesToEvent} minutes`}`,
            icon: '/calendar-icon.png',
            tag: `reminder-${reminder.id}`,
            requireInteraction: true
          });
          
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
          
          // Auto-close after 10 seconds
          setTimeout(() => notification.close(), 10000);
        } else {
          // Fallback to toast
          toast(`${event.title} - Starting ${minutesToEvent <= 0 ? 'now' : `in ${minutesToEvent} minutes`}`, {
            duration: 5000,
            icon: '🔔'
          });
        }
        break;
        
      case ReminderMethod.EMAIL:
        // TODO: Send email reminder via API
        console.log('Email reminder:', reminder);
        break;
        
      case ReminderMethod.SMS:
        // TODO: Send SMS reminder via API
        console.log('SMS reminder:', reminder);
        break;
        
      case ReminderMethod.PUSH:
        // TODO: Send push notification
        console.log('Push reminder:', reminder);
        break;
    }
  };

  const dismissReminder = (reminderId: string) => {
    setActiveReminders(prev => 
      prev.map(r => 
        r.id === reminderId ? { ...r, isDismissed: true } : r
      ).filter(r => !r.isDismissed)
    );
  };

  const snoozeReminder = (reminderId: string, minutes: number) => {
    const newTriggerTime = addMinutes(new Date(), minutes);
    
    setActiveReminders(prev => 
      prev.map(r => 
        r.id === reminderId ? {
          ...r,
          triggerTime: newTriggerTime,
          isTriggered: false,
          isSent: false
        } : r
      )
    );
    
    toast.success(`Reminder snoozed for ${minutes} minutes`);
  };

  const joinMeeting = (event: CalendarEvent) => {
    if (event.videoCall?.joinUrl) {
      window.open(event.videoCall.joinUrl, '_blank');
      toast.success('Opening meeting...');
    }
  };

  const getMethodIcon = (method: ReminderMethod) => {
    switch (method) {
      case ReminderMethod.EMAIL:
        return <Mail className="w-3 h-3" />;
      case ReminderMethod.SMS:
        return <Smartphone className="w-3 h-3" />;
      case ReminderMethod.PUSH:
        return <Bell className="w-3 h-3" />;
      default:
        return <Bell className="w-3 h-3" />;
    }
  };

  if (activeReminders.length === 0) {
    return null; // Don't render anything if no active reminders
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md space-y-3">
      {activeReminders.map(reminder => (
        <ReminderNotification
          key={reminder.id}
          reminder={reminder}
          onDismiss={dismissReminder}
          onSnooze={snoozeReminder}
          onJoinMeeting={joinMeeting}
        />
      ))}
      
      {/* Permission request */}
      {notificationPermission === 'denied' && (
        <Card className="border-orange-500 border-l-4">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <div className="text-sm">
                <div className="font-medium">Notifications blocked</div>
                <div className="text-muted-foreground text-xs">
                  Enable notifications in your browser settings for meeting reminders
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};