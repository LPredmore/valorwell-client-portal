
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
      console.log("[PasswordResetForm] Starting password reset flow for email:", values.email);
      setDebugInfo(prev => ({
        ...prev,
        startReset: {
          timestamp: new Date().toISOString(),
          email: values.email
        }
      }));
      
      // Use the correct production redirect URL
      const redirectTo = "https://clients.valorwell.org/update-password";
      
      console.log("[PasswordResetForm] Using redirect URL:", redirectTo);
      setDebugInfo(prev => ({
        ...prev,
        redirectUrl: redirectTo
      }));
      
      console.log("[PasswordResetForm] Calling supabase.auth.resetPasswordForEmail with:", {
        email: values.email,
        redirectTo: redirectTo
      });
      
      const { data, error: resetError } = await debugAuthOperation("resetPasswordForEmail", () =>
        supabase.auth.resetPasswordForEmail(values.email, {
          redirectTo: redirectTo,
        })
      );
      
      console.log("[PasswordResetForm] Reset password response:", { data, error: resetError });
      
      setDebugInfo(prev => ({
        ...prev,
        supabaseResponse: {
          data,
          error: resetError ? {
            message: resetError.message,
            status: resetError.status
          } : null
        }
      }));
      
      // Clear the timeout since the operation completed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (resetError) {
        console.error("[PasswordResetForm] Reset error:", resetError.message, resetError);
        setResetError(resetError.message);
        throw resetError;
      }
      
      console.log("[PasswordResetForm] Password reset email sent successfully");
      
      toast({
        title: "Password reset email sent",
        description: "Please check your email for the password reset link.",
      });

      onCancel();
      resetForm.reset();
    } catch (error: any) {
      console.error("[PasswordResetForm] Unexpected error:", error);
      // Clear the timeout if there's an error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      toast({
        title: "Password reset failed",
        description: error.message || "Failed to initiate password reset",
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
                <Input placeholder="Enter your email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Display reset error if present */}
        {resetError && (
          <p className="text-sm text-red-500">{resetError}</p>
        )}
        
        {/* Debug info in development mode */}
        {process.env.NODE_ENV === 'development' && Object.keys(debugInfo).length > 0 && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
            <details>
              <summary className="cursor-pointer font-medium">Debug Info</summary>
              <pre className="mt-1 overflow-auto max-h-40">
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
            {isResettingPassword ? "Processing..." : "Continue"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default PasswordResetForm;
