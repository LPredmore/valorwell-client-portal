
/**
 * Utility functions for migrating auth data from the old system to the new system
 */
import { cleanupOldAuthKeys } from './authCleanup';

/**
 * Migrates stored auth data from the old format to the new format
 * Returns true if migration was performed, false if not needed
 */
export const migrateStoredAuthData = (): boolean => {
  console.log('[AuthMigration] Checking for auth data to migrate...');
  
  try {
    // Clean up old auth keys first
    cleanupOldAuthKeys();
    
    const oldAuthStateKey = 'valorwell_auth_state';
    const oldAuthTokenKey = 'supabase.auth.token';
    const newAuthCacheKey = 'auth_session_cache';
    
    // Check if there's any old auth data to migrate
    const hasOldAuthState = localStorage.getItem(oldAuthStateKey) !== null;
    const hasOldAuthToken = localStorage.getItem(oldAuthTokenKey) !== null;
    
    // If there's nothing to migrate, return early
    if (!hasOldAuthState && !hasOldAuthToken) {
      console.log('[AuthMigration] No auth data to migrate');
      return false;
    }
    
    console.log('[AuthMigration] Found old auth data, performing migration');
    
    // Remove old keys - already handled by cleanupOldAuthKeys()
    // The new auth system will handle initialization itself
    
    return true;
  } catch (error) {
    console.error('[AuthMigration] Error during migration:', error);
    return false;
  }
};

/**
 * Diagnoses auth issues and returns information about them
 */
export const diagnoseAuthIssues = (): { issues: string[] } => {
  console.log('[AuthMigration] Diagnosing auth issues...');
  const issues: string[] = [];
  
  try {
    // Check for localStorage access
    try {
      localStorage.setItem('auth_test', 'test');
      localStorage.removeItem('auth_test');
    } catch (e) {
      issues.push('Unable to access localStorage. This may be due to browser privacy settings or incognito mode.');
    }
    
    // Check for inconsistent auth state
    const authSessionCache = localStorage.getItem('auth_session_cache');
    if (authSessionCache) {
      try {
        const parsedCache = JSON.parse(authSessionCache);
        if (!parsedCache || !parsedCache.access_token) {
          issues.push('Auth session cache exists but appears to be invalid or incomplete.');
        }
        
        // Check for expired tokens
        if (parsedCache.expires_at && new Date(parsedCache.expires_at * 1000) < new Date()) {
          issues.push('Auth session appears to be expired but not properly cleared.');
        }
      } catch (e) {
        issues.push('Auth session cache exists but cannot be parsed as valid JSON.');
      }
    }
    
    // Check for old auth data that might not have been migrated properly
    const oldKeys = [
      'valorwell_auth_state',
      'supabase.auth.token',
      'auth_initialization_forced'
    ];
    
    const remainingOldKeys = oldKeys.filter(key => localStorage.getItem(key) !== null);
    if (remainingOldKeys.length > 0) {
      issues.push(`Old auth keys found that were not properly migrated: ${remainingOldKeys.join(', ')}`);
    }
    
  } catch (error) {
    issues.push(`Unexpected error during auth diagnostics: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return { issues };
};

/**
 * Resets the auth state by clearing all auth-related data
 */
export const resetAuthState = async (): Promise<void> => {
  console.log('[AuthMigration] Resetting auth state...');
  
  try {
    // Clear all auth-related localStorage keys
    const keysToRemove = [
      'auth_session_cache',
      'valorwell_auth_state',
      'supabase.auth.token',
      'auth_initialization_forced'
    ];
    
    keysToRemove.forEach(key => {
      try {
        if (localStorage.getItem(key)) {
          console.log(`[AuthMigration] Removing ${key} from localStorage`);
          localStorage.removeItem(key);
        }
      } catch (e) {
        console.error(`[AuthMigration] Error removing ${key}:`, e);
      }
    });
    
    console.log('[AuthMigration] Auth state reset complete');
    
    // After a short delay, reload the page to reinitialize auth
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.error('[AuthMigration] Error during auth state reset:', error);
  }
};
