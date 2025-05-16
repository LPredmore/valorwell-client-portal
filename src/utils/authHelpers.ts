
/**
 * authHelpers.ts - Utilities for authentication and debugging
 */

import { AuthState } from '@/context/UserContext';

// Helper to log AuthState changes for debugging
export const logAuthStateChange = (
  prevState: AuthState | undefined, 
  newState: AuthState, 
  component: string
) => {
  if (prevState !== newState) {
    console.log(`[${component}] Auth state changed: ${prevState || 'undefined'} -> ${newState}`);
  }
};

// Helper to get descriptive messages for auth states
export const getAuthStateMessage = (authState: AuthState) => {
  switch (authState) {
    case AuthState.INITIALIZING:
      return "Initializing authentication...";
    case AuthState.AUTHENTICATED:
      return "You are signed in";
    case AuthState.UNAUTHENTICATED:
      return "You are not signed in";
    case AuthState.ERROR:
      return "Authentication error occurred";
    default:
      return "Unknown authentication state";
  }
};

// Helper to get the target route for a user based on role and client status
export const getTargetRouteForUser = (userRole: string | null, clientStatus: string | null): string => {
  if (!userRole) return '/login';
  
  switch (userRole) {
    case 'admin':
      return '/settings';
    case 'clinician':
      return '/clinician-dashboard';
    case 'client':
      return clientStatus === 'New' ? '/profile-setup' : '/patient-dashboard';
    default:
      return '/login';
  }
};

// Helper for safely parsing JSON from localStorage
export const safelyParseJSON = (jsonString: string | null, defaultValue: any = null) => {
  if (!jsonString) return defaultValue;
  
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Error parsing JSON from storage:', e);
    return defaultValue;
  }
};

// Helper for safely storing to localStorage with error handling
export const safelyStoreToLocalStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('Error storing to localStorage:', e);
    return false;
  }
};

// Check if a user session is valid
export const isValidSession = (session: any) => {
  return session && 
         session.user && 
         session.user.id &&
         session.access_token &&
         new Date(session.expires_at * 1000) > new Date();
};

// Sanitize an error for logging (avoiding circular references)
export const sanitizeErrorForLogging = (error: any): Record<string, any> => {
  if (!error) return { message: 'No error' };
  
  const sanitized: Record<string, any> = {};
  
  if (error instanceof Error) {
    sanitized.name = error.name;
    sanitized.message = error.message;
    sanitized.stack = error.stack;
  } else if (typeof error === 'object') {
    try {
      Object.keys(error).forEach(key => {
        if (key !== 'toJSON' && typeof error[key] !== 'function') {
          sanitized[key] = error[key];
        }
      });
    } catch (e) {
      sanitized.message = 'Error object could not be processed';
    }
  } else {
    sanitized.message = String(error);
  }
  
  return sanitized;
};
