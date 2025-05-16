
import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase, testResendEmailService } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Bug } from "lucide-react";
import { runAuthDiagnostics, testPasswordResetFlow } from "@/utils/authTroubleshooter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuthDiagnostics from "@/components/auth/AuthDiagnostics";
import { debugAuthOperation } from "@/utils/authDebugUtils";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email");
  const [email, setEmail] = useState(emailParam || "");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("reset");
  const timeoutRef = useRef<number | null>(null);

  // Add console logs to trace page load and state changes
  useEffect(() => {
    console.log("[ResetPassword] Page loaded, email param:", emailParam);
    
    // Check for Supabase URL to verify config
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    console.log("[ResetPassword] Supabase URL configured:", supabaseUrl ? "Yes" : "No");
    
    // Log the current origin for redirect URL validation
    console.log("[ResetPassword] Current origin:", window.location.origin);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [emailParam]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setDebugInfo({});
    
    console.log("[ResetPassword] Starting password reset for email:", email);
    
    // Basic email validation
    if (!email || !email.includes('@')) {
      setErrorMessage("Please enter a valid email address");
      return;
    }
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Set a timeout to clear the loading state in case the operation hangs
    timeoutRef.current = window.setTimeout(() => {
      console.warn("[ResetPassword] Reset password operation timed out after 45 seconds");
      setIsLoading(false);
      setErrorMessage("The request timed out. Please try again.");
      setDebugInfo(prev => ({
        ...prev,
        timeout: {
          timestamp: new Date().toISOString(),
          message: "Operation timed out after 45 seconds"
        }
      }));
      toast("Request timed out", {
        description: "The password reset request took too long. Please try again."
      });
    }, 45000) as unknown as number;  // Increased to 45 seconds
    
    try {
      setIsLoading(true);
      
      // Check for existing session first and sign out if needed
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("[ResetPassword] Found existing session, signing out first");
        setDebugInfo(prev => ({
          ...prev,
          existingSession: {
            email: session.user.email,
            id: session.user.id,
            timestamp: new Date().toISOString()
          }
        }));
        
        await supabase.auth.signOut();
        console.log("[ResetPassword] Successfully signed out existing user");
      }
      
      // Use the origin to build the proper redirect URL
      const siteUrl = window.location.origin;
      const redirectTo = `${siteUrl}/update-password`;
      
      console.log("[ResetPassword] Using redirect URL:", redirectTo);
      
      // Verify the URL is properly formatted
      if (!siteUrl || !siteUrl.startsWith('http')) {
        throw new Error(`Invalid site URL: ${siteUrl}. Password reset may not work correctly.`);
      }
      
      // Save URL details for debugging
      setDebugInfo(prev => ({
        ...prev,
        urlDetails: {
          siteUrl,
          redirectTo,
          timestamp: new Date().toISOString()
        }
      }));
      
      // Call Supabase Auth API directly with explicit redirect URL
      console.log("[ResetPassword] Calling supabase.auth.resetPasswordForEmail with:", {
        email: email,
        redirectTo: redirectTo
      });
      
      const { data, error } = await debugAuthOperation("resetPasswordForEmail", () =>
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectTo,
          captchaToken: undefined // Explicitly set to undefined to avoid issues
        })
      );
      
      console.log("[ResetPassword] Reset password response:", { data, error });
      
      setDebugInfo(prev => ({
        ...prev,
        supabaseResponse: {
          data,
          error: error ? {
            message: error.message,
            status: error.status
          } : null,
          timestamp: new Date().toISOString()
        }
      }));
      
      // Clear the timeout since the operation completed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (error) {
        console.error("[ResetPassword] Error:", error.message);
        setErrorMessage(error.message);
        throw error;
      }
      
      setSuccessMessage("Password reset email sent successfully!");
      console.log("[ResetPassword] Password reset email sent successfully");
      
      // Add more detailed success information
      setDebugInfo(prev => ({
        ...prev,
        resetSuccess: {
          timestamp: new Date().toISOString(),
          redirectUrl: redirectTo
        }
      }));
      
      toast("Password reset email sent", {
        description: "Please check your email for the password reset link. Be sure to click the complete link in the email."
      });
    } catch (error: any) {
      console.error("[ResetPassword] Error details:", error);
      // Clear the timeout if there's an error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      toast("Failed to send reset email", {
        description: error.message || "There was a problem sending the reset email. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!email || !email.includes('@')) {
      setErrorMessage("Please enter a valid email address");
      return;
    }
    
    setIsLoading(true);
    setDebugInfo(prev => ({ ...prev, testingEmail: true }));
    
    try {
      const result = await testResendEmailService(email);
      setDebugInfo(prev => ({
        ...prev,
        directTestResult: result,
        timestamp: new Date().toISOString()
      }));
      
      if (result.success) {
        toast("Test email sent", {
          description: "A test email was sent successfully. Please check your inbox."
        });
      } else {
        toast("Test email failed", {
          description: result.error || "Failed to send test email"
        });
      }
    } catch (error: any) {
      console.error("[ResetPassword] Test email error:", error);
      toast("Test email failed", {
        description: error.message || "There was a problem sending the test email"
      });
    } finally {
      setIsLoading(false);
      setDebugInfo(prev => ({ ...prev, testingEmail: false }));
    }
  };
  
  const testEdgeFunction = async () => {
    try {
      setIsLoading(true);
      setDebugInfo(prev => ({ ...prev, edgeFunctionTest: { status: 'testing' } }));
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/test-resend`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      setDebugInfo(prev => ({
        ...prev,
        edgeFunctionTest: {
          status: 'completed',
          result: result,
          timestamp: new Date().toISOString()
        }
      }));
      
      toast("Edge Function Test", {
        description: result.status === 'ok' ? "Edge function is operational" : "Edge function test failed"
      });
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        edgeFunctionTest: {
          status: 'error',
          error: error,
          timestamp: new Date().toISOString()
        }
      }));
      toast("Edge Function Test Failed", {
        description: "Could not connect to the edge function"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runDiagnostic = async () => {
    setIsLoading(true);
    try {
      const diagnosticResults = await runAuthDiagnostics();
      setDebugInfo(prev => ({
        ...prev,
        diagnosticResults
      }));
      toast("Diagnostics Complete", {
        description: "Authentication system diagnostics have been run."
      });
    } catch (error) {
      console.error("[ResetPassword] Diagnostic error:", error);
      toast("Diagnostic Failed", {
        description: "There was a problem running the diagnostics"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="reset" className="flex-1">Reset Password</TabsTrigger>
            <TabsTrigger value="debug" className="flex-1">Diagnostics</TabsTrigger>
          </TabsList>
          
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {activeTab === "reset" ? "Reset Password" : "Auth Diagnostics"}
            </CardTitle>
            <CardDescription className="text-center">
              {activeTab === "reset" 
                ? "Enter your email address and we'll send you a link to reset your password"
                : "Run diagnostics to troubleshoot authentication issues"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <TabsContent value="reset" className="mt-0">
              {errorMessage && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              
              {successMessage && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md">
                  <p className="text-sm font-medium">{successMessage}</p>
                  <p className="text-xs mt-1">Please check your email for further instructions.</p>
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
                
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline" 
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
                  </Button>
                </div>
                
                {showAdvanced && (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500">Advanced diagnostic tools:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                        onClick={handleTestEmail}
                        disabled={isLoading || !email}
                      >
                        Test Email Delivery
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={testEdgeFunction}
                        disabled={isLoading}
                      >
                        Test Edge Function
                      </Button>
                    </div>
                  </div>
                )}
              </form>
              
              {/* Debug info */}
              {showAdvanced && Object.keys(debugInfo).length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <details>
                    <summary className="text-xs font-medium text-gray-500 cursor-pointer">Debug Info:</summary>
                    <pre className="text-xs text-gray-600 overflow-auto max-h-60 mt-2">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="debug" className="mt-0">
              <AuthDiagnostics />
            </TabsContent>
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <Button variant="link" onClick={() => navigate("/login")}>
              Back to Login
            </Button>
          </CardFooter>
        </Tabs>
      </Card>
    </div>
  );
};

export default ResetPassword;
