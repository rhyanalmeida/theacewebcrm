'use client';

import { createClient } from '@supabase/supabase-js';
import {
  CalendarEvent,
  BookingRequest,
  Availability,
  MeetingRoom,
  EventFilters,
  ConflictCheckResult,
  CalendarApiResponse,
  EventsResponse,
  EventResponse,
  AvailabilityResponse,
  MeetingRoomsResponse,
  RecurrencePattern
} from '../types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

class CalendarAPI {
  private baseUrl = '/api/calendar';

  // Events API
  async getEvents(filters?: EventFilters): Promise<EventsResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          attendees:calendar_attendees(*),
          reminders:calendar_reminders(*),
          meeting_room:meeting_rooms(*)
        `)
        .gte('start', filters?.startDate?.toISOString())
        .lte('end', filters?.endDate?.toISOString())
        .order('start', { ascending: true });

      if (error) throw error;

      return {
        data: data?.map(this.transformEventFromDb) || [],
        success: true
      };
    } catch (error) {
      console.error('Error fetching events:', error);
      return {
        data: [],
        success: false,
        message: 'Failed to fetch events'
      };
    }
  }

  async getEvent(eventId: string): Promise<EventResponse> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          attendees:calendar_attendees(*),
          reminders:calendar_reminders(*),
          meeting_room:meeting_rooms(*)
        `)
        .eq('id', eventId)
        .single();

      if (error) throw error;

      return {
        data: this.transformEventFromDb(data),
        success: true
      };
    } catch (error) {
      console.error('Error fetching event:', error);
      return {
        data: null as any,
        success: false,
        message: 'Failed to fetch event'
      };
    }
  }

  async createEvent(eventData: BookingRequest): Promise<EventResponse> {
    try {
      const eventToCreate = {
        title: eventData.title,
        description: eventData.description,
        start: eventData.start.toISOString(),
        end: eventData.end.toISOString(),
        timezone: eventData.timezone,
        meeting_room_id: eventData.meetingRoomId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: eventData: createdEvent, error: eventError } = await supabase
        .from('calendar_events')
        .insert(eventToCreate)
        .select()
        .single();

      if (eventError) throw eventError;

      // Add attendees
      if (eventData.attendees.length > 0) {
        const attendeesToCreate = eventData.attendees.map(email => ({
          event_id: createdEvent.id,
          email,
          status: 'needs_action'
        }));

        const { error: attendeesError } = await supabase
          .from('calendar_attendees')
          .insert(attendeesToCreate);

        if (attendeesError) throw attendeesError;
      }

      // Add reminders
      if (eventData.reminders.length > 0) {
        const remindersToCreate = eventData.reminders.map(reminder => ({
          event_id: createdEvent.id,
          minutes: reminder.minutes,
          method: reminder.method
        }));

        const { error: remindersError } = await supabase
          .from('calendar_reminders')
          .insert(remindersToCreate);

        if (remindersError) throw remindersError;
      }

      return {
        data: await this.getEvent(createdEvent.id).then(r => r.data),
        success: true
      };
    } catch (error) {
      console.error('Error creating event:', error);
      return {
        data: null as any,
        success: false,
        message: 'Failed to create event'
      };
    }
  }

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<EventResponse> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.start) updateData.start = updates.start.toISOString();
      if (updates.end) updateData.end = updates.end.toISOString();
      if (updates.timezone) updateData.timezone = updates.timezone;

      const { error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', eventId);

      if (error) throw error;

      return this.getEvent(eventId);
    } catch (error) {
      console.error('Error updating event:', error);
      return {
        data: null as any,
        success: false,
        message: 'Failed to update event'
      };
    }
  }

  async deleteEvent(eventId: string): Promise<CalendarApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      return {
        data: true,
        success: true
      };
    } catch (error) {
      console.error('Error deleting event:', error);
      return {
        data: false,
        success: false,
        message: 'Failed to delete event'
      };
    }
  }

  // Availability API
  async getAvailability(userIds: string[], startDate: Date, endDate: Date): Promise<AvailabilityResponse> {
    try {
      const { data, error } = await supabase
        .from('user_availability')
        .select('*')
        .in('user_id', userIds)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) throw error;

      return {
        data: data?.map(this.transformAvailabilityFromDb) || [],
        success: true
      };
    } catch (error) {
      console.error('Error fetching availability:', error);
      return {
        data: [],
        success: false,
        message: 'Failed to fetch availability'
      };
    }
  }

  async checkConflicts(eventData: BookingRequest): Promise<CalendarApiResponse<ConflictCheckResult>> {
    try {
      // Check for conflicting events
      const { data: conflicts } = await supabase
        .from('calendar_events')
        .select('*')
        .or(`and(start.lte.${eventData.end.toISOString()},end.gte.${eventData.start.toISOString()})`)
        .neq('status', 'cancelled');

      // Check meeting room availability
      let roomConflicts: any[] = [];
      if (eventData.meetingRoomId) {
        const { data: roomEvents } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('meeting_room_id', eventData.meetingRoomId)
          .or(`and(start.lte.${eventData.end.toISOString()},end.gte.${eventData.start.toISOString()})`)
          .neq('status', 'cancelled');

        roomConflicts = roomEvents || [];
      }

      const hasConflicts = (conflicts && conflicts.length > 0) || roomConflicts.length > 0;
      
      return {
        data: {
          hasConflicts,
          conflicts: [...(conflicts || []), ...roomConflicts].map(this.transformEventFromDb)
        },
        success: true
      };
    } catch (error) {
      console.error('Error checking conflicts:', error);
      return {
        data: { hasConflicts: false, conflicts: [] },
        success: false,
        message: 'Failed to check conflicts'
      };
    }
  }

  // Meeting Rooms API
  async getMeetingRooms(): Promise<MeetingRoomsResponse> {
    try {
      const { data, error } = await supabase
        .from('meeting_rooms')
        .select('*')
        .order('name');

      if (error) throw error;

      return {
        data: data?.map(this.transformRoomFromDb) || [],
        success: true
      };
    } catch (error) {
      console.error('Error fetching meeting rooms:', error);
      return {
        data: [],
        success: false,
        message: 'Failed to fetch meeting rooms'
      };
    }
  }

  async getRoomAvailability(roomId: string, startDate: Date, endDate: Date): Promise<CalendarApiResponse<boolean[]>> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('start, end')
        .eq('meeting_room_id', roomId)
        .gte('start', startDate.toISOString())
        .lte('end', endDate.toISOString())
        .neq('status', 'cancelled');

      if (error) throw error;

      // Calculate availability slots (simplified)
      const availability: boolean[] = [];
      // Implementation would calculate hourly or slot-based availability
      
      return {
        data: availability,
        success: true
      };
    } catch (error) {
      console.error('Error fetching room availability:', error);
      return {
        data: [],
        success: false,
        message: 'Failed to fetch room availability'
      };
    }
  }

  // Recurring Events API
  async createRecurringEvent(eventData: BookingRequest, recurrence: RecurrencePattern): Promise<CalendarApiResponse<CalendarEvent[]>> {
    try {
      const recurringEvents: CalendarEvent[] = [];
      const occurrences = this.calculateRecurrenceOccurrences(eventData.start, recurrence);
      
      for (const occurrence of occurrences) {
        const eventStart = new Date(occurrence);
        const eventEnd = new Date(occurrence);
        eventEnd.setTime(eventEnd.getTime() + (eventData.end.getTime() - eventData.start.getTime()));
        
        const recurringEventData = {
          ...eventData,
          start: eventStart,
          end: eventEnd
        };
        
        const result = await this.createEvent(recurringEventData);
        if (result.success && result.data) {
          recurringEvents.push(result.data);
        }
      }
      
      return {
        data: recurringEvents,
        success: true
      };
    } catch (error) {
      console.error('Error creating recurring event:', error);
      return {
        data: [],
        success: false,
        message: 'Failed to create recurring event'
      };
    }
  }

  // Helper Methods
  private transformEventFromDb(dbEvent: any): CalendarEvent {
    return {
      id: dbEvent.id,
      title: dbEvent.title,
      description: dbEvent.description,
      start: new Date(dbEvent.start),
      end: new Date(dbEvent.end),
      allDay: dbEvent.all_day || false,
      location: dbEvent.location,
      attendees: dbEvent.attendees?.map((a: any) => ({
        id: a.id,
        email: a.email,
        name: a.name || a.email,
        status: a.status
      })) || [],
      organizer: {
        id: dbEvent.organizer_id,
        email: dbEvent.organizer_email,
        name: dbEvent.organizer_name,
        timezone: dbEvent.timezone
      },
      status: dbEvent.status || 'confirmed',
      type: dbEvent.type || 'meeting',
      reminders: dbEvent.reminders?.map((r: any) => ({
        id: r.id,
        type: r.type,
        minutes: r.minutes,
        method: r.method
      })) || [],
      timezone: dbEvent.timezone,
      isPrivate: dbEvent.is_private || false,
      externalIds: {
        googleCalendarId: dbEvent.google_calendar_id,
        outlookId: dbEvent.outlook_id
      },
      createdAt: new Date(dbEvent.created_at),
      updatedAt: new Date(dbEvent.updated_at),
      meetingRoom: dbEvent.meeting_room ? this.transformRoomFromDb(dbEvent.meeting_room) : undefined,
      recurring: dbEvent.recurrence_pattern ? JSON.parse(dbEvent.recurrence_pattern) : undefined,
      videoCall: dbEvent.video_call_info ? JSON.parse(dbEvent.video_call_info) : undefined,
      color: dbEvent.color
    } as CalendarEvent;
  }

  private transformRoomFromDb(dbRoom: any): MeetingRoom {
    return {
      id: dbRoom.id,
      name: dbRoom.name,
      capacity: dbRoom.capacity,
      location: dbRoom.location,
      amenities: dbRoom.amenities || [],
      isAvailable: dbRoom.is_available || true,
      equipment: dbRoom.equipment ? JSON.parse(dbRoom.equipment) : []
    };
  }

  private transformAvailabilityFromDb(dbAvailability: any): Availability {
    return {
      userId: dbAvailability.user_id,
      date: new Date(dbAvailability.date),
      timeSlots: JSON.parse(dbAvailability.time_slots || '[]'),
      timezone: dbAvailability.timezone
    };
  }

  private calculateRecurrenceOccurrences(startDate: Date, recurrence: RecurrencePattern): Date[] {
    const occurrences: Date[] = [];
    const current = new Date(startDate);
    let count = 0;
    const maxOccurrences = recurrence.occurrences || 100;
    const endDate = recurrence.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    
    while (current <= endDate && count < maxOccurrences) {
      if (!recurrence.exceptions?.some(exception => 
        exception.toDateString() === current.toDateString()
      )) {
        occurrences.push(new Date(current));
      }
      
      switch (recurrence.frequency) {
        case 'daily':
          current.setDate(current.getDate() + recurrence.interval);
          break;
        case 'weekly':
          current.setDate(current.getDate() + (7 * recurrence.interval));
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + recurrence.interval);
          break;
        case 'yearly':
          current.setFullYear(current.getFullYear() + recurrence.interval);
          break;
      }
      
      count++;
    }
    
    return occurrences;
  }
}

export const calendarAPI = new CalendarAPI();