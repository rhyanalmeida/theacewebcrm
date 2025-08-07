'use client';

import React, { useState, useEffect } from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { useCalendar } from '../../hooks/use-calendar';
import { MeetingRoom } from '../../types';
import { 
  MapPin, 
  Users, 
  Monitor, 
  Wifi, 
  Coffee, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../../lib/utils';

interface MeetingRoomSelectorProps {
  value?: string;
  onChange: (roomId?: string) => void;
  startTime: Date;
  endTime: Date;
  requiredCapacity?: number;
}

export const MeetingRoomSelector: React.FC<MeetingRoomSelectorProps> = ({
  value,
  onChange,
  startTime,
  endTime,
  requiredCapacity = 1
}) => {
  const { meetingRooms } = useCalendar();
  const [roomAvailability, setRoomAvailability] = useState<Map<string, boolean>>(new Map());
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (value) {
      const room = meetingRooms.find(r => r.id === value);
      setSelectedRoom(room || null);
    } else {
      setSelectedRoom(null);
    }
  }, [value, meetingRooms]);

  // Check room availability (mock implementation)
  useEffect(() => {
    const checkAvailability = async () => {
      const availability = new Map<string, boolean>();
      
      // Mock availability check
      meetingRooms.forEach(room => {
        // Simulate some rooms being unavailable
        const isAvailable = Math.random() > 0.3;
        availability.set(room.id, isAvailable);
      });
      
      setRoomAvailability(availability);
    };

    if (meetingRooms.length > 0) {
      checkAvailability();
    }
  }, [meetingRooms, startTime, endTime]);

  const getAmenityIcon = (amenity: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'projector': <Monitor className="w-4 h-4" />,
      'wifi': <Wifi className="w-4 h-4" />,
      'whiteboard': <Monitor className="w-4 h-4" />,
      'coffee': <Coffee className="w-4 h-4" />,
      'conference_phone': <Monitor className="w-4 h-4" />,
      'video_conference': <Monitor className="w-4 h-4" />
    };
    return iconMap[amenity.toLowerCase()] || <Monitor className="w-4 h-4" />;
  };

  const getAvailabilityStatus = (room: MeetingRoom) => {
    const isAvailable = roomAvailability.get(room.id);
    const hasCapacity = room.capacity >= requiredCapacity;
    
    if (!isAvailable) {
      return { status: 'unavailable', icon: <AlertCircle className="w-4 h-4 text-red-500" /> };
    }
    if (!hasCapacity) {
      return { status: 'insufficient', icon: <AlertCircle className="w-4 h-4 text-orange-500" /> };
    }
    return { status: 'available', icon: <CheckCircle className="w-4 h-4 text-green-500" /> };
  };

  const filteredRooms = meetingRooms.filter(room => room.capacity >= requiredCapacity);
  const availableRooms = filteredRooms.filter(room => roomAvailability.get(room.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Meeting Room</Label>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>
            {format(startTime, 'MMM d, h:mm a')} - {format(endTime, 'h:mm a')}
          </span>
        </div>
      </div>

      {/* Room Selection */}
      <Select value={value || 'none'} onValueChange={(val) => onChange(val === 'none' ? undefined : val)}>
        <SelectTrigger>
          <SelectValue placeholder="Select a meeting room" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No room needed</SelectItem>
          {filteredRooms.map(room => {
            const { status, icon } = getAvailabilityStatus(room);
            return (
              <SelectItem 
                key={room.id} 
                value={room.id}
                disabled={status === 'unavailable'}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    {icon}
                    <span>{room.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {room.capacity} seats
                    </Badge>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Room Details */}
      {selectedRoom && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>{selectedRoom.name}</span>
              </CardTitle>
              {getAvailabilityStatus(selectedRoom).icon}
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{selectedRoom.location}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Capacity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Capacity</span>
              </div>
              <Badge variant={selectedRoom.capacity >= requiredCapacity ? "default" : "destructive"}>
                {selectedRoom.capacity} people
              </Badge>
            </div>

            {/* Amenities */}
            {selectedRoom.amenities.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedRoom.amenities.map(amenity => (
                    <Badge key={amenity} variant="outline" className="text-xs flex items-center space-x-1">
                      {getAmenityIcon(amenity)}
                      <span>{amenity.replace('_', ' ').toLowerCase()}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment */}
            {selectedRoom.equipment.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Equipment</Label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedRoom.equipment.map(equipment => (
                    <div
                      key={equipment.id}
                      className={cn(
                        "flex items-center space-x-2 p-2 rounded border",
                        equipment.isAvailable ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                      )}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        equipment.isAvailable ? "bg-green-500" : "bg-red-500"
                      )} />
                      <span className="text-xs">{equipment.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Availability Status */}
            <div className="p-3 rounded border">
              {roomAvailability.get(selectedRoom.id) ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Available for selected time</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Not available for selected time</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  // TODO: View room schedule
                }}
              >
                View Schedule
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  // TODO: View room details/photos
                }}
              >
                Room Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Room Recommendations */}
      {!selectedRoom && availableRooms.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Recommended Rooms</Label>
          <div className="grid grid-cols-1 gap-2">
            {availableRooms.slice(0, 3).map(room => {
              const { icon } = getAvailabilityStatus(room);
              return (
                <div
                  key={room.id}
                  className="p-3 border rounded cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onChange(room.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {icon}
                      <div>
                        <div className="font-medium text-sm">{room.name}</div>
                        <div className="text-xs text-muted-foreground">{room.location}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {room.capacity} seats
                      </Badge>
                    </div>
                  </div>
                  {room.amenities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {room.amenities.slice(0, 3).map(amenity => (
                        <Badge key={amenity} variant="secondary" className="text-xs">
                          {amenity.replace('_', ' ')}
                        </Badge>
                      ))}
                      {room.amenities.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{room.amenities.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Available Rooms */}
      {availableRooms.length === 0 && filteredRooms.length > 0 && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <div>
              <div className="font-medium text-sm text-orange-800">No rooms available</div>
              <div className="text-xs text-orange-600">
                All suitable rooms are booked for this time. Consider changing the meeting time or using a virtual meeting.
              </div>
            </div>
          </div>
          <div className="mt-2 flex space-x-2">
            <Button variant="outline" size="sm" className="text-xs">
              Suggest alternative times
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              Add to waitlist
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};