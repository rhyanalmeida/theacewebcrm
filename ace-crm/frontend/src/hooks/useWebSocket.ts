import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsService } from '../services/websocket';
import { CACHE_KEYS } from '../config/api';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export const useWebSocket = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const listenersRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      wsService.disconnect();
      return;
    }

    // Set up event listeners
    const unsubscribers: (() => void)[] = [];

    // Connection events
    unsubscribers.push(
      wsService.on('connection', (data) => {
        if (data.status === 'connected') {
          console.log('WebSocket connected');
        } else if (data.status === 'disconnected') {
          console.log('WebSocket disconnected:', data.reason);
        } else if (data.status === 'error') {
          console.error('WebSocket connection error:', data.error);
          toast.error('Connection lost. Attempting to reconnect...');
        }
      })
    );

    // Real-time data updates
    unsubscribers.push(
      wsService.on('user_created', (user) => {
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.users });
        toast.success(`New user ${user.firstName} ${user.lastName} was added`);
      })
    );

    unsubscribers.push(
      wsService.on('user_updated', (user) => {
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.users });
        queryClient.setQueryData(['users', user._id], user);
        toast.success(`User ${user.firstName} ${user.lastName} was updated`);
      })
    );

    unsubscribers.push(
      wsService.on('user_deleted', (data) => {
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.users });
        queryClient.removeQueries({ queryKey: ['users', data.id] });
        toast.success('User was deleted');
      })
    );

    // Contact events
    unsubscribers.push(
      wsService.on('contact_created', (contact) => {
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.contacts });
        toast.success(`New contact ${contact.firstName} ${contact.lastName} was added`);
      })
    );

    unsubscribers.push(
      wsService.on('contact_updated', (contact) => {
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.contacts });
        queryClient.setQueryData(['contacts', contact._id], contact);
      })
    );

    unsubscribers.push(
      wsService.on('contact_deleted', (data) => {
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.contacts });
        queryClient.removeQueries({ queryKey: ['contacts', data.id] });
        toast.success('Contact was deleted');
      })
    );

    // Lead events
    unsubscribers.push(
      wsService.on('lead_created', (lead) => {
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.leads });
        toast.success(`New lead ${lead.firstName} ${lead.lastName} was added`);
      })
    );

    unsubscribers.push(
      wsService.on('lead_updated', (lead) => {
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.leads });
        queryClient.setQueryData(['leads', lead._id], lead);
      })
    );

    unsubscribers.push(
      wsService.on('lead_converted', (data) => {
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.leads });
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.deals });
        toast.success(`Lead ${data.lead.firstName} ${data.lead.lastName} was converted to a deal!`);
      })
    );

    // Deal events
    unsubscribers.push(
      wsService.on('deal_created', (deal) => {
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.deals });
        toast.success(`New deal "${deal.title}" was created`);
      })
    );

    unsubscribers.push(
      wsService.on('deal_updated', (deal) => {
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.deals });
        queryClient.setQueryData(['deals', deal._id], deal);
      })
    );

    // Company events
    unsubscribers.push(
      wsService.on('company_created', (company) => {
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.companies });
        toast.success(`New company "${company.name}" was added`);
      })
    );

    unsubscribers.push(
      wsService.on('company_updated', (company) => {
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.companies });
        queryClient.setQueryData(['companies', company._id], company);
      })
    );

    // Project events
    unsubscribers.push(
      wsService.on('project_created', (project) => {
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.projects });
        toast.success(`New project "${project.name}" was created`);
      })
    );

    unsubscribers.push(
      wsService.on('project_updated', (project) => {
        queryClient.invalidateQueries({ queryKey: CACHE_KEYS.projects });
        queryClient.setQueryData(['projects', project._id], project);
      })
    );

    // Notification events
    unsubscribers.push(
      wsService.on('notification', (data) => {
        toast.success(data.message);
      })
    );

    unsubscribers.push(
      wsService.on('alert', (data) => {
        if (data.type === 'error') {
          toast.error(data.message);
        } else if (data.type === 'warning') {
          toast(data.message, { icon: '⚠️' });
        } else {
          toast.success(data.message);
        }
      })
    );

    // System events
    unsubscribers.push(
      wsService.on('system_maintenance', (data) => {
        toast(
          `System maintenance scheduled: ${data.message}`,
          { 
            duration: 10000,
            icon: '🔧'
          }
        );
      })
    );

    listenersRef.current = unsubscribers;

    // Cleanup on unmount or when authentication changes
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      listenersRef.current = [];
    };
  }, [isAuthenticated, queryClient]);

  // Methods to interact with WebSocket
  const joinRoom = useCallback((room: string) => {
    wsService.joinRoom(room);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    wsService.leaveRoom(room);
  }, []);

  const startTyping = useCallback((context: { type: string; id: string }) => {
    wsService.startTyping(context);
  }, []);

  const stopTyping = useCallback((context: { type: string; id: string }) => {
    wsService.stopTyping(context);
  }, []);

  const updatePresence = useCallback((status: 'online' | 'away' | 'busy' | 'offline') => {
    wsService.updatePresence(status);
  }, []);

  const sendMessage = useCallback((event: string, data: any) => {
    wsService.send(event, data);
  }, []);

  return {
    isConnected: wsService.isConnected(),
    joinRoom,
    leaveRoom,
    startTyping,
    stopTyping,
    updatePresence,
    sendMessage,
    reconnect: wsService.reconnect.bind(wsService),
  };
};

// Hook for typing indicators
export const useTypingIndicator = (context: { type: string; id: string }) => {
  const { startTyping, stopTyping } = useWebSocket();

  const handleStartTyping = useCallback(() => {
    startTyping(context);
  }, [context, startTyping]);

  const handleStopTyping = useCallback(() => {
    stopTyping(context);
  }, [context, stopTyping]);

  return {
    startTyping: handleStartTyping,
    stopTyping: handleStopTyping,
  };
};

// Hook for presence management
export const usePresence = () => {
  const { updatePresence } = useWebSocket();

  useEffect(() => {
    // Set to online when component mounts
    updatePresence('online');

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    // Handle before unload
    const handleBeforeUnload = () => {
      updatePresence('offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updatePresence('offline');
    };
  }, [updatePresence]);

  return { updatePresence };
};