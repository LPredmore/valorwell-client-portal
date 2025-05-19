
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AuthState } from '@/context/NewAuthContext';
import { toast } from 'sonner';

interface AuthProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  blockNewClients?: boolean;
  redirectPath?: string;
}

const AuthProtectedRoute: React.FC<AuthProtectedRouteProps> = ({
  children,
  allowedRoles = ["client"],
  blockNewClients = false,
  redirectPath = '/login'
}) => {
  const { 
    authState, 
    isLoading, 
    authInitialized, 
    userRole, 
    clientStatus, 
    authError,
    clientProfile,
    refreshUserData,
    forceRefreshAuth,
    emergencyResetAuth
  } = useAuth();
  
  // Add recovery states with more detailed tracking
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [showRecoveryUI, setShowRecoveryUI] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<'standard' | 'advanced' | 'emergency'>('standard');
  const [showDetailedDiagnostics, setShowDetailedDiagnostics] = useState(false);
  
  const location = useLocation();
  const isPreviewEnvironment = window.location.hostname.includes('lovableproject.com');
  
  // Log the current state for debugging - only in development environment or preview
  useEffect(() => {
    if (import.meta.env.DEV || isPreviewEnvironment) {
      console.log(`[AuthProtectedRoute] Status: authState=${authState}, isLoading=${isLoading}, authInitialized=${authInitialized}, userRole=${userRole}, clientStatus=${clientStatus}, blockNewClients=${blockNewClients}, path=${location.pathname}`);
    }
  }, [authState, isLoading, authInitialized, userRole, clientStatus, blockNewClients, location, isPreviewEnvironment]);

  // Detect redirect loops and attempt to recover with enhanced tracking
  useEffect(() => {
    const redirectCount = parseInt(sessionStorage.getItem('redirectCount') || '0', 10);
    const redirectTimestamp = parseInt(sessionStorage.getItem('redirectTimestamp') || '0', 10);
    const currentTime = Date.now();
    
    // If last redirect was more than 10 seconds ago, reset counter
    if (currentTime - redirectTimestamp > 10000) {
      sessionStorage.setItem('redirectCount', '0');
      sessionStorage.setItem('redirectTimestamp', currentTime.toString());
      return;
    }
    
    // Update timestamp
    sessionStorage.setItem('redirectTimestamp', currentTime.toString());
    
    if (redirectCount > 5) {
      console.error('[AuthProtectedRoute] Detected potential redirect loop. Attempting recovery.');
      sessionStorage.setItem('redirectCount', '0'); // Reset counter
      
      // Try to refresh user data to recover from auth state issues
      if (authState === AuthState.AUTHENTICATED && !clientProfile) {
        console.log('[AuthProtectedRoute] Authenticated user missing profile data, trying to refresh');
        
        // Show a toast immediately for user feedback
        toast.loading("Loading your profile data...", { id: "recovery-refresh", duration: 5000 });
        
        refreshUserData().catch(err => {
          console.error('[AuthProtectedRoute] Error refreshing user data:', err);
          toast.error("Error loading your profile");
          setShowRecoveryUI(true); // Show recovery UI if refresh fails
        });
      } else if (authState === AuthState.ERROR) {
        // Show recovery UI immediately on error state
        toast.error("Authentication issue detected");
        setShowRecoveryUI(true);
      }
    } else {
      // Increment redirect counter
      sessionStorage.setItem('redirectCount', (redirectCount + 1).toString());
    }
  }, [location.pathname, authState, clientProfile, refreshUserData]);

  // Handle loading timeout with progressive states
  const [loadingState, setLoadingState] = useState<'initial' | 'extended' | 'timeout'>('initial');
  
  useEffect(() => {
    // Only set up the timeout if we're in a loading state
    let initialTimeoutId: NodeJS.Timeout | undefined;
    let extendedTimeoutId: NodeJS.Timeout | undefined;
    
    if (!authInitialized || isLoading) {
      // First timeout - show extended waiting message
      initialTimeoutId = setTimeout(() => {
        setLoadingState('extended');
      }, isPreviewEnvironment ? 3000 : 5000); // Shorter initial timeout in preview
      
      // Second timeout - show potential issue message
      extendedTimeoutId = setTimeout(() => {
        setLoadingState('timeout');
      }, isPreviewEnvironment ? 8000 : 15000); // Shorter extended timeout in preview
    } else if (loadingState !== 'initial') {
      // Reset the timeout state when loading is complete
      setLoadingState('initial');
    }
    
    return () => {
      if (initialTimeoutId) clearTimeout(initialTimeoutId);
      if (extendedTimeoutId) clearTimeout(extendedTimeoutId);
    };
  }, [authInitialized, isLoading, loadingState, isPreviewEnvironment]);

  // Add specific debug for client status detection
  useEffect(() => {
    if (blockNewClients && authState === AuthState.AUTHENTICATED) {
      const isClientStatusNew = clientStatus === 'New' || clientStatus === null || clientStatus === undefined;
      const clientProfileComplete = clientProfile?.client_is_profile_complete === true;
      
      console.log(`[AuthProtectedRoute] Protection Check: clientStatus=${clientStatus}, isNew=${isClientStatusNew}, profileComplete=${clientProfileComplete}, blockingEnabled=${blockNewClients}, path=${location.pathname}`);
    }
  }, [clientStatus, clientProfile, blockNewClients, authState, location.pathname]);

  // Handle recovery attempt with progressive strategies
  const handleRecoveryAttempt = async (method: 'standard' | 'advanced' | 'emergency' = 'standard') => {
    setIsRecovering(true);
    setRecoveryMethod(method);
    setRecoveryAttempts(prev => prev + 1);
    
    try {
      if (method === 'emergency') {
        // Emergency reset is a complete teardown of auth state
        const result = emergencyResetAuth();
        
        // Toast message and redirect are handled by emergencyResetAuth
        return; // Exit early as page will reload
      }
      
      if (method === 'advanced') {
        // Advanced recovery attempts a deeper session restoration
        toast.loading("Performing advanced authentication recovery...", { 
          id: "advanced-recovery",
          duration: 15000
        });
        
        // Advanced forced refresh (reload with clear cache)
        setTimeout(() => {
          // Clear caches for a complete refresh
          if ('caches' in window) {
            caches.keys().then((names) => {
              names.forEach(name => {
                caches.delete(name);
              });
            });
          }
          
          // Force reload the page with cache clear
          window.location.reload();
          
        }, 2000);
        return;
      }
      
      // Standard recovery - force refresh authentication
      const success = await forceRefreshAuth();
      
      if (success) {
        // If successful, hide recovery UI and continue
        toast.success("Authentication restored successfully!");
        setShowRecoveryUI(false);
        sessionStorage.setItem('redirectCount', '0');
      } else if (recoveryAttempts >= 2) {
        // After multiple failed attempts, suggest advanced recovery
        toast.error("Standard recovery failed. Try advanced recovery.");
      } else {
        toast.error("Authentication recovery failed. Please try again.");
      }
    } catch (error) {
      console.error('[AuthProtectedRoute] Recovery attempt failed:', error);
      toast.error("Authentication recovery failed. Please try again.");
    } finally {
      setIsRecovering(false);
    }
  };

  // Create recovery component with improved UI and multiple recovery options
  const recoveryComponent = React.useMemo(() => {
    if (showRecoveryUI) {
      return (
        <div className="flex h-screen w-full items-center justify-center flex-col p-4 bg-gray-50">
          <div className="bg-white shadow-lg rounded-lg p-6 max-w-md w-full">
            <div className="text-center">
              <div className="text-amber-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <p className="text-red-600 font-medium text-lg mb-2">Authentication Issue Detected</p>
              <p className="text-center text-gray-600 mb-6">
                We're having trouble with your authentication session. This can happen due to network issues or session timeouts.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleRecoveryAttempt('standard')}
                  disabled={isRecovering}
                  className="px-4 py-3 bg-valorwell-600 text-white rounded-md hover:bg-valorwell-700 transition-colors block w-full disabled:opacity-70"
                >
                  {isRecovering && recoveryMethod === 'standard' ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Restoring session...
                    </span>
                  ) : (
                    'Restore Authentication Session'
                  )}
                </button>
                
                {recoveryAttempts >= 1 && (
                  <button
                    onClick={() => handleRecoveryAttempt('advanced')}
                    disabled={isRecovering}
                    className="px-4 py-3 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors block w-full disabled:opacity-70"
                  >
                    {isRecovering && recoveryMethod === 'advanced' ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Advanced recovery...
                      </span>
                    ) : (
                      'Advanced Recovery (Reload with Cache Clear)'
                    )}
                  </button>
                )}
                
                {recoveryAttempts >= 2 && (
                  <button
                    onClick={() => handleRecoveryAttempt('emergency')}
                    disabled={isRecovering}
                    className="px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors block w-full disabled:opacity-70"
                  >
                    {isRecovering && recoveryMethod === 'emergency' ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Resetting...
                      </span>
                    ) : (
                      'Emergency Reset (Sign Out & Clear All Data)'
                    )}
                  </button>
                )}
                
                <button
                  onClick={() => {
                    // Clear session storage and local storage auth data
                    sessionStorage.clear();
                    localStorage.removeItem('supabase.auth.token');
                    localStorage.removeItem('auth_session_cache');
                    window.location.href = '/login';
                  }}
                  className="px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors block w-full"
                  disabled={isRecovering}
                >
                  Sign Out & Go to Login
                </button>
                
                {/* Technical details toggle */}
                <div className="mt-4 text-center">
                  <button 
                    onClick={() => setShowDetailedDiagnostics(!showDetailedDiagnostics)}
                    className="text-gray-500 hover:text-gray-700 text-sm underline"
                  >
                    {showDetailedDiagnostics ? 'Hide' : 'Show'} technical details
                  </button>
                  
                  {showDetailedDiagnostics && (
                    <div className="mt-2 bg-gray-50 p-3 rounded text-left text-xs font-mono">
                      <p className="font-semibold mb-1">Diagnostic Information:</p>
                      <ul className="space-y-1 text-gray-600">
                        <li>Auth State: {authState}</li>
                        <li>Is Loading: {isLoading.toString()}</li>
                        <li>Auth Initialized: {authInitialized.toString()}</li>
                        <li>Client Status: {clientStatus || 'null'}</li>
                        <li>User Role: {userRole || 'null'}</li>
                        <li>Recovery Attempts: {recoveryAttempts}</li>
                        <li>Environment: {isPreviewEnvironment ? 'Preview' : 'Standard'}</li>
                        <li>Has Profile: {clientProfile ? 'Yes' : 'No'}</li>
                        <li>Error Code: {authError?.code || 'none'}</li>
                        <li className="break-all">Path: {location.pathname}</li>
                        <li className="break-all">Error: {authError?.message || 'none'}</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }, [showRecoveryUI, isRecovering, recoveryMethod, recoveryAttempts, authState, isLoading, clientStatus, userRole, clientProfile, authInitialized, authError, isPreviewEnvironment, location.pathname, showDetailedDiagnostics]);
  
  // Create loading component with progressive feedback stages
  const loadingComponent = React.useMemo(() => {
    if (!authInitialized || isLoading) {
      return (
        <div className="flex h-screen w-full items-center justify-center flex-col">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
          <p className="text-valorwell-600 mb-2">
            {!authInitialized
              ? "Initializing authentication..."
              : "Loading your profile..."}
          </p>
          
          {loadingState === 'extended' && (
            <p className="text-amber-600 mt-4 max-w-xs text-center">
              This is taking a bit longer than expected. 
              {isPreviewEnvironment && " Preview environments may have slower connections."}
            </p>
          )}
          
          {loadingState === 'timeout' && (
            <div className="mt-6 text-center max-w-md px-4">
              <p className="text-amber-600 mb-2">This is taking longer than expected.</p>
              <p className="text-gray-600 mb-4">There might be an issue with your connection.</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => refreshUserData()}
                  className="px-4 py-2 bg-valorwell-600 text-white rounded-md hover:bg-valorwell-700 transition-colors"
                >
                  Retry Loading
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors ml-2"
                >
                  Refresh Page
                </button>
                
                {isPreviewEnvironment && (
                  <p className="text-xs text-gray-500 mt-4">
                    Note: Preview environments may experience slower loading times. 
                    For the best experience, use the published version of the app.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  }, [authInitialized, isLoading, refreshUserData, loadingState, isPreviewEnvironment]);
  
  // Create error component
  const errorComponent = React.useMemo(() => {
    if (authState === AuthState.ERROR && !showRecoveryUI) {
      return (
        <div className="flex h-screen w-full items-center justify-center flex-col">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <p className="text-red-600 font-medium mb-2">Authentication Error</p>
          <p className="text-center text-gray-600 mb-6 max-w-md px-4">
            {authError?.message || "There was a problem verifying your access"}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => setShowRecoveryUI(true)}
              className="px-4 py-2 bg-valorwell-600 text-white rounded-md hover:bg-valorwell-700 transition-colors block w-full"
            >
              Try to Recover Session
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors block w-full"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return null;
  }, [authState, authError, showRecoveryUI]);
  
  // Show recovery UI if explicitly enabled
  if (recoveryComponent) {
    return recoveryComponent;
  }
  
  // Check if loading component should be shown
  if (loadingComponent) {
    return loadingComponent;
  }
  
  // Check if error component should be shown
  if (errorComponent) {
    return errorComponent;
  }

  // If user is not authenticated, redirect to login
  if (authState === AuthState.UNAUTHENTICATED) {
    console.log(`[AuthProtectedRoute] User not authenticated, redirecting to ${redirectPath}`);
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // User is authenticated, check role - we only accept client role in this application
  if (userRole !== 'client') {
    toast.warning("This application is for patients only");
    console.log("[AuthProtectedRoute] User is not a client, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // For clients, handle the blocking of new clients if specified
  // ENHANCED PROTECTION: Explicitly check for "New" status, null status, undefined status, incomplete profile
  // Making sure we treat non-loaded status as "New" for safety
  const isNewOrIncompleteClient = 
    (clientStatus === 'New' || 
    clientStatus === null || 
    clientStatus === undefined) && 
    clientProfile?.client_is_profile_complete !== true;
  
  // Allow "Therapist Selected" status to access protected routes
  if (clientStatus === 'Therapist Selected') {
    console.log("[AuthProtectedRoute] Client has Therapist Selected status, granting access");
  } 
  // CRITICAL FIX: When authentication is fully loaded (not in loading state),
  // if we're blocking new clients, AND the client is new or has incomplete profile,
  // AND we're not already on the profile setup page, redirect to profile setup
  else if (blockNewClients && 
      !isLoading && 
      authInitialized && 
      isNewOrIncompleteClient && 
      location.pathname !== '/profile-setup') {
    console.log("[AuthProtectedRoute] Blocking new/incomplete client, redirecting to profile setup", {
      clientStatus, 
      isNewOrIncompleteClient, 
      profileComplete: clientProfile?.client_is_profile_complete
    });
    
    // Show a toast message to inform the user
    toast.info("Please complete your profile first");
    
    // Redirect to profile setup
    return <Navigate to="/profile-setup" replace />;
  }

  // Access granted
  console.log(`[AuthProtectedRoute] Access granted to protected route for client`);
  sessionStorage.setItem('redirectCount', '0'); // Reset counter on successful access
  return <>{children}</>;
};

export default AuthProtectedRoute;
