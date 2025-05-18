import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import AuthService, { AuthState, AuthError } from '@/services/AuthService';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { DebugUtils } from '@/utils/debugUtils';

// Types for client profile
export interface ClientProfile {
  id: string;
  client_first_name?: string;
  client_last_name?: string;
  client_preferred_name?: string;
  client_email?: string;
  client_phone?: string;
  client_status?: 'New' | 'Profile Complete' | 'Active' | 'Inactive' | string;
  client_is_profile_complete?: boolean;
  client_age?: number | null;
  client_state?: string | null;
  [key: string]: any; 
}

// Context interface
export interface AuthContextType {
  authState: AuthState;
  isLoading: boolean;
  authInitialized: boolean;
  authError: AuthError | null;
  user: User | null;
  userId: string | null;
  userRole: string | null;
  clientStatus: ClientProfile['client_status'] | null;
  clientProfile: ClientProfile | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: AuthError }>;
  logout: () => Promise<{ success: boolean; error?: AuthError }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: AuthError }>;
  refreshUserData: () => Promise<void>;
  hasRole: (role: string | string[]) => boolean;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(AuthService.currentState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<AuthError | null>(AuthService.error);
  const [user, setUser] = useState<User | null>(AuthService.currentUser);
  const [userId, setUserId] = useState<string | null>(AuthService.userId);
  const [userRole, setUserRole] = useState<string | null>(AuthService.userRole);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [clientStatus, setClientStatus] = useState<ClientProfile['client_status'] | null>(null);

  // Initialize the auth context
  useEffect(() => {
    DebugUtils.log('auth', '[AuthProvider] Initializing auth context');
    AuthService.addStateListener(async (newState) => {
      DebugUtils.log('auth', '[AuthProvider] Auth state changed', { newState });
      setAuthState(newState);
      setUser(AuthService.currentUser);
      setUserId(AuthService.userId);
      setUserRole(AuthService.userRole);
      setAuthError(AuthService.error);
      if (newState === AuthState.AUTHENTICATED) {
        await loadClientData(AuthService.userId);
      }
    });
  }, []);

  // Load client data
  const loadClientData = async (userId: string | null) => {
    if (!userId) return;
    try {
      DebugUtils.log('auth', '[AuthProvider] Loading client data', { userId });
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        DebugUtils.log('auth', '[AuthProvider] Error loading client data', { error });
        setClientProfile(null);
        setClientStatus('ErrorFetchingStatus');
      } else if (data) {
        DebugUtils.log('auth', '[AuthProvider] Client data loaded', data);
        setClientProfile(data as ClientProfile);
        setClientStatus(data.client_status || 'New');
      }
    } catch (err) {
      DebugUtils.log('auth', '[AuthProvider] Exception loading client data', { error: err });
      setClientProfile(null);
      setClientStatus('ErrorFetchingStatus');
    }
  };

  const contextValue = useMemo(() => ({
    authState,
    isLoading,
    authError,
    user,
    userId,
    userRole,
    clientStatus,
    clientProfile,
    login: AuthService.signIn,
    logout: AuthService.signOut,
    resetPassword: AuthService.resetPassword,
    refreshUserData: AuthService.refreshSession,
    hasRole: AuthService.hasRole
  }), [authState, isLoading, authError, user, userId, userRole, clientStatus, clientProfile]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export { AuthState } from '@/services/AuthService';
