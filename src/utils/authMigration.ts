
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
export const migrateStoredAuthData = (): { 
  migrated: boolean; 
  oldUserId?: string; 
  oldRole?: string;
  message: string;
} => {
  console.log('[AuthMigration] Starting migration of stored auth data');
  
  try {
    // Check if old auth data exists
    const oldAuthData = localStorage.getItem(OLD_AUTH_KEY);
    if (!oldAuthData) {
      console.log('[AuthMigration] No old auth data found');
      return { migrated: false, message: 'No old auth data found' };
    }
    
    // Parse old auth data
    const parsedOldData = JSON.parse(oldAuthData);
    const oldUserId = parsedOldData?.user?.id;
    const oldRole = parsedOldData?.user?.role || 'client';
    
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
    
    return { 
      migrated: true, 
      oldUserId, 
      oldRole,
      message: `Successfully migrated auth data for user: ${oldUserId}` 
    };
  } catch (error) {
    console.error('[AuthMigration] Error migrating stored auth data:', error);
    return { migrated: false, message: `Error migrating auth data: ${error}` };
  }
};

/**
 * Diagnoses common authentication issues
 * @returns Object containing diagnostic information
 */
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
    issues.push('Network connection unavailable');
  }
  
  // Check Supabase configuration
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabaseConfigured = !!supabaseUrl && !!supabaseKey;
  
  if (!supabaseConfigured) {
    issues.push('Supabase configuration missing or incomplete');
  }
  
  // Check for old auth data
  try {
    const oldAuthData = localStorage.getItem(OLD_AUTH_KEY);
    if (oldAuthData) {
      hasOldAuthData = true;
      issues.push('Legacy authentication data found');
      
      // Extract user ID from old auth data
      const parsedOldData = JSON.parse(oldAuthData);
      oldUserId = parsedOldData?.user?.id || null;
    }
  } catch (error) {
    issues.push(`Error checking old auth data: ${error}`);
  }
  
  // Check for new auth data
  try {
    const newAuthData = localStorage.getItem(NEW_AUTH_KEY);
    if (newAuthData) {
      hasNewAuthData = true;
      
      // Extract user ID from new auth data
      const parsedNewData = JSON.parse(newAuthData);
      newUserId = parsedNewData?.user?.id || null;
    }
  } catch (error) {
    issues.push(`Error checking new auth data: ${error}`);
  }
  
  // Check for conflicting user IDs
  const conflictingUserIds = !!(oldUserId && newUserId && oldUserId !== newUserId);
  if (conflictingUserIds) {
    issues.push(`Conflicting user IDs found: old=${oldUserId}, new=${newUserId}`);
  }
  
  // Check for other legacy keys
  LEGACY_KEYS.forEach(key => {
    if (localStorage.getItem(key)) {
      issues.push(`Legacy key found: ${key}`);
    }
  });
  
  // Check current session
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      issues.push(`Error getting current session: ${error.message}`);
    } else if (!data.session) {
      issues.push('No active session found');
    }
  } catch (error: any) {
    issues.push(`Exception checking session: ${error.message}`);
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
