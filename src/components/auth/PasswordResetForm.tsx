
import { useState, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type PasswordResetFormProps = {
  onCancel: () => void;
};

const PasswordResetForm = ({ onCancel }: PasswordResetFormProps) => {
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const timeoutRef = useRef<number | null>(null);

  const resetForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleResetPassword = async (values: z.infer<typeof resetPasswordSchema>) => {
    setResetError(null);
    setDebugInfo({});
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Set a timeout to clear the loading state in case the operation hangs
    timeoutRef.current = window.setTimeout(() => {
      console.warn("[PasswordResetForm] Reset password operation timed out after 30 seconds");
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
    
    try {
      setIsResettingPassword(true);
      
      // Enhanced email processing and validation
      const emailValidation = validateEmail(values.email);
      if (!emailValidation.isValid) {
        setResetError(emailValidation.message || "Invalid email address");
        return;
      }

      const processedEmail = encodeEmailForAPI(values.email);
      
      console.log("[PasswordResetForm] Starting password reset flow for email:", {
        originalEmail: values.email,
        processedEmail: processedEmail,
        timestamp: new Date().toISOString()
      });
      
      setDebugInfo(prev => ({
        ...prev,
        startReset: {
          timestamp: new Date().toISOString(),
          originalEmail: values.email,
          processedEmail: processedEmail,
          emailValidation: {
            isValid: emailValidation.isValid,
            hasSpecialChars: /[+.]/.test(processedEmail)
          }
        }
      }));
      
      // Use the corrected redirect URL for client portal
      const redirectTo = "https://client.valorwell.org/update-password";
      
      console.log("[PasswordResetForm] Using redirect URL:", redirectTo);
      console.log("[PasswordResetForm] Current origin for comparison:", window.location.origin);
      
      setDebugInfo(prev => ({
        ...prev,
        redirectConfig: {
          redirectTo: redirectTo,
          currentOrigin: window.location.origin,
          isProduction: !window.location.hostname.includes('localhost')
        }
      }));
      
      console.log("[PasswordResetForm] Calling supabase.auth.resetPasswordForEmail with:", {
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
      
      console.log("[PasswordResetForm] Reset password response:", { 
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
        console.error("[PasswordResetForm] Reset error:", {
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
      
      console.log("[PasswordResetForm] Password reset email sent successfully for:", processedEmail);
      
      toast({
        title: "Password reset email sent",
        description: "Please check your email for the password reset link. Don't forget to check your spam folder.",
      });

      onCancel();
      resetForm.reset();
    } catch (error: any) {
      console.error("[PasswordResetForm] Unexpected error:", {
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
        
        {/* Display reset error if present */}
        {resetError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md">
            <p className="text-sm font-medium">{resetError}</p>
          </div>
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
  );
};

export default PasswordResetForm;
