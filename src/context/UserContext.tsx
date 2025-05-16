
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';

// Auth states as an enum for better type safety and clarity
export enum AuthState {
  INITIALIZING = 'initializing',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  ERROR = 'error'
}

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

interface UserContextType {
  user: SupabaseUser | null;
  userId: string | null;
  userRole: string | null;
  clientStatus: ClientProfile['client_status'] | null;
  clientProfile: ClientProfile | null;
  isLoading: boolean;
  authInitialized: boolean;
  authState: AuthState;
  authError: Error | null;
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
}

const isDev = process.env.NODE_ENV === 'development';
const logInfo = isDev ? console.log : () => {};
const logError = console.error;

const LOCAL_STORAGE_AUTH_KEY = 'valorwell_auth_state';

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clientStatus, setClientStatus] = useState<ClientProfile['client_status'] | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authState, setAuthState] = useState<AuthState>(AuthState.INITIALIZING);
  const [authError, setAuthError] = useState<Error | null>(null);
  
  // Try to restore auth state from localStorage to prevent flicker on page reload
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem(LOCAL_STORAGE_AUTH_KEY);
      if (savedAuth) {
        const parsedAuth = JSON.parse(savedAuth);
        if (parsedAuth.userId) {
          setUserId(parsedAuth.userId);
          setUserRole(parsedAuth.userRole);
          setAuthInitialized(true);
          setAuthState(AuthState.AUTHENTICATED);
          logInfo("[UserContext] Restored auth state from localStorage");
        }
      }
    } catch (error) {
      logError("[UserContext] Failed to restore auth state from localStorage:", error);
      // Continue with normal auth flow
    }
  }, []);

  // Processes session data: sets user state and fetches client-specific data if a user exists.
  const processSessionData = useCallback(async (currentAuthUser: SupabaseUser | null) => {
    logInfo("[UserContext] processSessionData for authUser:", currentAuthUser?.id || 'null');
    setUser(currentAuthUser);
    setUserId(currentAuthUser?.id || null);

    if (currentAuthUser) {
      setIsLoading(true);
      setAuthState(AuthState.AUTHENTICATED);
      
      // Save basic auth info to localStorage for faster restores
      try {
        localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify({
          userId: currentAuthUser.id,
          userRole: currentAuthUser.user_metadata?.role || 'client'
        }));
      } catch (e) {
        // Ignore localStorage errors
      }
      
      const role = currentAuthUser.user_metadata?.role || 'client';
      setUserRole(role);
      logInfo(`[UserContext] User role set: ${role}`);

      if (role === 'client' || role === 'admin' || role === 'clinician') {
        try {
          const { data: clientData, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', currentAuthUser.id)
            .single();

          if (error) {
            logError('[UserContext] Error fetching client data:', error);
            if (error.code === 'PGRST116') { // No row found
              setClientStatus('New'); 
              setClientProfile(null);
            } else {
              setClientStatus('ErrorFetchingStatus'); 
              setClientProfile(null);
            }
          } else if (clientData) {
            setClientProfile(clientData as ClientProfile);
            setClientStatus(clientData.client_status || 'New');
            logInfo('[UserContext] Set clientProfile with age:', clientData.client_age, 'and status:', clientData.client_status);
          } else { 
            setClientStatus('New'); 
            setClientProfile(null);
          }
        } catch (e) {
          logError('[UserContext] Exception fetching client data:', e);
          setClientStatus('ErrorFetchingStatus'); 
          setClientProfile(null);
        }
      } else {
        setClientStatus(null); 
        setClientProfile(null);
      }
    } else {
      setAuthState(AuthState.UNAUTHENTICATED);
      
      // Clear stored auth info
      try {
        localStorage.removeItem(LOCAL_STORAGE_AUTH_KEY);
      } catch (e) {
        // Ignore localStorage errors
      }
      
      // No authenticated user, reset all user-specific state
      setUserRole(null);
      setClientStatus(null);
      setClientProfile(null);
    }
    
    setIsLoading(false);
    setAuthInitialized(true);
  }, []);

  // Effect for initial session check and setting up auth listener
  useEffect(() => {
    logInfo("[UserContext] Main useEffect: Initializing auth context");
    let isMounted = true;
    setAuthState(AuthState.INITIALIZING);
    setIsLoading(true);
    setAuthInitialized(false);
    setAuthError(null);
    
    // Set a safety timeout to ensure authInitialized gets set 
    // even if Supabase auth calls fail or hang
    const authInitTimeoutId = setTimeout(() => {
      if (isMounted) {
        logInfo("[UserContext] Safety timeout reached: Force setting authInitialized=true");
        setAuthInitialized(true);
        
        if (authState === AuthState.INITIALIZING) {
          logInfo("[UserContext] Auth still initializing after timeout, setting to error state");
          setAuthState(AuthState.ERROR);
          setAuthError(new Error("Authentication initialization timeout"));
          setIsLoading(false);
        }
      }
    }, 5000);

    // Helper function to handle any errors in the authentication process
    const handleAuthError = (error: any) => {
      logError("[UserContext] Auth error:", error);
      setAuthError(error instanceof Error ? error : new Error(String(error)));
      setAuthState(AuthState.ERROR);
      setAuthInitialized(true);
      setIsLoading(false);
    };

    // Initial Session Check with Promise.race to handle timeouts
    const sessionCheckPromise = supabase.auth.getSession();
    const sessionPromise = Promise.race([
      sessionCheckPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("getSession timeout")), 3000)
      )
    ]);
    
    sessionPromise
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        logInfo("[UserContext] Initial getSession completed. Session user ID:", session?.user?.id || 'null');
        return processSessionData(session?.user || null);
      })
      .catch(async (error) => {
        if (!isMounted) return;
        logError("[UserContext] Error in initial getSession:", error);
        
        // Fallback direct user check
        try {
          const { data, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;
          
          logInfo("[UserContext] Fallback getUser successful, user ID:", data?.user?.id || 'null');
          return processSessionData(data?.user || null);
        } catch (fallbackError) {
          handleAuthError(fallbackError);
          return processSessionData(null); // Reset context with no user
        }
      })
      .finally(() => {
        if (isMounted) {
          logInfo("[UserContext] Initial auth process completed");
        }
      });

    // Auth State Change Listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        logInfo(`[UserContext] onAuthStateChange event: ${event}, User: ${session?.user?.id || 'null'}`);
        
        try {
          await processSessionData(session?.user || null);
        } catch (error) {
          handleAuthError(error);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(authInitTimeoutId);
      authListener?.subscription?.unsubscribe();
      logInfo("[UserContext] Cleaned up auth subscription");
    };
  }, [processSessionData]);

  const refreshUserData = useCallback(async () => {
    logInfo("[UserContext] refreshUserData explicitly called");
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession(); 
      await processSessionData(session?.user || null);
      logInfo("[UserContext] refreshUserData finished");
    } catch (error) {
      logError("[UserContext] Error refreshing user data:", error);
      setAuthError(error instanceof Error ? error : new Error(String(error)));
      setIsLoading(false);
    }
  }, [processSessionData]);

  const logout = async () => {
    logInfo("[UserContext] Logging out user...");
    
    try {
      await supabase.auth.signOut();
      logInfo("[UserContext] Supabase signOut successful");
      
      // Clear local storage
      try {
        localStorage.removeItem(LOCAL_STORAGE_AUTH_KEY);
      } catch (e) {
        // Ignore localStorage errors
      }
      
      // The onAuthStateChange listener will handle the state update
    } catch (error) {
      logError("[UserContext] Error during sign out:", error);
      setAuthError(error instanceof Error ? error : new Error(String(error)));
      
      // Even on error, try to ensure a clean state locally
      await processSessionData(null);
    }
  };

  return (
    <UserContext.Provider 
      value={{ 
        user, 
        userId, 
        userRole, 
        clientStatus, 
        clientProfile, 
        isLoading, 
        authInitialized,
        authState,
        authError,
        refreshUserData, 
        logout 
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
