
import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

// Enhanced email encoding function to handle special characters
const encodeEmailForRequest = (email: string): string => {
  const cleanEmail = email.trim().toLowerCase();
  console.log("[ResetPassword] Email encoding:", {
    original: email,
    cleaned: cleanEmail,
    hasPlus: cleanEmail.includes('+'),
    hasDots: cleanEmail.includes('.'),
    length: cleanEmail.length
  });
  return cleanEmail;
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email");
  const [email, setEmail] = useState(emailParam || "");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const timeoutRef = useRef<number | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setDebugInfo({});

    // Enhanced email validation
    const processedEmail = encodeEmailForRequest(email);
    if (!processedEmail || !processedEmail.includes('@')) {
      setErrorMessage("Please enter a valid email address");
      return;
    }

    try {
      setIsLoading(true);

      console.log("[ResetPassword] Starting password reset for:", {
        originalEmail: email,
        processedEmail: processedEmail,
        timestamp: new Date().toISOString()
      });

      setDebugInfo({
        emailProcessing: {
          original: email,
          processed: processedEmail,
          timestamp: new Date().toISOString()
        }
      });

      // Use the corrected redirect URL - note it's "client" not "clients"
      const redirectTo = "https://client.valorwell.org/update-password";

      console.log("[ResetPassword] Configuration:", {
        redirectTo,
        currentOrigin: window.location.origin,
        isProduction: !window.location.hostname.includes('localhost')
      });

      setDebugInfo(prev => ({
        ...prev,
        configuration: {
          redirectTo,
          currentOrigin: window.location.origin,
          isProduction: !window.location.hostname.includes('localhost')
        }
      }));

      // Optional: timeout for slow network
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          setErrorMessage("The request is taking longer than expected. Please try again later.");
          toast("Request timeout", {
            description: "The server took too long to respond. Please try again."
          });
        }
      }, 15000) as unknown as number;

      console.log("[ResetPassword] Calling Supabase resetPasswordForEmail");
      
      // The magic call with enhanced logging
      const { data, error } = await supabase.auth.resetPasswordForEmail(processedEmail, { 
        redirectTo 
      });

      console.log("[ResetPassword] Supabase response:", {
        data,
        error: error ? {
          message: error.message,
          status: error.status,
          details: error
        } : null,
        timestamp: new Date().toISOString()
      });

      setDebugInfo(prev => ({
        ...prev,
        supabaseResponse: {
          data,
          error: error ? {
            message: error.message,
            status: error.status,
            details: error
          } : null,
          timestamp: new Date().toISOString()
        }
      }));

      // Clear timeout since we got a response
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (error) {
        console.error("[ResetPassword] Error from Supabase:", error);
        
        // Provide more specific error messages
        let userFriendlyMessage = error.message;
        if (error.message.includes("rate limit")) {
          userFriendlyMessage = "Too many requests. Please wait a few minutes before trying again.";
        } else if (error.message.includes("invalid")) {
          userFriendlyMessage = "Invalid email address. Please check and try again.";
        } else if (error.message.includes("not found")) {
          userFriendlyMessage = "No account found with this email address.";
        }
        
        setErrorMessage(userFriendlyMessage);
        throw error;
      }

      console.log("[ResetPassword] Success! Password reset email sent for:", processedEmail);
      setSuccessMessage("Password reset email sent successfully!");
      
      toast("Password reset email sent", {
        description: "Please check your email for the password reset link. Don't forget to check your spam folder."
      });
    } catch (error: any) {
      console.error("[ResetPassword] Caught error:", {
        error,
        message: error?.message,
        timestamp: new Date().toISOString()
      });
      
      toast("Failed to send reset email", {
        description: error.message || "There was a problem sending the reset email. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md">
              <p className="text-sm font-medium">{successMessage}</p>
              <p className="text-xs mt-1">Please check your email for further instructions. Don't forget to check your spam folder.</p>
            </div>
          )}
          
          {/* Enhanced debug info in development mode */}
          {process.env.NODE_ENV === 'development' && Object.keys(debugInfo).length > 0 && (
            <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
              <details>
                <summary className="cursor-pointer font-medium">Debug Info (Development Only)</summary>
                <pre className="mt-1 overflow-auto max-h-40 whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </div>
          )}
          
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                disabled={isLoading || !!successMessage}
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !!successMessage}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : "Send Reset Link"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" onClick={() => navigate("/login")}>
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPassword;
