
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import AuthService, { AuthState, AuthError } from '@/services/AuthService';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { cleanupOldAuthKeys } from '@/utils/authCleanup';

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
  // Auth state
  authState: AuthState;
  isLoading: boolean;
  authInitialized: boolean;
  authError: AuthError | null;
  
  // User data
  user: User | null;
  userId: string | null;
  userRole: string | null;
  clientStatus: ClientProfile['client_status'] | null;
  clientProfile: ClientProfile | null;
  
  // Actions
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
  // Track auth state
  const [authState, setAuthState] = useState<AuthState>(AuthService.currentState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<AuthError | null>(AuthService.error);
  
  // User data
  const [user, setUser] = useState<User | null>(AuthService.currentUser);
  const [userId, setUserId] = useState<string | null>(AuthService.userId);
  const [userRole, setUserRole] = useState<string | null>(AuthService.userRole);
  
  // Client-specific data
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [clientStatus, setClientStatus] = useState<ClientProfile['client_status'] | null>(null);
  
  // Flag to track initial client data load
  const [loadingClientData, setLoadingClientData] = useState<boolean>(false);
  
  // Force authInitialized to match AuthService.isInitialized
  const [authInitialized, setAuthInitialized] = useState<boolean>(AuthService.isInitialized);
  
  // Clean up old localStorage keys on startup
  useEffect(() => {
    console.log('[AuthContext] Cleaning up old localStorage keys');
    cleanupOldAuthKeys();
  }, []);

  // Safety timeout for initialization
  useEffect(() => {
    // If initialization takes too long, consider it done anyway
    const timeoutId = setTimeout(() => {
      if (!authInitialized) {
        console.log('[AuthContext] Initialization timeout reached, forcing initialized state');
        setAuthInitialized(true);
        if (authState === AuthState.INITIALIZING) {
          // Default to unauthenticated if we can't determine state
          setAuthState(AuthState.UNAUTHENTICATED);
        }
      }
    }, 8000); // 8 seconds timeout
    
    return () => clearTimeout(timeoutId);
  }, [authInitialized, authState]);
  
  // Sync with AuthService initialization state
  useEffect(() => {
    setAuthInitialized(AuthService.isInitialized);
    console.log(`[AuthContext] AuthService.isInitialized: ${AuthService.isInitialized}`);
    
    // Monitor changes to initialization state - using a more efficient approach
    // Only check every second instead of every 500ms to reduce overhead
    const checkInitInterval = setInterval(() => {
      if (AuthService.isInitialized !== authInitialized) {
        console.log(`[AuthContext] AuthService initialization changed: ${AuthService.isInitialized}`);
        setAuthInitialized(AuthService.isInitialized);
      }
    }, 1000); // Check every 1000ms (1 second) instead of 500ms
    
    return () => clearInterval(checkInitInterval);
  }, [authInitialized]);
  
  // Subscribe to auth service state changes
  useEffect(() => {
    // Update our context state when auth service state changes
    const unsubscribe = AuthService.addStateListener((newState) => {
      console.log(`[AuthContext] Auth state changed to: ${newState}`);
      setAuthState(newState);
      setUser(AuthService.currentUser);
      setUserId(AuthService.userId);
      setUserRole(AuthService.userRole);
      setAuthError(AuthService.error);
      setAuthInitialized(AuthService.isInitialized); // Sync initialization state
      
      // Trigger client profile load if authenticated
      if (newState === AuthState.AUTHENTICATED) {
        loadClientData(AuthService.userId);
      } else if (newState === AuthState.UNAUTHENTICATED) {
        setClientProfile(null);
        setClientStatus(null);
      }
    });
    
    // Clean up subscription
    return unsubscribe;
  }, []);

  // Load client data if we have a user
  const loadClientData = async (userId: string | null) => {
    if (!userId || userRole !== 'client') {
      setLoadingClientData(false);
      return;
    }
    
    try {
      setLoadingClientData(true);
      console.log(`[AuthContext] Loading client data for user: ${userId}`);
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('[AuthContext] Error loading client data:', error);
        
        if (error.code === 'PGRST116') { // No rows returned
          setClientStatus('New');
        } else {
          setClientStatus('ErrorFetchingStatus');
        }
        setClientProfile(null);
      } else if (data) {
        console.log('[AuthContext] Loaded client profile:', data);
        setClientProfile(data as ClientProfile);
        setClientStatus(data.client_status || 'New');
      } else {
        console.log('[AuthContext] No client data found, setting status to New');
        setClientStatus('New');
        setClientProfile(null);
      }
    } catch (err) {
      console.error('[AuthContext] Exception loading client data:', err);
      setClientStatus('ErrorFetchingStatus');
      setClientProfile(null);
    } finally {
      setLoadingClientData(false);
    }
  };

  // Effect to update isLoading state based on initialization and client data loading
  useEffect(() => {
    const isStillInitializing = !authInitialized || authState === AuthState.INITIALIZING;
    const isClientDataLoading = authState === AuthState.AUTHENTICATED && loadingClientData;
    const newLoadingState = isStillInitializing || isClientDataLoading;
    
    // Only update state if it's actually changing to avoid unnecessary renders
    if (isLoading !== newLoadingState) {
      setIsLoading(newLoadingState);
      console.log(`[AuthContext] Updated loading state: ${newLoadingState} (initializing=${isStillInitializing}, clientDataLoading=${isClientDataLoading})`);
    }
  }, [authState, authInitialized, loadingClientData, isLoading]);

  // Load initial client data if user is already present
  useEffect(() => {
    if (AuthService.userId && authState === AuthState.AUTHENTICATED && !clientProfile && !loadingClientData) {
      loadClientData(AuthService.userId);
    }
  }, [authState, clientProfile, loadingClientData]);

  // Login handler
  const login = async (email: string, password: string) => {
    return AuthService.signIn(email, password);
  };

  // Logout handler
  const logout = async () => {
    return AuthService.signOut();
  };

  // Reset password handler
  const resetPassword = async (email: string) => {
    return AuthService.resetPassword(email);
  };

  // Refresh user data
  const refreshUserData = async () => {
    const refreshed = await AuthService.refreshSession();
    if (refreshed && AuthService.userId) {
      await loadClientData(AuthService.userId);
    }
  };

  // Check if user has a role
  const hasRole = (role: string | string[]) => {
    return AuthService.hasRole(role);
  };

  // Context value - memoized to prevent unnecessary re-renders
  const contextValue = useMemo<AuthContextType>(() => ({
    authState,
    isLoading,
    authInitialized,
    authError,
    user,
    userId,
    userRole,
    clientStatus,
    clientProfile,
    login,
    logout,
    resetPassword,
    refreshUserData,
    hasRole
  }), [
    authState,
    isLoading,
    authInitialized,
    authError,
    user,
    userId,
    userRole,
    clientStatus,
    clientProfile
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for accessing auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Re-export AuthState
export { AuthState } from '@/services/AuthService';
