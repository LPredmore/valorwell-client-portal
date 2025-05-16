
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AuthState } from '@/context/NewAuthContext';
import { toast } from 'sonner';

interface AuthProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  blockNewClients?: boolean;
  redirectPath?: string;
}

const AuthProtectedRoute: React.FC<AuthProtectedRouteProps> = ({
  children,
  allowedRoles,
  blockNewClients = false,
  redirectPath = '/login'
}) => {
  const { 
    authState, 
    isLoading, 
    authInitialized, 
    userRole, 
    clientStatus, 
    authError 
  } = useAuth();
  
  const location = useLocation();
  
  // Log the current state for debugging
  useEffect(() => {
    console.log(`[AuthProtectedRoute] Status: authState=${authState}, isLoading=${isLoading}, authInitialized=${authInitialized}, userRole=${userRole}, clientStatus=${clientStatus}, blockNewClients=${blockNewClients}`);
  }, [authState, isLoading, authInitialized, userRole, clientStatus, blockNewClients]);

  // Handle initialization and loading state with a time limit
  const [showLoadingTimeout, setShowLoadingTimeout] = React.useState(false);
  
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (!authInitialized || isLoading) {
      timeoutId = setTimeout(() => {
        setShowLoadingTimeout(true);
      }, 5000); // Show timeout message after 5 seconds
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [authInitialized, isLoading]);

  // Handle loading state
  if (!authInitialized || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
        <p className="text-valorwell-600 mb-2">
          {!authInitialized
            ? "Initializing authentication..."
            : "Loading user data..."}
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

  // Handle error state
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

  // If user is not authenticated, redirect to login
  if (authState === AuthState.UNAUTHENTICATED) {
    console.log(`[AuthProtectedRoute] User not authenticated, redirecting to ${redirectPath}`);
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // User is authenticated, check role
  if (!userRole || !allowedRoles.includes(userRole)) {
    console.log(`[AuthProtectedRoute] User role '${userRole}' not in allowed roles: [${allowedRoles.join(', ')}]`);
    
    // Redirect clients to patient dashboard
    if (userRole === 'client') {
      toast.warning("You don't have permission to access this page");
      console.log("[AuthProtectedRoute] Redirecting client to patient dashboard");
      return <Navigate to="/patient-dashboard" replace />;
    }
    
    // Redirect others to login
    toast.warning("You don't have the required permissions");
    console.log("[AuthProtectedRoute] No valid role, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // For clients, block new clients if specified
  if (userRole === 'client' && blockNewClients && clientStatus === 'New') {
    console.log("[AuthProtectedRoute] Blocking new client, redirecting to profile setup");
    toast.info("Please complete your profile first");
    return <Navigate to="/profile-setup" replace />;
  }

  // Access granted
  console.log(`[AuthProtectedRoute] Access granted with role: ${userRole}`);
  return <>{children}</>;
};

export default AuthProtectedRoute;
