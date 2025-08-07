'use client';

import { useState, useEffect, useCallback } from 'react';
import { Fingerprint, ShieldCheck, AlertCircle, Smartphone, Eye, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import toast from 'react-hot-toast';

interface BiometricState {
  isSupported: boolean;
  isAvailable: boolean;
  isEnabled: boolean;
  supportedMethods: string[];
}

interface BiometricAuthProps {
  onAuthenticate?: (success: boolean) => void;
  onSetup?: () => void;
  required?: boolean;
  fallbackToPassword?: boolean;
}

// WebAuthn/Biometric API types
interface PublicKeyCredentialCreationOptionsExtended extends PublicKeyCredentialCreationOptions {
  authenticatorSelection?: AuthenticatorSelectionCriteria & {
    userVerification?: UserVerificationRequirement;
  };
}

export function BiometricAuth({
  onAuthenticate,
  onSetup,
  required = false,
  fallbackToPassword = true
}: BiometricAuthProps) {
  const [state, setState] = useState<BiometricState>({
    isSupported: false,
    isAvailable: false,
    isEnabled: false,
    supportedMethods: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    // Check if WebAuthn is supported
    const isWebAuthnSupported = 'credentials' in navigator && 'create' in navigator.credentials;
    
    if (!isWebAuthnSupported) {
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    try {
      // Check if biometric authentication is available
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      // Check what methods are supported
      const supportedMethods: string[] = [];
      
      // Check for platform authenticator (Touch ID, Face ID, Windows Hello)
      if (isAvailable) {
        supportedMethods.push('platform');
      }
      
      // Check for external authenticators (USB keys, etc.)
      supportedMethods.push('cross-platform');

      // Check if user has already set up biometric auth
      const isEnabled = localStorage.getItem('biometric-auth-enabled') === 'true';

      setState({
        isSupported: true,
        isAvailable,
        isEnabled,
        supportedMethods
      });
    } catch (error) {
      console.error('Error checking biometric support:', error);
      setState(prev => ({ ...prev, isSupported: false }));
    }
  };

  const createCredential = async () => {
    if (!state.isSupported) {
      throw new Error('Biometric authentication not supported');
    }

    const user = {
      id: new TextEncoder().encode('user-id-123'), // Should be unique user ID
      name: 'user@example.com',
      displayName: 'User Name'
    };

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptionsExtended = {
      challenge: new TextEncoder().encode('random-challenge-string'),
      rp: {
        name: 'ACE CRM',
        id: window.location.hostname,
      },
      user,
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: false,
      },
      timeout: 60000,
      attestation: 'direct'
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    }) as PublicKeyCredential;

    return credential;
  };

  const authenticateWithCredential = async () => {
    if (!state.isEnabled) {
      throw new Error('Biometric authentication not set up');
    }

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: new TextEncoder().encode('random-challenge-string'),
      allowCredentials: [], // Empty array allows any credential
      timeout: 60000,
      userVerification: 'required'
    };

    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    }) as PublicKeyCredential;

    return credential;
  };

  const setupBiometric = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const credential = await createCredential();
      
      if (credential) {
        // Store credential info (in real app, send to server)
        const credentialData = {
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          type: credential.type,
          response: {
            clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
            attestationObject: Array.from(new Uint8Array((credential.response as AuthenticatorAttestationResponse).attestationObject))
          }
        };

        localStorage.setItem('biometric-credential', JSON.stringify(credentialData));
        localStorage.setItem('biometric-auth-enabled', 'true');

        setState(prev => ({ ...prev, isEnabled: true }));
        toast.success('Biometric authentication set up successfully!');
        onSetup?.();
      }
    } catch (error) {
      console.error('Biometric setup failed:', error);
      
      let errorMessage = 'Failed to set up biometric authentication';
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'User cancelled or permission denied';
            break;
          case 'NotSupportedError':
            errorMessage = 'Biometric authentication not supported';
            break;
          case 'SecurityError':
            errorMessage = 'Security error occurred';
            break;
          case 'AbortError':
            errorMessage = 'Operation was aborted';
            break;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const authenticate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const credential = await authenticateWithCredential();
      
      if (credential) {
        // Verify credential (in real app, send to server for verification)
        toast.success('Authentication successful!');
        onAuthenticate?.(true);
      }
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      
      let errorMessage = 'Authentication failed';
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'Authentication cancelled or failed';
            break;
          case 'SecurityError':
            errorMessage = 'Security error occurred';
            break;
          case 'AbortError':
            errorMessage = 'Authentication was cancelled';
            break;
          case 'InvalidStateError':
            errorMessage = 'No valid credentials found';
            break;
        }
      }
      
      setError(errorMessage);
      
      if (fallbackToPassword && !required) {
        setShowPasswordFallback(true);
      } else {
        toast.error(errorMessage);
        onAuthenticate?.(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const removeBiometric = () => {
    localStorage.removeItem('biometric-credential');
    localStorage.removeItem('biometric-auth-enabled');
    setState(prev => ({ ...prev, isEnabled: false }));
    toast.success('Biometric authentication removed');
  };

  const getBiometricIcon = () => {
    if (state.supportedMethods.includes('platform')) {
      // Detect platform
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('mac')) {
        return <Fingerprint className="w-8 h-8" />; // Touch ID
      } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        return <Eye className="w-8 h-8" />; // Face ID
      } else if (userAgent.includes('windows')) {
        return <ShieldCheck className="w-8 h-8" />; // Windows Hello
      }
    }
    return <Fingerprint className="w-8 h-8" />;
  };

  const getBiometricLabel = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) {
      return 'Touch ID';
    } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'Face ID / Touch ID';
    } else if (userAgent.includes('windows')) {
      return 'Windows Hello';
    } else if (userAgent.includes('android')) {
      return 'Fingerprint / Face Unlock';
    }
    return 'Biometric Authentication';
  };

  if (!state.isSupported) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Biometric Authentication Unavailable</h3>
          <p className="text-sm text-gray-600 mb-4">
            Your device or browser doesn't support biometric authentication.
          </p>
          
          {fallbackToPassword && (
            <Button
              variant="outline"
              onClick={() => setShowPasswordFallback(true)}
              className="w-full"
            >
              <Lock className="w-4 h-4 mr-2" />
              Continue with Password
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (showPasswordFallback) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Lock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Enter Password</h3>
          <p className="text-sm text-gray-600 mb-4">
            Use your password to continue.
          </p>
          
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex space-x-2">
              <Button
                onClick={() => onAuthenticate?.(true)}
                className="flex-1"
              >
                Continue
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPasswordFallback(false)}
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="text-center">
        {getBiometricIcon()}
        
        <h3 className="font-semibold text-gray-900 mt-4 mb-2">
          {state.isEnabled ? 'Authenticate' : 'Set up'} {getBiometricLabel()}
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          {state.isEnabled
            ? 'Use your biometric to sign in securely'
            : 'Secure your account with biometric authentication'
          }
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {state.isEnabled ? (
            <>
              <Button
                onClick={authenticate}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    {getBiometricIcon()}
                    Authenticate
                  </>
                )}
              </Button>
              
              <div className="flex space-x-2">
                {fallbackToPassword && (
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordFallback(true)}
                    className="flex-1"
                  >
                    Use Password
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={removeBiometric}
                  className="flex-1"
                >
                  Remove
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                onClick={setupBiometric}
                disabled={isLoading || !state.isAvailable}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Set up {getBiometricLabel()}
                  </>
                )}
              </Button>
              
              {!required && fallbackToPassword && (
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordFallback(true)}
                  className="w-full"
                >
                  Skip for now
                </Button>
              )}
            </>
          )}
        </div>

        {!state.isAvailable && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Smartphone className="w-4 h-4 text-yellow-500 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium mb-1">Platform Authenticator Not Available</p>
                <p>You can still use external security keys or other authentication methods.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// Biometric setup wizard component
export function BiometricSetupWizard({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(1);
  
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Secure Your Account</h2>
        <p className="text-gray-600">Set up biometric authentication for enhanced security</p>
      </div>

      <div className="flex items-center justify-center space-x-2 mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${
              i <= step ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <Card className="p-6 text-center">
          <ShieldCheck className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Enhanced Security</h3>
          <p className="text-sm text-gray-600 mb-6">
            Biometric authentication provides an extra layer of security for your account.
          </p>
          <Button onClick={() => setStep(2)} className="w-full">
            Continue
          </Button>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6 text-center">
          <Fingerprint className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Quick & Convenient</h3>
          <p className="text-sm text-gray-600 mb-6">
            Sign in quickly with your fingerprint, face, or other biometric methods.
          </p>
          <Button onClick={() => setStep(3)} className="w-full">
            Continue
          </Button>
        </Card>
      )}

      {step === 3 && (
        <BiometricAuth
          onSetup={onComplete}
          fallbackToPassword={false}
        />
      )}
    </div>
  );
}