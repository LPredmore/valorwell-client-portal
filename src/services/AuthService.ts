import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

// Finite state machine for authentication
export enum AuthState {
  INITIALIZING = 'initializing',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  ERROR = 'error'
}

export interface AuthError {
  code?: string;
  message: string;
  originalError?: any;
}

interface AuthSession {
  user: User | null;
  session: Session | null;
  expiresAt?: number;
  role?: string | null;
}

const AUTH_STORAGE_KEY = 'auth_session_cache';
const AUTH_TIMEOUT = 90000; // 90 seconds timeout for auth operations (increased from 45s)
const SESSION_EXPIRY_BUFFER = 900000; // 15 minutes buffer before actual expiry (increased from 10m)
const MAX_RETRIES = 3; // Maximum number of retries for auth operations

class AuthService {
  private static instance: AuthService;
  private _currentState: AuthState = AuthState.INITIALIZING;
  private _stateListeners: Array<(state: AuthState) => void> = [];
  private _sessionData: AuthSession | null = null;
  private _error: AuthError | null = null;
  private _initialCheckComplete = false;

  // Singleton pattern
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
  
  private constructor() {
    console.log('[AuthService] Initializing AuthService');
    // Try to restore session from storage immediately
    this.restoreSessionFromStorage();
    
    // Set up auth state listener
    this.setupAuthStateListener();
    
    // Perform initial session check with timeout
    this.performInitialSessionCheck();
  }
  
