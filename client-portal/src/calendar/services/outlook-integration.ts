'use client';

import { CalendarEvent, BookingRequest, CalendarApiResponse } from '../types';

interface OutlookConfig {
  clientId: string;
  authority: string;
  scopes: string[];
  redirectUri: string;
}

interface OutlookEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    status: {
      response: string;
      time?: string;
    };
    type: string;
  }>;
  organizer?: {
    emailAddress: {
      address: string;
      name?: string;
    };
  };
  recurrence?: any;
  isAllDay?: boolean;
  showAs?: string;
  sensitivity?: string;
  onlineMeetingUrl?: string;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
}

class OutlookIntegrationService {
  private config: OutlookConfig;
  private msalInstance: any;
  private accessToken: string | null = null;
  private isInitialized = false;

  constructor() {
    this.config = {
      clientId: process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID || '',
      authority: 'https://login.microsoftonline.com/common',
      scopes: [
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/User.Read'
      ],
      redirectUri: typeof window !== 'undefined' ? window.location.origin : ''
    };
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Load MSAL library
      await this.loadMSAL();
      
      const { PublicClientApplication } = await import('@azure/msal-browser');
      
      this.msalInstance = new PublicClientApplication({
        auth: {
          clientId: this.config.clientId,
          authority: this.config.authority,
          redirectUri: this.config.redirectUri
        },
        cache: {
          cacheLocation: 'localStorage',
          storeAuthStateInCookie: false
        }
      });

      await this.msalInstance.initialize();
      this.isInitialized = true;
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Outlook integration:', error);
      return false;
    }
  }

  private async loadMSAL(): Promise<void> {
    // In a real implementation, you would install @azure/msal-browser
    // For now, we'll simulate the loading
    return Promise.resolve();
  }

  async signIn(): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      const loginRequest = {
        scopes: this.config.scopes,
        prompt: 'select_account'
      };

      const response = await this.msalInstance.loginPopup(loginRequest);
      
      if (response.accessToken) {
        this.accessToken = response.accessToken;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Outlook sign-in failed:', error);
      return false;
    }
  }

  async signOut(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await this.msalInstance.logoutPopup();
      this.accessToken = null;
    } catch (error) {
      console.error('Outlook sign-out failed:', error);
    }
  }

  isSignedIn(): boolean {
    return !!this.accessToken;
  }

  async getCalendars(): Promise<CalendarApiResponse<any[]>> {
    if (!this.isSignedIn()) {
      return {
        success: false,
        message: 'Not signed in to Outlook',
        data: []
      };
    }

    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data.value || []
      };
    } catch (error) {
      console.error('Failed to fetch Outlook calendars:', error);
      return {
        success: false,
        message: 'Failed to fetch calendars',
        data: []
      };
    }
  }

  async getEvents(calendarId?: string, startTime?: Date, endTime?: Date): Promise<CalendarApiResponse<CalendarEvent[]>> {
    if (!this.isSignedIn()) {
      return {
        success: false,
        message: 'Not signed in to Outlook',
        data: []
      };
    }

    try {
      let url = 'https://graph.microsoft.com/v1.0/me/events';
      
      if (calendarId) {
        url = `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`;
      }

      const params = new URLSearchParams();
      if (startTime && endTime) {
        params.append('startDateTime', startTime.toISOString());
        params.append('endDateTime', endTime.toISOString());
      }
      params.append('$orderby', 'start/dateTime');

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const events = data.value || [];
      
      return {
        success: true,
        data: events.map(this.transformFromOutlookEvent.bind(this))
      };
    } catch (error) {
      console.error('Failed to fetch Outlook events:', error);
      return {
        success: false,
        message: 'Failed to fetch events',
        data: []
      };
    }
  }

  async createEvent(eventData: BookingRequest, calendarId?: string, generateTeamsMeeting = false): Promise<CalendarApiResponse<CalendarEvent>> {
    if (!this.isSignedIn()) {
      return {
        success: false,
        message: 'Not signed in to Outlook',
        data: null as any
      };
    }

    try {
      let url = 'https://graph.microsoft.com/v1.0/me/events';
      
      if (calendarId) {
        url = `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`;
      }

      const outlookEvent: OutlookEvent = this.transformToOutlookEvent(eventData);
      
      // Add Teams meeting if requested
      if (generateTeamsMeeting) {
        outlookEvent.isOnlineMeeting = true;
        outlookEvent.onlineMeetingProvider = 'teamsForBusiness';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(outlookEvent)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: this.transformFromOutlookEvent(data)
      };
    } catch (error) {
      console.error('Failed to create Outlook event:', error);
      return {
        success: false,
        message: 'Failed to create event',
        data: null as any
      };
    }
  }

  async updateEvent(eventId: string, eventData: Partial<CalendarEvent>): Promise<CalendarApiResponse<CalendarEvent>> {
    if (!this.isSignedIn()) {
      return {
        success: false,
        message: 'Not signed in to Outlook',
        data: null as any
      };
    }

    try {
      const url = `https://graph.microsoft.com/v1.0/me/events/${eventId}`;
      const outlookEvent = this.transformToOutlookEvent(eventData as BookingRequest);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(outlookEvent)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: this.transformFromOutlookEvent(data)
      };
    } catch (error) {
      console.error('Failed to update Outlook event:', error);
      return {
        success: false,
        message: 'Failed to update event',
        data: null as any
      };
    }
  }

  async deleteEvent(eventId: string): Promise<CalendarApiResponse<boolean>> {
    if (!this.isSignedIn()) {
      return {
        success: false,
        message: 'Not signed in to Outlook',
        data: false
      };
    }

    try {
      const url = `https://graph.microsoft.com/v1.0/me/events/${eventId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      console.error('Failed to delete Outlook event:', error);
      return {
        success: false,
        message: 'Failed to delete event',
        data: false
      };
    }
  }

  async syncEvents(localEvents: CalendarEvent[]): Promise<CalendarApiResponse<{ synced: number; errors: number }>> {
    if (!this.isSignedIn()) {
      return {
        success: false,
        message: 'Not signed in to Outlook',
        data: { synced: 0, errors: 0 }
      };
    }

    let synced = 0;
    let errors = 0;

    for (const event of localEvents) {
      try {
        if (event.externalIds?.outlookId) {
          // Update existing event
          await this.updateEvent(event.externalIds.outlookId, event);
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
          
          await this.createEvent(bookingRequest);
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

  private transformFromOutlookEvent(outlookEvent: any): CalendarEvent {
    return {
      id: outlookEvent.id,
      title: outlookEvent.subject || 'No Title',
      description: outlookEvent.body?.content,
      start: new Date(outlookEvent.start.dateTime),
      end: new Date(outlookEvent.end.dateTime),
      allDay: outlookEvent.isAllDay || false,
      location: outlookEvent.location?.displayName,
      attendees: (outlookEvent.attendees || []).map((attendee: any) => ({
        id: attendee.emailAddress.address,
        email: attendee.emailAddress.address,
        name: attendee.emailAddress.name || attendee.emailAddress.address,
        status: this.mapOutlookAttendeeStatus(attendee.status.response),
        isOptional: attendee.type === 'optional'
      })),
      organizer: {
        id: outlookEvent.organizer?.emailAddress.address || '',
        email: outlookEvent.organizer?.emailAddress.address || '',
        name: outlookEvent.organizer?.emailAddress.name || '',
        timezone: outlookEvent.start.timeZone || 'UTC'
      },
      status: 'confirmed',
      type: 'meeting',
      reminders: [], // Outlook doesn't expose reminders in the same way
      timezone: outlookEvent.start.timeZone || 'UTC',
      isPrivate: outlookEvent.sensitivity === 'private',
      externalIds: {
        outlookId: outlookEvent.id
      },
      createdAt: new Date(outlookEvent.createdDateTime),
      updatedAt: new Date(outlookEvent.lastModifiedDateTime),
      videoCall: outlookEvent.onlineMeetingUrl ? {
        platform: 'microsoft_teams' as any,
        meetingId: outlookEvent.id,
        joinUrl: outlookEvent.onlineMeetingUrl,
        password: undefined
      } : undefined
    } as CalendarEvent;
  }

  private transformToOutlookEvent(eventData: BookingRequest | Partial<CalendarEvent>): OutlookEvent {
    const outlookEvent: OutlookEvent = {
      subject: eventData.title || '',
      start: {
        dateTime: eventData.start?.toISOString() || '',
        timeZone: eventData.timezone || 'UTC'
      },
      end: {
        dateTime: eventData.end?.toISOString() || '',
        timeZone: eventData.timezone || 'UTC'
      }
    };

    if (eventData.description) {
      outlookEvent.body = {
        contentType: 'HTML',
        content: eventData.description
      };
    }

    // Handle attendees
    const isBookingRequest = 'attendees' in eventData && Array.isArray(eventData.attendees) && typeof eventData.attendees[0] === 'string';
    
    if (isBookingRequest) {
      const bookingData = eventData as BookingRequest;
      outlookEvent.attendees = bookingData.attendees?.map(email => ({
        emailAddress: { address: email },
        status: { response: 'none' },
        type: 'required'
      }));
    } else {
      const calendarEvent = eventData as Partial<CalendarEvent>;
      outlookEvent.attendees = calendarEvent.attendees?.map(attendee => ({
        emailAddress: { 
          address: attendee.email,
          name: attendee.name 
        },
        status: { response: this.mapToOutlookAttendeeStatus(attendee.status) },
        type: attendee.isOptional ? 'optional' : 'required'
      }));
    }

    return outlookEvent;
  }

  private mapOutlookAttendeeStatus(status: string): any {
    switch (status) {
      case 'accepted': return 'accepted';
      case 'declined': return 'declined';
      case 'tentativelyAccepted': return 'tentative';
      default: return 'needs_action';
    }
  }

  private mapToOutlookAttendeeStatus(status: any): string {
    switch (status) {
      case 'accepted': return 'accepted';
      case 'declined': return 'declined';
      case 'tentative': return 'tentativelyAccepted';
      default: return 'none';
    }
  }
}

export const outlookIntegrationService = new OutlookIntegrationService();