'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Home, Phone, Mail, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    window.location.reload();
  };

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-6">
          {isOnline ? (
            <Wifi className="w-16 h-16 mx-auto text-green-500 mb-4" />
          ) : (
            <WifiOff className="w-16 h-16 mx-auto text-red-500 mb-4 animate-pulse" />
          )}
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isOnline ? 'You\'re Back Online!' : 'You\'re Offline'}
          </h1>
          
          <p className="text-gray-600 mb-6">
            {isOnline 
              ? 'Great! You can now access all features of ACE CRM.'
              : 'No internet connection detected. Some features may be limited.'
            }
          </p>
        </div>

        {!isOnline && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Available Offline:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                View cached contacts and leads
              </li>
              <li className="flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                Make calls and send messages
              </li>
              <li className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Create drafts (will sync when online)
              </li>
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleRetry}
            className="w-full"
            variant={isOnline ? "default" : "outline"}
            disabled={retryCount > 3}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {retryCount > 3 ? 'Try again later' : 'Try Again'}
          </Button>
          
          <Button
            onClick={goHome}
            variant="outline"
            className="w-full"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>

        {retryCount > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            Retry attempts: {retryCount}/3
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            ACE CRM works offline with limited functionality.
            <br />
            Your data will sync automatically when you reconnect.
          </p>
        </div>
      </Card>
    </div>
  );
}