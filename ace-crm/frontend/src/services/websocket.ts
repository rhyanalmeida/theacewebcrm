import { io, Socket } from 'socket.io-client';
import { WS_BASE_URL } from '../config/api';
import { WebSocketMessage } from '../types';
import { authService } from './auth';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private eventListeners = new Map<string, Set<(data: any) => void>>();

  constructor() {
    this.connect();
  }

  private connect(): void {
    const token = authService.getAccessToken();
    
    if (!token) {
      console.warn('No authentication token available for WebSocket connection');
      return;
    }

    this.socket = io(WS_BASE_URL, {
      auth: {
        token
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectInterval,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connection', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('connection', { status: 'disconnected', reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.emit('connection', { status: 'error', error: error.message });
    });

    // Authentication events
    this.socket.on('auth_error', (error) => {
      console.error('WebSocket authentication error:', error);
      this.disconnect();
      // Attempt to refresh token and reconnect
      this.handleAuthError();
    });

    // Real-time data events
    this.socket.on('user_created', (data) => this.emit('user_created', data));
    this.socket.on('user_updated', (data) => this.emit('user_updated', data));
    this.socket.on('user_deleted', (data) => this.emit('user_deleted', data));

    this.socket.on('contact_created', (data) => this.emit('contact_created', data));
    this.socket.on('contact_updated', (data) => this.emit('contact_updated', data));
    this.socket.on('contact_deleted', (data) => this.emit('contact_deleted', data));

    this.socket.on('lead_created', (data) => this.emit('lead_created', data));
    this.socket.on('lead_updated', (data) => this.emit('lead_updated', data));
    this.socket.on('lead_deleted', (data) => this.emit('lead_deleted', data));
    this.socket.on('lead_converted', (data) => this.emit('lead_converted', data));

    this.socket.on('deal_created', (data) => this.emit('deal_created', data));
    this.socket.on('deal_updated', (data) => this.emit('deal_updated', data));
    this.socket.on('deal_deleted', (data) => this.emit('deal_deleted', data));

    this.socket.on('company_created', (data) => this.emit('company_created', data));
    this.socket.on('company_updated', (data) => this.emit('company_updated', data));
    this.socket.on('company_deleted', (data) => this.emit('company_deleted', data));

    this.socket.on('project_created', (data) => this.emit('project_created', data));
    this.socket.on('project_updated', (data) => this.emit('project_updated', data));
    this.socket.on('project_deleted', (data) => this.emit('project_deleted', data));

    // Notification events
    this.socket.on('notification', (data) => this.emit('notification', data));
    this.socket.on('alert', (data) => this.emit('alert', data));

    // System events
    this.socket.on('system_maintenance', (data) => this.emit('system_maintenance', data));
    this.socket.on('system_update', (data) => this.emit('system_update', data));
  }

  private async handleAuthError(): Promise<void> {
    try {
      await authService.refreshToken();
      // Reconnect with new token
      setTimeout(() => this.connect(), 1000);
    } catch (error) {
      console.error('Failed to refresh token for WebSocket:', error);
      // Redirect to login
      window.location.href = '/login';
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Public methods
  public on(event: string, callback: (data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
    };
  }

  public off(event: string, callback?: (data: any) => void): void {
    if (callback) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
    } else {
      this.eventListeners.delete(event);
    }
  }

  public send(event: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected. Cannot send message:', event, data);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  public reconnect(): void {
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Room management for real-time collaboration
  public joinRoom(room: string): void {
    this.send('join_room', { room });
  }

  public leaveRoom(room: string): void {
    this.send('leave_room', { room });
  }

  // Typing indicators
  public startTyping(context: { type: string; id: string }): void {
    this.send('typing_start', context);
  }

  public stopTyping(context: { type: string; id: string }): void {
    this.send('typing_stop', context);
  }

  // Presence management
  public updatePresence(status: 'online' | 'away' | 'busy' | 'offline'): void {
    this.send('presence_update', { status });
  }
}

// Create singleton instance
export const wsService = new WebSocketService();
export default wsService;