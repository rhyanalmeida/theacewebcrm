'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useCalendarStore } from '../stores/calendar-store';
import { calendarAPI } from '../services/calendar-api';
import {
  CalendarEvent,
  BookingRequest,
  EventFilters,
  ViewType,
  MeetingRoom,
  ConflictCheckResult
} from '../types';
import { toast } from 'react-hot-toast';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

export const useCalendar = () => {
  const {
    // State
    events,
    selectedEvent,
    isLoadingEvents,
    currentView,
    isCreatingEvent,
    isEditingEvent,
    settings,
    meetingRooms,
    selectedRoom,
    teamAvailability,
    isLoadingAvailability,
    activeFilters,
    
    // Actions
    setEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    selectEvent,
    setCurrentView,
    changeViewType,
    navigateToDate,
    navigateNext,
    navigatePrevious,
    goToToday,
    startCreatingEvent,
    stopCreatingEvent,
    startEditingEvent,
    stopEditingEvent,
    setMeetingRooms,
    selectRoom,
    setTeamAvailability,
    setFilters,
    clearFilters,
    setLoadingEvents,
    setLoadingAvailability
  } = useCalendarStore();

  // Computed values
  const visibleEvents = useMemo(() => {
    let filtered = events;
    
    // Apply active filters
    if (activeFilters.eventType) {
      filtered = filtered.filter(event => event.type === activeFilters.eventType);
    }
    
    if (activeFilters.status) {
      filtered = filtered.filter(event => event.status === activeFilters.status);
    }
    
    if (activeFilters.attendeeId) {
      filtered = filtered.filter(event => 
        event.attendees.some(attendee => attendee.id === activeFilters.attendeeId)
      );
    }
    
    if (activeFilters.roomId) {
      filtered = filtered.filter(event => event.meetingRoom?.id === activeFilters.roomId);
    }
    
    if (activeFilters.search) {
      const searchTerm = activeFilters.search.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm) ||
        event.description?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filter by visible range
    return filtered.filter(event => 
      event.start >= currentView.visibleRange.start &&
      event.start <= currentView.visibleRange.end
    );
  }, [events, activeFilters, currentView.visibleRange]);

  const getDateRange = useCallback(() => {
    const { currentDate, type } = currentView;
    
    switch (type) {
      case ViewType.DAY:
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate)
        };
      case ViewType.WEEK:
        return {
          start: startOfWeek(currentDate, { weekStartsOn: settings.firstDayOfWeek as 0 | 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: settings.firstDayOfWeek as 0 | 1 })
        };
      case ViewType.MONTH:
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        };
      default:
        return currentView.visibleRange;
    }
  }, [currentView, settings.firstDayOfWeek]);

  // Event operations
  const fetchEvents = useCallback(async (customFilters?: EventFilters) => {
    try {
      setLoadingEvents(true);
      const dateRange = getDateRange();
      
      const filters: EventFilters = {
        startDate: dateRange.start,
        endDate: dateRange.end,
        ...activeFilters,
        ...customFilters
      };
      
      const response = await calendarAPI.getEvents(filters);
      
      if (response.success) {
        setEvents(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to fetch events');
    } finally {
      setLoadingEvents(false);
    }
  }, [getDateRange, activeFilters, setEvents, setLoadingEvents]);

  const createEvent = useCallback(async (eventData: BookingRequest) => {
    try {
      // Check for conflicts first
      const conflictCheck = await calendarAPI.checkConflicts(eventData);
      
      if (conflictCheck.success && conflictCheck.data.hasConflicts) {
        const shouldProceed = window.confirm(
          `This event conflicts with ${conflictCheck.data.conflicts.length} existing event(s). Do you want to proceed?`
        );
        if (!shouldProceed) {
          return { success: false, message: 'Event creation cancelled due to conflicts' };
        }
      }
      
      const response = await calendarAPI.createEvent(eventData);
      
      if (response.success) {
        addEvent(response.data);
        toast.success('Event created successfully');
        stopCreatingEvent();
      } else {
        toast.error(response.message || 'Failed to create event');
      }
      
      return response;
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
      return { success: false, message: 'Failed to create event' };
    }
  }, [addEvent, stopCreatingEvent]);

  const editEvent = useCallback(async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      const response = await calendarAPI.updateEvent(eventId, updates);
      
      if (response.success) {
        updateEvent(eventId, updates);
        toast.success('Event updated successfully');
        stopEditingEvent();
      } else {
        toast.error(response.message || 'Failed to update event');
      }
      
      return response;
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
      return { success: false, message: 'Failed to update event' };
    }
  }, [updateEvent, stopEditingEvent]);

  const removeEvent = useCallback(async (eventId: string) => {
    try {
      const shouldDelete = window.confirm('Are you sure you want to delete this event?');
      if (!shouldDelete) return;
      
      const response = await calendarAPI.deleteEvent(eventId);
      
      if (response.success) {
        deleteEvent(eventId);
        toast.success('Event deleted successfully');
        selectEvent(null);
      } else {
        toast.error(response.message || 'Failed to delete event');
      }
      
      return response;
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
      return { success: false, message: 'Failed to delete event' };
    }
  }, [deleteEvent, selectEvent]);

  const checkConflicts = useCallback(async (eventData: BookingRequest): Promise<ConflictCheckResult> => {
    try {
      const response = await calendarAPI.checkConflicts(eventData);
      return response.success ? response.data : { hasConflicts: false, conflicts: [] };
    } catch (error) {
      console.error('Error checking conflicts:', error);
      return { hasConflicts: false, conflicts: [] };
    }
  }, []);

  // Meeting rooms
  const fetchMeetingRooms = useCallback(async () => {
    try {
      const response = await calendarAPI.getMeetingRooms();
      
      if (response.success) {
        setMeetingRooms(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch meeting rooms');
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching meeting rooms:', error);
      toast.error('Failed to fetch meeting rooms');
      return { success: false, message: 'Failed to fetch meeting rooms' };
    }
  }, [setMeetingRooms]);

  // Availability
  const fetchTeamAvailability = useCallback(async (userIds: string[]) => {
    try {
      setLoadingAvailability(true);
      const dateRange = getDateRange();
      
      const response = await calendarAPI.getAvailability(userIds, dateRange.start, dateRange.end);
      
      if (response.success) {
        response.data.forEach(availability => {
          setTeamAvailability(availability.userId, availability);
        });
      } else {
        toast.error(response.message || 'Failed to fetch team availability');
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching team availability:', error);
      toast.error('Failed to fetch team availability');
    } finally {
      setLoadingAvailability(false);
    }
  }, [getDateRange, setTeamAvailability, setLoadingAvailability]);

  // Navigation helpers
  const goToDate = useCallback((date: Date) => {
    navigateToDate(date);
    // Auto-fetch events for the new date range
    fetchEvents();
  }, [navigateToDate, fetchEvents]);

  const changeView = useCallback((viewType: ViewType) => {
    changeViewType(viewType);
    // Auto-fetch events for the new view
    fetchEvents();
  }, [changeViewType, fetchEvents]);

  const nextPeriod = useCallback(() => {
    navigateNext();
    fetchEvents();
  }, [navigateNext, fetchEvents]);

  const previousPeriod = useCallback(() => {
    navigatePrevious();
    fetchEvents();
  }, [navigatePrevious, fetchEvents]);

  const today = useCallback(() => {
    goToToday();
    fetchEvents();
  }, [goToToday, fetchEvents]);

  // Auto-fetch events when view changes
  useEffect(() => {
    fetchEvents();
  }, [currentView.visibleRange.start, currentView.visibleRange.end]);

  // Auto-fetch meeting rooms on mount
  useEffect(() => {
    fetchMeetingRooms();
  }, [fetchMeetingRooms]);

  return {
    // State
    events: visibleEvents,
    allEvents: events,
    selectedEvent,
    isLoadingEvents,
    currentView,
    isCreatingEvent,
    isEditingEvent,
    settings,
    meetingRooms,
    selectedRoom,
    teamAvailability,
    isLoadingAvailability,
    activeFilters,
    
    // Event operations
    fetchEvents,
    createEvent,
    editEvent,
    removeEvent,
    checkConflicts,
    
    // Event selection
    selectEvent,
    startCreatingEvent,
    stopCreatingEvent,
    startEditingEvent,
    stopEditingEvent,
    
    // Navigation
    goToDate,
    changeView,
    nextPeriod,
    previousPeriod,
    today,
    
    // Meeting rooms
    fetchMeetingRooms,
    selectRoom,
    
    // Availability
    fetchTeamAvailability,
    
    // Filters
    setFilters,
    clearFilters,
    
    // Utilities
    getDateRange
  };
};