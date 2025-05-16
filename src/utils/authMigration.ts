
/**
 * Migration utility to help with the transition from old auth system to new auth system
 */

import AuthService, { AuthState } from '@/services/AuthService';

/**
 * Extract any useful information from the old localStorage auth data
 * and migrate it to the new system
 */
export const migrateStoredAuthData = (): boolean => {
  try {
    const oldAuthKey = 'valorwell_auth_state';
    const oldAuthData = localStorage.getItem(oldAuthKey);
    
    if (oldAuthData) {
      const parsedData = JSON.parse(oldAuthData);
      console.log('[AuthMigration] Found old auth data:', parsedData);
      
      // If we have the old data and we're not already authenticated,
      // we can use it to assist in debugging
      if (AuthService.currentState !== AuthState.AUTHENTICATED && parsedData.userId) {
        console.log('[AuthMigration] Previous user ID:', parsedData.userId);
        console.log('[AuthMigration] Previous user role:', parsedData.userRole);
      }
      
      // Remove old auth data
      localStorage.removeItem(oldAuthKey);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[AuthMigration] Error migrating auth data:', error);
    return false;
  }
};

/**
 * Detect possible issues based on auth behavior
 */
export const diagnoseAuthIssues = (): { issues: string[] } => {
  const issues: string[] = [];
  
  try {
    // Check for missing Supabase config
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url || url === 'undefined') {
      issues.push('Missing Supabase URL in environment variables');
    }
    
    if (!anonKey || anonKey === 'undefined') {
      issues.push('Missing Supabase Anon Key in environment variables');
    }
    
    // Check for issues with localStorage
    try {
      localStorage.setItem('auth_test', 'test');
      localStorage.removeItem('auth_test');
    } catch (e) {
      issues.push('Browser storage (localStorage) is not available');
    }
    
    // Check for errors in the service
    const currentError = AuthService.error;
    if (currentError) {
      issues.push(`Auth service error: ${currentError.message}`);
    }
    
    // Check for inconsistent state between service and stored data
    const storedAuthData = localStorage.getItem('auth_session_cache');
    if (storedAuthData) {
      try {
        const parsedData = JSON.parse(storedAuthData);
        if (!parsedData.user && AuthService.currentState === AuthState.AUTHENTICATED) {
          issues.push('Inconsistent auth state: service thinks user is authenticated but no user data found');
        }
      } catch (e) {
        issues.push('Corrupted auth data in localStorage');
      }
    }
    
    return { issues };
  } catch (e) {
    issues.push(`Exception during diagnosis: ${(e as Error).message}`);
    return { issues };
  }
};

/**
 * Get readable auth state
 */
export const getAuthStateInfo = () => {
  return {
    currentState: AuthService.currentState,
    isInitialized: AuthService.isInitialized,
    userId: AuthService.userId,
    userRole: AuthService.userRole,
    hasError: !!AuthService.error,
    errorMessage: AuthService.error?.message
  };
};

/**
 * Reset auth state
 */
export const resetAuthState = async () => {
  try {
    // Clear all local storage related to auth
    localStorage.removeItem('auth_session_cache');
    localStorage.removeItem('valorwell_auth_state');
    localStorage.removeItem('supabase.auth.token');
    
    // Try to sign out via auth service first
    try {
      await AuthService.signOut();
    } catch (err) {
      console.log('[AuthMigration] Error signing out via service:', err);
      // Continue with reset anyway
    }
    
    console.log('[AuthMigration] Auth state reset complete, reloading page');
    
    // Reload the page to ensure clean state
    setTimeout(() => {
      window.location.reload();
    }, 500);
    
    return { success: true };
  } catch (error) {
    console.error('[AuthMigration] Error resetting auth state:', error);
    return {
      success: false,
      error: `Failed to reset auth state: ${(error as Error).message}`
    };
  }
};

/**
 * Force initialization to complete
 * This is a last-resort function to help recover from stuck initialization
 */
export const forceAuthInitialization = () => {
  try {
    // This is a bit of a hack, but it helps recover from stuck initialization
    const currentState = AuthService.currentState;
    console.log(`[AuthMigration] Forcing auth initialization from state: ${currentState}`);
    
    // Update localStorage to match current state
    // This will be picked up on next page load
    localStorage.setItem('auth_initialization_forced', 'true');
    
    // Reload the page to pick up changes
    window.location.reload();
    
    return { success: true };
  } catch (error) {
    console.error('[AuthMigration] Error forcing auth initialization:', error);
    return {
      success: false,
      error: `Failed to force auth initialization: ${(error as Error).message}`
    };
  }
};
