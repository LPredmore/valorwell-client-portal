
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, AuthState } from '@/context/NewAuthContext';
import AuthStateMonitor from '@/components/auth/AuthStateMonitor';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { userRole, authState, authInitialized, isLoading, clientStatus, userId } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  // Log the current state on each render for debugging
  useEffect(() => {
    console.log(
      "[Index] Auth state:", authState,
      "authInitialized:", authInitialized, 
      "isLoading:", isLoading, 
      "userId:", userId, 
      "userRole:", userRole, 
      "clientStatus:", clientStatus
    );

    // Only proceed if authentication has been initialized and context is not actively loading
    if (authState === AuthState.INITIALIZING || isLoading) {
      console.log("[Index] Waiting: Auth initializing or context is loading.");
      return;
    }

    console.log("[Index] Auth state ready, proceeding with redirect logic.");

    if (authState === AuthState.AUTHENTICATED && userId) { // User is authenticated
      if (userRole === 'admin') {
        console.log("[Index] Redirecting admin to /settings");
        navigate('/settings', { replace: true });
      } else if (userRole === 'clinician') {
        console.log("[Index] Redirecting clinician to /clinician-dashboard");
        navigate('/clinician-dashboard', { replace: true });
      } else if (userRole === 'client') {
        if (clientStatus === 'New') {
          console.log("[Index] Redirecting new client to /profile-setup");
          navigate('/profile-setup', { replace: true });
        } else {
          console.log("[Index] Redirecting client to /patient-dashboard");
          navigate('/patient-dashboard', { replace: true });
        }
      } else {
        console.warn(`[Index] User (ID: ${userId}) has no recognized role ('${userRole}'). Redirecting to login.`);
        setAuthError(`Account has no recognized role: ${userRole || 'undefined'}`);
        navigate('/login', { replace: true });
      }
    } else if (authState === AuthState.UNAUTHENTICATED) { // No userId, so not authenticated
      console.log("[Index] User not authenticated. Redirecting to /login.");
      navigate('/login', { replace: true });
    } else if (authState === AuthState.ERROR) { // Authentication error
      console.log("[Index] Authentication error. Redirecting to /login.");
      setAuthError("Authentication error occurred. Please try logging in again.");
      navigate('/login', { replace: true });
    }
  }, [authState, authInitialized, isLoading, userId, userRole, clientStatus, navigate]);

  // Display a loading indicator while waiting for auth to initialize or user data to load
  return (
    <div className="min-h-screen flex items-center justify-center">
      {/* Set AuthStateMonitor to be visible in development environment for debugging */}
      <AuthStateMonitor visible={process.env.NODE_ENV === 'development'} />
      <div className="text-center">
        {(authState === AuthState.INITIALIZING || isLoading) && (
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600 mb-2">
              {authState === AuthState.INITIALIZING
                ? "Initializing authentication..."
                : "Loading user data..."}
            </p>
          </div>
        )}
        
        {authInitialized && !isLoading && authError && (
          <div className="flex flex-col items-center bg-red-50 p-6 rounded-lg border border-red-200 max-w-md">
            <h3 className="text-lg font-medium text-red-800 mb-2">Authentication Error</h3>
            <p className="text-red-600 mb-4">{authError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
