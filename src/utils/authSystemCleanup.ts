/**
 * Utility to help identify and fix phantom UserContext references
 * This script can be run in the browser console to help debug authentication issues
 */

/**
 * Check for any remaining references to UserContext in the window object
 */
export function checkForUserContextReferences(): void {
  console.log('[AuthCleanup] Checking for UserContext references...');
  
  // Check for direct references on window
  const windowKeys = Object.keys(window);
  const suspiciousKeys = windowKeys.filter(key => 
    key.includes('User') || 
    key.includes('Auth') || 
    key.includes('Context')
  );
  
  if (suspiciousKeys.length > 0) {
    console.log('[AuthCleanup] Suspicious window keys found:', suspiciousKeys);
  } else {
    console.log('[AuthCleanup] No suspicious window keys found');
  }
  
  // Check for UserContext in loaded scripts
  const scripts = document.querySelectorAll('script');
  console.log(`[AuthCleanup] Checking ${scripts.length} loaded scripts...`);
  
  scripts.forEach(script => {
    const src = script.src;
    if (src && (src.includes('chunk') || src.includes('bundle'))) {
      console.log(`[AuthCleanup] Found bundle: ${src}`);
      // We can't easily check the content of external scripts due to CORS
    }
  });
  
  // Check localStorage for any auth-related keys
  const allStorageKeys = Object.keys(localStorage);
  const authKeys = allStorageKeys.filter(key => 
    key.includes('auth') || 
    key.includes('user') || 
    key.includes('token') ||
    key.includes('session')
  );
  
  console.log('[AuthCleanup] Auth-related localStorage keys:', authKeys);
  
  // Check for console.log overrides
  if (window.console && window.console.log.toString().includes('native code')) {
    console.log('[AuthCleanup] Console.log appears to be the native implementation');
  } else {
    console.warn('[AuthCleanup] Console.log may have been overridden!');
  }
}

/**
 * Clean up any potential issues that might be causing phantom UserContext references
 */
export function cleanupAuthSystem(): void {
  console.log('[AuthCleanup] Performing deep cleanup of auth system...');
  
  // Clear all auth-related localStorage keys
  const allStorageKeys = Object.keys(localStorage);
  const authKeys = allStorageKeys.filter(key => 
    key.includes('auth') || 
    key.includes('user') || 
    key.includes('token') ||
    key.includes('session')
  );
  
  authKeys.forEach(key => {
    console.log(`[AuthCleanup] Removing localStorage key: ${key}`);
    localStorage.removeItem(key);
  });
  
  // Clear sessionStorage as well
  const sessionKeys = Object.keys(sessionStorage);
  const authSessionKeys = sessionKeys.filter(key => 
    key.includes('auth') || 
    key.includes('user') || 
    key.includes('token') ||
    key.includes('session')
  );
  
  authSessionKeys.forEach(key => {
    console.log(`[AuthCleanup] Removing sessionStorage key: ${key}`);
    sessionStorage.removeItem(key);
  });
  
  // Clear any service worker caches if possible
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        console.log(`[AuthCleanup] Deleting cache: ${cacheName}`);
        caches.delete(cacheName);
      });
    });
  }
  
  console.log('[AuthCleanup] Cleanup complete. Please refresh the page.');
}

/**
 * Monitor for any UserContext-related console logs
 * This can help identify where phantom logs are coming from
 */
export function monitorForUserContextLogs(): void {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.log('[AuthCleanup] Setting up console log monitoring...');
  
  // Override console.log to catch UserContext logs
  console.log = function(...args: any[]) {
    // Call the original function
    originalConsoleLog.apply(console, args);
    
    // Check if any argument contains UserContext
    const message = args.join(' ');
    if (message.includes('UserContext')) {
      originalConsoleLog.call(console, '[AuthCleanup] UserContext log detected!');
      originalConsoleLog.call(console, 'Stack trace:', new Error().stack);
    }
  };
  
  // Override console.error to catch UserContext errors
  console.error = function(...args: any[]) {
    // Call the original function
    originalConsoleError.apply(console, args);
    
    // Check if any argument contains UserContext
    const message = args.join(' ');
    if (message.includes('UserContext')) {
      originalConsoleLog.call(console, '[AuthCleanup] UserContext error detected!');
      originalConsoleLog.call(console, 'Stack trace:', new Error().stack);
    }
  };
  
  // Override console.warn to catch UserContext warnings
  console.warn = function(...args: any[]) {
    // Call the original function
    originalConsoleWarn.apply(console, args);
    
    // Check if any argument contains UserContext
    const message = args.join(' ');
    if (message.includes('UserContext')) {
      originalConsoleLog.call(console, '[AuthCleanup] UserContext warning detected!');
      originalConsoleLog.call(console, 'Stack trace:', new Error().stack);
    }
  };
  
  console.log('[AuthCleanup] Console log monitoring active');
}

/**
 * Run all cleanup and diagnostic functions
 */
export function runFullAuthDiagnostics(): void {
  console.log('[AuthCleanup] Running full auth system diagnostics...');
  
  // Check for UserContext references
  checkForUserContextReferences();
  
  // Set up monitoring
  monitorForUserContextLogs();
  
  console.log('[AuthCleanup] Diagnostics complete. Monitoring for UserContext logs...');
}

export default {
  checkForUserContextReferences,
  cleanupAuthSystem,
  monitorForUserContextLogs,
  runFullAuthDiagnostics
};