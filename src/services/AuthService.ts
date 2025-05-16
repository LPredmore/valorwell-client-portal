
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
const AUTH_TIMEOUT = 5000; // 5 seconds timeout for auth operations

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
      if (storedData) {
        const parsedData = JSON.parse(storedData) as AuthSession;
        // Only use cached data if it hasn't expired
        if (parsedData.expiresAt && parsedData.expiresAt > Date.now()) {
          console.log('[AuthService] Restored session from storage');
          this._sessionData = parsedData;
          if (parsedData.user) {
            this._currentState = AuthState.AUTHENTICATED;
          } else {
            this._currentState = AuthState.UNAUTHENTICATED;
          }
        } else {
          console.log('[AuthService] Stored session expired, removing');
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('[AuthService] Error restoring session from storage:', error);
    }
  }
  
  // Set up Supabase auth listener
  private setupAuthStateListener(): void {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AuthService] Auth state changed: ${event}`);
      
      if (event === 'SIGNED_IN' && session) {
        this.handleSuccessfulAuth(session);
      } else if (event === 'SIGNED_OUT') {
        this.handleSignOut();
      } else if (event === 'USER_UPDATED' && session) {
        this.handleUserUpdated(session);
      }
    });
  }
  
  // Initial auth check with timeout protection
  private async performInitialSessionCheck(): Promise<void> {
    if (this._initialCheckComplete) return;
    
    try {
      // Use Promise.race to implement timeout
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise<{data: {session: null}}>((_, reject) => 
          setTimeout(() => reject(new Error('Auth session check timed out')), AUTH_TIMEOUT)
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
      // Even if there's an error, still mark initialization as complete
      this._currentState = AuthState.ERROR;
      this._error = {
        message: 'Failed to check authentication status',
        originalError: error
      };
    } finally {
      this._initialCheckComplete = true;
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
        
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(dataToStore));
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
  
  // Check if user has specific role
  public hasRole(role: string | string[]): boolean {
    const currentRole = this.userRole;
    
    if (!currentRole || this._currentState !== AuthState.AUTHENTICATED) {
      return false;
    }
    
    if (Array.isArray(role)) {
      return role.includes(currentRole);
    }
    
    return role === currentRole;
  }
  
  // Force refresh session
  public async refreshSession(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        this._error = {
          code: error.status?.toString(),
          message: error.message || 'Failed to refresh session',
          originalError: error
        };
        return false;
      }
      
      const session = data?.session;
      
      if (session) {
        this.handleSuccessfulAuth(session);
        return true;
      } else {
        this._currentState = AuthState.UNAUTHENTICATED;
        this.saveSessionToStorage(null, null);
        this.notifyListeners();
        return false;
      }
    } catch (error: any) {
      this._error = {
        message: error.message || 'An error occurred during session refresh',
        originalError: error
      };
      return false;
    }
  }
}

export default AuthService.getInstance();
