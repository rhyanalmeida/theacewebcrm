'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { CalendarEvent, BookingRequest, EventType, VideoCallPlatform, ReminderMethod } from '../../types';
import { useCalendar } from '../../hooks/use-calendar';
import { format, addHours } from 'date-fns';
import { toast } from 'react-hot-toast';
import { 
  Clock, 
  MapPin, 
  Users, 
  Video, 
  Calendar,
  Bell,
  Plus,
  X,
  AlertTriangle
} from 'lucide-react';
import { AttendeeSelector } from './AttendeeSelector';
import { MeetingRoomSelector } from '../rooms/MeetingRoomSelector';
import { RecurrenceSelector } from './RecurrenceSelector';
import { ConflictChecker } from './ConflictChecker';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  start: z.string().min(1, 'Start time is required'),
  end: z.string().min(1, 'End time is required'),
  allDay: z.boolean().default(false),
  type: z.nativeEnum(EventType),
  location: z.string().optional(),
  attendees: z.array(z.string().email()).default([]),
  meetingRoomId: z.string().optional(),
  videoCall: z.object({
    platform: z.nativeEnum(VideoCallPlatform),
    generateMeeting: z.boolean().default(false)
  }).optional(),
  reminders: z.array(z.object({
    minutes: z.number(),
    method: z.nativeEnum(ReminderMethod)
  })).default([]),
  timezone: z.string().default('UTC'),
  isPrivate: z.boolean().default(false),
  color: z.string().optional()
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  mode: 'create' | 'edit';
  defaultStart?: Date;
  defaultEnd?: Date;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  event,
  mode,
  defaultStart,
  defaultEnd
}) => {
  const { createEvent, editEvent, removeEvent, settings, checkConflicts } = useCalendar();
  const [isLoading, setIsLoading] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      type: EventType.MEETING,
      attendees: [],
      reminders: [
        { minutes: 15, method: ReminderMethod.POPUP },
        { minutes: 60, method: ReminderMethod.EMAIL }
      ],
      timezone: settings.timezone,
      isPrivate: false,
      allDay: false
    }
  });

  // Initialize form with event data or defaults
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && event) {
        form.reset({
          title: event.title,
          description: event.description || '',
          start: format(event.start, "yyyy-MM-dd'T'HH:mm"),
          end: format(event.end, "yyyy-MM-dd'T'HH:mm"),
          allDay: event.allDay || false,
          type: event.type,
          location: event.location || '',
          attendees: event.attendees.map(a => a.email),
          meetingRoomId: event.meetingRoom?.id,
          videoCall: event.videoCall ? {
            platform: event.videoCall.platform,
            generateMeeting: false
          } : undefined,
          reminders: event.reminders.map(r => ({
            minutes: r.minutes,
            method: r.method as ReminderMethod
          })),
          timezone: event.timezone,
          isPrivate: event.isPrivate,
          color: event.color
        });
      } else {
        // Create mode
        const startTime = defaultStart || new Date();
        const endTime = defaultEnd || addHours(startTime, 1);
        
        form.reset({
          title: '',
          description: '',
          start: format(startTime, "yyyy-MM-dd'T'HH:mm"),
          end: format(endTime, "yyyy-MM-dd'T'HH:mm"),
          allDay: false,
          type: EventType.MEETING,
          location: '',
          attendees: [],
          reminders: [
            { minutes: 15, method: ReminderMethod.POPUP },
            { minutes: 60, method: ReminderMethod.EMAIL }
          ],
          timezone: settings.timezone,
          isPrivate: false
        });
      }
    }
  }, [isOpen, mode, event, defaultStart, defaultEnd, settings.timezone, form]);

  const onSubmit = async (data: EventFormData) => {
    try {
      setIsLoading(true);

      const bookingRequest: BookingRequest = {
        title: data.title,
        description: data.description,
        start: new Date(data.start),
        end: new Date(data.end),
        attendees: data.attendees,
        meetingRoomId: data.meetingRoomId,
        videoCall: data.videoCall,
        reminders: data.reminders,
        timezone: data.timezone
      };

      // Check for conflicts before saving
      const conflicts = await checkConflicts(bookingRequest);
      if (conflicts.hasConflicts && conflicts.conflicts.length > 0) {
        setShowConflicts(true);
        return;
      }

      if (mode === 'edit' && event) {
        await editEvent(event.id, {
          ...bookingRequest,
          type: data.type,
          location: data.location,
          allDay: data.allDay,
          isPrivate: data.isPrivate,
          color: data.color
        } as Partial<CalendarEvent>);
      } else {
        await createEvent(bookingRequest);
      }

      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this event?');
    if (confirmed) {
      try {
        setIsLoading(true);
        await removeEvent(event.id);
        onClose();
      } catch (error) {
        console.error('Error deleting event:', error);
        toast.error('Failed to delete event');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const addReminder = () => {
    const current = form.getValues('reminders') || [];
    form.setValue('reminders', [
      ...current,
      { minutes: 15, method: ReminderMethod.POPUP }
    ]);
  };

  const removeReminder = (index: number) => {
    const current = form.getValues('reminders') || [];
    form.setValue('reminders', current.filter((_, i) => i !== index));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Create Event' : 'Edit Event'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="attendees">Attendees</TabsTrigger>
                <TabsTrigger value="options">Options</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                {/* Basic Event Details */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      {...form.register('title')}
                      placeholder="Event title"
                      className={form.formState.errors.title ? 'border-red-500' : ''}
                    />
                    {form.formState.errors.title && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.title.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...form.register('description')}
                      placeholder="Event description"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select
                        onValueChange={(value) => form.setValue('type', value as EventType)}
                        defaultValue={form.watch('type')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(EventType).map(type => (
                            <SelectItem key={type} value={type}>
                              {type.replace('_', ' ').toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2 pt-6">
                      <Checkbox
                        id="allDay"
                        checked={form.watch('allDay')}
                        onCheckedChange={(checked) => form.setValue('allDay', !!checked)}
                      />
                      <Label htmlFor="allDay">All day event</Label>
                    </div>
                  </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start">Start *</Label>
                      <Input
                        id="start"
                        type={form.watch('allDay') ? 'date' : 'datetime-local'}
                        {...form.register('start')}
                        className={form.formState.errors.start ? 'border-red-500' : ''}
                      />
                      {form.formState.errors.start && (
                        <p className="text-red-500 text-sm mt-1">
                          {form.formState.errors.start.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="end">End *</Label>
                      <Input
                        id="end"
                        type={form.watch('allDay') ? 'date' : 'datetime-local'}
                        {...form.register('end')}
                        className={form.formState.errors.end ? 'border-red-500' : ''}
                      />
                      {form.formState.errors.end && (
                        <p className="text-red-500 text-sm mt-1">
                          {form.formState.errors.end.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <div className="flex space-x-2">
                      <MapPin className="w-4 h-4 mt-3 text-muted-foreground" />
                      <Input
                        id="location"
                        {...form.register('location')}
                        placeholder="Event location"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="attendees" className="space-y-4">
                <AttendeeSelector
                  value={form.watch('attendees')}
                  onChange={(attendees) => form.setValue('attendees', attendees)}
                />
              </TabsContent>

              <TabsContent value="options" className="space-y-4">
                {/* Meeting Room */}
                <div>
                  <Label>Meeting Room</Label>
                  <MeetingRoomSelector
                    value={form.watch('meetingRoomId')}
                    onChange={(roomId) => form.setValue('meetingRoomId', roomId)}
                    startTime={new Date(form.watch('start'))}
                    endTime={new Date(form.watch('end'))}
                  />
                </div>

                {/* Video Call */}
                <div className="space-y-2">
                  <Label>Video Call</Label>
                  <Select
                    onValueChange={(value) => {
                      if (value === 'none') {
                        form.setValue('videoCall', undefined);
                      } else {
                        form.setValue('videoCall', {
                          platform: value as VideoCallPlatform,
                          generateMeeting: true
                        });
                      }
                    }}
                    defaultValue={form.watch('videoCall')?.platform || 'none'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select video platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No video call</SelectItem>
                      {Object.values(VideoCallPlatform).map(platform => (
                        <SelectItem key={platform} value={platform}>
                          {platform.replace('_', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reminders */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Reminders</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addReminder}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {form.watch('reminders')?.map((reminder, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={reminder.minutes}
                          onChange={(e) => {
                            const reminders = form.getValues('reminders') || [];
                            reminders[index].minutes = parseInt(e.target.value);
                            form.setValue('reminders', reminders);
                          }}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">minutes</span>
                        <Select
                          value={reminder.method}
                          onValueChange={(value) => {
                            const reminders = form.getValues('reminders') || [];
                            reminders[index].method = value as ReminderMethod;
                            form.setValue('reminders', reminders);
                          }}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(ReminderMethod).map(method => (
                              <SelectItem key={method} value={method}>
                                {method}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeReminder(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                {/* Recurrence */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="recurrence"
                      checked={showRecurrence}
                      onCheckedChange={(checked) => setShowRecurrence(!!checked)}
                    />
                    <Label htmlFor="recurrence">Repeat event</Label>
                  </div>
                  
                  {showRecurrence && (
                    <RecurrenceSelector
                      onChange={(pattern) => {
                        // Handle recurrence pattern
                        console.log('Recurrence pattern:', pattern);
                      }}
                    />
                  )}
                </div>

                {/* Privacy */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="private"
                    checked={form.watch('isPrivate')}
                    onCheckedChange={(checked) => form.setValue('isPrivate', !!checked)}
                  />
                  <Label htmlFor="private">Private event</Label>
                </div>

                {/* Color */}
                <div>
                  <Label htmlFor="color">Event Color</Label>
                  <Input
                    id="color"
                    type="color"
                    {...form.register('color')}
                    className="w-20 h-10"
                  />
                </div>

                {/* Timezone */}
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    onValueChange={(value) => form.setValue('timezone', value)}
                    defaultValue={form.watch('timezone')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <div className="flex items-center justify-between w-full">
                <div className="flex space-x-2">
                  {mode === 'edit' && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isLoading}
                    >
                      Delete
                    </Button>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : (mode === 'create' ? 'Create' : 'Update')}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Conflict Warning Dialog */}
      <ConflictChecker
        isOpen={showConflicts}
        onClose={() => setShowConflicts(false)}
        onProceed={() => {
          setShowConflicts(false);
          form.handleSubmit(onSubmit)();
        }}
        bookingRequest={{
          title: form.getValues('title'),
          start: new Date(form.getValues('start')),
          end: new Date(form.getValues('end')),
          attendees: form.getValues('attendees'),
          timezone: form.getValues('timezone'),
          reminders: form.getValues('reminders')
        }}
      />
    </>
  );
};