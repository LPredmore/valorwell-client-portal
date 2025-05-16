
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import AuthStateMonitor from '@/components/auth/AuthStateMonitor';

const Index = () => {
  const navigate = useNavigate();
  const { userRole, isLoading, authInitialized, clientStatus, userId } = useUser();
  const [authError, setAuthError] = useState<string | null>(null);

  // Log the current state on each render for debugging
  console.log(
    "[Index Render] authInitialized:", authInitialized, 
    "isLoading:", isLoading, 
    "userId:", userId, 
    "userRole:", userRole, 
    "clientStatus:", clientStatus
  );

  useEffect(() => {
    console.log(
      "[Index Effect] Checking conditions. authInitialized:", authInitialized, 
      "isLoading:", isLoading, 
      "userId:", userId, 
      "userRole:", userRole, 
      "clientStatus:", clientStatus
    );

    // Only proceed if authentication has been initialized and context is not actively loading
    if (!authInitialized || isLoading) {
      console.log("[Index Effect] Waiting: Auth not initialized or UserContext is loading.");
      return; // Do nothing until context is ready
    }

    // At this point, authInitialized is true and isLoading is false.
    console.log("[Index Effect] Context ready. Proceeding with redirect logic.");

    if (userId) { // User is authenticated
      if (userRole === 'admin') {
        console.log("[Index Effect] Redirecting admin to /settings");
        navigate('/settings', { replace: true });
      } else if (userRole === 'clinician') {
        console.log("[Index Effect] Redirecting clinician to /clinician-dashboard");
        navigate('/clinician-dashboard', { replace: true });
      } else if (userRole === 'client') {
        if (clientStatus === 'New') {
          console.log("[Index Effect] Redirecting new client to /profile-setup");
          navigate('/profile-setup', { replace: true });
        } else {
          console.log("[Index Effect] Redirecting client to /patient-dashboard");
          navigate('/patient-dashboard', { replace: true });
        }
      } else {
        console.warn(`[Index Effect] User (ID: ${userId}) has no recognized role ('${userRole}'). Redirecting to login.`);
        navigate('/login', { replace: true });
      }
    } else { // No userId, so not authenticated
      console.log("[Index Effect] No userId. Redirecting to /login.");
      navigate('/login', { replace: true });
    }
  }, [authInitialized, isLoading, userId, userRole, clientStatus, navigate]);

  // Display a loading indicator while waiting for auth to initialize or user data to load
  return (
    <div className="min-h-screen flex items-center justify-center">
      {/* Set AuthStateMonitor to be visible in development environment for debugging */}
      <AuthStateMonitor visible={process.env.NODE_ENV === 'development'} />
      <div className="text-center">
        {!authInitialized || isLoading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600 mb-2">
              {!authInitialized
                ? "Initializing authentication..."
                : "Loading user data..."}
            </p>
          </div>
        ) : null}
        
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
