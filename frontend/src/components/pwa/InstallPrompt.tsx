'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, Zap, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { usePWA } from '@/hooks/usePWA';

interface InstallPromptProps {
  onDismiss?: () => void;
  showDelayed?: boolean;
}

export function InstallPrompt({ onDismiss, showDelayed = true }: InstallPromptProps) {
  const { isInstallable, install, isStandalone } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const dismissed = localStorage.getItem('ace-crm-install-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Show prompt after delay if configured
    if (showDelayed && isInstallable && !isStandalone) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000); // Show after 3 seconds

      return () => clearTimeout(timer);
    } else if (isInstallable && !isStandalone) {
      setIsVisible(true);
    }
  }, [isInstallable, isStandalone, showDelayed]);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await install();
      setIsVisible(false);
      onDismiss?.();
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('ace-crm-install-dismissed', 'true');
    onDismiss?.();
  };

  if (!isInstallable || isStandalone || isDismissed || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm">
      <Card className="p-4 bg-white shadow-lg border border-gray-200 animate-slide-up">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Install ACE CRM</h3>
              <p className="text-sm text-gray-600">Get the full app experience</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3" />
              <span>Faster loading</span>
            </div>
            <div className="flex items-center space-x-1">
              <Wifi className="w-3 h-3" />
              <span>Works offline</span>
            </div>
            <div className="flex items-center space-x-1">
              <Smartphone className="w-3 h-3" />
              <span>Mobile optimized</span>
            </div>
            <div className="flex items-center space-x-1">
              <Monitor className="w-3 h-3" />
              <span>Desktop app</span>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex-1 text-sm"
          >
            {isInstalling ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Install
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="text-sm"
          >
            Not now
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Floating action button for install
export function InstallButton() {
  const { isInstallable, install, isStandalone } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await install();
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  if (!isInstallable || isStandalone) {
    return null;
  }

  return (
    <Button
      onClick={handleInstall}
      disabled={isInstalling}
      className="fixed bottom-6 right-6 rounded-full w-12 h-12 shadow-lg z-40"
      title="Install ACE CRM"
    >
      {isInstalling ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <Download className="w-5 h-5" />
      )}
    </Button>
  );
}