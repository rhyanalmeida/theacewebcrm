'use client';

import React from 'react';
import { useCalendar } from '../../hooks/use-calendar';
import { ViewType } from '../../types';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { AgendaView } from './AgendaView';
import { CalendarHeader } from './CalendarHeader';
import { EventModal } from '../booking/EventModal';
import { cn } from '../../../lib/utils';

interface CalendarViewProps {
  className?: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ className }) => {
  const {
    currentView,
    isCreatingEvent,
    isEditingEvent,
    selectedEvent,
    stopCreatingEvent,
    stopEditingEvent
  } = useCalendar();

  const renderCurrentView = () => {
    switch (currentView.type) {
      case ViewType.MONTH:
        return <MonthView />;
      case ViewType.WEEK:
        return <WeekView />;
      case ViewType.DAY:
        return <DayView />;
      case ViewType.AGENDA:
        return <AgendaView />;
      default:
        return <WeekView />;
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      <CalendarHeader />
      
      <div className="flex-1 overflow-hidden">
        {renderCurrentView()}
      </div>

      {/* Event Creation/Edit Modal */}
      {(isCreatingEvent || isEditingEvent) && (
        <EventModal
          isOpen={isCreatingEvent || isEditingEvent}
          onClose={isCreatingEvent ? stopCreatingEvent : stopEditingEvent}
          event={selectedEvent}
          mode={isCreatingEvent ? 'create' : 'edit'}
        />
      )}
    </div>
  );
};