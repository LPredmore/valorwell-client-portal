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
const AUTH_TIMEOUT = 45000; // 45 seconds timeout for auth operations (increased from 15s)
const SESSION_EXPIRY_BUFFER = 600000; // 10 minutes buffer before actual expiry (increased from 5m)

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
  
  // Initial auth check with timeout protection
  private async performInitialSessionCheck(): Promise<void> {
    if (this._initialCheckComplete) return;
    
    try {
      console.log('[AuthService] Starting initial session check');
      // Use Promise.race to implement timeout with better error handling
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
      
      // Enhanced fallback mechanism
      try {
        console.log('[AuthService] Attempting enhanced fallback check');
        
        // First try getUser with timeout
        const { data: userData, error: userError } = await Promise.race([
          supabase.auth.getUser(),
          new Promise<{data: {user: null}, error: any}>((_, reject) =>
            setTimeout(() => reject(new Error('GetUser fallback timed out')), AUTH_TIMEOUT)
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
          } else {
            console.log('[AuthService] User found but could not refresh session');
            this._currentState = AuthState.UNAUTHENTICATED;
          }
        } else {
          console.log('[AuthService] No user found via getUser fallback');
          this._currentState = AuthState.UNAUTHENTICATED;
        }
      } catch (fallbackError) {
        console.error('[AuthService] Fallback check failed:', fallbackError);
        // Even if there's an error, still mark initialization as complete
        this._currentState = AuthState.ERROR;
        this._error = {
          message: 'Failed to check authentication status. Please try refreshing the page.',
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
  
  // Persist session data to local storage
  private saveSessionToStorage(user: User | null, session: Session | null, role?: string | null): void {
    try {
      if (user && session) {
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
        }
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (error) {
      console.error('[AuthService] Error saving session to storage:', error);
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
  
  // Force refresh session with retry logic
  public async refreshSession(attempt = 1): Promise<boolean> {
    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000; // 1 second
    
    try {
      console.log(`[AuthService] Refreshing session (attempt ${attempt})`);
      
      // First try to get current session
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      const session = data?.session;
      
      if (session) {
        this.handleSuccessfulAuth(session);
        return true;
      }
      
      // If no session, try explicit refresh
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
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
      if (attempt < MAX_RETRIES) {
        // Exponential backoff
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);
        console.log(`[AuthService] Refresh failed, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.refreshSession(attempt + 1);
      }
      
      // Max retries reached
      this._error = {
        code: error.status?.toString(),
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
