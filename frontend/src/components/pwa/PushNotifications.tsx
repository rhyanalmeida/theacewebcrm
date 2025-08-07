'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Settings, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import toast from 'react-hot-toast';

interface NotificationState {
  permission: NotificationPermission;
  subscription: PushSubscription | null;
  isSupported: boolean;
  isSubscribed: boolean;
}

interface PushNotificationProps {
  vapidPublicKey?: string;
  apiEndpoint?: string;
}

export function PushNotifications({ 
  vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  apiEndpoint = '/api/notifications/subscribe'
}: PushNotificationProps) {
  const [state, setState] = useState<NotificationState>({
    permission: 'default',
    subscription: null,
    isSupported: false,
    isSubscribed: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    // Check if notifications are supported
    const isSupported = 'Notification' in window && 
                       'serviceWorker' in navigator && 
                       'PushManager' in window;

    if (!isSupported) {
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    try {
      const permission = Notification.permission;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      setState(prev => ({
        ...prev,
        permission,
        subscription,
        isSupported: true,
        isSubscribed: !!subscription,
      }));
    } catch (error) {
      console.error('Error initializing notifications:', error);
      setError('Failed to initialize notifications');
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!state.isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      
      if (permission === 'granted') {
        toast.success('Notifications enabled successfully!');
        return true;
      } else if (permission === 'denied') {
        setError('Notifications blocked. Please enable in browser settings.');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setError('Failed to request notification permission');
      return false;
    }
  };

  const subscribe = useCallback(async () => {
    if (state.permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to server
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription on server');
      }

      setState(prev => ({
        ...prev,
        subscription,
        isSubscribed: true,
      }));

      toast.success('Push notifications enabled!');
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      setError(error instanceof Error ? error.message : 'Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  }, [state.permission, vapidPublicKey, apiEndpoint]);

  const unsubscribe = useCallback(async () => {
    if (!state.subscription) return;

    setIsLoading(true);
    setError(null);

    try {
      await state.subscription.unsubscribe();
      
      // Remove subscription from server
      await fetch(apiEndpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: state.subscription.endpoint,
        }),
      });

      setState(prev => ({
        ...prev,
        subscription: null,
        isSubscribed: false,
      }));

      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
      setError('Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  }, [state.subscription, apiEndpoint]);

  const testNotification = useCallback(async () => {
    if (!state.isSubscribed) return;

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: state.subscription?.endpoint,
        }),
      });

      if (response.ok) {
        toast.success('Test notification sent!');
      } else {
        toast.error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  }, [state.isSubscribed, state.subscription]);

  if (!state.isSupported) {
    return (
      <Card className="p-4">
        <div className="flex items-center space-x-3">
          <BellOff className="w-5 h-5 text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">Push Notifications Unavailable</p>
            <p className="text-sm text-gray-500">
              Your browser doesn't support push notifications
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {state.isSubscribed ? (
            <Bell className="w-5 h-5 text-green-500" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <p className="font-medium text-gray-900">Push Notifications</p>
            <p className="text-sm text-gray-500">
              {state.isSubscribed 
                ? 'Get notified about important updates'
                : 'Enable notifications to stay updated'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {state.isSubscribed && (
            <Button
              variant="outline"
              size="sm"
              onClick={testNotification}
              disabled={isLoading}
            >
              Test
            </Button>
          )}
          
          <Button
            onClick={state.isSubscribed ? unsubscribe : subscribe}
            disabled={isLoading}
            variant={state.isSubscribed ? "outline" : "default"}
            size="sm"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {state.isSubscribed ? 'Disabling...' : 'Enabling...'}
              </>
            ) : (
              <>
                {state.isSubscribed ? <BellOff className="w-4 h-4 mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
                {state.isSubscribed ? 'Disable' : 'Enable'}
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto p-1"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {state.permission === 'denied' && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium mb-1">Notifications Blocked</p>
              <p>To enable notifications:</p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Click the lock icon in your address bar</li>
                <li>Allow notifications for this site</li>
                <li>Refresh the page</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {state.isSubscribed && (
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Notifications active</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open('/settings/notifications')}
              className="ml-auto"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// Notification settings component
export function NotificationSettings() {
  const [settings, setSettings] = useState({
    newLeads: true,
    dealUpdates: true,
    taskReminders: true,
    systemAlerts: true,
    marketing: false,
  });

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Save to localStorage
    localStorage.setItem('notification-settings', JSON.stringify({
      ...settings,
      [key]: value,
    }));

    // Update server settings
    fetch('/api/notifications/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    });
  };

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('notification-settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    }
  }, []);

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Notification Preferences</h3>
      
      <div className="space-y-4">
        {Object.entries({
          newLeads: 'New leads and inquiries',
          dealUpdates: 'Deal status changes',
          taskReminders: 'Task and appointment reminders',
          systemAlerts: 'System alerts and maintenance',
          marketing: 'Marketing updates and tips',
        }).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              {label}
            </label>
            <button
              onClick={() => updateSetting(key as keyof typeof settings, !settings[key as keyof typeof settings])}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings[key as keyof typeof settings] ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings[key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}