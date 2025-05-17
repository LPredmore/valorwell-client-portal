
import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuthDiagnostics from "@/components/auth/AuthDiagnostics";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email");
  const [email, setEmail] = useState(emailParam || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isTestSending, setIsTestSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("reset");
  const [debugInfo, setDebugInfo] = useState<any>({});
  const timeoutRef = useRef<number | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    console.log("[ResetPassword] Page loaded, email param:", emailParam);
    
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
    
    try {
      setIsLoading(true);
      
      // Simple direct approach - use the origin for redirect
      const redirectTo = `${window.location.origin}/update-password`;
      
      console.log("[ResetPassword] Using redirect URL:", redirectTo);
      
      // Set a safety timeout to detect if the operation is taking too long
      timeoutRef.current = window.setTimeout(() => {
        console.log("[ResetPassword] Operation taking longer than expected.");
        setDebugInfo(prev => ({
          ...prev,
          timeout: true,
          timeoutTime: new Date().toISOString()
        }));
      }, 5000) as unknown as number;
      
      // Make the Supabase auth call
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      });
      
      // Capture response data for debugging
      setDebugInfo(prev => ({
        ...prev,
        supabaseResponse: {
          data,
          error: error ? {
            message: error.message,
            name: error.name,
            status: error.status
          } : null
        }
      }));
      
      // Clear timeout since we got a response
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
      
      toast("Password reset email sent", {
        description: "Please check your email for the password reset link."
      });
    } catch (error: any) {
      console.error("[ResetPassword] Error details:", error);
      toast("Failed to send reset email", {
        description: error.message || "There was a problem sending the reset email. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to test email delivery using the test-resend Edge Function
  const handleTestEmail = async () => {
    if (!email || !email.includes('@')) {
      setErrorMessage("Please enter a valid email address");
      return;
    }
    
    try {
      setIsTestSending(true);
      console.log("[ResetPassword] Testing email delivery to:", email);
      
      // Call the test-resend function directly
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ email })
      });
      
      const result = await response.json();
      
      setDebugInfo(prev => ({
        ...prev,
        testEmailResponse: result
      }));
      
      console.log("[ResetPassword] Test email response:", result);
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to send test email");
      }
      
      toast("Test email sent", {
        description: "A test email was sent to verify the email delivery system."
      });
    } catch (error: any) {
      console.error("[ResetPassword] Test email error:", error);
      toast("Failed to send test email", {
        description: error.message || "There was a problem with the email service."
      });
      setDebugInfo(prev => ({
        ...prev,
        testEmailError: error.message
      }));
    } finally {
      setIsTestSending(false);
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
                
                <div className="pt-2 border-t mt-4">
                  <p className="text-xs text-gray-500 mb-2">
                    Troubleshooting options:
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={handleTestEmail}
                    disabled={isTestSending}
                  >
                    {isTestSending ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Testing...
                      </>
                    ) : "Test Email Delivery"}
                  </Button>
                </div>
                
                {Object.keys(debugInfo).length > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 text-xs rounded-md">
                    <details>
                      <summary className="cursor-pointer font-medium">Debug Information</summary>
                      <pre className="mt-2 whitespace-pre-wrap overflow-auto max-h-60">
                        {JSON.stringify(debugInfo, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </form>
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
