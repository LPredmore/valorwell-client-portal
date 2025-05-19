
import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import AuthService, { AuthState, AuthError } from '@/services/AuthService';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { DebugUtils } from '@/utils/debugUtils';
import { toast } from 'sonner';

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
  forceRefreshAuth: () => Promise<boolean>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Maximum time to wait for client data loading before forcing isLoading to false
const CLIENT_DATA_LOADING_TIMEOUT = 15000; // 15 seconds (increased from 10s)
const CLIENT_DATA_MAX_RETRIES = 5; // Maximum retries for loading client data (increased from 3)
const CLIENT_DATA_RETRY_DELAY = 1500; // Delay between retries in ms (increased from 1000ms)

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
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  
  // Use refs to track loading state for safety timeouts
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clientDataAttempts = useRef<number>(0);
  const sessionId = useRef(DebugUtils.generateSessionId()).current;
  const profileLoadingRef = useRef<boolean>(false);

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
        
        // If we're still waiting for client data but timeout is reached, create minimal profile
        if (profileLoadingRef.current && AuthService.currentState === AuthState.AUTHENTICATED && AuthService.userId) {
          DebugUtils.log(sessionId, '[AuthProvider] Client data loading timed out, creating minimal profile');
          createMinimalProfile(AuthService.userId);
          profileLoadingRef.current = false;
        }
      }
    }, CLIENT_DATA_LOADING_TIMEOUT);
  };

  // Create minimal profile when we cannot load from database
  const createMinimalProfile = (userId: string) => {
    const minimalProfile = {
      id: userId,
      client_status: 'New',
      client_is_profile_complete: false
    };
    
    setClientProfile(minimalProfile as ClientProfile);
    setClientStatus('New');
    DebugUtils.log(sessionId, '[AuthProvider] Created minimal profile for recovery', minimalProfile);
    toast.warning("Using limited profile data. Some features may be unavailable.");
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
      
      if (newState === AuthState.AUTHENTICATED && AuthService.userId) {
        await loadClientData(AuthService.userId);
      } else if (newState === AuthState.UNAUTHENTICATED) {
        // Clear client data when logged out
        setClientProfile(null);
        setClientStatus(null);
        setIsLoading(false); // Ensure we're not stuck in loading state when logged out
      } else if (newState === AuthState.ERROR && AuthService.userId) {
        // Try to use any cached data we might have
        const minimalProfile = {
          id: AuthService.userId,
          client_status: 'New',
          client_is_profile_complete: false
        };
        setClientProfile(minimalProfile as ClientProfile);
        setClientStatus('New');
        setIsLoading(false);
      }
    });

    // Clean up on unmount
    return () => {
      removeListener();
      clearLoadingTimeout();
    };
  }, [sessionId]);

  // Load client data with enhanced retry mechanism
  const loadClientData = async (userId: string | null, retryCount = 0) => {
    if (!userId) {
      setIsLoading(false);
      // CRITICAL FIX: Default to New status when no user ID
      setClientStatus('New');
      return;
    }
    
    // Set flag to indicate we're loading profile data
    profileLoadingRef.current = true;
    
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
        
        // If we get an error but have tried less than max retries, retry after a short delay
        if (retryCount < CLIENT_DATA_MAX_RETRIES) {
          DebugUtils.log(sessionId, `[AuthProvider] Retrying client data load (attempt ${retryCount + 1})`);
          setTimeout(() => loadClientData(userId, retryCount + 1), CLIENT_DATA_RETRY_DELAY);
          return;
        }
        
        // Create a minimum profile with just the ID to prevent issues
        createMinimalProfile(userId);
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
        createMinimalProfile(userId);
      }
    } catch (err) {
      DebugUtils.error(sessionId, '[AuthProvider] Exception loading client data', err);
      
      // Retry if we haven't exceeded max retries
      if (retryCount < CLIENT_DATA_MAX_RETRIES) {
        setTimeout(() => loadClientData(userId, retryCount + 1), CLIENT_DATA_RETRY_DELAY);
        return;
      }
      
      // CRITICAL FIX: Create minimal profile on any kind of error
      createMinimalProfile(userId);
    } finally {
      // Always set isLoading to false when client data loading completes or fails
      // And reset the profile loading flag
      if (retryCount >= CLIENT_DATA_MAX_RETRIES || !profileLoadingRef.current) {
        DebugUtils.log(sessionId, '[AuthProvider] Client data loading complete, setting isLoading to false');
        setIsLoading(false);
        clearLoadingTimeout();
        clientDataAttempts.current = 0;
        profileLoadingRef.current = false;
      }
    }
  };

  // Match the refreshUserData return type with the interface
  const refreshUserDataWrapper = async (): Promise<void> => {
    DebugUtils.log(sessionId, '[AuthProvider] Manually refreshing user data');
    setIsLoading(true); // Set loading state during refresh
    
    // First refresh the auth session
    const sessionRefreshed = await AuthService.refreshSession();
    
    // Then explicitly reload client data
    if (userId) {
      clientDataAttempts.current = 0; // Reset attempts counter
      await loadClientData(userId);
      DebugUtils.log(sessionId, '[AuthProvider] Client data explicitly reloaded after session refresh');
    } else {
      setIsLoading(false); // Ensure we're not stuck in loading state if no userId
    }
    
    // If session refresh failed but we have userId, try to create minimal profile
    if (!sessionRefreshed && userId) {
      createMinimalProfile(userId);
    }
  };

  // Add a method to force refresh auth - useful for recovery UI
  const forceRefreshAuth = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Reset and reinitialize auth service
      await AuthService.resetAndReinitialize();
      
      // Force refresh session
      const result = await AuthService.forceRefreshSession();
      
      // Reload client data if needed
      if (result && AuthService.userId) {
        await loadClientData(AuthService.userId, 0);
      } else {
        setIsLoading(false);
      }
      
      return result;
    } catch (error) {
      console.error("[AuthProvider] Force refresh failed:", error);
      setIsLoading(false);
      return false;
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
    hasRole: AuthService.hasRole,
    forceRefreshAuth
  }), [authState, isLoading, authInitialized, authError, user, userId, userRole, clientStatus, clientProfile]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export { AuthState } from '@/services/AuthService';
