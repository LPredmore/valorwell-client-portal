
import React, { useEffect } from 'react';
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
    clientProfile
  } = useAuth();
  
  const location = useLocation();
  
  // Log the current state for debugging - only in development environment
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(`[AuthProtectedRoute] Status: authState=${authState}, isLoading=${isLoading}, authInitialized=${authInitialized}, userRole=${userRole}, clientStatus=${clientStatus}, blockNewClients=${blockNewClients}, path=${location.pathname}`);
    }
  }, [authState, isLoading, authInitialized, userRole, clientStatus, blockNewClients, location]);

  // Handle loading timeout - Always initialize the state
  const [showLoadingTimeout, setShowLoadingTimeout] = React.useState(false);
  
  useEffect(() => {
    // Only set up the timeout if we're in a loading state
    let timeoutId: NodeJS.Timeout | undefined;
    
    if (!authInitialized || isLoading) {
      timeoutId = setTimeout(() => {
        setShowLoadingTimeout(true);
      }, 5000); // Show timeout message after 5 seconds
    } else if (showLoadingTimeout) {
      // Reset the timeout state when loading is complete
      setShowLoadingTimeout(false);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [authInitialized, isLoading, showLoadingTimeout]);

  // Add specific debug for client status detection
  useEffect(() => {
    if (blockNewClients && authState === AuthState.AUTHENTICATED) {
      const isClientStatusNew = clientStatus === 'New' || clientStatus === null || clientStatus === undefined;
      const clientProfileComplete = clientProfile?.client_is_profile_complete === true;
      
      console.log(`[AuthProtectedRoute] Protection Check: clientStatus=${clientStatus}, isNew=${isClientStatusNew}, profileComplete=${clientProfileComplete}, blockingEnabled=${blockNewClients}, path=${location.pathname}`);
    }
  }, [clientStatus, clientProfile, blockNewClients, authState, location.pathname]);

  // Create loading component
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
          
          {showLoadingTimeout && (
            <div className="mt-6 text-center max-w-md px-4">
              <p className="text-amber-600 mb-2">This is taking longer than expected.</p>
              <p className="text-gray-600 mb-4">There might be an issue with your connection.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-valorwell-600 text-white rounded-md hover:bg-valorwell-700 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>
      );
    }
    return null;
  }, [authInitialized, isLoading, showLoadingTimeout]);
  
  // Create error component
  const errorComponent = React.useMemo(() => {
    if (authState === AuthState.ERROR) {
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
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-valorwell-600 text-white rounded-md hover:bg-valorwell-700 transition-colors block w-full"
            >
              Refresh Page
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors block w-full"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }
    return null;
  }, [authState, authError]);
  
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
    clientStatus === 'New' || 
    clientStatus === null || 
    clientStatus === undefined || 
    clientProfile?.client_is_profile_complete !== true;
  
  // CRITICAL FIX: When authentication is fully loaded (not in loading state),
  // if we're blocking new clients, AND the client is new or has incomplete profile,
  // AND we're not already on the profile setup page, redirect to profile setup
  if (blockNewClients && 
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
  return <>{children}</>;
};

export default AuthProtectedRoute;
