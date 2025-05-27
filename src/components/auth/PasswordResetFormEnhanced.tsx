
import { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from "@/components/ui/form";
import {
  DialogFooter
} from "@/components/ui/dialog";
import { debugAuthOperation } from "@/debug/authDebugUtils";
import { validateEmail, encodeEmailForAPI } from "@/utils/emailValidation";
import { 
  monitorPasswordResetRequest, 
  runEmailDeliveryDiagnostics,
  getPasswordResetTroubleshooting,
  testEmailFormats 
} from "@/utils/passwordResetDebugger";
import { AlertTriangle, Info, RefreshCw } from "lucide-react";

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type PasswordResetFormEnhancedProps = {
  onCancel: () => void;
};

const PasswordResetFormEnhanced = ({ onCancel }: PasswordResetFormEnhancedProps) => {
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [troubleshootingInfo, setTroubleshootingInfo] = useState<any>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const resetForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const runDiagnostics = async () => {
    const email = resetForm.getValues().email;
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter an email address first",
        variant: "destructive",
      });
      return;
    }

    setIsRunningDiagnostics(true);
    try {
      const diagnostics = await runEmailDeliveryDiagnostics(email);
      setTroubleshootingInfo(diagnostics);
      console.log("[PasswordResetFormEnhanced] Diagnostics complete:", diagnostics);
      
      toast({
        title: "Diagnostics Complete",
        description: "Check the console and recommendations below",
      });
    } catch (error) {
      console.error("[PasswordResetFormEnhanced] Diagnostics failed:", error);
      toast({
        title: "Diagnostics Failed",
        description: "Unable to run diagnostics. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const handleResetPassword = async (values: z.infer<typeof resetPasswordSchema>) => {
    setResetError(null);
    setResetSuccess(null);
    setDebugInfo({});
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    try {
      setIsResettingPassword(true);
      
      // Start monitoring
      const monitoringInfo = await monitorPasswordResetRequest(values.email);
      setDebugInfo(prev => ({ ...prev, monitoring: monitoringInfo }));
      
      // Enhanced email processing and validation
      const emailValidation = validateEmail(values.email);
      if (!emailValidation.isValid) {
        setResetError(emailValidation.message || "Invalid email address");
        return;
      }

      const processedEmail = encodeEmailForAPI(values.email);
      
      console.log("[PasswordResetFormEnhanced] Starting password reset flow for email:", {
        originalEmail: values.email,
        processedEmail: processedEmail,
        timestamp: new Date().toISOString(),
        emailFormats: testEmailFormats(values.email)
      });
      
      setDebugInfo(prev => ({
        ...prev,
        startReset: {
          timestamp: new Date().toISOString(),
          originalEmail: values.email,
          processedEmail: processedEmail,
          emailValidation: {
            isValid: emailValidation.isValid,
            hasSpecialChars: /[+.]/.test(processedEmail),
            emailFormat: processedEmail.includes('+') ? 'plus_addressing' : 'standard'
          },
          alternativeFormats: testEmailFormats(values.email)
        }
      }));
      
      // Use the corrected redirect URL for client portal
      const redirectTo = "https://client.valorwell.org/update-password";
      
      console.log("[PasswordResetFormEnhanced] Using redirect URL:", redirectTo);
      console.log("[PasswordResetFormEnhanced] Current origin for comparison:", window.location.origin);
      
      setDebugInfo(prev => ({
        ...prev,
        redirectConfig: {
          redirectTo: redirectTo,
          currentOrigin: window.location.origin,
          isProduction: !window.location.hostname.includes('localhost')
        }
      }));
      
      // Set timeout for slow responses
      timeoutRef.current = window.setTimeout(() => {
        console.warn("[PasswordResetFormEnhanced] Reset password operation timed out after 30 seconds");
        setIsResettingPassword(false);
        setResetError("The request timed out. Please try again.");
        setDebugInfo(prev => ({
          ...prev,
          timeout: {
            timestamp: new Date().toISOString(),
            message: "Operation timed out after 30 seconds"
          }
        }));
        toast({
          title: "Request timed out",
          description: "The password reset request took too long. Please try again.",
          variant: "destructive",
        });
      }, 30000) as unknown as number;
      
      console.log("[PasswordResetFormEnhanced] Calling supabase.auth.resetPasswordForEmail with:", {
        email: processedEmail,
        redirectTo: redirectTo,
        options: { redirectTo }
      });
      
      // Enhanced Supabase call with better error capture
      const { data, error: resetError } = await debugAuthOperation("resetPasswordForEmail", () =>
        supabase.auth.resetPasswordForEmail(processedEmail, {
          redirectTo: redirectTo,
        })
      );
      
      console.log("[PasswordResetFormEnhanced] Reset password response:", { 
        data, 
        error: resetError,
        timestamp: new Date().toISOString()
      });
      
      setDebugInfo(prev => ({
        ...prev,
        supabaseResponse: {
          data,
          error: resetError ? {
            message: resetError.message,
            status: resetError.status,
            details: resetError
          } : null,
          timestamp: new Date().toISOString()
        }
      }));
      
      // Clear the timeout since the operation completed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (resetError) {
        console.error("[PasswordResetFormEnhanced] Reset error:", {
          message: resetError.message,
          status: resetError.status,
          fullError: resetError
        });
        setResetError(`Reset failed: ${resetError.message}`);
        
        // Provide more specific error messages
        let userFriendlyMessage = "Failed to send password reset email.";
        if (resetError.message.includes("rate limit")) {
          userFriendlyMessage = "Too many requests. Please wait a few minutes before trying again.";
        } else if (resetError.message.includes("invalid")) {
          userFriendlyMessage = "Invalid email address. Please check and try again.";
        } else if (resetError.message.includes("not found")) {
          userFriendlyMessage = "No account found with this email address.";
        }
        
        toast({
          title: "Password reset failed",
          description: userFriendlyMessage,
          variant: "destructive",
        });
        return;
      }
      
      console.log("[PasswordResetFormEnhanced] Password reset email sent successfully for:", processedEmail);
      setResetSuccess("Password reset email sent! Please check all your email folders.");
      
      toast({
        title: "Password reset email sent",
        description: "Please check your email for the password reset link. Don't forget to check your spam folder.",
      });

      // Auto-run diagnostics on success to help with troubleshooting
      setTimeout(() => runDiagnostics(), 1000);
      
    } catch (error: any) {
      console.error("[PasswordResetFormEnhanced] Unexpected error:", {
        error,
        message: error?.message,
        stack: error?.stack,
        timestamp: new Date().toISOString()
      });
      
      // Clear the timeout if there's an error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      setResetError(`Unexpected error: ${error?.message || 'Unknown error occurred'}`);
      
      toast({
        title: "Password reset failed",
        description: error.message || "Failed to initiate password reset. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="space-y-4">
      <Form {...resetForm}>
        <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
          <FormField
            control={resetForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter your email" 
                    {...field}
                    type="email"
                    autoComplete="email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Success message */}
          {resetSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {resetSuccess}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Error message */}
          {resetError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{resetError}</AlertDescription>
            </Alert>
          )}
          
          {/* Troubleshooting recommendations */}
          {troubleshootingInfo && (
            <Alert>
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
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Enhanced debug info in development mode */}
          {process.env.NODE_ENV === 'development' && Object.keys(debugInfo).length > 0 && (
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
              <details>
                <summary className="cursor-pointer font-medium">Debug Info (Development Only)</summary>
                <pre className="mt-1 overflow-auto max-h-40 whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={runDiagnostics}
              disabled={isResettingPassword || isRunningDiagnostics}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
              Run Diagnostics
            </Button>
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isResettingPassword}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isResettingPassword}>
              {isResettingPassword ? "Processing..." : "Send Reset Email"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
};

export default PasswordResetFormEnhanced;
