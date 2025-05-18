/**
 * Utility to clean up old authentication localStorage keys
 * This should be called on application startup
 */
export const cleanupOldAuthKeys = (): void => {
  const oldKeys = [
    'valorwell_auth_state',
    'supabase.auth.token',
    'auth_initialization_forced'
  ];
  
  oldKeys.forEach(key => {
    try {
      if (localStorage.getItem(key)) {
        console.log(`[AuthCleanup] Removing old auth key: ${key}`);
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error(`[AuthCleanup] Error removing ${key}:`, e);
    }
  });
};