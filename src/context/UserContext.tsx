
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Adjust path as needed
import { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';

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
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
}

const isDev = process.env.NODE_ENV === 'development';
const logInfo = isDev ? console.log : () => {};
const logError = console.error;

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clientStatus, setClientStatus] = useState<ClientProfile['client_status'] | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  
  const [isLoading, setIsLoading] = useState(true); 
  const [authInitialized, setAuthInitialized] = useState(false);

  // Processes session data: sets user state and fetches client-specific data if a user exists.
  // Returns a promise that resolves when processing is complete.
  const processSessionData = useCallback(async (currentAuthUser: SupabaseUser | null) => {
    logInfo("[UserContext] processSessionData for authUser:", currentAuthUser?.id || 'null');
    setUser(currentAuthUser);
    setUserId(currentAuthUser?.id || null);

    if (currentAuthUser) {
      setIsLoading(true); // Indicate loading for client-specific data
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
              setClientStatus('New'); setClientProfile(null);
            } else {
              setClientStatus('ErrorFetchingStatus'); setClientProfile(null);
            }
          } else if (clientData) {
            logInfo('[UserContext DEBUG] Raw clientData from DB:', JSON.stringify(clientData, null, 2));
            setClientProfile(clientData as ClientProfile);
            setClientStatus(clientData.client_status || 'New');
            logInfo('[UserContext] Set clientProfile with age:', clientData.client_age, 'and status:', clientData.client_status);
          } else { 
            setClientStatus('New'); setClientProfile(null);
          }
        } catch (e) {
          logError('[UserContext] Exception fetching client data:', e);
          setClientStatus('ErrorFetchingStatus'); setClientProfile(null);
        }
      } else {
        setClientStatus(null); setClientProfile(null);
      }
      setIsLoading(false); // Finished processing for this user
    } else {
      // No authenticated user, reset all user-specific state
      setUserRole(null);
      setClientStatus(null);
      setClientProfile(null);
      setIsLoading(false); // No user, so not loading anything
    }
  }, []); // Empty: fetchClientSpecificData is stable

  // Effect for initial session check and setting up auth listener
  useEffect(() => {
    logInfo("[UserContext] Main useEffect (mount): Initializing context.");
    let isMounted = true;
    setIsLoading(true);
    setAuthInitialized(false);
    
    // Set a safety timeout to ensure authInitialized gets set 
    // even if Supabase auth calls fail or hang
    const authInitTimeoutId = setTimeout(() => {
      if (isMounted && !authInitialized) {
        logInfo("[UserContext] Safety timeout reached: Force setting authInitialized=true");
        setAuthInitialized(true);
        // Only reset loading if auth is taking too long and we're still loading
        if (isLoading) {
          logInfo("[UserContext] Safety timeout also resetting isLoading=false since still loading");
          setIsLoading(false);
        }
      }
    }, 5000); // 5 second safety timeout

    // 1. Initial Session Check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      logInfo("[UserContext] Initial getSession completed. Session user ID:", session?.user?.id || 'null');
      await processSessionData(session?.user || null);
      if (isMounted) {
        setAuthInitialized(true); // Auth check is complete
        // setIsLoading(false) is handled by processSessionData or set if no session
        logInfo("[UserContext] Initial auth process finished. authInitialized: true");
      }
    }).catch(async (error) => {
      if (!isMounted) return;
      logError("[UserContext] Error in initial getSession:", error);
      await processSessionData(null); // Reset context
      if (isMounted) {
        setAuthInitialized(true); // Still mark as initialized
        setIsLoading(false);      // Ensure loading is false
        logInfo("[UserContext] Initial auth process finished (with error). authInitialized: true, isLoading: false");
      }
    });

    // 2. Auth State Change Listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        logInfo(`[UserContext] onAuthStateChange event: ${event}, User: ${session?.user?.id || 'null'}`);
        await processSessionData(session?.user || null);
        // If this is the very first event that establishes auth state (e.g. INITIAL_SESSION)
        // and getSession hasn't completed yet, ensure authInitialized is set.
        if (isMounted && !authInitialized) {
            setAuthInitialized(true);
            logInfo("[UserContext] authInitialized set to true via onAuthStateChange (if getSession was slow).");
        }
      }
    );

    // Add an additional check after a small delay if authInitialized is still false
    // This helps when neither getSession nor onAuthStateChange callbacks fire
    const shortCheckTimeout = setTimeout(() => {
      if (isMounted && !authInitialized) {
        logInfo("[UserContext] Short timeout check - auth still not initialized");
        // Perform a direct check to Supabase to see if we have a session
        supabase.auth.getUser().then(({ data }) => {
          if (!isMounted) return;
          logInfo("[UserContext] Short timeout getUser check:", data.user?.id || "no user");
          if (data.user) {
            processSessionData(data.user);
          } else {
            processSessionData(null);
          }
          setAuthInitialized(true);
        }).catch(() => {
          if (isMounted) {
            logInfo("[UserContext] Short timeout getUser failed, setting initialized anyway");
            setAuthInitialized(true);
            setIsLoading(false);
          }
        });
      }
    }, 1500); // 1.5 seconds short timeout

    return () => {
      isMounted = false;
      clearTimeout(authInitTimeoutId);
      clearTimeout(shortCheckTimeout);
      logInfo("[UserContext] Cleaning up auth subscription (unmount).");
      authListener?.subscription?.unsubscribe();
    };
  }, [processSessionData, authInitialized, isLoading]); // processSessionData is stable due to useCallback

  const refreshUserData = useCallback(async () => {
    logInfo("[UserContext] refreshUserData explicitly called.");
    setIsLoading(true); // Indicate loading for the refresh operation
    const { data: { session } } = await supabase.auth.getSession(); 
    await processSessionData(session?.user || null);
    // processSessionData will set isLoading to false at its end.
    // authInitialized should remain true.
    logInfo("[UserContext] refreshUserData finished.");
  }, [processSessionData]);

  const logout = async () => {
    logInfo("[UserContext] Logging out user...");
    // setIsLoading(true); // processSessionData called by onAuthStateChange will handle loading state
    try {
      await supabase.auth.signOut();
      logInfo("[UserContext] Supabase signOut successful.");
      // The onAuthStateChange listener will fire with SIGNED_OUT,
      // which will call processSessionData(null), resetting state and setting isLoading=false.
    } catch (error) {
      logError("[UserContext] Error during supabase.auth.signOut():", error);
      // Even on error, try to ensure a clean state locally
      await processSessionData(null); // Reset user state
      if (authInitialized) setIsLoading(false); // If auth was initialized, stop loading
    }
  };

  return (
    <UserContext.Provider value={{ user, userId, userRole, clientStatus, clientProfile, isLoading, authInitialized, refreshUserData, logout }}>
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
