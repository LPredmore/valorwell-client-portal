import { DebugUtils } from './debugUtils';
import { supabase } from "@/integrations/supabase/client";

/**
 * Debug utility for authentication operations
 * @param operation The name of the auth operation being debugged
 * @param callback The auth operation function to execute and debug
 * @returns The result of the callback function
 */
export async function debugAuthOperation<T>(operation: string, callback: () => Promise<T>): Promise<T> {
  const startTime = performance.now();
  try {
    DebugUtils.log('AuthDebug', `Auth operation '${operation}' started`);
    const result = await callback();
    const duration = (performance.now() - startTime).toFixed(2);
    DebugUtils.log('AuthDebug', `Auth operation '${operation}' completed in ${duration}ms`, result);
    return result;
  } catch (error: any) {
    const duration = (performance.now() - startTime).toFixed(2);
    DebugUtils.error('AuthDebug', `Auth operation '${operation}' failed after ${duration}ms`, error);
    
    // Log specific error details based on error type
    if (error?.status) {
      DebugUtils.error('AuthDebug', `HTTP Status: ${error.status}`);
    }
    
    if (error?.message) {
      DebugUtils.error('AuthDebug', `Error message: ${error.message}`);
    }
    
    throw error;
  }
}

/**
 * Debug utility for simple authentication operations
 * @param operation The name of the auth operation being debugged
 * @param data Any relevant data for the operation
 * @param error Any error that occurred during the operation
 */
export function debugAuthSimpleOperation(operation: string, data?: any, error?: any): void {
  if (error) {
    DebugUtils.error('AuthDebug', `Auth operation '${operation}' failed`, error);
    return;
  }
  
  DebugUtils.log('AuthDebug', `Auth operation '${operation}' executed`, data);
}

/**
 * Logs detailed information about the current Supabase configuration
 */
export const logSupabaseConfig = (config?: any) => {
  // Get environment variables (but don't log sensitive keys)
  const defaultConfig = {
    url: import.meta.env.VITE_SUPABASE_URL || 'Not set',
    hasAnonymousKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    currentOrigin: window.location.origin,
    environment: import.meta.env.MODE || 'development'
  };
  
  const finalConfig = config ? { ...defaultConfig, ...config } : defaultConfig;
  
  // Sanitize the config to remove sensitive information
  const safeConfig = { ...finalConfig };
  
  // Remove any keys or secrets
  if (safeConfig.key) safeConfig.key = '[REDACTED]';
  if (safeConfig.secret) safeConfig.secret = '[REDACTED]';
  if (safeConfig.serviceKey) safeConfig.serviceKey = '[REDACTED]';
  if (safeConfig.apiKey) safeConfig.apiKey = '[REDACTED]';
  
  DebugUtils.log('AuthDebug', 'Supabase configuration', safeConfig);
  
  // Log storage type being used
  try {
    const storageType = window.localStorage ? 'localStorage' :
                       (window.sessionStorage ? 'sessionStorage' : 'unknown');
    DebugUtils.log('AuthDebug', 'Browser storage type available:', storageType);
    
    // Check if localStorage has Supabase auth data
    const hasSupabaseAuth = !!localStorage.getItem('supabase.auth.token');
    DebugUtils.log('AuthDebug', 'Has stored auth data:', hasSupabaseAuth);
  } catch (e) {
    DebugUtils.error('AuthDebug', 'Error checking storage:', e);
  }
  
  return safeConfig;
};

/**
 * Logs information about the current URL and authentication state
 */
export const logAuthContext = (additionalContext = {}) => {
  const urlInfo = {
    fullUrl: window.location.href,
    pathname: window.location.pathname,
    hash: window.location.hash,
    search: window.location.search,
    hasResetToken: window.location.hash.includes('type=recovery'),
  };
  
  DebugUtils.log('AuthDebug', 'Current URL info:', urlInfo);
  DebugUtils.log('AuthDebug', 'Additional context:', additionalContext);
  
  return {
    urlInfo,
    additionalContext
  };
};

/**
 * Validates that the Supabase URL and redirect URL configurations are valid
 */
export const validateSupabaseUrls = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const origin = window.location.origin;
  
  const issues = [];
  
  if (!supabaseUrl) {
    issues.push('VITE_SUPABASE_URL environment variable is not set');
  }
  
  DebugUtils.log('AuthDebug', `URL validation: Supabase URL: ${supabaseUrl}, App origin: ${origin}`);
  
  return {
    supabaseUrl,
    origin,
    issues,
    isValid: issues.length === 0
  };
};

/**
 * Utility to inspect the current auth state directly
 */
export const inspectAuthState = async (authState?: any) => {
  // If authState is provided, use it directly
  if (authState) {
    // Create a safe copy of the auth state
    const safeState = { ...authState };
    
    // Remove sensitive information
    if (safeState.session?.access_token) safeState.session.access_token = '[REDACTED]';
    if (safeState.session?.refresh_token) safeState.session.refresh_token = '[REDACTED]';
    
    // Extract useful information
    const userInfo = safeState.user ? {
      id: safeState.user.id,
      email: safeState.user.email,
      role: safeState.user.user_metadata?.role || 'unknown',
      confirmed: safeState.user.confirmed_at ? true : false,
      lastSignIn: safeState.user.last_sign_in_at,
      createdAt: safeState.user.created_at
    } : null;
    
    DebugUtils.log('AuthDebug', 'Auth state inspection', {
      isAuthenticated: !!safeState.user,
      userInfo,
      sessionExpires: safeState.session?.expires_at ? new Date(safeState.session.expires_at * 1000).toISOString() : null,
      provider: safeState.user?.app_metadata?.provider || 'unknown'
    });
    
    return {
      isAuthenticated: !!safeState.user,
      userInfo,
      sessionExpires: safeState.session?.expires_at ? new Date(safeState.session.expires_at * 1000).toISOString() : null,
      provider: safeState.user?.app_metadata?.provider || 'unknown'
    };
  }
  
  // Otherwise, fetch the current session
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      DebugUtils.error('AuthDebug', 'Error getting session:', error);
      return { error };
    }
    
    const session = data?.session;
    
    if (!session) {
      DebugUtils.log('AuthDebug', 'No active session found');
      return { session: null };
    }
    
    const tokenInfo = {
      accessToken: {
        length: session.access_token.length,
        prefix: session.access_token.substring(0, 10) + '...',
        expiresAt: new Date(session.expires_at * 1000).toISOString(),
        expires_in: session.expires_in,
      },
      refreshToken: session.refresh_token ? {
        length: session.refresh_token.length,
        prefix: session.refresh_token.substring(0, 10) + '...',
      } : 'None'
    };
    
    DebugUtils.log('AuthDebug', 'Active session found:', tokenInfo);
    
    // Don't log the full user object to avoid exposing sensitive data
    const userInfo = session.user ? {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      lastSignInAt: session.user.last_sign_in_at,
      factors: session.user.factors ? 'Has MFA factors' : 'No MFA factors'
    } : null;
    
    DebugUtils.log('AuthDebug', 'User info:', userInfo);
    
    return {
      session: tokenInfo,
      user: userInfo,
      originalSession: { ...session, access_token: '[REDACTED]', refresh_token: '[REDACTED]' }
    };
  } catch (error) {
    DebugUtils.error('AuthDebug', 'Error inspecting auth state:', error);
    return { error };
  }
};

export default {
  logSupabaseConfig,
  logAuthContext,
  debugAuthOperation,
  validateSupabaseUrls,
  inspectAuthState,
  debugAuthSimpleOperation
};