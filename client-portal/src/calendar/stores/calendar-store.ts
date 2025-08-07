'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  CalendarEvent,
  CalendarView,
  CalendarSettings,
  MeetingRoom,
  Availability,
  ViewType,
  EventFilters
} from '../types';

interface CalendarState {
  // Events
  events: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  isLoadingEvents: boolean;
  
  // View State
  currentView: CalendarView;
  isCreatingEvent: boolean;
  isEditingEvent: boolean;
  
  // Settings
  settings: CalendarSettings;
  
  // Meeting Rooms
  meetingRooms: MeetingRoom[];
  selectedRoom: MeetingRoom | null;
  
  // Availability
  teamAvailability: Map<string, Availability>;
  isLoadingAvailability: boolean;
  
  // Filters
  activeFilters: EventFilters;
  
  // UI State
  sidebarOpen: boolean;
  showWeekends: boolean;
}

interface CalendarActions {
  // Event Actions
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (eventId: string) => void;
  selectEvent: (event: CalendarEvent | null) => void;
  
  // View Actions
  setCurrentView: (view: Partial<CalendarView>) => void;
  changeViewType: (viewType: ViewType) => void;
  navigateToDate: (date: Date) => void;
  navigateNext: () => void;
  navigatePrevious: () => void;
  goToToday: () => void;
  
  // Event Creation/Editing
  startCreatingEvent: (initialData?: Partial<CalendarEvent>) => void;
  stopCreatingEvent: () => void;
  startEditingEvent: (event: CalendarEvent) => void;
  stopEditingEvent: () => void;
  
  // Settings
  updateSettings: (settings: Partial<CalendarSettings>) => void;
  
  // Meeting Rooms
  setMeetingRooms: (rooms: MeetingRoom[]) => void;
  selectRoom: (room: MeetingRoom | null) => void;
  
  // Availability
  setTeamAvailability: (userId: string, availability: Availability) => void;
  clearTeamAvailability: () => void;
  
  // Filters
  setFilters: (filters: Partial<EventFilters>) => void;
  clearFilters: () => void;
  
  // UI Actions
  toggleSidebar: () => void;
  toggleWeekends: () => void;
  
  // Loading States
  setLoadingEvents: (loading: boolean) => void;
  setLoadingAvailability: (loading: boolean) => void;
}

type CalendarStore = CalendarState & CalendarActions;

const getVisibleRange = (date: Date, viewType: ViewType): { start: Date; end: Date } => {
  const start = new Date(date);
  const end = new Date(date);
  
  switch (viewType) {
    case ViewType.DAY:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case ViewType.WEEK:
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case ViewType.MONTH:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case ViewType.YEAR:
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(end.getFullYear() + 1, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      // AGENDA view - show next 30 days
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 30);
      end.setHours(23, 59, 59, 999);
  }
  
  return { start, end };
};

const initialSettings: CalendarSettings = {
  defaultView: ViewType.WEEK,
  workingHours: {
    start: '09:00',
    end: '17:00'
  },
  workingDays: [1, 2, 3, 4, 5], // Monday to Friday
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  reminderDefaults: ['popup', 'email'] as any,
  autoAcceptInvites: false,
  showWeekends: true,
  firstDayOfWeek: 0 // Sunday
};

const today = new Date();
const initialView: CalendarView = {
  type: ViewType.WEEK,
  currentDate: today,
  selectedDate: today,
  visibleRange: getVisibleRange(today, ViewType.WEEK)
};

