export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  recurring?: RecurrencePattern;
  location?: string;
  meetingRoom?: MeetingRoom;
  attendees: Attendee[];
  organizer: User;
  status: EventStatus;
  type: EventType;
  videoCall?: VideoCallInfo;
  reminders: Reminder[];
  timezone: string;
  color?: string;
  isPrivate: boolean;
  externalIds: ExternalCalendarIds;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendee {
  id: string;
  email: string;
  name: string;
  status: AttendeeStatus;
  isOptional?: boolean;
  role?: AttendeeRole;
}

export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
  avatar?: string;
}

export interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  location: string;
  amenities: string[];
  isAvailable: boolean;
  equipment: Equipment[];
}

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  isAvailable: boolean;
}

export interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  weekOfMonth?: number;
  monthOfYear?: number;
  endDate?: Date;
  occurrences?: number;
  exceptions?: Date[];
}

export interface Reminder {
  id: string;
  type: ReminderType;
  minutes: number;
  method: ReminderMethod;
}

export interface VideoCallInfo {
  platform: VideoCallPlatform;
  meetingId: string;
  joinUrl: string;
  password?: string;
  dialInNumbers?: string[];
}

export interface ExternalCalendarIds {
  googleCalendarId?: string;
  outlookId?: string;
  exchangeId?: string;
}

export interface Availability {
  userId: string;
  date: Date;
  timeSlots: TimeSlot[];
  timezone: string;
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string;   // HH:mm format
  isAvailable: boolean;
  eventId?: string;
}

export interface BookingRequest {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  attendees: string[]; // email addresses
  meetingRoomId?: string;
  videoCall?: {
    platform: VideoCallPlatform;
    generateMeeting: boolean;
  };
  reminders: {
    minutes: number;
    method: ReminderMethod;
  }[];
  timezone: string;
}

export interface CalendarView {
  type: ViewType;
  currentDate: Date;
  selectedDate?: Date;
  visibleRange: {
    start: Date;
    end: Date;
  };
}

export interface CalendarSettings {
  defaultView: ViewType;
  workingHours: {
    start: string;
    end: string;
  };
  workingDays: number[];
  timezone: string;
  reminderDefaults: ReminderMethod[];
  autoAcceptInvites: boolean;
  showWeekends: boolean;
  firstDayOfWeek: number;
}

// Enums
export enum EventStatus {
  CONFIRMED = 'confirmed',
  TENTATIVE = 'tentative',
  CANCELLED = 'cancelled',
  NEEDS_ACTION = 'needs_action'
}

export enum EventType {
  MEETING = 'meeting',
  APPOINTMENT = 'appointment',
  CALL = 'call',
  TASK = 'task',
  REMINDER = 'reminder',
  BLOCK_TIME = 'block_time',
  OUT_OF_OFFICE = 'out_of_office'
}

export enum AttendeeStatus {
  NEEDS_ACTION = 'needs_action',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative'
}

export enum AttendeeRole {
  REQUIRED = 'required',
  OPTIONAL = 'optional',
  RESOURCE = 'resource',
  CHAIR = 'chair'
}

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum ReminderType {
  POPUP = 'popup',
  EMAIL = 'email',
  SMS = 'sms'
}

export enum ReminderMethod {
  POPUP = 'popup',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push'
}

export enum VideoCallPlatform {
  ZOOM = 'zoom',
  GOOGLE_MEET = 'google_meet',
  MICROSOFT_TEAMS = 'microsoft_teams',
  WEBEX = 'webex'
}

export enum ViewType {
  MONTH = 'month',
  WEEK = 'week',
  DAY = 'day',
  AGENDA = 'agenda',
  YEAR = 'year'
}

export enum EquipmentType {
  PROJECTOR = 'projector',
  SCREEN = 'screen',
  WHITEBOARD = 'whiteboard',
  CONFERENCE_PHONE = 'conference_phone',
  WEBCAM = 'webcam',
  SPEAKERS = 'speakers'
}

// API Response Types
export interface CalendarApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EventsResponse extends CalendarApiResponse<CalendarEvent[]> {}
export interface EventResponse extends CalendarApiResponse<CalendarEvent> {}
export interface AvailabilityResponse extends CalendarApiResponse<Availability[]> {}
export interface MeetingRoomsResponse extends CalendarApiResponse<MeetingRoom[]> {}

// Filter and Search Types
export interface EventFilters {
  startDate?: Date;
  endDate?: Date;
  attendeeId?: string;
  roomId?: string;
  eventType?: EventType;
  status?: EventStatus;
  search?: string;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: CalendarEvent[];
  suggestions?: {
    alternativeSlots: TimeSlot[];
    availableRooms?: MeetingRoom[];
  };
}