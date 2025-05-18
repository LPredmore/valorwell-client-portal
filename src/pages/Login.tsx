import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth, AuthState } from '@/context/NewAuthContext';
import { AlertCircle, Loader2, Bug } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DebugUtils } from "@/utils/debugUtils";

const Login = () => {
  const navigate = useNavigate();
  const { login, authState, userRole, clientStatus, authInitialized, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginTimeout, setLoginTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const sessionId = useRef(DebugUtils.generateSessionId()).current;
  
  // Reset form state when auth state changes
  useEffect(() => {
    DebugUtils.log(sessionId, "Auth state changed in Login component", {
      authState, 
      userRole, 
      clientStatus, 
      isLoading,
      isSubmitting
    });
    
    // If we're authenticated, client data is loaded, and form was submitting, handle redirection
    if (authState === AuthState.AUTHENTICATED && !isLoading && isSubmitting) {
      DebugUtils.log(sessionId, "Auth complete and client data loaded. Ready for redirection.");
      setIsSubmitting(false);
      
      // Clear safety timeout if it exists
      if (loginTimeout) {
        clearTimeout(loginTimeout);
        setLoginTimeout(null);
      }
      
      handleSuccessfulLogin();
    }
    
    // If there's an auth error while submitting, reset the form
    if (authState === AuthState.ERROR && isSubmitting) {
      setIsSubmitting(false);
      setError("Authentication error. Please try again.");
      
      // Clear safety timeout if it exists
      if (loginTimeout) {
        clearTimeout(loginTimeout);
        setLoginTimeout(null);
      }
    }
    
    // If auth is initialized but not authenticated, reset submitting state
    if (authInitialized && authState === AuthState.UNAUTHENTICATED && isSubmitting) {
      DebugUtils.log(sessionId, "Auth initialized but not authenticated. Resetting submitting state.");
      setIsSubmitting(false);
    }
  }, [authState, userRole, clientStatus, isLoading, authInitialized, loginTimeout, sessionId]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (loginTimeout) {
        clearTimeout(loginTimeout);
      }
    };
  }, [loginTimeout]);

  const handleSuccessfulLogin = () => {
    DebugUtils.log(sessionId, "Handling successful login", { userRole, clientStatus });
    toast.success("Login successful", { description: "Welcome back!" });
    
    // Handle redirection based on role and client status
    if (userRole === 'client') {
      if (clientStatus === 'New') {
        DebugUtils.log(sessionId, "Redirecting client with New status to profile setup");
        navigate("/profile-setup");
      } else {
        DebugUtils.log(sessionId, "Redirecting client to dashboard");
        navigate("/patient-dashboard");
      }
    } else if (userRole === 'clinician') {
      navigate("/clients");
    } else if (userRole === 'admin') {
      navigate("/settings");
    } else {
      navigate("/");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      DebugUtils.log(sessionId, "Attempting login with", { email });
      const { success, error } = await login(email, password);
      DebugUtils.log(sessionId, "Login result", { success, error });
      
      if (success) {
        // Set a safety timeout to reset loading state if client data loading doesn't complete
        const timeout = setTimeout(() => {
          DebugUtils.log(sessionId, "Safety timeout reached - force handling login completion");
          
          if (isSubmitting) {
            setIsSubmitting(false);
            
            // If we're already authenticated but client data is taking too long, try redirecting anyway
            if (authState === AuthState.AUTHENTICATED) {
              DebugUtils.log(sessionId, "Auth is complete but client data may be incomplete. Forcing redirection.");
              handleSuccessfulLogin();
            } else {
              DebugUtils.log(sessionId, "Auth still not complete after timeout. Showing error message.");
              setError("Login process is taking longer than expected. Please try again.");
            }
          }
        }, 5000); // 5 second timeout
        
        setLoginTimeout(timeout);
        
      } else {
        setError(error?.message || "Invalid login credentials. Please try again.");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      DebugUtils.error(sessionId, "Login error", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleDiagnosticMode = () => {
    setShowDebug(!showDebug);
  };

  const handleDiagnosticsPageOpen = () => {
    navigate("/debug/auth-public");
  };
  
  // We're logging auth state so we can see it in console for debugging
  const authStateString = authState ? AuthState[authState] : 'undefined';

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
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password"
                type="password" 
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div className="text-right">
              <button 
                type="button"
                onClick={() => navigate("/reset-password")}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                Forgot password?
              </button>
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : "Sign in"}
            </Button>
          </form>
          
          {/* Debug section */}
          <div className="mt-4">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              className="w-full text-xs flex items-center justify-center"
              onClick={handleDiagnosticMode}
            >
              <Bug className="h-3 w-3 mr-1" />
              {showDebug ? "Hide Diagnostic Info" : "Show Diagnostic Info"}
            </Button>
          </div>
          
          {showDebug && (
            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <h4 className="text-xs font-semibold mb-1">Auth State Diagnostics:</h4>
              <ul className="text-xs space-y-1">
                <li>Auth State: <span className="font-mono">{authStateString}</span></li>
                <li>Auth Initialized: <span className="font-mono">{authInitialized ? "Yes" : "No"}</span></li>
                <li>Loading: <span className="font-mono">{isLoading ? "Yes" : "No"}</span></li>
                <li>User Role: <span className="font-mono">{userRole || "None"}</span></li>
                <li>Client Status: <span className="font-mono">{clientStatus || "None"}</span></li>
                <li>Is Submitting: <span className="font-mono">{isSubmitting ? "Yes" : "No"}</span></li>
              </ul>
              
              <Button 
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 text-xs w-full"
                onClick={handleDiagnosticsPageOpen}
              >
                Open Full Diagnostics Page
              </Button>
            </div>
          )}
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
    </div>
  );
};

export default Login;
