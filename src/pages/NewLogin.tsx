
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, AuthState } from "@/context/NewAuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import NewLoginForm from "@/components/auth/NewLoginForm";
import ForgotPasswordDialog from "@/components/auth/ForgotPasswordDialog";
import { Loader2 } from "lucide-react";

const NewLogin = () => {
  const navigate = useNavigate();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const { userId, authState, authInitialized, isLoading, authError } = useAuth();
  const [authCheckTimeout, setAuthCheckTimeout] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    console.log("[NewLogin] Checking auth state, userId:", userId, "authState:", authState, "authInitialized:", authInitialized, "isLoading:", isLoading);
    
    // Redirect if already authenticated
    if (authInitialized && !isLoading && authState === AuthState.AUTHENTICATED && userId) {
      console.log("[NewLogin] User is already authenticated, redirecting to home");
      navigate("/");
    }
  }, [userId, authState, authInitialized, isLoading, navigate]);

  // Add timeout for auth check
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if ((authState === AuthState.INITIALIZING || isLoading) && !authCheckTimeout) {
      timeoutId = setTimeout(() => {
        console.log("[NewLogin] Auth check timeout reached after 5 seconds");
        setAuthCheckTimeout(true);
      }, 5000);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [authState, isLoading, authCheckTimeout]);

  const handleForgotPassword = () => {
    setIsResetDialogOpen(true);
  };

  // Show loading indicator if auth context is initializing
  if (authState === AuthState.INITIALIZING || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600 mb-2">
              {authState === AuthState.INITIALIZING
                ? "Initializing authentication..."
                : "Loading user data..."}
            </p>
          </div>
          
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
          <NewLoginForm onForgotPassword={handleForgotPassword} />
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

export default NewLogin;
