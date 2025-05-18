
import React, { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth, AuthState } from '@/context/NewAuthContext';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  blockNewClients?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles,
  blockNewClients = false
}) => {
  const { 
    userRole, 
    clientStatus, 
    isLoading, 
    authInitialized, 
    authState,
    authError
  } = useAuth();
  const { toast } = useToast();
  const { clientId } = useParams();
  
  // Log the current state for debugging
  useEffect(() => {
    console.log(`[ProtectedRoute] Status: authState=${authState}, isLoading=${isLoading}, authInitialized=${authInitialized}, userRole=${userRole}, clientStatus=${clientStatus}, blockNewClients=${blockNewClients}`);
  }, [authState, isLoading, authInitialized, userRole, clientStatus, blockNewClients]);

  // Handle auth state transitions with appropriate UI
  if (authState === AuthState.INITIALIZING || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
        <p className="text-valorwell-600 mb-2">
          {authState === AuthState.INITIALIZING 
            ? "Initializing authentication..." 
            : "Loading user data..."}
        </p>
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
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-valorwell-600 text-white rounded-md"
        >
          Refresh Page
        </button>
      </div>
    );
  }
  
  // If user is not authenticated, redirect to login
  if (authState === AuthState.UNAUTHENTICATED) {
    console.log("[ProtectedRoute] User is not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }
  
  // At this point we know the user is authenticated, so check role-based access
  if (!userRole || !allowedRoles.includes(userRole)) {
    console.log(`[ProtectedRoute] User role '${userRole}' not in allowed roles: [${allowedRoles.join(', ')}]`);
    
    // Redirect clients to patient dashboard
    if (userRole === 'client') {
      console.log("[ProtectedRoute] Redirecting client to patient dashboard");
      return <Navigate to="/patient-dashboard" replace />;
    }
    // Redirect everyone else to login
    else {
      console.log("[ProtectedRoute] No valid role, redirecting to login");
      return <Navigate to="/login" replace />;
    }
  }
  
  // For clients, check if they're "New" and should be blocked from this route
  if (userRole === 'client' && blockNewClients && clientStatus === 'New') {
    console.log("[ProtectedRoute] Blocking new client, redirecting to profile setup");
    return <Navigate to="/profile-setup" replace />;
  }
  
  // Allow access to the protected route
  console.log(`[ProtectedRoute] Access granted to protected route with role: ${userRole}`);
  return <>{children}</>;
};

export default ProtectedRoute;
