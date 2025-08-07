import { supabase } from '../../config/supabase';
import { logger } from '../../config/logger';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface RealtimeSubscriptionConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string;
  callback: (payload: RealtimePostgresChangesPayload<any>) => void;
}

export interface ActivityFeedItem {
  id: string;
  type: 'contact' | 'lead' | 'deal' | 'project' | 'activity';
  action: 'created' | 'updated' | 'deleted';
  entity_id: string;
  entity_name: string;
  user_name: string;
  timestamp: string;
  details?: Record<string, any>;
}

class SupabaseRealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private activityCallbacks: Set<(activity: ActivityFeedItem) => void> = new Set();

  // =============================================
  // SUBSCRIPTION MANAGEMENT
  // =============================================

  subscribe(config: RealtimeSubscriptionConfig): string {
    const channelId = `${config.table}-${config.event || 'all'}-${Date.now()}`;
    
    try {
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: config.event || '*',
            schema: config.schema || 'public',
            table: config.table,
            filter: config.filter
          },
          (payload) => {
            logger.debug('Realtime event received:', {
              table: config.table,
              event: payload.eventType,
              id: payload.new?.id || payload.old?.id
            });
            
            config.callback(payload);
            this.handleActivityFeed(payload, config.table);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info('Realtime subscription successful:', { channelId, table: config.table });
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('Realtime subscription error:', { channelId, table: config.table });
          }
        });

      this.channels.set(channelId, channel);
      return channelId;
    } catch (error) {
      logger.error('Failed to create realtime subscription:', error);
      throw error;
    }
  }

  unsubscribe(channelId: string): boolean {
    try {
      const channel = this.channels.get(channelId);
      if (channel) {
        supabase.removeChannel(channel);
        this.channels.delete(channelId);
        logger.info('Realtime subscription removed:', { channelId });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to unsubscribe from realtime:', error);
      return false;
    }
  }

  unsubscribeAll(): void {
    try {
      for (const [channelId, channel] of this.channels) {
        supabase.removeChannel(channel);
      }
      this.channels.clear();
      logger.info('All realtime subscriptions removed');
    } catch (error) {
      logger.error('Failed to unsubscribe from all realtime channels:', error);
    }
  }

  // =============================================
  // SPECIFIC ENTITY SUBSCRIPTIONS
  // =============================================

  subscribeToContacts(callback: (payload: RealtimePostgresChangesPayload<any>) => void): string {
    return this.subscribe({
      table: 'contacts',
      event: '*',
      callback
    });
  }

  subscribeToLeads(callback: (payload: RealtimePostgresChangesPayload<any>) => void): string {
    return this.subscribe({
      table: 'leads',
      event: '*',
      callback
    });
  }

  subscribeToDeals(callback: (payload: RealtimePostgresChangesPayload<any>) => void): string {
    return this.subscribe({
      table: 'deals',
      event: '*',
      callback
    });
  }

  subscribeToProjects(callback: (payload: RealtimePostgresChangesPayload<any>) => void): string {
    return this.subscribe({
      table: 'projects',
      event: '*',
      callback
    });
  }

  subscribeToTasks(projectId: string, callback: (payload: RealtimePostgresChangesPayload<any>) => void): string {
    return this.subscribe({
      table: 'tasks',
      event: '*',
      filter: `project_id=eq.${projectId}`,
      callback
    });
  }

  subscribeToActivities(entityType: string, entityId: string, callback: (payload: RealtimePostgresChangesPayload<any>) => void): string {
    return this.subscribe({
      table: 'activities',
      event: '*',
      filter: `and(related_to_type.eq.${entityType},related_to_id.eq.${entityId})`,
      callback
    });
  }

  subscribeToUserActivities(userId: string, callback: (payload: RealtimePostgresChangesPayload<any>) => void): string {
    return this.subscribe({
      table: 'activities',
      event: '*',
      filter: `created_by=eq.${userId}`,
      callback
    });
  }

  // =============================================
  // ACTIVITY FEED MANAGEMENT
  // =============================================

  subscribeToActivityFeed(callback: (activity: ActivityFeedItem) => void): void {
    this.activityCallbacks.add(callback);
    
    // Subscribe to all relevant tables for activity feed
    if (this.activityCallbacks.size === 1) {
      // Only set up subscriptions once
      this.setupActivityFeedSubscriptions();
    }
  }

  unsubscribeFromActivityFeed(callback: (activity: ActivityFeedItem) => void): void {
    this.activityCallbacks.delete(callback);
    
    // Clean up subscriptions if no more callbacks
    if (this.activityCallbacks.size === 0) {
      this.cleanupActivityFeedSubscriptions();
    }
  }

  private setupActivityFeedSubscriptions(): void {
    const tables = ['contacts', 'leads', 'deals', 'projects', 'activities'];
    
    tables.forEach(table => {
      this.subscribe({
        table,
        event: '*',
        callback: (payload) => this.handleActivityFeed(payload, table)
      });
    });
  }

  private cleanupActivityFeedSubscriptions(): void {
    // Remove activity feed specific subscriptions
    for (const [channelId, channel] of this.channels) {
      if (channelId.includes('activity-feed')) {
        supabase.removeChannel(channel);
        this.channels.delete(channelId);
      }
    }
  }

  private async handleActivityFeed(payload: RealtimePostgresChangesPayload<any>, table: string): Promise<void> {
    if (this.activityCallbacks.size === 0) return;

    try {
      const activity: ActivityFeedItem = {
        id: crypto.randomUUID(),
        type: table.slice(0, -1) as any, // Remove 's' from table name
        action: payload.eventType === 'INSERT' ? 'created' : 
                payload.eventType === 'UPDATE' ? 'updated' : 'deleted',
        entity_id: payload.new?.id || payload.old?.id,
        entity_name: this.getEntityName(payload.new || payload.old, table),
        user_name: await this.getUserName(payload.new?.created_by || payload.old?.created_by),
        timestamp: new Date().toISOString(),
        details: payload.new || payload.old
      };

      // Notify all callbacks
      for (const callback of this.activityCallbacks) {
        try {
          callback(activity);
        } catch (error) {
          logger.error('Activity feed callback error:', error);
        }
      }
    } catch (error) {
      logger.error('Failed to handle activity feed:', error);
    }
  }

  private getEntityName(entity: any, table: string): string {
    if (!entity) return 'Unknown';

    switch (table) {
      case 'contacts':
        return `${entity.first_name} ${entity.last_name}`;
      case 'companies':
        return entity.name;
      case 'leads':
      case 'deals':
      case 'projects':
        return entity.title || entity.name;
      case 'activities':
        return entity.subject;
      default:
        return entity.name || entity.title || 'Unknown';
    }
  }

  private async getUserName(userId: string): Promise<string> {
    if (!userId) return 'System';

    try {
      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      if (error || !data) return 'Unknown User';

      return `${data.first_name} ${data.last_name}`;
    } catch (error) {
      logger.error('Failed to get user name for activity feed:', error);
      return 'Unknown User';
    }
  }

  // =============================================
  // PRESENCE MANAGEMENT
  // =============================================

  async joinPresence(channelName: string, userId: string, userInfo: Record<string, any>): Promise<RealtimeChannel> {
    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        logger.debug('Presence sync:', { channelName, users: Object.keys(presenceState) });
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        logger.debug('User joined presence:', { channelName, newPresences });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        logger.debug('User left presence:', { channelName, leftPresences });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            ...userInfo
          });
        }
      });

    return channel;
  }

  // =============================================
  // BROADCAST MESSAGING
  // =============================================

  createBroadcastChannel(channelName: string): RealtimeChannel {
    const channel = supabase.channel(channelName);
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Broadcast channel ready:', { channelName });
      }
    });

    return channel;
  }

  async broadcast(channel: RealtimeChannel, event: string, payload: any): Promise<boolean> {
    try {
      const response = await channel.send({
        type: 'broadcast',
        event,
        payload
      });

      if (response === 'ok') {
        logger.debug('Broadcast sent successfully:', { event, payload });
        return true;
      } else {
        logger.error('Broadcast failed:', { event, payload, response });
        return false;
      }
    } catch (error) {
      logger.error('Broadcast error:', error);
      return false;
    }
  }

  // =============================================
  // CONNECTION STATUS
  // =============================================

  getConnectionStatus(): string {
    return supabase.realtime.connection.connectionState;
  }

  onConnectionStateChange(callback: (state: string) => void): void {
    supabase.realtime.connection.onStateChange(callback);
  }

  // =============================================
  // CLEANUP
  // =============================================

  cleanup(): void {
    this.unsubscribeAll();
    this.activityCallbacks.clear();
  }
}

export default new SupabaseRealtimeService();