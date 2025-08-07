'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Send,
  Paperclip,
  Image,
  File,
  Download,
  Users,
  MessageCircle,
  Phone,
  Video,
  MoreVertical,
  Search,
  Hash,
  AtSign
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { useAuthContext } from '@/components/auth/auth-provider'
import { createSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/database'

type ChatRoom = Database['public']['Tables']['chat_rooms']['Row']
type ChatMessage = Database['public']['Tables']['chat_messages']['Row']

interface MessagingSystemProps {
  clientId: string
  projectId?: string
}

interface MessageWithSender extends ChatMessage {
  sender?: {
    id: string
    full_name: string | null
    avatar_url: string | null
    role: string
  }
}

export function MessagingSystem({ clientId, projectId }: MessagingSystemProps) {
  const { profile } = useAuthContext()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    loadRooms()
  }, [clientId, projectId])

  useEffect(() => {
    if (activeRoom) {
      loadMessages(activeRoom.id)
      subscribeToMessages(activeRoom.id)
      subscribeToPresence(activeRoom.id)
    }
  }, [activeRoom])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadRooms = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('chat_rooms')
        .select('*')
        .contains('participants', [clientId])

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query.order('last_message_at', { ascending: false })

      if (error) throw error
      
      setRooms(data || [])
      
      // Auto-select first room or project room
      if (data && data.length > 0) {
        const defaultRoom = projectId 
          ? data.find(room => room.project_id === projectId) || data[0]
          : data[0]
        setActiveRoom(defaultRoom)
      }
    } catch (error) {
      console.error('Failed to load chat rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles(id, full_name, avatar_url, role)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) throw error
      setMessages(data as MessageWithSender[] || [])
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const subscribeToMessages = (roomId: string) => {
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          // Load the full message with sender info
          const { data, error } = await supabase
            .from('chat_messages')
            .select(`
              *,
              sender:profiles(id, full_name, avatar_url, role)
            `)
            .eq('id', payload.new.id)
            .single()

          if (!error && data) {
            setMessages(prev => [...prev, data as MessageWithSender])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const subscribeToPresence = (roomId: string) => {
    const channel = supabase.channel(`presence:${roomId}`)
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState()
        const users = Object.values(presenceState).flat().map((user: any) => user.user_id)
        setOnlineUsers(users)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const users = newPresences.map((presence: any) => presence.user_id)
        setOnlineUsers(prev => [...new Set([...prev, ...users])])
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const users = leftPresences.map((presence: any) => presence.user_id)
        setOnlineUsers(prev => prev.filter(id => !users.includes(id)))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: profile?.id,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !activeRoom || !profile) return

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: activeRoom.id,
          user_id: profile.id,
          message: newMessage.trim(),
          message_type: 'text',
        })

      if (error) throw error

      // Update room's last message timestamp
      await supabase
        .from('chat_rooms')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeRoom.id)

      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!activeRoom || !profile) return

    try {
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName)

      // Send file message
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: activeRoom.id,
          user_id: profile.id,
          message: file.name,
          message_type: 'file',
          file_url: publicUrl,
        })

      if (error) throw error
    } catch (error) {
      console.error('Failed to upload file:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return format(date, 'h:mm a')
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return format(date, 'MMM d')
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-6 h-96">
        <div className="bg-muted animate-pulse rounded-lg" />
        <div className="col-span-3 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-6 h-[600px]">
      {/* Chat Rooms Sidebar */}
      <Card className="col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Conversations</CardTitle>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search conversations..." className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`
                  flex items-center space-x-3 p-3 cursor-pointer transition-colors
                  ${activeRoom?.id === room.id 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}
                onClick={() => setActiveRoom(room)}
              >
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                    {room.type === 'project' ? <Hash className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                  </div>
                  {onlineUsers.length > 0 && (
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{room.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {room.last_message_at 
                      ? formatDistanceToNow(new Date(room.last_message_at)) + ' ago'
                      : 'No messages'
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="col-span-3 flex flex-col">
        {activeRoom ? (
          <>
            {/* Chat Header */}
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    {activeRoom.type === 'project' ? <Hash className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold">{activeRoom.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{activeRoom.participants.length} participants</span>
                      {onlineUsers.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {onlineUsers.length} online
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-0">
              <div className="space-y-4 p-4">
                {messages.map((message, index) => {
                  const isOwnMessage = message.user_id === profile?.id
                  const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex space-x-3 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}
                    >
                      {showAvatar && !isOwnMessage && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.sender?.avatar_url || undefined} />
                          <AvatarFallback>
                            {message.sender?.full_name?.charAt(0) || 'T'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      {!showAvatar && !isOwnMessage && <div className="w-8" />}
                      
                      <div className={`flex-1 max-w-xs ${isOwnMessage ? 'text-right' : ''}`}>
                        {showAvatar && (
                          <div className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                            <span className="text-sm font-medium">
                              {isOwnMessage ? 'You' : message.sender?.full_name || 'Unknown'}
                            </span>
                            {message.sender?.role === 'team' && (
                              <Badge variant="secondary" className="text-xs">Team</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatMessageTime(message.created_at)}
                            </span>
                          </div>
                        )}
                        
                        <div
                          className={`
                            rounded-lg p-3 text-sm
                            ${isOwnMessage
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800'
                            }
                          `}
                        >
                          {message.message_type === 'file' ? (
                            <div className="flex items-center space-x-2">
                              {getFileIcon(message.message)}
                              <span>{message.message}</span>
                              {message.file_url && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => window.open(message.file_url!, '_blank')}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ) : (
                            <p>{message.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>

            {/* Message Input */}
            <div className="border-t p-4">
              {isTyping && (
                <div className="text-xs text-muted-foreground mb-2">
                  Someone is typing...
                </div>
              )}
              
              <form onSubmit={sendMessage} className="flex items-end space-x-2">
                <div className="flex-1">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="min-h-[40px] max-h-32 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage(e)
                      }
                    }}
                  />
                </div>
                
                <div className="flex space-x-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                    }}
                  />
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}