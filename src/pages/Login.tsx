
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, AuthState } from "@/context/UserContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import LoginForm from "@/components/auth/LoginForm";
import ForgotPasswordDialog from "@/components/auth/ForgotPasswordDialog";
import { logSupabaseConfig, logAuthContext } from "@/utils/authDebugUtils";

const Login = () => {
  const navigate = useNavigate();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const { userId, authState, authInitialized, isLoading, authError } = useUser();
  const [authCheckTimeout, setAuthCheckTimeout] = useState(false);

  // Check if user is already authenticated and auth is initialized
  useEffect(() => {
    console.log("[Login] Checking auth state, userId:", userId, "authState:", authState, "authInitialized:", authInitialized, "isLoading:", isLoading);
    
    // Log detailed auth debugging information
    logSupabaseConfig();
    logAuthContext({ userId, authState, authInitialized, isLoading, authError });
    
    // Redirect if already authenticated
    if (authInitialized && !isLoading && authState === AuthState.AUTHENTICATED && userId) {
      console.log("[Login] User is already authenticated, redirecting to home");
      navigate("/");
    }
  }, [userId, authState, authInitialized, isLoading, navigate, authError]);

  // Add timeout for auth check
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (authState === AuthState.INITIALIZING || isLoading) {
      timeoutId = setTimeout(() => {
        console.log("[Login] Auth check timeout reached after 10 seconds");
        setAuthCheckTimeout(true);
      }, 10000);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [authState, isLoading]);

  const handleForgotPassword = () => {
    setIsResetDialogOpen(true);
  };

  // Show loading indicator if auth context is initializing
  if (authState === AuthState.INITIALIZING || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600 mb-2">
            {authState === AuthState.INITIALIZING
              ? "Initializing authentication..."
              : "Loading user data..."}
          </p>
          {authCheckTimeout && (
            <div className="mt-4">
              <p className="text-amber-600 text-sm mb-4">
                This is taking longer than expected.
              </p>
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
  }

  // Show error state if authentication failed
  if (authState === AuthState.ERROR && authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center bg-red-50 p-6 rounded-lg border border-red-200 max-w-md">
          <h3 className="text-lg font-medium text-red-800 mb-2">Authentication Error</h3>
          <p className="text-red-600 mb-4">{authError.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm onForgotPassword={handleForgotPassword} />
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <button 
              onClick={() => navigate("/signup")} 
              className="text-blue-500 hover:text-blue-700 font-medium"
            >
              Sign up
            </button>
          </p>
          <p className="text-center text-sm text-gray-500">
            <button 
              onClick={() => navigate("/reset-password")} 
              className="text-blue-500 hover:text-blue-700 font-medium"
            >
              Admin password reset
            </button>
          </p>
        </CardFooter>
      </Card>

      {/* Password Reset Dialog */}
      <ForgotPasswordDialog 
        isOpen={isResetDialogOpen} 
        onOpenChange={setIsResetDialogOpen} 
      />
    </div>
  );
};

export default Login;
