/**
 * Comprehensive utilities for troubleshooting authentication issues
 */
import { supabase } from "@/integrations/supabase/client";
import { debugAuthOperation, logSupabaseConfig, logAuthContext } from "@/debug/authDebugUtils";

/**
 * Runs a comprehensive test of the authentication system
 */
export const runAuthDiagnostics = async () => {
  console.log("=== Starting Authentication System Diagnostics ===");
  
  // Step 1: Check environment variables and configuration
  console.log("\n--- Step 1: Checking Configuration ---");
  const config = logSupabaseConfig();
  
  // Step 2: Check current auth state
  console.log("\n--- Step 2: Checking Current Auth State ---");
  const { data: sessionData } = await supabase.auth.getSession();
  console.log("Current session:", sessionData?.session ? "Active" : "None");
  
  // Step 3: Test email delivery
  console.log("\n--- Step 3: Testing Email Delivery Configuration ---");
  try {
    // First check if the Resend API is configured properly
    const response = await fetch(`${config.url}/functions/v1/test-resend`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log("Email service status:", result);
    
    if (result.hasResendKey) {
      console.log("✅ Resend API key is configured");
    } else {
      console.error("❌ Resend API key is missing or not configured");
    }
    
    // Prompt for email test only if API key is configured
    if (result.hasResendKey) {
      const testEmail = prompt("Enter an email address to test delivery (or cancel to skip):");
      if (testEmail) {
        const testResponse = await fetch(`${config.url}/functions/v1/test-resend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: testEmail })
        });
        
        const testResult = await testResponse.json();
        console.log("Email test result:", testResult);
      } else {
        console.log("Email test skipped");
      }
    }
  } catch (error) {
    console.error("Email test error:", error);
  }
  
  // Step 4: Check URL handling for password reset
  console.log("\n--- Step 4: Checking URL Handling ---");
  const urlInfo = logAuthContext();
  console.log("URL has recovery token:", urlInfo.urlInfo.hasResetToken);
  
  // Check if the current URL is valid for password reset
  if (window.location.pathname === '/update-password') {
    if (urlInfo.urlInfo.hasResetToken) {
      console.log("✅ Valid password reset URL detected");
    } else {
      console.warn("⚠️ On update-password page but no reset token found in URL hash");
      console.log("Expected format: /update-password#access_token=...&type=recovery");
    }
  }
  
  // Step 5: Test password reset flow (simulation only)
  console.log("\n--- Step 5: Simulating Password Reset Flow ---");
  console.log("Redirect URL would be:", `${window.location.origin}/update-password`);
  
  // Step 6: Check for recent migrations that might affect auth
  console.log("\n--- Step 6: Recent Migration Impact ---");
  console.log("Recent migrations that might affect auth:");
  console.log("- 20250508_audit_correct_user_data.sql: Updates user metadata and role tables");
  console.log("- 20250508_ensure_app_role.sql: Creates app_role enum if it doesn't exist");
  console.log("- 20250508_fix_send_welcome_email.sql: Fixes welcome email trigger");
  console.log("- 20250508_fix_welcome_email_trigger.sql: Temporarily disables welcome email trigger");
  console.log("- 20250508_update_handle_new_user.sql: Updates handle_new_user function and trigger");
  
  console.log("\n=== Authentication Diagnostics Complete ===");
  return {
    config,
    urlInfo,
    hasSession: !!sessionData?.session
  };
};

/**
 * Tests the login flow with provided credentials
 */
export const testLoginFlow = async (email: string, password: string) => {
  console.log("=== Testing Login Flow ===");
  
  try {
    const { data, error } = await debugAuthOperation("signInWithPassword", () => 
      supabase.auth.signInWithPassword({
        email,
        password
      })
    );
    
    if (error) {
      console.error("Login test failed:", error);
      return { success: false, error };
    }
    
    console.log("Login test succeeded:", data.user?.id);
    return { success: true, data };
  } catch (error) {
    console.error("Login test exception:", error);
    return { success: false, error };
  }
};

/**
 * Tests the password reset flow
 */
export const testPasswordResetFlow = async (email: string) => {
  console.log("=== Testing Password Reset Flow ===");
  
  try {
    // Ensure the redirect URL is properly formatted
    const origin = window.location.origin;
    const redirectTo = `${origin}/update-password`;
    console.log("Using redirect URL:", redirectTo);
    
    // Validate the URL format
    if (!origin || !origin.startsWith('http')) {
      console.error("⚠️ Invalid origin detected:", origin);
      console.log("This may cause password reset links to fail");
    } else {
      console.log("✅ Origin URL format is valid");
    }
    
    const { data, error } = await debugAuthOperation("resetPasswordForEmail", () =>
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      })
    );
    
    if (error) {
      console.error("Password reset test failed:", error);
      return { success: false, error };
    }
    
    console.log("Password reset email sent successfully");
    return { success: true, data };
  } catch (error) {
    console.error("Password reset test exception:", error);
    return { success: false, error };
  }
};

export default {
  runAuthDiagnostics,
  testLoginFlow,
  testPasswordResetFlow
};