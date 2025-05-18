# Authentication System Troubleshooting Guide

## Current Status

The authentication system has been successfully migrated from the dual-context approach (UserContext + NewAuthContext) to using only NewAuthContext. However, there are still some issues that need to be addressed:

1. Authentication timeout issues
2. References to non-existent UserContext in error logs
3. Race conditions in auth initialization
4. Session storage inconsistencies

## Root Causes Identified

### Authentication Timeout Issues

- The system is experiencing "Auth session check timed out" errors during initial authentication
- Despite increasing AUTH_TIMEOUT to 45 seconds, the Supabase API calls are still timing out in some cases
- The timeout is causing the auth state to transition to ERROR instead of properly establishing the session

### References to Non-existent UserContext

- Error logs show `[UserContext] Error in initial getSession: Error: getSession timeout`
- However, there is no UserContext component in the codebase anymore
- This indicates remaining references to a removed authentication system

### Race Condition in Auth Initialization

- The AuthService initializes with INITIALIZING state
- When a timeout occurs, it switches to ERROR state
- Other components see this transition inconsistently

### Session Storage Inconsistencies

- The system logs `[AuthService] Stored session expired, removing`
- This suggests token expiration issues or corrupted session data

## Improvements Implemented

The following improvements have been implemented to address these issues:

1. **Increased Timeout Values**
   - AUTH_TIMEOUT increased to 45 seconds (from 15 seconds)
   - SESSION_EXPIRY_BUFFER increased to 10 minutes (from 5 minutes)

2. **Enhanced Error Handling**
   - Added retry logic with exponential backoff for auth operations
   - Improved error messages and logging
   - Added validation of session data before storing

3. **Improved Session Management**
   - Added cleanup of legacy localStorage keys
   - Added validation of session data before storing
   - Improved error recovery for corrupted localStorage data

4. **Network Connectivity Handling**
   - Added checks for network connectivity
   - Added retry logic for network-related errors

## Recommended Additional Fixes

### 1. Build System Cleanup

The references to UserContext in error logs despite no code references suggest a build system issue:

```bash
# Clean the build directory
rm -rf dist/
rm -rf .cache/

# Clean node_modules (optional, but recommended)
rm -rf node_modules/
npm install

# Rebuild the application
npm run build
```

### 2. Browser Cache Clearing

Users experiencing authentication issues should clear their browser cache:

1. Open browser developer tools (F12)
2. Go to Application tab
3. Select Storage > Clear Site Data
4. Reload the page

### 3. Session Storage Monitoring

Add monitoring for localStorage to detect and fix inconsistencies:

```typescript
// Add to AuthService.ts
private monitorSessionStorage(): void {
  // Check for storage events
  window.addEventListener('storage', (event) => {
    if (event.key === AUTH_STORAGE_KEY) {
      console.log('[AuthService] Storage event detected for auth key');
      // Validate the new data
      try {
        const newData = JSON.parse(event.newValue || '');
        // Handle the change if needed
      } catch (error) {
        console.error('[AuthService] Invalid data in storage event:', error);
      }
    }
  });
}
```

### 4. Offline Mode Support

Enhance the application to handle offline scenarios better:

```typescript
// Add to AuthService.ts
private setupNetworkListeners(): void {
  window.addEventListener('online', () => {
    console.log('[AuthService] Network connection restored');
    // Attempt to refresh session when coming back online
    this.refreshSession();
  });
  
  window.addEventListener('offline', () => {
    console.log('[AuthService] Network connection lost');
    // Update UI to show offline status
  });
}
```

## Debugging the Phantom UserContext Issue

The most puzzling aspect is the `[UserContext] Error` log when there's no UserContext in the active codebase. This suggests:

1. **Module Caching Issue**: The browser or build system is caching old versions of modules
2. **Third-Party Library**: A third-party library might be referencing UserContext
3. **Build Artifact**: Old code might be included in the build

### Steps to Debug:

1. **Check Network Tab**: Look for any JS files being loaded that might contain UserContext
2. **Search Bundle**: Use source maps to search the bundled JS for UserContext references
3. **Check localStorage**: Look for any keys that might be related to module caching
4. **Inspect window object**: Check if UserContext is attached to the window object

## Conclusion

The authentication system has been significantly improved, but some issues remain. The most critical is the phantom UserContext reference, which suggests a build system or caching issue. Implementing the recommended fixes and debugging steps should resolve the remaining issues.