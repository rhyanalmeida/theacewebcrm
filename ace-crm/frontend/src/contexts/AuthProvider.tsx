import React, { ReactNode, createContext, useContext, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User } from '../types';

interface AuthContextType {
  user: User | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  isError: boolean;
  login: (credentials: { email: string; password: string }) => void;
  register: (userData: any) => void;
  logout: () => void;
  updateProfile: (userData: Partial<User>) => void;
  changePassword: (passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => void;
  forgotPassword: (email: string) => void;
  resetPassword: (data: { token: string; password: string }) => void;
  isLoggingIn: boolean;
  isRegistering: boolean;
  isLoggingOut: boolean;
  isUpdatingProfile: boolean;
  isChangingPassword: boolean;
  isSendingResetEmail: boolean;
  isResettingPassword: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const authData = useAuth();

  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    if (authData.isAuthenticated && authData.user) {
      // WebSocket will be initialized by useWebSocket hook
      console.log('User authenticated:', authData.user.email);
    }
  }, [authData.isAuthenticated, authData.user]);

  const contextValue: AuthContextType = {
    user: authData.user,
    isAuthenticated: authData.isAuthenticated,
    isLoading: authData.isLoading,
    isError: authData.isError,
    login: authData.login,
    register: authData.register,
    logout: authData.logout,
    updateProfile: authData.updateProfile,
    changePassword: authData.changePassword,
    forgotPassword: authData.forgotPassword,
    resetPassword: authData.resetPassword,
    isLoggingIn: authData.isLoggingIn,
    isRegistering: authData.isRegistering,
    isLoggingOut: authData.isLoggingOut,
    isUpdatingProfile: authData.isUpdatingProfile,
    isChangingPassword: authData.isChangingPassword,
    isSendingResetEmail: authData.isSendingResetEmail,
    isResettingPassword: authData.isResettingPassword,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};