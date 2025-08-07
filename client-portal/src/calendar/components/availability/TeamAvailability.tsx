'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Avatar } from '../../../components/ui/avatar';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { useCalendar } from '../../hooks/use-calendar';
import { Availability, TimeSlot, User } from '../../types';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addDays,
  isSameDay,
  parse,
  isWithinInterval
} from 'date-fns';
import { 
  Users, 
  Clock, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Filter,
  RefreshCw
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  timezone: string;
  workingHours: {
    start: string;
    end: string;
  };
  workingDays: number[];
}

interface AvailabilitySlot {
  time: string;
  teamMembers: {
    member: TeamMember;
    isAvailable: boolean;
    hasConflict: boolean;
    conflictReason?: string;
  }[];
  availableCount: number;
  totalCount: number;
  bestForMeeting: boolean;
}

export const TeamAvailability: React.FC = () => {
  const { fetchTeamAvailability, teamAvailability, isLoadingAvailability } = useCalendar();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeRange, setTimeRange] = useState({ start: '09:00', end: '17:00' });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [meetingDuration, setMeetingDuration] = useState(60); // minutes
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Mock team members - in real app, this would come from API
  const [teamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Product Manager',
      timezone: 'America/New_York',
      workingHours: { start: '09:00', end: '17:00' },
      workingDays: [1, 2, 3, 4, 5]
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'Developer',
      timezone: 'America/Los_Angeles',
      workingHours: { start: '10:00', end: '18:00' },
      workingDays: [1, 2, 3, 4, 5]
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      role: 'Designer',
      timezone: 'Europe/London',
      workingHours: { start: '08:00', end: '16:00' },
      workingDays: [1, 2, 3, 4, 5]
    },
    {
      id: '4',
      name: 'Sarah Wilson',
      email: 'sarah@example.com',
      role: 'Manager',
      timezone: 'America/Chicago',
      workingHours: { start: '08:30', end: '17:30' },
      workingDays: [1, 2, 3, 4, 5]
    }
  ]);

  // Initialize with all team members selected
  useEffect(() => {
    setSelectedMembers(teamMembers.map(m => m.id));
  }, [teamMembers]);

  // Fetch availability when members or date changes
  useEffect(() => {
    if (selectedMembers.length > 0) {
      const startDate = viewMode === 'week' ? startOfWeek(selectedDate) : selectedDate;
      const endDate = viewMode === 'week' ? endOfWeek(selectedDate) : selectedDate;
      fetchTeamAvailability(selectedMembers);
    }
  }, [selectedMembers, selectedDate, viewMode, fetchTeamAvailability]);

  // Generate time slots for the selected range
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const start = parse(timeRange.start, 'HH:mm', new Date());
    const end = parse(timeRange.end, 'HH:mm', new Date());
    
    let current = start;
    while (current < end) {
      slots.push(format(current, 'HH:mm'));
      current = new Date(current.getTime() + 30 * 60 * 1000); // 30-minute slots
    }
    
    return slots;
  }, [timeRange]);

  // Calculate availability for each time slot
  const availabilityData = useMemo((): AvailabilitySlot[] => {
    const selectedTeam = teamMembers.filter(m => selectedMembers.includes(m.id));
    
    return timeSlots.map(time => {
      const memberAvailability = selectedTeam.map(member => {
        // Check if member is working this day/time
        const dayOfWeek = selectedDate.getDay();
        const isWorkingDay = member.workingDays.includes(dayOfWeek);
        const timeInRange = isWithinInterval(
          parse(time, 'HH:mm', new Date()),
          {
            start: parse(member.workingHours.start, 'HH:mm', new Date()),
            end: parse(member.workingHours.end, 'HH:mm', new Date())
          }
        );
        
        // Get actual availability from calendar events
        const memberAvail = teamAvailability.get(member.id);
        const daySlots = memberAvail?.timeSlots || [];
        const timeSlot = daySlots.find(slot => slot.start === time);
        
        const hasConflict = timeSlot ? !timeSlot.isAvailable : !isWorkingDay || !timeInRange;
        const conflictReason = !isWorkingDay ? 'Non-working day' :
                              !timeInRange ? 'Outside working hours' :
                              timeSlot?.eventId ? 'Has meeting' :
                              'Unknown';

        return {
          member,
          isAvailable: !hasConflict,
          hasConflict,
          conflictReason: hasConflict ? conflictReason : undefined
        };
      });

      const availableCount = memberAvailability.filter(m => m.isAvailable).length;
      const totalCount = memberAvailability.length;
      
      return {
        time,
        teamMembers: memberAvailability,
        availableCount,
        totalCount,
        bestForMeeting: availableCount >= Math.ceil(totalCount * 0.8) // 80% or more available
      };
    });
  }, [timeSlots, selectedDate, selectedMembers, teamMembers, teamAvailability]);

  // Find best meeting slots
  const bestSlots = useMemo(() => {
    const consecutiveSlots = Math.ceil(meetingDuration / 30);
    const goodSlots: { start: string; end: string; availableCount: number }[] = [];
    
    for (let i = 0; i <= availabilityData.length - consecutiveSlots; i++) {
      const slots = availabilityData.slice(i, i + consecutiveSlots);
      const minAvailable = Math.min(...slots.map(s => s.availableCount));
      
      if (minAvailable >= Math.ceil(selectedMembers.length * 0.6)) { // 60% minimum
        goodSlots.push({
          start: slots[0].time,
          end: slots[slots.length - 1].time,
          availableCount: minAvailable
        });
      }
    }
    
    return goodSlots.sort((a, b) => b.availableCount - a.availableCount).slice(0, 5);
  }, [availabilityData, meetingDuration, selectedMembers.length]);

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const getAvailabilityColor = (availableCount: number, totalCount: number) => {
    const ratio = availableCount / totalCount;
    if (ratio >= 0.8) return 'bg-green-500';
    if (ratio >= 0.6) return 'bg-yellow-500';
    if (ratio >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const renderDayView = () => (
    <div className="space-y-4">
      {/* Date selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="w-40"
          />
          <Badge variant="outline">
            {format(selectedDate, 'EEEE, MMM d')}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{selectedMembers.length} members</span>
        </div>
      </div>

      {/* Best meeting times */}
      {bestSlots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Recommended Times</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {bestSlots.map((slot, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded"
                >
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span className="font-medium">
                      {slot.start} - {slot.end}
                    </span>
                    <Badge className="bg-green-100 text-green-800">
                      {slot.availableCount}/{selectedMembers.length} available
                    </Badge>
                  </div>
                  <Button size="sm" className="text-xs">
                    Schedule Meeting
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Availability grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Team Availability</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTeamAvailability(selectedMembers)}
              disabled={isLoadingAvailability}
            >
              <RefreshCw className={cn("w-4 h-4", isLoadingAvailability && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[100px_1fr] gap-2">
            {/* Time column */}
            <div className="space-y-2">
              <div className="h-12 flex items-center text-sm font-medium">Time</div>
              {timeSlots.map(time => (
                <div key={time} className="h-12 flex items-center text-sm text-muted-foreground">
                  {format(parse(time, 'HH:mm', new Date()), 'h:mm a')}
                </div>
              ))}
            </div>

            {/* Availability grid */}
            <div className="space-y-2">
              {/* Member headers */}
              <div className="grid grid-cols-4 gap-2">
                {teamMembers.filter(m => selectedMembers.includes(m.id)).map(member => (
                  <div key={member.id} className="h-12 p-2 border rounded bg-muted/20">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {member.name[0]}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate">{member.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{member.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Availability slots */}
              {availabilityData.map(slot => (
                <div key={slot.time} className="grid grid-cols-4 gap-2">
                  {slot.teamMembers.map(({ member, isAvailable, conflictReason }) => (
                    <div
                      key={`${slot.time}-${member.id}`}
                      className={cn(
                        "h-12 border rounded flex items-center justify-center",
                        isAvailable ? "bg-green-100 border-green-200" : "bg-red-100 border-red-200"
                      )}
                      title={conflictReason}
                    >
                      {isAvailable ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate);
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(selectedDate)
    });

    return (
      <div className="space-y-4">
        <div className="text-center">
          <Badge variant="outline" className="text-base px-4 py-1">
            Week of {format(weekStart, 'MMM d, yyyy')}
          </Badge>
        </div>
        
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map(day => (
            <Card key={day.toISOString()} className="min-h-[200px]">
              <CardHeader className="pb-2">
                <div className="text-center">
                  <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                  <div className="text-lg font-bold">{format(day, 'd')}</div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground">
                  <div className="text-xs">Team availability summary for {format(day, 'MMM d')}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Team Members</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teamMembers.map(member => (
              <div key={member.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(member.id)}
                  onChange={() => toggleMember(member.id)}
                  className="rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{member.name}</div>
                  <div className="text-xs text-muted-foreground">{member.role}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Time Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Start Time</Label>
              <Input
                type="time"
                value={timeRange.start}
                onChange={(e) => setTimeRange(prev => ({ ...prev, start: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">End Time</Label>
              <Input
                type="time"
                value={timeRange.end}
                onChange={(e) => setTimeRange(prev => ({ ...prev, end: e.target.value }))}
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Meeting Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Duration (minutes)</Label>
              <Select value={meetingDuration.toString()} onValueChange={(v) => setMeetingDuration(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'week')}>
        <TabsList>
          <TabsTrigger value="day">Day View</TabsTrigger>
          <TabsTrigger value="week">Week View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="day">
          {renderDayView()}
        </TabsContent>
        
        <TabsContent value="week">
          {renderWeekView()}
        </TabsContent>
      </Tabs>
    </div>
  );
};