export const useCalendarStore = create<CalendarStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        events: [],
        selectedEvent: null,
        isLoadingEvents: false,
        currentView: initialView,
        isCreatingEvent: false,
        isEditingEvent: false,
        settings: initialSettings,
        meetingRooms: [],
        selectedRoom: null,
        teamAvailability: new Map(),
        isLoadingAvailability: false,
        activeFilters: {},
        sidebarOpen: false,
        showWeekends: true,

        // Event Actions
        setEvents: (events) => set({ events }),
        
        addEvent: (event) => set((state) => ({
          events: [...state.events, event]
        })),
        
        updateEvent: (eventId, updates) => set((state) => ({
          events: state.events.map((event) =>
            event.id === eventId ? { ...event, ...updates } : event
          )
        })),
        
        deleteEvent: (eventId) => set((state) => ({
          events: state.events.filter((event) => event.id !== eventId)
        })),
        
        selectEvent: (event) => set({ selectedEvent: event }),

        // View Actions
        setCurrentView: (view) => set((state) => ({
          currentView: { ...state.currentView, ...view }
        })),
        
        changeViewType: (viewType) => set((state) => {
          const visibleRange = getVisibleRange(state.currentView.currentDate, viewType);
          return {
            currentView: {
              ...state.currentView,
              type: viewType,
              visibleRange
            }
          };
        }),
        
        navigateToDate: (date) => set((state) => {
          const visibleRange = getVisibleRange(date, state.currentView.type);
          return {
            currentView: {
              ...state.currentView,
              currentDate: date,
              visibleRange
            }
          };
        }),
        
        navigateNext: () => set((state) => {
          const { currentDate, type } = state.currentView;
          const next = new Date(currentDate);
          
          switch (type) {
            case ViewType.DAY:
              next.setDate(next.getDate() + 1);
              break;
            case ViewType.WEEK:
              next.setDate(next.getDate() + 7);
              break;
            case ViewType.MONTH:
              next.setMonth(next.getMonth() + 1);
              break;
            case ViewType.YEAR:
              next.setFullYear(next.getFullYear() + 1);
              break;
          }
          
          const visibleRange = getVisibleRange(next, type);
          return {
            currentView: {
              ...state.currentView,
              currentDate: next,
              visibleRange
            }
          };
        }),
        
        navigatePrevious: () => set((state) => {
          const { currentDate, type } = state.currentView;
          const prev = new Date(currentDate);
          
          switch (type) {
            case ViewType.DAY:
              prev.setDate(prev.getDate() - 1);
              break;
            case ViewType.WEEK:
              prev.setDate(prev.getDate() - 7);
              break;
            case ViewType.MONTH:
              prev.setMonth(prev.getMonth() - 1);
              break;
            case ViewType.YEAR:
              prev.setFullYear(prev.getFullYear() - 1);
              break;
          }
          
          const visibleRange = getVisibleRange(prev, type);
          return {
            currentView: {
              ...state.currentView,
              currentDate: prev,
              visibleRange
            }
          };
        }),
        
        goToToday: () => set((state) => {
          const today = new Date();
          const visibleRange = getVisibleRange(today, state.currentView.type);
          return {
            currentView: {
              ...state.currentView,
              currentDate: today,
              selectedDate: today,
              visibleRange
            }
          };
        }),

        // Event Creation/Editing
        startCreatingEvent: (initialData) => set({
          isCreatingEvent: true,
          selectedEvent: initialData as CalendarEvent || null
        }),
        
        stopCreatingEvent: () => set({
          isCreatingEvent: false,
          selectedEvent: null
        }),
        
        startEditingEvent: (event) => set({
          isEditingEvent: true,
          selectedEvent: event
        }),
        
        stopEditingEvent: () => set({
          isEditingEvent: false,
          selectedEvent: null
        }),

        // Settings
        updateSettings: (settings) => set((state) => ({
          settings: { ...state.settings, ...settings }
        })),

        // Meeting Rooms
        setMeetingRooms: (rooms) => set({ meetingRooms: rooms }),
        selectRoom: (room) => set({ selectedRoom: room }),

        // Availability
        setTeamAvailability: (userId, availability) => set((state) => {
          const newMap = new Map(state.teamAvailability);
          newMap.set(userId, availability);
          return { teamAvailability: newMap };
        }),
        
        clearTeamAvailability: () => set({ teamAvailability: new Map() }),

        // Filters
        setFilters: (filters) => set((state) => ({
          activeFilters: { ...state.activeFilters, ...filters }
        })),
        
        clearFilters: () => set({ activeFilters: {} }),

        // UI Actions
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        toggleWeekends: () => set((state) => ({ showWeekends: !state.showWeekends })),

        // Loading States
        setLoadingEvents: (loading) => set({ isLoadingEvents: loading }),
        setLoadingAvailability: (loading) => set({ isLoadingAvailability: loading })
      }),
      {
        name: 'calendar-store',
        partialize: (state) => ({
          settings: state.settings,
          sidebarOpen: state.sidebarOpen,
          showWeekends: state.showWeekends
        })
      }
    ),
    {
      name: 'calendar-store'
    }
  )
);