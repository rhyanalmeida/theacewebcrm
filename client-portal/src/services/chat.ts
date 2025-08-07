import { createSupabaseClient } from '@/lib/supabase'
import io, { Socket } from 'socket.io-client'
import type { Database } from '@/types/database'

type ChatRoom = Database['public']['Tables']['chat_rooms']['Row']
type ChatMessage = Database['public']['Tables']['chat_messages']['Row']

class ChatService {
  private supabase = createSupabaseClient()
  private socket: Socket | null = null

  async initializeSocket(userId: string) {
    if (this.socket?.connected) return this.socket

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000'
    this.socket = io(socketUrl, {
      auth: {
        userId,
      },
      transports: ['websocket', 'polling'],
    })

    return this.socket
  }

  disconnectSocket() {
    if (this.socket?.connected) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  async getChatRooms(userId: string) {
    const { data, error } = await this.supabase
      .from('chat_rooms')
      .select('*')
      .contains('participants', [userId])
      .order('last_message_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getChatRoom(roomId: string) {
    const { data, error } = await this.supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (error) throw error
    return data
  }

  async getChatMessages(roomId: string, limit: number = 50) {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url,
          role
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data.reverse() // Reverse to show oldest first
  }

  async sendMessage(roomId: string, userId: string, message: string, type: 'text' | 'file' = 'text') {
    // Send via Supabase
    const { data, error } = await this.supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        user_id: userId,
        message,
        message_type: type,
      })
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url,
          role
        )
      `)
      .single()

    if (error) throw error

    // Send via Socket.io if available
    if (this.socket?.connected) {
      this.socket.emit('send_message', {
        roomId,
        message: data,
      })
    }

    // Update room's last message timestamp
    await this.supabase
      .from('chat_rooms')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', roomId)

    return data
  }

  async createProjectChatRoom(projectId: string, projectName: string, participants: string[]) {
    const { data, error } = await this.supabase
      .from('chat_rooms')
      .insert({
        name: `${projectName} - Project Chat`,
        type: 'project',
        project_id: projectId,
        participants,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async joinRoom(roomId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join_room', roomId)
    }
  }

  async leaveRoom(roomId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_room', roomId)
    }
  }

  onNewMessage(callback: (message: ChatMessage & { profiles: any }) => void) {
    if (this.socket?.connected) {
      this.socket.on('new_message', callback)
    }
  }

  onUserTyping(callback: (data: { userId: string, isTyping: boolean }) => void) {
    if (this.socket?.connected) {
      this.socket.on('user_typing', callback)
    }
  }

  emitTyping(roomId: string, userId: string, isTyping: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('typing', { roomId, userId, isTyping })
    }
  }

  async uploadChatFile(file: File, roomId: string): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `chat-files/${roomId}/${fileName}`

    const { error: uploadError } = await this.supabase.storage
      .from('chat-files')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: urlData } = this.supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  }

  // Real-time subscriptions
  subscribeToRoomMessages(roomId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        callback
      )
      .subscribe()
  }

  subscribeToRoomUpdates(userId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel('room-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms',
          filter: `participants.cs.{${userId}}`
        },
        callback
      )
      .subscribe()
  }
}

export const chatService = new ChatService()