
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth, AuthState } from '@/context/NewAuthContext';
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Login = () => {
  const navigate = useNavigate();
  const { login, authState, userRole, clientStatus, authInitialized } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reset form state when auth state changes
  useEffect(() => {
    console.log("Auth state changed in Login component:", authState, "userRole:", userRole, "clientStatus:", clientStatus);
    
    // If we're authenticated and form was submitting, handle redirection
    if (authState === AuthState.AUTHENTICATED && isSubmitting) {
      setIsSubmitting(false);
      handleSuccessfulLogin();
    }
    
    // If there's an auth error while submitting, reset the form
    if (authState === AuthState.ERROR && isSubmitting) {
      setIsSubmitting(false);
      setError("Authentication error. Please try again.");
    }
  }, [authState, userRole, clientStatus]);

  const handleSuccessfulLogin = () => {
    console.log("Handling successful login. userRole:", userRole, "clientStatus:", clientStatus);
    toast.success("Login successful", { description: "Welcome back!" });
    
    // Handle redirection based on role and client status
    if (userRole === 'client') {
      if (clientStatus === 'New') {
        console.log("Redirecting client with New status to profile setup");
        navigate("/profile-setup");
      } else {
        console.log("Redirecting client to dashboard");
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
      console.log("Attempting login with:", email);
      const { success, error } = await login(email, password);
      console.log("Login result:", success, error);
      
      if (success) {
        // Don't navigate here - let the useEffect handle it
        // The loading state will be reset by the useEffect
        console.log("Login successful, waiting for auth state update");
        
        // Set a safety timeout to reset loading state if auth state doesn't change
        setTimeout(() => {
          if (isSubmitting) {
            console.log("Safety timeout reached, forcing loading state reset");
            setIsSubmitting(false);
            
            // If we're already authenticated but stuck, try redirecting
            if (authState === AuthState.AUTHENTICATED) {
              handleSuccessfulLogin();
            }
          }
        }, 3000);
      } else {
        setError(error?.message || "Invalid login credentials. Please try again.");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

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
