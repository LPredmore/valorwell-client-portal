
import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, RefreshCw, Info } from "lucide-react";
import { validateEmail, encodeEmailForAPI } from "@/utils/emailValidation";
import { 
  runEmailDeliveryDiagnostics,
  testEmailFormats,
  monitorPasswordResetRequest 
} from "@/utils/passwordResetDebugger";

const ResetPasswordEnhanced = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email");
  const [email, setEmail] = useState(emailParam || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [troubleshootingInfo, setTroubleshootingInfo] = useState<any>(null);
  const timeoutRef = useRef<number | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const runDiagnostics = async () => {
    if (!email) {
      toast("Email required", {
        description: "Please enter an email address first"
      });
      return;
    }

    setIsRunningDiagnostics(true);
    try {
      const diagnostics = await runEmailDeliveryDiagnostics(email);
      setTroubleshootingInfo(diagnostics);
      console.log("[ResetPasswordEnhanced] Diagnostics complete:", diagnostics);
      
      toast("Diagnostics Complete", {
        description: "Check the console and recommendations below"
      });
    } catch (error) {
      console.error("[ResetPasswordEnhanced] Diagnostics failed:", error);
      toast("Diagnostics Failed", {
        description: "Unable to run diagnostics. Check console for details."
      });
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setDebugInfo({});

    // Enhanced email validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setErrorMessage(emailValidation.message || "Please enter a valid email address");
      return;
    }

    const processedEmail = encodeEmailForAPI(email);

    try {
      setIsLoading(true);

      // Start monitoring
      const monitoringInfo = await monitorPasswordResetRequest(email);
      setDebugInfo(prev => ({ ...prev, monitoring: monitoringInfo }));

      console.log("[ResetPasswordEnhanced] Starting password reset for:", {
        originalEmail: email,
        processedEmail: processedEmail,
        timestamp: new Date().toISOString(),
        emailFormats: testEmailFormats(email)
      });

      setDebugInfo(prev => ({
        ...prev,
        emailProcessing: {
          original: email,
          processed: processedEmail,
          timestamp: new Date().toISOString(),
          alternativeFormats: testEmailFormats(email)
        }
      }));

      // Use the corrected redirect URL for client portal
      const redirectTo = "https://client.valorwell.org/update-password";

      console.log("[ResetPasswordEnhanced] Configuration:", {
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

      console.log("[ResetPasswordEnhanced] Calling Supabase resetPasswordForEmail");
      
      // The magic call with enhanced logging
      const { data, error } = await supabase.auth.resetPasswordForEmail(processedEmail, { 
        redirectTo 
      });

      console.log("[ResetPasswordEnhanced] Supabase response:", {
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
        console.error("[ResetPasswordEnhanced] Error from Supabase:", error);
        
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

      console.log("[ResetPasswordEnhanced] Success! Password reset email sent for:", processedEmail);
      setSuccessMessage("Password reset email sent successfully!");
      
      toast("Password reset email sent", {
        description: "Please check your email for the password reset link. Don't forget to check your spam folder."
      });

      // Auto-run diagnostics on success to help with troubleshooting
      setTimeout(() => runDiagnostics(), 1000);
      
    } catch (error: any) {
      console.error("[ResetPasswordEnhanced] Caught error:", {
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
            Enter your email address and we'll send you a link to reset your password.
            Enhanced debugging tools available for troubleshooting.
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
          
          {/* Troubleshooting recommendations */}
          {troubleshootingInfo && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">Troubleshooting Recommendations:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {troubleshootingInfo.recommendations?.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                  {troubleshootingInfo.browserInfo?.extensionsDetected && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      <strong>⚠️ Browser Extensions Detected:</strong> Extensions may interfere with email delivery. 
                      Try using incognito/private mode.
                    </div>
                  )}
                  {troubleshootingInfo.testFormats && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                      <strong>Alternative Email Formats to Try:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {troubleshootingInfo.testFormats.map((format: string, index: number) => (
                          <li key={index}><code className="bg-white px-1 rounded">{format}</code></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
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
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={runDiagnostics}
                disabled={isLoading || isRunningDiagnostics || !email}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
                Run Diagnostics
              </Button>
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

export default ResetPasswordEnhanced;
