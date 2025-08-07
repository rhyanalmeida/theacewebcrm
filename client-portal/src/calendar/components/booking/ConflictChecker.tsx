'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';
import { useCalendar } from '../../hooks/use-calendar';
import { BookingRequest, CalendarEvent, ConflictCheckResult } from '../../types';
import { format, differenceInMinutes } from 'date-fns';
import { 
  AlertTriangle, 
  Clock, 
  Users, 
  MapPin, 
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ConflictCheckerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  bookingRequest: BookingRequest;
}

export const ConflictChecker: React.FC<ConflictCheckerProps> = ({
  isOpen,
  onClose,
  onProceed,
  bookingRequest
}) => {
  const { checkConflicts } = useCalendar();
  const [conflictResult, setConflictResult] = useState<ConflictCheckResult>({ hasConflicts: false, conflicts: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkForConflicts();
    }
  }, [isOpen, bookingRequest]);

  const checkForConflicts = async () => {
    setIsLoading(true);
    try {
      const result = await checkConflicts(bookingRequest);
      setConflictResult(result);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConflictSeverity = (conflict: CalendarEvent): 'high' | 'medium' | 'low' => {
    const requestStart = bookingRequest.start;
    const requestEnd = bookingRequest.end;
    const conflictStart = conflict.start;
    const conflictEnd = conflict.end;

    // Complete overlap
    if (conflictStart <= requestStart && conflictEnd >= requestEnd) {
      return 'high';
    }

    // Partial overlap with significant duration
    const overlapStart = new Date(Math.max(requestStart.getTime(), conflictStart.getTime()));
    const overlapEnd = new Date(Math.min(requestEnd.getTime(), conflictEnd.getTime()));
    const overlapMinutes = differenceInMinutes(overlapEnd, overlapStart);
    
    if (overlapMinutes > 30) {
      return 'high';
    } else if (overlapMinutes > 15) {
      return 'medium';
    }
    
    return 'low';
  };

  const getConflictIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const renderConflictCard = (conflict: CalendarEvent, index: number) => {
    const severity = getConflictSeverity(conflict);
    const overlapStart = new Date(Math.max(bookingRequest.start.getTime(), conflict.start.getTime()));
    const overlapEnd = new Date(Math.min(bookingRequest.end.getTime(), conflict.end.getTime()));
    const overlapMinutes = differenceInMinutes(overlapEnd, overlapStart);

    return (
      <Card key={conflict.id} className={cn(
        "border-l-4",
        severity === 'high' ? "border-l-red-500" :
        severity === 'medium' ? "border-l-orange-500" :
        "border-l-yellow-500"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            {getConflictIcon(severity)}
            
            <div className="flex-1 space-y-2">
              {/* Event title and type */}
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{conflict.title}</h3>
                <Badge variant="outline" className="text-xs">
                  {conflict.type}
                </Badge>
              </div>

              {/* Time overlap */}
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {format(conflict.start, 'h:mm a')} - {format(conflict.end, 'h:mm a')}
                </span>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs",
                    severity === 'high' ? "bg-red-100 text-red-800" :
                    severity === 'medium' ? "bg-orange-100 text-orange-800" :
                    "bg-yellow-100 text-yellow-800"
                  )}
                >
                  {overlapMinutes}min overlap
                </Badge>
              </div>

              {/* Location */}
              {conflict.location && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{conflict.location}</span>
                </div>
              )}

              {/* Meeting room conflict */}
              {conflict.meetingRoom && bookingRequest.meetingRoomId === conflict.meetingRoom.id && (
                <div className="flex items-center space-x-2 text-sm text-red-600">
                  <Calendar className="w-4 h-4" />
                  <span>Same meeting room: {conflict.meetingRoom.name}</span>
                </div>
              )}

              {/* Attendee conflicts */}
              {conflict.attendees.length > 0 && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>
                    {conflict.attendees.length} attendees
                    {conflict.attendees.some(a => bookingRequest.attendees.includes(a.email)) && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Shared attendees
                      </Badge>
                    )}
                  </span>
                </div>
              )}

              {/* Organizer */}
              {conflict.organizer && (
                <div className="text-sm text-muted-foreground">
                  Organized by {conflict.organizer.name || conflict.organizer.email}
                </div>
              )}

              {/* Conflict resolution suggestions */}
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-1">Suggestions:</div>
                <div className="flex flex-wrap gap-1">
                  {severity === 'low' && (
                    <Badge variant="outline" className="text-xs">
                      Minimal overlap - can proceed
                    </Badge>
                  )}
                  {conflict.meetingRoom && (
                    <Badge variant="outline" className="text-xs">
                      Find alternative room
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    Reschedule meeting
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Shorten duration
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const getSeverityStats = () => {
    const stats = { high: 0, medium: 0, low: 0 };
    conflictResult.conflicts.forEach(conflict => {
      stats[getConflictSeverity(conflict)]++;
    });
    return stats;
  };

  const stats = getSeverityStats();
  const hasHighSeverityConflicts = stats.high > 0;

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Checking for conflicts...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span>Schedule Conflicts Detected</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conflict summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Conflict Summary</h3>
                <Badge variant="destructive">
                  {conflictResult.conflicts.length} conflict{conflictResult.conflicts.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.high}</div>
                  <div className="text-muted-foreground">High</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.medium}</div>
                  <div className="text-muted-foreground">Medium</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.low}</div>
                  <div className="text-muted-foreground">Low</div>
                </div>
              </div>

              {hasHighSeverityConflicts && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  ⚠️ High-severity conflicts detected. Consider rescheduling or making changes.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event details */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-2 flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Your Event</span>
              </h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>{bookingRequest.title}</div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-3 h-3" />
                  <span>
                    {format(bookingRequest.start, 'MMM d, h:mm a')} - {format(bookingRequest.end, 'h:mm a')}
                  </span>
                </div>
                {bookingRequest.attendees.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Users className="w-3 h-3" />
                    <span>{bookingRequest.attendees.length} attendees</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Conflicts list */}
          <div className="space-y-3">
            <h3 className="font-medium">Conflicting Events</h3>
            {conflictResult.conflicts.map((conflict, index) => renderConflictCard(conflict, index))}
          </div>

          {/* Alternative suggestions */}
          {conflictResult.suggestions && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Suggestions</span>
                </h3>
                
                {conflictResult.suggestions.alternativeSlots && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Alternative time slots:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {conflictResult.suggestions.alternativeSlots.slice(0, 4).map((slot, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="justify-start text-xs"
                          onClick={() => {
                            // TODO: Update booking request with suggested slot
                          }}
                        >
                          {slot.start} - {slot.end}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {conflictResult.suggestions.availableRooms && (
                  <div className="space-y-2 mt-4">
                    <div className="text-sm font-medium">Available rooms:</div>
                    <div className="flex flex-wrap gap-2">
                      {conflictResult.suggestions.availableRooms.slice(0, 3).map((room) => (
                        <Badge key={room.id} variant="outline" className="text-xs">
                          {room.name} ({room.capacity} seats)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {hasHighSeverityConflicts 
                ? "⚠️ Proceeding with high-severity conflicts may cause scheduling issues"
                : "✓ You can proceed with minor conflicts"
              }
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={onProceed}
                variant={hasHighSeverityConflicts ? "destructive" : "default"}
              >
                {hasHighSeverityConflicts ? "Proceed Anyway" : "Create Event"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};