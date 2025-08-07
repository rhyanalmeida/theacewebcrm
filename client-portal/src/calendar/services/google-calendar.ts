'use client';

import { CalendarEvent, BookingRequest, CalendarApiResponse } from '../types';

interface GoogleCalendarConfig {
  clientId: string;
  apiKey: string;
  discoveryDoc: string;
  scopes: string[];
}

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus?: string;
    displayName?: string;
    optional?: boolean;
  }>;
  location?: string;
  recurrence?: string[];
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
    };
  };
  status?: string;
  transparency?: string;
  visibility?: string;
}

class GoogleCalendarService {
  private config: GoogleCalendarConfig;
  private gapi: any;
  private isInitialized = false;
  private accessToken: string | null = null;

  constructor() {
    this.config = {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
      discoveryDoc: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ]
    };
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Load Google API client
      await this.loadGoogleAPI();
      
      // Initialize gapi
      await this.gapi.load('client:auth2', async () => {
        await this.gapi.client.init({
          apiKey: this.config.apiKey,
          clientId: this.config.clientId,
          discoveryDocs: [this.config.discoveryDoc],
          scope: this.config.scopes.join(' ')
        });
        
        this.isInitialized = true;
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Calendar API:', error);
      return false;
    }
  }

  private async loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).gapi) {
        this.gapi = (window as any).gapi;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        this.gapi = (window as any).gapi;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async signIn(): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn();
      
      if (user.isSignedIn()) {
        this.accessToken = user.getAuthResponse().access_token;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Google Calendar sign-in failed:', error);
      return false;
    }
  }

  async signOut(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      this.accessToken = null;
    } catch (error) {
      console.error('Google Calendar sign-out failed:', error);
    }
  }

  isSignedIn(): boolean {
    if (!this.isInitialized) return false;
    
    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      return authInstance.isSignedIn.get();
    } catch (error) {
      return false;
    }
  }

  async getCalendars(): Promise<CalendarApiResponse<any[]>> {
    if (!this.isSignedIn()) {
      return {
        success: false,
        message: 'Not signed in to Google Calendar',
        data: []
      };
    }

    try {
      const response = await this.gapi.client.calendar.calendarList.list();
      
      return {
        success: true,
        data: response.result.items || []
      };
    } catch (error) {
      console.error('Failed to fetch Google calendars:', error);
      return {
        success: false,
        message: 'Failed to fetch calendars',
        data: []
      };
    }
  }

  async getEvents(calendarId = 'primary', timeMin?: Date, timeMax?: Date): Promise<CalendarApiResponse<CalendarEvent[]>> {
    if (!this.isSignedIn()) {
      return {
        success: false,
        message: 'Not signed in to Google Calendar',
        data: []
      };
    }

    try {
      const params: any = {
        calendarId,
        singleEvents: true,
        orderBy: 'startTime'
      };

      if (timeMin) {
        params.timeMin = timeMin.toISOString();
      }

      if (timeMax) {
        params.timeMax = timeMax.toISOString();
      }

      const response = await this.gapi.client.calendar.events.list(params);
      const events = response.result.items || [];
      
      return {
        success: true,
        data: events.map(this.transformFromGoogleEvent.bind(this))
      };
    } catch (error) {
      console.error('Failed to fetch Google Calendar events:', error);
      return {
        success: false,
        message: 'Failed to fetch events',
        data: []
      };
    }
  }

  async createEvent(eventData: BookingRequest, calendarId = 'primary', generateMeetLink = false): Promise<CalendarApiResponse<CalendarEvent>> {
    if (!this.isSignedIn()) {
      return {
        success: false,
        message: 'Not signed in to Google Calendar',
        data: null as any
      };
    }

    try {
      const googleEvent: GoogleCalendarEvent = this.transformToGoogleEvent(eventData);
      
      // Add Google Meet link if requested
      if (generateMeetLink) {
        googleEvent.conferenceData = {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        };
      }

      const response = await this.gapi.client.calendar.events.insert({
        calendarId,
        conferenceDataVersion: generateMeetLink ? 1 : 0,
        resource: googleEvent
      });

      return {
        success: true,
        data: this.transformFromGoogleEvent(response.result)
      };
    } catch (error) {
      console.error('Failed to create Google Calendar event:', error);
      return {
        success: false,
        message: 'Failed to create event',
        data: null as any
      };
    }
  }

  async updateEvent(eventId: string, eventData: Partial<CalendarEvent>, calendarId = 'primary'): Promise<CalendarApiResponse<CalendarEvent>> {
    if (!this.isSignedIn()) {
      return {
        success: false,
        message: 'Not signed in to Google Calendar',
        data: null as any
      };
    }

    try {
      // Get current event first
      const currentEvent = await this.gapi.client.calendar.events.get({
        calendarId,
        eventId
      });

      // Merge updates
      const updatedEvent = {
        ...currentEvent.result,
        ...this.transformToGoogleEvent(eventData as BookingRequest)
      };

      const response = await this.gapi.client.calendar.events.update({
        calendarId,
        eventId,
        resource: updatedEvent
      });

      return {
        success: true,
        data: this.transformFromGoogleEvent(response.result)
      };
    } catch (error) {
      console.error('Failed to update Google Calendar event:', error);
      return {
        success: false,
        message: 'Failed to update event',
        data: null as any
      };
    }
  }

  async deleteEvent(eventId: string, calendarId = 'primary'): Promise<CalendarApiResponse<boolean>> {
    if (!this.isSignedIn()) {
      return {
        success: false,
        message: 'Not signed in to Google Calendar',
        data: false
      };
    }

    try {
      await this.gapi.client.calendar.events.delete({
        calendarId,
        eventId
      });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      console.error('Failed to delete Google Calendar event:', error);
      return {
        success: false,
        message: 'Failed to delete event',
        data: false
      };
    }
  }

  async syncEvents(localEvents: CalendarEvent[], calendarId = 'primary'): Promise<CalendarApiResponse<{ synced: number; errors: number }>> {
    if (!this.isSignedIn()) {
      return {
        success: false,
        message: 'Not signed in to Google Calendar',
        data: { synced: 0, errors: 0 }
      };
    }

    let synced = 0;
    let errors = 0;

    for (const event of localEvents) {
      try {
        if (event.externalIds?.googleCalendarId) {
          // Update existing event
          await this.updateEvent(event.externalIds.googleCalendarId, event, calendarId);
        } else {
          // Create new event
          const bookingRequest: BookingRequest = {
            title: event.title,
            description: event.description,
            start: event.start,
            end: event.end,
            attendees: event.attendees.map(a => a.email),
            timezone: event.timezone,
            reminders: event.reminders.map(r => ({ minutes: r.minutes, method: r.method }))
          };
          
          await this.createEvent(bookingRequest, calendarId);
        }
        synced++;
      } catch (error) {
        console.error('Failed to sync event:', event.title, error);
        errors++;
      }
    }

    return {
      success: true,
      data: { synced, errors }
    };
  }

  private transformFromGoogleEvent(googleEvent: any): CalendarEvent {
    const start = googleEvent.start?.dateTime ? 
      new Date(googleEvent.start.dateTime) : 
      new Date(googleEvent.start?.date + 'T00:00:00');
      
    const end = googleEvent.end?.dateTime ? 
      new Date(googleEvent.end.dateTime) : 
      new Date(googleEvent.end?.date + 'T23:59:59');

    return {
      id: googleEvent.id,
      title: googleEvent.summary || 'No Title',
      description: googleEvent.description,
      start,
      end,
      allDay: !googleEvent.start?.dateTime,
      location: googleEvent.location,
      attendees: (googleEvent.attendees || []).map((attendee: any) => ({
        id: attendee.email,
        email: attendee.email,
        name: attendee.displayName || attendee.email,
        status: this.mapGoogleAttendeeStatus(attendee.responseStatus),
        isOptional: attendee.optional
      })),
      organizer: {
        id: googleEvent.organizer?.email || '',
        email: googleEvent.organizer?.email || '',
        name: googleEvent.organizer?.displayName || '',
        timezone: googleEvent.start?.timeZone || 'UTC'
      },
      status: this.mapGoogleEventStatus(googleEvent.status),
      type: 'meeting',
      reminders: (googleEvent.reminders?.overrides || []).map((reminder: any) => ({
        id: `${reminder.method}-${reminder.minutes}`,
        type: reminder.method,
        minutes: reminder.minutes,
        method: reminder.method
      })),
      timezone: googleEvent.start?.timeZone || 'UTC',
      isPrivate: googleEvent.visibility === 'private',
      externalIds: {
        googleCalendarId: googleEvent.id
      },
      createdAt: new Date(googleEvent.created),
      updatedAt: new Date(googleEvent.updated),
      videoCall: googleEvent.hangoutLink || googleEvent.conferenceData ? {
        platform: 'google_meet' as any,
        meetingId: googleEvent.conferenceData?.conferenceId || '',
        joinUrl: googleEvent.hangoutLink || googleEvent.conferenceData?.entryPoints?.[0]?.uri || '',
        password: googleEvent.conferenceData?.conferenceId
      } : undefined,
      color: googleEvent.colorId
    } as CalendarEvent;
  }

  private transformToGoogleEvent(eventData: BookingRequest | Partial<CalendarEvent>): GoogleCalendarEvent {
    const isBookingRequest = 'attendees' in eventData && Array.isArray(eventData.attendees) && typeof eventData.attendees[0] === 'string';
    
    const googleEvent: GoogleCalendarEvent = {
      summary: eventData.title || '',
      description: eventData.description,
      start: {
        dateTime: eventData.start?.toISOString(),
        timeZone: eventData.timezone || 'UTC'
      },
      end: {
        dateTime: eventData.end?.toISOString(),
        timeZone: eventData.timezone || 'UTC'
      },
      location: 'location' in eventData ? eventData.location : undefined
    };

    // Handle attendees
    if (isBookingRequest) {
      const bookingData = eventData as BookingRequest;
      googleEvent.attendees = bookingData.attendees?.map(email => ({ email }));
    } else {
      const calendarEvent = eventData as Partial<CalendarEvent>;
      googleEvent.attendees = calendarEvent.attendees?.map(attendee => ({
        email: attendee.email,
        displayName: attendee.name,
        optional: attendee.isOptional
      }));
    }

    // Handle reminders
    if ('reminders' in eventData && eventData.reminders) {
      if (isBookingRequest) {
        const bookingData = eventData as BookingRequest;
        googleEvent.reminders = {
          useDefault: false,
          overrides: bookingData.reminders?.map(reminder => ({
            method: reminder.method === 'popup' ? 'popup' : 'email',
            minutes: reminder.minutes
          }))
        };
      } else {
        const calendarEvent = eventData as Partial<CalendarEvent>;
        googleEvent.reminders = {
          useDefault: false,
          overrides: calendarEvent.reminders?.map(reminder => ({
            method: reminder.method === 'popup' ? 'popup' : 'email',
            minutes: reminder.minutes
          }))
        };
      }
    }

    return googleEvent;
  }

  private mapGoogleAttendeeStatus(status?: string): any {
    switch (status) {
      case 'accepted': return 'accepted';
      case 'declined': return 'declined';
      case 'tentative': return 'tentative';
      default: return 'needs_action';
    }
  }

  private mapGoogleEventStatus(status?: string): any {
    switch (status) {
      case 'confirmed': return 'confirmed';
      case 'tentative': return 'tentative';
      case 'cancelled': return 'cancelled';
      default: return 'confirmed';
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();