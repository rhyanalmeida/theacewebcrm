'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Label } from '../../../components/ui/label';
import { Avatar } from '../../../components/ui/avatar';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../../components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../components/ui/popover';
import { Check, X, Users, Mail, Plus } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface Contact {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
}

interface AttendeeSelectorProps {
  value: string[];
  onChange: (attendees: string[]) => void;
  maxAttendees?: number;
}

export const AttendeeSelector: React.FC<AttendeeSelectorProps> = ({
  value,
  onChange,
  maxAttendees = 50
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);

  // Mock contacts - in real app, this would come from an API
  useEffect(() => {
    const mockContacts: Contact[] = [
      { id: '1', email: 'john.doe@example.com', name: 'John Doe', role: 'Manager' },
      { id: '2', email: 'jane.smith@example.com', name: 'Jane Smith', role: 'Developer' },
      { id: '3', email: 'mike.johnson@example.com', name: 'Mike Johnson', role: 'Designer' },
      { id: '4', email: 'sarah.wilson@example.com', name: 'Sarah Wilson', role: 'Product Manager' },
      { id: '5', email: 'david.brown@example.com', name: 'David Brown', role: 'Sales' },
    ];
    setContacts(mockContacts);
  }, []);

  // Filter contacts based on search input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const filtered = contacts.filter(contact => 
      contact.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      contact.email.toLowerCase().includes(inputValue.toLowerCase())
    );
    setFilteredContacts(filtered);
  }, [inputValue, contacts]);

  const addAttendee = (email: string) => {
    if (!value.includes(email) && value.length < maxAttendees) {
      onChange([...value, email]);
    }
  };

  const removeAttendee = (email: string) => {
    onChange(value.filter(attendee => attendee !== email));
  };

  const addEmailDirectly = () => {
    const email = inputValue.trim();
    if (email && isValidEmail(email) && !value.includes(email)) {
      addAttendee(email);
      setInputValue('');
      setOpen(false);
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getContactByEmail = (email: string): Contact | undefined => {
    return contacts.find(contact => contact.email === email);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addEmailDirectly();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center space-x-2">
          <Users className="w-4 h-4" />
          <span>Attendees ({value.length})</span>
        </Label>
        <Badge variant="outline" className="text-xs">
          {maxAttendees - value.length} remaining
        </Badge>
      </div>

      {/* Selected Attendees */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map(email => {
            const contact = getContactByEmail(email);
            return (
              <Badge key={email} variant="secondary" className="flex items-center space-x-2 pr-1">
                <div className="flex items-center space-x-1">
                  {contact?.avatar ? (
                    <Avatar className="w-4 h-4">
                      <img src={contact.avatar} alt={contact.name} />
                    </Avatar>
                  ) : (
                    <div className="w-4 h-4 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-xs">{(contact?.name || email)[0].toUpperCase()}</span>
                    </div>
                  )}
                  <span className="text-xs">
                    {contact?.name || email.split('@')[0]}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeAttendee(email)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Add Attendees */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start"
            disabled={value.length >= maxAttendees}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add attendees...
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search contacts or enter email..."
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={handleKeyDown}
            />
            <CommandList>
              {/* Direct email entry */}
              {inputValue && isValidEmail(inputValue) && !value.includes(inputValue) && (
                <CommandGroup>
                  <CommandItem
                    onSelect={addEmailDirectly}
                    className="flex items-center space-x-2"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Add "{inputValue}"</span>
                  </CommandItem>
                </CommandGroup>
              )}

              {/* Contacts list */}
              <CommandEmpty>
                {inputValue && !isValidEmail(inputValue) 
                  ? "Enter a valid email address" 
                  : "No contacts found"
                }
              </CommandEmpty>
              
              {filteredContacts.length > 0 && (
                <CommandGroup heading="Contacts">
                  {filteredContacts.map((contact) => {
                    const isSelected = value.includes(contact.email);
                    return (
                      <CommandItem
                        key={contact.id}
                        onSelect={() => {
                          if (isSelected) {
                            removeAttendee(contact.email);
                          } else {
                            addAttendee(contact.email);
                          }
                        }}
                        className="flex items-center space-x-3"
                      >
                        <div className="flex items-center space-x-2 flex-1">
                          {contact.avatar ? (
                            <Avatar className="w-8 h-8">
                              <img src={contact.avatar} alt={contact.name} />
                            </Avatar>
                          ) : (
                            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {contact.name[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{contact.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {contact.email}
                            </div>
                            {contact.role && (
                              <div className="text-xs text-muted-foreground">
                                {contact.role}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Check
                          className={cn(
                            "w-4 h-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {/* Recent attendees */}
              <CommandGroup heading="Recent">
                {/* This would be populated with recently used contacts */}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Attendee details */}
      {value.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Attendee Details</Label>
          <div className="space-y-1 max-h-32 overflow-auto">
            {value.map(email => {
              const contact = getContactByEmail(email);
              return (
                <div
                  key={email}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
                >
                  <div className="flex items-center space-x-2">
                    {contact?.avatar ? (
                      <Avatar className="w-6 h-6">
                        <img src={contact.avatar} alt={contact.name} />
                      </Avatar>
                    ) : (
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-xs">{(contact?.name || email)[0].toUpperCase()}</span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{contact?.name || email.split('@')[0]}</div>
                      <div className="text-muted-foreground">{email}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Required
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Capacity warning */}
      {value.length >= maxAttendees * 0.8 && (
        <div className="flex items-center space-x-2 p-2 bg-yellow-50 text-yellow-800 rounded text-xs">
          <Users className="w-4 h-4" />
          <span>
            Approaching maximum attendees ({maxAttendees}). Consider using a larger meeting room.
          </span>
        </div>
      )}
    </div>
  );
};