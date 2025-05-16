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

  const fetchClientSpecificData = useCallback(async (currentAuthUser: SupabaseUser) => {
    logInfo("[UserContext] fetchClientSpecificData - START for user:", currentAuthUser.id);
    // This function is now responsible for its own loading state during client data fetch
    // The overall context isLoading might already be false if auth is initialized but user logs in later.
    // However, to signal that client-specific data is being fetched, we set isLoading true here.
    setIsLoading(true); 

    const role = currentAuthUser.user_metadata?.role || 'client';
    setUserRole(role);
    logInfo(`[UserContext] fetchClientSpecificData - User role set: ${role}`);

    if (role === 'client' || role === 'admin' || role === 'clinician') {
      try {
        const { data: clientData, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', currentAuthUser.id)
          .single();

        if (error) {
          logError('[UserContext] fetchClientSpecificData - Error fetching client data:', error);
          if (error.code === 'PGRST116') {
            setClientStatus('New'); setClientProfile(null);
          } else {
            setClientStatus('ErrorFetchingStatus'); setClientProfile(null);
          }
        } else if (clientData) {
          logInfo('[UserContext DEBUG] fetchClientSpecificData - Raw clientData from DB:', JSON.stringify(clientData, null, 2));
          setClientProfile(clientData as ClientProfile);
          setClientStatus(clientData.client_status || 'New');
          logInfo('[UserContext] fetchClientSpecificData - Set clientProfile with age:', clientData.client_age, 'and status:', clientData.client_status);
        } else { 
          logInfo('[UserContext DEBUG] fetchClientSpecificData - No clientData returned (but no error). Setting status to New.');
          setClientStatus('New'); setClientProfile(null);
        }
      } catch (e) {
        logError('[UserContext] fetchClientSpecificData - Exception fetching client data:', e);
        setClientStatus('ErrorFetchingStatus'); setClientProfile(null);
      }
    } else {
      setClientStatus(null); setClientProfile(null);
      logInfo(`[UserContext] fetchClientSpecificData - User role '${role}' does not require client status/profile fetch.`);
    }
    setIsLoading(false); // Done with client-specific data fetching
    logInfo("[UserContext] fetchClientSpecificData - END. isLoading set to false.");
  }, []); 

  useEffect(() => {
    logInfo("[UserContext] Main useEffect (mount): Initializing. Setting up auth listener and initial session check.");
    let isMounted = true;
    // Start with isLoading true and authInitialized false.
    // These will be updated once the initial session check is complete.
    setIsLoading(true);
    setAuthInitialized(false);

    // 1. Initial Session Check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      logInfo("[UserContext] Initial getSession completed. Session user ID:", session?.user?.id || 'null');
      
      setUser(session?.user || null);
      setUserId(session?.user?.id || null);

      if (session?.user) {
        // fetchClientSpecificData will manage its own isLoading for this part
        await fetchClientSpecificData(session.user);
      } else {
        // No initial session, reset client specific data and ensure loading is false
        setUserRole(null);
        setClientStatus(null);
        setClientProfile(null);
        setIsLoading(false); // No user, so no further data to load
      }
      
      if (isMounted) {
        setAuthInitialized(true); // CRITICAL: Auth has now been checked
        // If there was no session user, fetchClientSpecificData wasn't called to set isLoading to false.
        // So, ensure isLoading is false if it's still true.
        if (isLoading) setIsLoading(false); 
        logInfo("[UserContext] Initial auth process finished. authInitialized: true, isLoading:", isLoading);
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
        
        // When auth state changes, we might need to fetch new user data.
        // isLoading will be true during this fetch if session.user exists.
        setUser(session?.user || null);
        setUserId(session?.user?.id || null);

        if (session?.user) {
          await fetchClientSpecificData(session.user); // This will set isLoading true then false
        } else {
          // User signed out or session became null
          setUserRole(null);
          setClientStatus(null);
          setClientProfile(null);
          setIsLoading(false); // No user, so not loading user-specific data
          logInfo("[UserContext] onAuthStateChange: User signed out or session null. isLoading set to false.");
        }
        
        // authInitialized should have been set by getSession.
        // This is a safeguard if onAuthStateChange fires with INITIAL_SESSION before getSession resolves.
        if (isMounted && !authInitialized) {
            logInfo(`[UserContext] onAuthStateChange: authInitialized was false, event: ${event}. Setting authInitialized=true (safeguard).`);
            setAuthInitialized(true);
            // If there's no session user at this point, ensure isLoading is also false.
            if (!session?.user && isLoading) {
                setIsLoading(false);
            }
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
    // setIsLoading(true); // fetchClientSpecificData will handle its own loading state
    const { data: { session } } = await supabase.auth.getSession(); 
    if (session?.user) {
        await fetchClientSpecificData(session.user);
    } else {
        setUser(null); setUserId(null); setUserRole(null); 
        setClientStatus(null); setClientProfile(null);
        setIsLoading(false); // Ensure loading is false if no user to refresh
    }
    // authInitialized should already be true. isLoading is handled by fetchClientSpecificData or set false if no user.
    logInfo("[UserContext] refreshUserData finished. isLoading:", isLoading, "authInitialized:", authInitialized);
  }, [fetchClientSpecificData]);

  const logout = async () => {
    logInfo("[UserContext] Logging out user...");
    // setIsLoading(true); // onAuthStateChange will trigger isLoading changes via fetchClientSpecificData(null)
    
    try {
      await supabase.auth.signOut();
      logInfo("[UserContext] Supabase signOut successful.");
      // The onAuthStateChange listener will fire with SIGNED_OUT,
      // which will call fetchClientSpecificData(null) (which resets user state)
      // and then set isLoading=false.
      // For more immediate UI feedback, you can reset basic user state here,
      // but the listener is the source of truth for post-logout state.
      setUser(null);
      setUserId(null);
      setUserRole(null);
      // clientStatus and clientProfile will be reset by fetchClientSpecificData(null)
    } catch (error) {
      logError("[UserContext] Error during supabase.auth.signOut():", error);
    } 
    // No finally block needed to set isLoading/authInitialized, as onAuthStateChange handles it.
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
