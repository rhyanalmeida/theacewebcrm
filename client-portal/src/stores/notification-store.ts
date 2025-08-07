import { create } from 'zustand'
import type { Database } from '@/types/database'

type Notification = Database['public']['Tables']['client_notifications']['Row']

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  setLoading: (loading: boolean) => void
  getUnreadCount: () => number
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  
  setNotifications: (notifications) => {
    const unreadCount = notifications.filter(n => !n.is_read).length
    set({ notifications, unreadCount })
  },
  
  addNotification: (notification) => {
    const { notifications } = get()
    const updated = [notification, ...notifications]
    const unreadCount = updated.filter(n => !n.is_read).length
    set({ notifications: updated, unreadCount })
  },
  
  markAsRead: (id) => {
    const { notifications } = get()
    const updated = notifications.map(n => 
      n.id === id ? { ...n, is_read: true } : n
    )
    const unreadCount = updated.filter(n => !n.is_read).length
    set({ notifications: updated, unreadCount })
  },
  
  markAllAsRead: () => {
    const { notifications } = get()
    const updated = notifications.map(n => ({ ...n, is_read: true }))
    set({ notifications: updated, unreadCount: 0 })
  },
  
  setLoading: (loading) => set({ loading }),
  
  getUnreadCount: () => get().unreadCount,
}))