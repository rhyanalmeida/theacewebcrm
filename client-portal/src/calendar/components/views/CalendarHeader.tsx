'use client';

import React from 'react';
import { Button } from '../../../components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Grid3X3, 
  List, 
  MoreHorizontal,
  Plus,
  Settings,
  Filter
} from 'lucide-react';
import { useCalendar } from '../../hooks/use-calendar';
import { ViewType } from '../../types';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../../../components/ui/dropdown-menu';
import { Badge } from '../../../components/ui/badge';
import { cn } from '../../../lib/utils';

export const CalendarHeader: React.FC = () => {
  const {
    currentView,
    changeView,
    previousPeriod,
    nextPeriod,
    today,
    startCreatingEvent,
    activeFilters,
    clearFilters,
    events
  } = useCalendar();

  const getViewTitle = () => {
    const { currentDate, type } = currentView;
    
    switch (type) {
      case ViewType.DAY:
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case ViewType.WEEK:
        return `Week of ${format(currentDate, 'MMM d, yyyy')}`;
      case ViewType.MONTH:
        return format(currentDate, 'MMMM yyyy');
      case ViewType.AGENDA:
        return 'Agenda';
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  const getViewIcon = (viewType: ViewType) => {
    switch (viewType) {
      case ViewType.DAY:
        return <Calendar className="w-4 h-4" />;
      case ViewType.WEEK:
        return <Grid3X3 className="w-4 h-4" />;
      case ViewType.MONTH:
        return <Calendar className="w-4 h-4" />;
      case ViewType.AGENDA:
        return <List className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  const eventCount = events.length;

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left Section - Navigation */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={previousPeriod}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={today}
            className="h-8 px-3"
          >
            Today
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={nextPeriod}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-semibold">{getViewTitle()}</h1>
          {eventCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {eventCount} events
            </Badge>
          )}
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center space-x-2">
        {/* Filter Indicator */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2"
          >
            <Filter className="w-3 h-3 mr-1" />
            <Badge variant="secondary" className="text-xs ml-1">
              {Object.keys(activeFilters).length}
            </Badge>
          </Button>
        )}

        {/* View Switcher */}
        <div className="flex border rounded-md">
          {Object.values(ViewType).map((viewType) => (
            <Button
              key={viewType}
              variant={currentView.type === viewType ? "default" : "ghost"}
              size="sm"
              onClick={() => changeView(viewType)}
              className={cn(
                "h-8 px-2 rounded-none first:rounded-l-md last:rounded-r-md border-0",
                currentView.type === viewType && "bg-primary text-primary-foreground"
              )}
              title={viewType.charAt(0).toUpperCase() + viewType.slice(1)}
            >
              {getViewIcon(viewType)}
              <span className="ml-1 hidden sm:inline">
                {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
              </span>
            </Button>
          ))}
        </div>

        {/* Create Event Button */}
        <Button
          onClick={() => startCreatingEvent()}
          size="sm"
          className="h-8"
        >
          <Plus className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">New Event</span>
        </Button>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {/* TODO: Open settings */}}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {/* TODO: Export calendar */}}>
              Export Calendar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {/* TODO: Import calendar */}}>
              Import Calendar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {/* TODO: Sync calendars */}}>
              Sync External Calendars
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};