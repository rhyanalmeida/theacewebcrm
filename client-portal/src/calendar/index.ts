// Calendar System Main Export File

// Core Types
export * from './types';

// Stores
export { useCalendarStore } from './stores/calendar-store';

// Services
export { calendarAPI } from './services/calendar-api';
export { googleCalendarService } from './services/google-calendar';
export { outlookIntegrationService } from './services/outlook-integration';

// Hooks
export { useCalendar } from './hooks/use-calendar';

// Main Calendar Component
export { CalendarView } from './components/views/CalendarView';

// View Components
export { MonthView } from './components/views/MonthView';
export { WeekView } from './components/views/WeekView';
export { DayView } from './components/views/DayView';
export { AgendaView } from './components/views/AgendaView';
export { CalendarHeader } from './components/views/CalendarHeader';

// Booking Components
export { EventModal } from './components/booking/EventModal';
export { AttendeeSelector } from './components/booking/AttendeeSelector';
export { RecurrenceSelector } from './components/booking/RecurrenceSelector';
export { ConflictChecker } from './components/booking/ConflictChecker';

// Room Components
export { MeetingRoomSelector } from './components/rooms/MeetingRoomSelector';

// Reminder Components
export { ReminderSystem } from './components/reminders/ReminderSystem';

// Availability Components
export { TeamAvailability } from './components/availability/TeamAvailability';