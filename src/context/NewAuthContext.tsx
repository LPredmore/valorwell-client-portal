
import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
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

// Maximum time to wait for client data loading before forcing isLoading to false
const CLIENT_DATA_LOADING_TIMEOUT = 10000; // 10 seconds

// Provider component
export const AuthProvider: React.FC<{
  children: React.ReactNode;
  onAuthStateChange?: (user: User | null, session: any) => void;
}> = ({ children, onAuthStateChange }) => {
  const [authState, setAuthState] = useState<AuthState>(AuthService.currentState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<AuthError | null>(AuthService.error);
  const [user, setUser] = useState<User | null>(AuthService.currentUser);
  const [userId, setUserId] = useState<string | null>(AuthService.userId);
  const [userRole, setUserRole] = useState<string | null>(AuthService.userRole);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [clientStatus, setClientStatus] = useState<ClientProfile['client_status'] | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  
  // Use refs to track loading state for safety timeouts
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clientDataAttempts = useRef<number>(0);
  const sessionId = useRef(DebugUtils.generateSessionId()).current;

  // Clear any existing timeout to prevent memory leaks
  const clearLoadingTimeout = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  // Set a safety timeout to ensure isLoading is eventually set to false
  const setLoadingSafetyTimeout = () => {
    clearLoadingTimeout();
    loadingTimeoutRef.current = setTimeout(() => {
      if (isLoading) {
        DebugUtils.log(sessionId, '[AuthProvider] Safety timeout reached, forcing isLoading to false');
        setIsLoading(false);
      }
    }, CLIENT_DATA_LOADING_TIMEOUT);
  };

  // Initialize the auth context
  useEffect(() => {
    DebugUtils.log(sessionId, '[AuthProvider] Initializing auth context');
    
    // Set safety timeout on initial load
    setLoadingSafetyTimeout();

    // Add auth state listener
    const removeListener = AuthService.addStateListener(async (newState) => {
      DebugUtils.log(sessionId, '[AuthProvider] Auth state changed', { newState });
      setAuthState(newState);
      setUser(AuthService.currentUser);
      setUserId(AuthService.userId);
      setUserRole(AuthService.userRole);
      setAuthError(AuthService.error);
      setAuthInitialized(AuthService.isInitialized);
      
      // Call the callback if provided - fix: get session from supabase directly since AuthService doesn't expose it
      if (onAuthStateChange) {
        const { data: { session } } = await supabase.auth.getSession();
        onAuthStateChange(AuthService.currentUser, session);
      }
      
      if (newState === AuthState.AUTHENTICATED && AuthService.userId) {
        await loadClientData(AuthService.userId);
      } else if (newState === AuthState.UNAUTHENTICATED) {
        // Clear client data when logged out
        setClientProfile(null);
        setClientStatus(null);
        setIsLoading(false);
      }
    });

    // Clean up on unmount
    return () => {
      removeListener();
      clearLoadingTimeout();
    };
  }, [sessionId, onAuthStateChange]);

  // Load client data with retry mechanism
  const loadClientData = async (userId: string | null) => {
    if (!userId) {
      setIsLoading(false);
      // CRITICAL FIX: Default to New status when no user ID
      setClientStatus('New');
      return;
    }
    
    // Reset safety timeout when starting to load client data
    setLoadingSafetyTimeout();
    clientDataAttempts.current += 1;
    
    try {
      DebugUtils.log(sessionId, '[AuthProvider] Loading client data', { userId, attempt: clientDataAttempts.current });
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        DebugUtils.error(sessionId, '[AuthProvider] Error loading client data', error);
        
        // If we get an error but have tried less than 3 times, retry after a short delay
        if (clientDataAttempts.current < 3) {
          DebugUtils.log(sessionId, `[AuthProvider] Retrying client data load (attempt ${clientDataAttempts.current + 1})`);
          setTimeout(() => loadClientData(userId), 1000);
          return;
        }
        
        // Create a minimum profile with just the ID to prevent issues
        const minimalProfile = {
          id: userId,
          client_status: 'New'
        };
        
        setClientProfile(minimalProfile as ClientProfile);
        setClientStatus('New');
        DebugUtils.log(sessionId, '[AuthProvider] Setting minimal client profile after failed retrieval', minimalProfile);
      } else if (data) {
        DebugUtils.log(sessionId, '[AuthProvider] Client data loaded', data);
        setClientProfile(data as ClientProfile);
        
        // CRITICAL FIX: Ensure we're explicitly setting client_status with "New" default
        // Only use a different status if it's explicitly set in the database
        const status = data.client_status || 'New';
        setClientStatus(status);
        DebugUtils.log(sessionId, `[AuthProvider] Client status explicitly set to "${status}"`);
      } else {
        // CRITICAL FIX: No data returned but no error either (unusual case)
        // Create a minimum profile with just the ID
        const minimalProfile = {
          id: userId,
          client_status: 'New'
        };
        
        setClientProfile(minimalProfile as ClientProfile);
        setClientStatus('New');
        DebugUtils.log(sessionId, '[AuthProvider] No client data found, setting minimal profile', minimalProfile);
      }
    } catch (err) {
      DebugUtils.error(sessionId, '[AuthProvider] Exception loading client data', err);
      
      // CRITICAL FIX: Create minimal profile on any kind of error
      const minimalProfile = {
        id: userId,
        client_status: 'New'
      };
      
      setClientProfile(minimalProfile as ClientProfile);
      setClientStatus('New');
      DebugUtils.log(sessionId, '[AuthProvider] Exception occurred, setting minimal profile', minimalProfile);
    } finally {
      // Always set isLoading to false when client data loading completes or fails
      DebugUtils.log(sessionId, '[AuthProvider] Client data loading complete, setting isLoading to false');
      setIsLoading(false);
      clearLoadingTimeout();
      clientDataAttempts.current = 0;
    }
  };

  // Match the refreshUserData return type with the interface
  const refreshUserDataWrapper = async (): Promise<void> => {
    DebugUtils.log(sessionId, '[AuthProvider] Manually refreshing user data');
    await AuthService.refreshSession();
    // After refreshing the session, explicitly reload client data
    if (userId) {
      clientDataAttempts.current = 0; // Reset attempts counter
      await loadClientData(userId);
      DebugUtils.log(sessionId, '[AuthProvider] Client data explicitly reloaded after session refresh');
    }
  };

  // Fix: Ensure methods are bound to the AuthService instance
  const login = (email: string, password: string) => AuthService.signIn(email, password);
  const logout = () => AuthService.signOut();
  const resetPassword = (email: string) => AuthService.resetPassword(email);

  const contextValue = useMemo(() => ({
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
    refreshUserData: refreshUserDataWrapper,
    hasRole: AuthService.hasRole
  }), [authState, isLoading, authInitialized, authError, user, userId, userRole, clientStatus, clientProfile]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export { AuthState } from '@/services/AuthService';
