
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

  // Improved safety timeout for initialization with progressive approach
  useEffect(() => {
    // Use a progressive timeout approach to avoid premature timeouts
    // but still ensure the app doesn't hang indefinitely
    
    // Initial timeout is longer (15 seconds instead of 8)
    const initialTimeoutId = setTimeout(() => {
      if (!authInitialized) {
        console.log('[AuthContext] Initial initialization timeout reached (15s), checking network...');
        
        // Check if network is the issue
        if (!navigator.onLine) {
          console.warn('[AuthContext] Network appears to be offline during initialization');
          setAuthError({
            message: 'Network connectivity issue detected. Please check your internet connection.'
          });
        }
        
        // Set a final timeout that will force initialization after 30 seconds total
        const finalTimeoutId = setTimeout(() => {
          if (!authInitialized) {
            console.warn('[AuthContext] Final initialization timeout reached (30s), forcing initialized state');
            setAuthInitialized(true);
            
            if (authState === AuthState.INITIALIZING) {
              // Default to unauthenticated if we can't determine state
              setAuthState(AuthState.UNAUTHENTICATED);
              setAuthError({
                message: 'Authentication initialization timed out. Some features may be unavailable.'
              });
            }
          }
        }, 15000); // Additional 15 seconds (30s total)
        
        return () => clearTimeout(finalTimeoutId);
      }
    }, 15000); // 15 seconds for initial timeout (increased from 8s)
    
    return () => clearTimeout(initialTimeoutId);
  }, [authInitialized, authState]);
  
  // Improved sync with AuthService initialization state
  useEffect(() => {
    // Only update if the value is actually different to prevent unnecessary renders
    if (AuthService.isInitialized !== authInitialized) {
      console.log(`[AuthContext] Setting authInitialized to: ${AuthService.isInitialized}`);
      setAuthInitialized(AuthService.isInitialized);
    }
    
    // Use a more efficient approach with a single check on mount and then
    // rely on the AuthService state listener for updates
    const checkInitInterval = setInterval(() => {
      if (AuthService.isInitialized !== authInitialized) {
        console.log(`[AuthContext] AuthService initialization changed: ${AuthService.isInitialized}`);
        setAuthInitialized(AuthService.isInitialized);
      }
    }, 3000); // Check every 3 seconds instead of every 1 second to reduce overhead
    
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

  // Improved effect to update isLoading state with debounce to prevent flicker
  useEffect(() => {
    const isStillInitializing = !authInitialized || authState === AuthState.INITIALIZING;
    const isClientDataLoading = authState === AuthState.AUTHENTICATED && loadingClientData;
    const newLoadingState = isStillInitializing || isClientDataLoading;
    
    // Only update state if it's actually changing to avoid unnecessary renders
    if (isLoading !== newLoadingState) {
      // For transitions to non-loading state, add a small delay to prevent flickering
      // if the state changes rapidly back to loading
      if (!newLoadingState && isLoading) {
        const debounceId = setTimeout(() => {
          // Double-check that we still want to set loading to false
          const currentIsStillInitializing = !AuthService.isInitialized || AuthService.currentState === AuthState.INITIALIZING;
          const currentIsClientDataLoading = AuthService.currentState === AuthState.AUTHENTICATED && loadingClientData;
          const currentNewLoadingState = currentIsStillInitializing || currentIsClientDataLoading;
          
          if (!currentNewLoadingState) {
            setIsLoading(false);
            console.log('[AuthContext] Debounced loading state update: false');
          }
        }, 300); // 300ms debounce
        
        return () => clearTimeout(debounceId);
      } else {
        // For transitions to loading state, update immediately
        setIsLoading(newLoadingState);
        console.log(`[AuthContext] Updated loading state: ${newLoadingState} (initializing=${isStillInitializing}, clientDataLoading=${isClientDataLoading})`);
      }
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