  // Restore session from local storage if available
  private restoreSessionFromStorage(): void {
    try {
      const storedData = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!storedData) return;
      
      const parsedData = JSON.parse(storedData) as AuthSession;
      
      // Only use cached data if it hasn't expired (with buffer time)
      // Add a 5-minute buffer to ensure we don't use a session that's about to expire
      if (parsedData.expiresAt && parsedData.expiresAt > (Date.now() + SESSION_EXPIRY_BUFFER)) {
        console.log('[AuthService] Restored session from storage');
        this._sessionData = parsedData;
        
        if (parsedData.user) {
          this._currentState = AuthState.AUTHENTICATED;
        } else {
          this._currentState = AuthState.UNAUTHENTICATED;
        }
      } else {
        console.log('[AuthService] Stored session expired or expiring soon, removing');
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (error) {
      console.error('[AuthService] Error restoring session from storage:', error);
      // Clean up potentially corrupted data
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }
  
  // Set up Supabase auth listener
  private setupAuthStateListener(): void {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AuthService] Auth state changed: ${event}`);
      
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          if (session) {
            this.handleSuccessfulAuth(session);
            
            // Schedule next refresh before token expires
            if (session.expires_at) {
              const expiresIn = (session.expires_at * 1000) - Date.now();
              const refreshTime = expiresIn - SESSION_EXPIRY_BUFFER;
              
              if (refreshTime > 0) {
                console.log(`[AuthService] Scheduling refresh in ${refreshTime}ms`);
                setTimeout(() => this.refreshSession(), refreshTime);
              }
            }
          }
          break;
          
        case 'SIGNED_OUT':
          this.handleSignOut();
          break;
          
        case 'PASSWORD_RECOVERY':
          // Handle password recovery if needed
          break;
          
        default:
          console.log(`[AuthService] Unhandled auth event: ${event}`);
      }
    });
  }
  
  // Initial auth check with improved timeout protection and fallback mechanisms
  private async performInitialSessionCheck(): Promise<void> {
    if (this._initialCheckComplete) return;
    
    try {
      console.log('[AuthService] Starting initial session check');
      
      // Check network connectivity first
      if (!navigator.onLine) {
        console.warn('[AuthService] Network appears to be offline');
        throw new Error('Network connectivity issue detected');
      }
      
      // Use Promise.race with a more generous timeout
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise<{data: {session: null}}>((_, reject) =>
          setTimeout(() => {
            console.warn('[AuthService] Initial session check timeout reached');
            reject(new Error('Auth session check timed out'));
          }, AUTH_TIMEOUT)
        )
      ]);
      
      // Process the session result
      const session = sessionResult?.data?.session;
      
      if (session) {
        console.log('[AuthService] Initial session check: User is authenticated');
        this.handleSuccessfulAuth(session);
      } else {
        console.log('[AuthService] Initial session check: No active session');
        this._currentState = AuthState.UNAUTHENTICATED;
        this.saveSessionToStorage(null, null);
      }
    } catch (error) {
      console.error('[AuthService] Error during initial session check:', error);
      
      // Improved fallback mechanism with retry logic
      try {
        console.log('[AuthService] Attempting improved fallback check');
        
        // Try to restore from localStorage first if available
        const storedData = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedData) {
          try {
            const parsedData = JSON.parse(storedData);
            if (parsedData?.user?.id) {
              console.log('[AuthService] Using cached user data during network issues');
              // We have a user ID, let's try to refresh the session
              await this.attemptSessionRecovery(parsedData);
              return;
            }
          } catch (parseError) {
            console.error('[AuthService] Error parsing stored auth data:', parseError);
          }
        }
        
        // If no stored data or parsing failed, try getUser with timeout and retries
        let lastError = error;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            console.log(`[AuthService] Fallback attempt ${attempt}/${MAX_RETRIES}`);
            
            // Use a shorter timeout for fallback attempts
            const fallbackTimeout = AUTH_TIMEOUT / 2;
            
            const { data: userData, error: userError } = await Promise.race([
              supabase.auth.getUser(),
              new Promise<{data: {user: null}, error: any}>((_, reject) =>
                setTimeout(() => reject(new Error(`GetUser fallback timed out (attempt ${attempt})`)), fallbackTimeout)
              )
            ]);
            
            if (userError) throw userError;
            
            if (userData?.user) {
              console.log('[AuthService] Found user via getUser fallback');
              // We found a user, but no session. Try to get a session via refresh
              const { data: refreshData } = await supabase.auth.refreshSession();
              
              if (refreshData?.session) {
                console.log('[AuthService] Successfully refreshed session');
                this.handleSuccessfulAuth(refreshData.session);
                return;
              } else {
                console.log('[AuthService] User found but could not refresh session');
                this._currentState = AuthState.UNAUTHENTICATED;
                return;
              }
            } else {
              console.log('[AuthService] No user found via getUser fallback');
              this._currentState = AuthState.UNAUTHENTICATED;
              return;
            }
          } catch (retryError) {
            console.error(`[AuthService] Fallback attempt ${attempt} failed:`, retryError);
            lastError = retryError;
            
            // Wait before retrying (exponential backoff)
            if (attempt < MAX_RETRIES) {
              const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
              console.log(`[AuthService] Waiting ${delay}ms before next attempt`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        // All retries failed
        throw lastError;
      } catch (fallbackError) {
        console.error('[AuthService] All fallback mechanisms failed:', fallbackError);
        // Even if there's an error, still mark initialization as complete
        this._currentState = AuthState.ERROR;
        this._error = {
          message: 'Authentication check failed after multiple attempts. Please check your network connection and try refreshing the page.',
          originalError: error
        };
      }
    } finally {
      this._initialCheckComplete = true;
      console.log('[AuthService] Initial check complete, state:', this._currentState);
      this.notifyListeners();
    }
  }
  
  // Handle successful authentication
  private handleSuccessfulAuth(session: Session): void {
    const user = session?.user;
    
    if (user) {
      // Extract role from user metadata
      const userRole = user.user_metadata?.role || 'client';
      
      this._sessionData = {
        user,
        session,
        expiresAt: session.expires_at ? session.expires_at * 1000 : undefined,
        role: userRole
      };
      
      this._currentState = AuthState.AUTHENTICATED;
      this._error = null;
      
      // Save session to storage
      this.saveSessionToStorage(user, session, userRole);
      
      console.log(`[AuthService] User authenticated: ${user.id}, role: ${userRole}`);
    }
    
    this.notifyListeners();
  }
  
  // Handle sign out
  private handleSignOut(): void {
    this._sessionData = null;
    this._currentState = AuthState.UNAUTHENTICATED;
    this._error = null;
    
    // Clear saved session
    localStorage.removeItem(AUTH_STORAGE_KEY);
    
    console.log('[AuthService] User signed out');
    this.notifyListeners();
  }
  
  // Handle user data updates
  private handleUserUpdated(session: Session): void {
    if (session?.user) {
      const userRole = session.user.user_metadata?.role || 'client';
      
      this._sessionData = {
        ...this._sessionData,
        user: session.user,
        session,
        role: userRole
      };
      
      // Save updated session
      this.saveSessionToStorage(session.user, session, userRole);
      
      console.log('[AuthService] User data updated');
      this.notifyListeners();
    }
  }
  
  // Persist session data to local storage with validation
  private saveSessionToStorage(user: User | null, session: Session | null, role?: string | null): void {
    try {
      if (user && session) {
        // Validate session data before storing
        if (!session.access_token || !session.expires_at) {
          console.error('[AuthService] Invalid session data, not saving to storage');
          return;
        }
        
        // Only store critical auth data, not the entire objects
        const dataToStore: AuthSession = {
          user: {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata,
            app_metadata: user.app_metadata
          } as User,
          session: {
            access_token: session.access_token,
            expires_at: session.expires_at,
            refresh_token: session.refresh_token
          } as Session,
          expiresAt: session.expires_at ? session.expires_at * 1000 : undefined,
          role
        };
        
        // Use a more efficient approach by checking if the data has actually changed
        const currentData = localStorage.getItem(AUTH_STORAGE_KEY);
        const newData = JSON.stringify(dataToStore);
        
        // Only write to localStorage if the data has changed
        if (!currentData || currentData !== newData) {
          localStorage.setItem(AUTH_STORAGE_KEY, newData);
          console.log('[AuthService] Session data saved to storage');
        }
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        console.log('[AuthService] Session data removed from storage');
        
        // Also clean up any legacy keys that might still exist
        const legacyKeys = ['valorwell_auth_state', 'supabase.auth.token', 'auth_initialization_forced'];
        legacyKeys.forEach(key => {
          if (localStorage.getItem(key)) {
            console.log(`[AuthService] Removing legacy key: ${key}`);
            localStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      console.error('[AuthService] Error saving session to storage:', error);
      
      // In case of error, try to clean up potentially corrupted data
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch (cleanupError) {
        console.error('[AuthService] Error cleaning up storage:', cleanupError);
      }
    }
  }
  
  // Notify state change listeners
  private notifyListeners(): void {
    this._stateListeners.forEach(listener => listener(this._currentState));
  }
  
  // Public methods
  public get currentState(): AuthState {
    return this._currentState;
  }
  
  public get currentUser(): User | null {
    return this._sessionData?.user || null;
  }
  
  public get userId(): string | null {
    return this._sessionData?.user?.id || null;
  }
  
  public get userRole(): string | null {
    return this._sessionData?.role || null;
  }
  
  public get error(): AuthError | null {
    return this._error;
  }
  
  public get isInitialized(): boolean {
    return this._initialCheckComplete;
  }
  
  public addStateListener(listener: (state: AuthState) => void): () => void {
    this._stateListeners.push(listener);
    
    // Return function to remove listener
    return () => {
      this._stateListeners = this._stateListeners.filter(l => l !== listener);
    };
  }
  
  // Sign in with email and password
  public async signIn(email: string, password: string): Promise<{ success: boolean; error?: AuthError }> {
    try {
      console.log(`[AuthService] Attempting sign in for: ${email}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        this._error = {
          code: error.status?.toString(),
          message: error.message || 'Failed to sign in',
          originalError: error
        };
        return { success: false, error: this._error };
      }
      
      if (data?.session) {
        this.handleSuccessfulAuth(data.session);
        return { success: true };
      } else {
        this._error = {
          message: 'Sign in successful but no session returned'
        };
        return { success: false, error: this._error };
      }
    } catch (error: any) {
      this._error = {
        message: error.message || 'An error occurred during sign in',
        originalError: error
      };
      return { success: false, error: this._error };
    }
  }
  
  // Sign out
  public async signOut(): Promise<{ success: boolean; error?: AuthError }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        this._error = {
          code: error.status?.toString(),
          message: error.message || 'Failed to sign out',
          originalError: error
        };
        return { success: false, error: this._error };
      }
      
      this.handleSignOut();
      return { success: true };
    } catch (error: any) {
      this._error = {
        message: error.message || 'An error occurred during sign out',
        originalError: error
      };
      return { success: false, error: this._error };
    }
  }
  
  // Reset password
  public async resetPassword(email: string): Promise<{ success: boolean; error?: AuthError }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        return {
          success: false,
          error: {
            code: error.status?.toString(),
            message: error.message || 'Failed to send password reset email',
            originalError: error
          }
        };
      }
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message || 'An error occurred during password reset',
          originalError: error
        }
      };
    }
  }
  
  // Check if user has specific role - optimized for performance
  public hasRole(role: string | string[]): boolean {
    const currentRole = this.userRole;
    
    // Early return for unauthenticated users
    if (!currentRole || this._currentState !== AuthState.AUTHENTICATED) {
      return false;
    }
    
    // Optimize for the common case of a single role check
    if (typeof role === 'string') {
      return role === currentRole;
    }
    
    // For array of roles, use includes
    return role.includes(currentRole);
  }
  
  // Helper method to attempt session recovery from stored data
  private async attemptSessionRecovery(storedData: any): Promise<void> {
    try {
      console.log('[AuthService] Attempting session recovery from stored data');
      
      // Try to refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('[AuthService] Session refresh failed during recovery:', refreshError);
        
        // If refresh fails but we have stored user data, use it temporarily
        if (storedData?.user) {
          console.log('[AuthService] Using stored user data as fallback');
          this._sessionData = storedData;
          this._currentState = AuthState.AUTHENTICATED;
          this._error = {
            message: 'Using cached authentication data. Some features may be limited until network connectivity is restored.',
            code: 'USING_CACHED_AUTH'
          };
        } else {
          this._currentState = AuthState.UNAUTHENTICATED;
        }
      } else if (refreshData?.session) {
        console.log('[AuthService] Successfully recovered session');
        this.handleSuccessfulAuth(refreshData.session);
      } else {
        console.log('[AuthService] No session could be recovered');
        this._currentState = AuthState.UNAUTHENTICATED;
      }
    } catch (error) {
      console.error('[AuthService] Error during session recovery:', error);
      this._currentState = AuthState.ERROR;
      this._error = {
        message: 'Failed to recover authentication session',
        originalError: error
      };
    }
  }

  // Improved refresh session with better retry logic and error handling
  public async refreshSession(attempt = 1): Promise<boolean> {
    const BASE_DELAY = 2000; // 2 seconds (increased from 1s)
    
    try {
      console.log(`[AuthService] Refreshing session (attempt ${attempt}/${MAX_RETRIES})`);
      
      // Check network connectivity
      if (!navigator.onLine) {
        console.warn('[AuthService] Network appears to be offline during refresh');
        throw new Error('Network connectivity issue detected during refresh');
      }
      
      // First try to get current session with timeout
      const { data, error } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Session check timed out during refresh')), AUTH_TIMEOUT / 2)
        )
      ]);
      
      if (error) {
        throw error;
      }
      
      const session = data?.session;
      
      if (session) {
        this.handleSuccessfulAuth(session);
        return true;
      }
      
      // If no session, try explicit refresh with timeout
      const { data: refreshData, error: refreshError } = await Promise.race([
        supabase.auth.refreshSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Session refresh timed out')), AUTH_TIMEOUT / 2)
        )
      ]);
      
      if (refreshError) {
        throw refreshError;
      }
      
      if (refreshData?.session) {
        this.handleSuccessfulAuth(refreshData.session);
        return true;
      }
      
      // No session found after refresh
      this._currentState = AuthState.UNAUTHENTICATED;
      this.saveSessionToStorage(null, null);
      this.notifyListeners();
      return false;
      
    } catch (error: any) {
      console.error(`[AuthService] Refresh attempt ${attempt} failed:`, error);
      
      if (attempt < MAX_RETRIES) {
        // Improved exponential backoff with jitter
        const baseDelay = BASE_DELAY * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 1000; // Add up to 1s of random jitter
        const delay = baseDelay + jitter;
        
        console.log(`[AuthService] Refresh failed, retrying in ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.refreshSession(attempt + 1);
      }
      
      // Max retries reached
      this._error = {
        code: error.status?.toString() || 'REFRESH_FAILED',
        message: error.message || 'Failed to refresh session after multiple attempts',
        originalError: error
      };
      
      // If we can't refresh, assume session is invalid
      this._currentState = AuthState.UNAUTHENTICATED;
      this.saveSessionToStorage(null, null);
      this.notifyListeners();
      
      return false;
    }
  }
}

export default AuthService.getInstance();
