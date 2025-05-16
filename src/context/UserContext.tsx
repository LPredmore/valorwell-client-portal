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
  isLoading: boolean; // True if initial auth check is pending OR user-specific data is being fetched
  authInitialized: boolean; // True once the initial attempt to get session has completed
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
}

// Environment-based logging control (from your provided file)
const isDev = process.env.NODE_ENV === 'development';
const logInfo = isDev ? console.log : () => {};
const logError = console.error; // Always log errors

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clientStatus, setClientStatus] = useState<ClientProfile['client_status'] | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  
  const [isLoading, setIsLoading] = useState(true); 
  const [authInitialized, setAuthInitialized] = useState(false);

  // Fetches client-specific data if a user is authenticated.
  // This function is called after we know who the user is.
  const fetchClientSpecificData = useCallback(async (currentAuthUser: SupabaseUser) => {
    logInfo("[UserContext] fetchClientSpecificData called for user:", currentAuthUser.id);
    // setIsLoading(true); // isLoading for this specific fetch is managed by its caller if needed

    const role = currentAuthUser.user_metadata?.role || 'client';
    setUserRole(role); // Set role based on currentAuthUser
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
            logInfo('[UserContext] No client record found, status set to New.');
          } else {
            setClientStatus('ErrorFetchingStatus'); setClientProfile(null);
          }
        } else if (clientData) {
          logInfo('[UserContext DEBUG] Raw clientData from DB:', JSON.stringify(clientData, null, 2));
          setClientProfile(clientData as ClientProfile);
          setClientStatus(clientData.client_status || 'New');
          logInfo('[UserContext] Set clientProfile with age:', clientData.client_age, 'and status:', clientData.client_status);
        } else { 
          logInfo('[UserContext DEBUG] No clientData returned (but no error). Setting status to New.');
          setClientStatus('New'); setClientProfile(null);
        }
      } catch (e) {
        logError('[UserContext] Exception fetching client data:', e);
        setClientStatus('ErrorFetchingStatus'); setClientProfile(null);
      }
    } else {
      // For roles that don't have a 'clients' table record or specific status
      setClientStatus(null); setClientProfile(null);
      logInfo(`[UserContext] User role '${role}' does not require client status/profile fetch.`);
    }
    // setIsLoading(false); // isLoading is managed by the calling effect (main useEffect or refreshUserData)
  }, []);

  // Main effect for initialization and auth state changes
  useEffect(() => {
    logInfo("[UserContext] Main useEffect: Setting up initial session check and auth listener.");
    let isMounted = true;
    setIsLoading(true);       // Start in loading state for the entire initialization
    setAuthInitialized(false); // Explicitly false until getSession completes

    // 1. Initial Session Check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      logInfo("[UserContext] Initial getSession completed. Session user ID:", session?.user?.id || 'null');
      
      setUser(session?.user || null);
      setUserId(session?.user?.id || null);

      if (session?.user) {
        await fetchClientSpecificData(session.user);
      } else {
        // No initial session, reset client specific data
        setUserRole(null);
        setClientStatus(null);
        setClientProfile(null);
      }
      
      if (isMounted) {
        setAuthInitialized(true); // CRITICAL: Auth has been checked
        setIsLoading(false);      // CRITICAL: Initial loading sequence is complete
        logInfo("[UserContext] Initial auth process finished. authInitialized: true, isLoading: false");
      }
    }).catch(async (error) => {
      if (!isMounted) return;
      logError("[UserContext] Error in initial getSession:", error);
      setUser(null); setUserId(null); setUserRole(null); setClientStatus(null); setClientProfile(null);
      if (isMounted) {
        setAuthInitialized(true); // Still mark as initialized so app doesn't hang
        setIsLoading(false);      // Initial loading sequence is complete (even with error)
        logInfo("[UserContext] Initial auth process finished (with error). authInitialized: true, isLoading: false");
      }
    });

    // 2. Auth State Change Listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        logInfo(`[UserContext] onAuthStateChange event: ${event}, User: ${session?.user?.id || 'null'}`);
        
        // Set overall loading true when auth state changes, as we'll fetch user data
        setIsLoading(true); 
        setUser(session?.user || null);
        setUserId(session?.user?.id || null);

        if (session?.user) {
          await fetchClientSpecificData(session.user);
        } else {
          // User signed out or session became null
          setUserRole(null);
          setClientStatus(null);
          setClientProfile(null);
        }
        // After processing the change, set loading to false.
        // authInitialized should already be true from the initial getSession call.
        if(isMounted) {
            setIsLoading(false);
            // Ensure authInitialized is true if this is the first meaningful event
            if (!authInitialized) {
                setAuthInitialized(true); 
                logInfo("[UserContext] authInitialized set to true via onAuthStateChange as a safeguard.");
            }
            logInfo(`[UserContext] onAuthStateChange processed. isLoading: false, authInitialized: ${authInitialized}`);
        }
      }
    );

    return () => {
      isMounted = false;
      logInfo("[UserContext] Cleaning up auth subscription (unmount).");
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchClientSpecificData]); // fetchClientSpecificData is stable

  const refreshUserData = useCallback(async () => {
    logInfo("[UserContext] refreshUserData explicitly called.");
    setIsLoading(true); // Indicate loading during refresh
    const { data: { session } } = await supabase.auth.getSession(); 
    if (session?.user) {
        await fetchClientSpecificData(session.user);
    } else {
        setUser(null); setUserId(null); setUserRole(null); 
        setClientStatus(null); setClientProfile(null);
    }
    setIsLoading(false); // Ensure loading is false after refresh attempt
    setAuthInitialized(true); // Ensure auth is considered initialized
    logInfo("[UserContext] refreshUserData finished. isLoading: false, authInitialized: true");
  }, [fetchClientSpecificData]);

  const logout = async () => {
    logInfo("[UserContext] Logging out user...");
    setIsLoading(true);
    
    try {
      await supabase.auth.signOut();
      logInfo("[UserContext] Supabase signOut successful.");
      // The onAuthStateChange listener will fire with SIGNED_OUT,
      // which will call fetchClientSpecificData(null) and then set isLoading=false.
      // For immediate UI feedback, we can also clear state here, but the listener is the primary mechanism.
      setUser(null); setUserId(null); setUserRole(null); 
      setClientStatus(null); setClientProfile(null);
    } catch (error) {
      logError("[UserContext] Error during supabase.auth.signOut():", error);
    } finally {
        // Ensure states are correctly set after logout attempt, even if listener is delayed
        setAuthInitialized(true); // Auth system has been initialized, now user is just logged out
        setIsLoading(false);
        logInfo("[UserContext] Logout process finished. isLoading: false, authInitialized: true");
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
