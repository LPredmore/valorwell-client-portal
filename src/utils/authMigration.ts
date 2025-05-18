
/**
 * Authentication Migration Utilities
 * 
 * This file contains utilities for migrating from the old authentication system (UserContext)
 * to the new authentication system (NewAuthContext).
 */

import { supabase } from '@/integrations/supabase/client';

// Constants for localStorage keys
const OLD_AUTH_KEY = 'valorwell_auth_state';
const NEW_AUTH_KEY = 'auth_session_cache';
const LEGACY_KEYS = ['supabase.auth.token', 'auth_initialization_forced'];

/**
 * Migrates stored authentication data from the old format to the new format
 * @returns Object containing information about the migration
 */
// Flag to track if migration has been attempted in this session
let migrationAttempted = false;

export const migrateStoredAuthData = (): {
  migrated: boolean;
  oldUserId?: string;
  oldRole?: string;
  message: string;
  alreadyMigrated?: boolean;
} => {
  // Check if migration has already been completed in a previous session
  const previouslyMigrated = localStorage.getItem('auth_migration_completed') === 'true';
  if (previouslyMigrated) {
    console.log('[AuthMigration] Migration was already completed in a previous session');
    return {
      migrated: false,
      alreadyMigrated: true,
      message: 'Migration was already completed in a previous session'
    };
  }
  
  // Check if migration has already been attempted in this session
  if (migrationAttempted) {
    console.log('[AuthMigration] Migration already attempted in this session');
    return {
      migrated: false,
      alreadyMigrated: true,
      message: 'Migration already attempted in this session'
    };
  }
  
  console.log('[AuthMigration] Starting migration of stored auth data');
  migrationAttempted = true;
  
  try {
    // Check if old auth data exists
    const oldAuthData = localStorage.getItem(OLD_AUTH_KEY);
    if (!oldAuthData) {
      console.log('[AuthMigration] No old auth data found');
      // Mark migration as completed even if no data was found
      localStorage.setItem('auth_migration_completed', 'true');
      return { migrated: false, message: 'No old auth data found' };
    }
    
    // Parse old auth data with error handling
    let parsedOldData;
    let oldUserId;
    let oldRole;
    
    try {
      parsedOldData = JSON.parse(oldAuthData);
      oldUserId = parsedOldData?.user?.id;
      oldRole = parsedOldData?.user?.role || 'client';
    } catch (parseError) {
      console.error('[AuthMigration] Error parsing old auth data:', parseError);
      // Remove corrupted data
      localStorage.removeItem(OLD_AUTH_KEY);
      localStorage.setItem('auth_migration_completed', 'true');
      return {
        migrated: false,
        message: `Error parsing old auth data: ${parseError}`
      };
    }
    
    console.log(`[AuthMigration] Found old auth data for user: ${oldUserId}, role: ${oldRole}`);
    
    // Remove old auth data
    localStorage.removeItem(OLD_AUTH_KEY);
    console.log('[AuthMigration] Removed old auth data');
    
    // Remove other legacy keys
    LEGACY_KEYS.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`[AuthMigration] Removing legacy key: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    // Mark migration as completed
    localStorage.setItem('auth_migration_completed', 'true');
    
    return {
      migrated: true,
      oldUserId,
      oldRole,
      message: `Successfully migrated auth data for user: ${oldUserId}`
    };
  } catch (error) {
    console.error('[AuthMigration] Error migrating stored auth data:', error);
    // Even if there's an error, mark migration as attempted to prevent infinite retries
    localStorage.setItem('auth_migration_completed', 'true');
    return { migrated: false, message: `Error migrating auth data: ${error}` };
  }
};

/**
 * Diagnoses common authentication issues
 * @returns Object containing diagnostic information
 */
// Add timeout support for async operations
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

export const diagnoseAuthIssues = async (): Promise<{
  issues: string[];
  hasOldAuthData: boolean;
  hasNewAuthData: boolean;
  conflictingUserIds: boolean;
  networkConnected: boolean;
  supabaseConfigured: boolean;
}> => {
  console.log('[AuthMigration] Diagnosing auth issues');
  
  const issues: string[] = [];
  let hasOldAuthData = false;
  let hasNewAuthData = false;
  let oldUserId: string | null = null;
  let newUserId: string | null = null;
  
  // Check network connectivity
  const networkConnected = navigator.onLine;
  if (!networkConnected) {
    issues.push('Network connection unavailable - please check your internet connection');
  }
  
  // Check Supabase configuration
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabaseConfigured = !!supabaseUrl && !!supabaseKey;
  
  if (!supabaseConfigured) {
    issues.push('Supabase configuration missing or incomplete - contact support');
  }
  
  // Check for old auth data
  try {
    const oldAuthData = localStorage.getItem(OLD_AUTH_KEY);
    if (oldAuthData) {
      hasOldAuthData = true;
      issues.push('Legacy authentication data found - will be migrated automatically');
      
      // Extract user ID from old auth data
      try {
        const parsedOldData = JSON.parse(oldAuthData);
        oldUserId = parsedOldData?.user?.id || null;
      } catch (parseError) {
        console.error('[AuthMigration] Error parsing old auth data:', parseError);
        // Don't add to issues, just log it
      }
    }
  } catch (error) {
    console.error('[AuthMigration] Error checking old auth data:', error);
    // Don't add to issues, just log it
  }
  
  // Check for new auth data
  try {
    const newAuthData = localStorage.getItem(NEW_AUTH_KEY);
    if (newAuthData) {
      hasNewAuthData = true;
      
      // Extract user ID from new auth data
      try {
        const parsedNewData = JSON.parse(newAuthData);
        newUserId = parsedNewData?.user?.id || null;
      } catch (parseError) {
        console.error('[AuthMigration] Error parsing new auth data:', parseError);
        issues.push('Current authentication data may be corrupted - try clearing browser cache');
      }
    }
  } catch (error) {
    console.error('[AuthMigration] Error checking new auth data:', error);
    // Don't add to issues, just log it
  }
  
  // Check for conflicting user IDs
  const conflictingUserIds = !!(oldUserId && newUserId && oldUserId !== newUserId);
  if (conflictingUserIds) {
    issues.push(`Conflicting user IDs detected - please sign out and sign in again`);
  }
  
  // Check for other legacy keys (but don't add to issues to reduce noise)
  LEGACY_KEYS.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`[AuthMigration] Legacy key found: ${key}`);
      // Don't add to issues to reduce noise
    }
  });
  
  // Check current session with timeout
  if (networkConnected && supabaseConfigured) {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        5000, // 5 second timeout
        'Session check timed out'
      );
      
      if (error) {
        issues.push(`Authentication error: ${error.message}`);
      } else if (!data.session && newUserId) {
        issues.push('Session expired - please sign in again');
      }
    } catch (error: any) {
      if (error.message.includes('timed out')) {
        issues.push('Authentication service response timeout - please try again later');
      } else {
        issues.push(`Authentication error: ${error.message}`);
      }
    }
  }
  
  return {
    issues,
    hasOldAuthData,
    hasNewAuthData,
    conflictingUserIds,
    networkConnected,
    supabaseConfigured
  };
};

/**
 * Resets the authentication state by clearing localStorage and refreshing the page
 * @param hardReset If true, will also clear sessionStorage and reload the page
 * @returns Object containing information about the reset
 */
export const resetAuthState = (hardReset: boolean = false): { 
  success: boolean; 
  message: string;
} => {
  console.log(`[AuthMigration] Resetting auth state (hardReset=${hardReset})`);
  
  try {
    // Remove auth-related localStorage items
    localStorage.removeItem(OLD_AUTH_KEY);
    localStorage.removeItem(NEW_AUTH_KEY);
    
    // Remove other legacy keys
    LEGACY_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });
    
    if (hardReset) {
      // Clear all auth-related items from sessionStorage
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('auth') || key.includes('supabase')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Force reload the page
      window.location.reload();
    }
    
    return { 
      success: true, 
      message: 'Authentication state reset successfully' 
    };
  } catch (error) {
    console.error('[AuthMigration] Error resetting auth state:', error);
    return { 
      success: false, 
      message: `Error resetting auth state: ${error}` 
    };
  }
};

/**
 * Checks if the current browser environment is compatible with the authentication system
 * @returns Object containing compatibility information
 */
export const checkBrowserCompatibility = (): {
  compatible: boolean;
  issues: string[];
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  cookies: boolean;
} => {
  console.log('[AuthMigration] Checking browser compatibility');
  
  const issues: string[] = [];
  
  // Check localStorage
  let localStorage = false;
  try {
    window.localStorage.setItem('test', 'test');
    window.localStorage.removeItem('test');
    localStorage = true;
  } catch (e) {
    issues.push('localStorage not available');
  }
  
  // Check sessionStorage
  let sessionStorage = false;
  try {
    window.sessionStorage.setItem('test', 'test');
    window.sessionStorage.removeItem('test');
    sessionStorage = true;
  } catch (e) {
    issues.push('sessionStorage not available');
  }
  
  // Check indexedDB
  const indexedDB = !!window.indexedDB;
  if (!indexedDB) {
    issues.push('indexedDB not available');
  }
  
  // Check cookies
  let cookies = false;
  try {
    document.cookie = 'test=test';
    cookies = document.cookie.indexOf('test=') !== -1;
    document.cookie = 'test=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  } catch (e) {
    issues.push('cookies not available');
  }
  
  const compatible = localStorage && sessionStorage && issues.length === 0;
  
  return {
    compatible,
    issues,
    localStorage,
    sessionStorage,
    indexedDB,
    cookies
  };
};

export default {
  migrateStoredAuthData,
  diagnoseAuthIssues,
  resetAuthState,
  checkBrowserCompatibility
};
