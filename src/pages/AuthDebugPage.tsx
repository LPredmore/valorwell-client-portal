import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/NewAuthContext";
import AuthDiagnostics from "@/components/auth/AuthDiagnostics";
import AuthFixesTestPanel from "@/components/auth/AuthFixesTestPanel";
import { Button } from "@/components/ui/button";
import { inspectAuthState } from "@/debug/authDebugUtils";

const AuthDebugPage = () => {
  const navigate = useNavigate();
  const { userId, userRole, authInitialized } = useAuth();
  const [authState, setAuthState] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if this is the public debug route
    const isPublicDebugRoute = window.location.pathname === "/debug/auth-public";
    
    if (isPublicDebugRoute) {
      // For public debug route, allow access without authentication
      setIsAdmin(true);
      inspectAuthState().then(state => {
        setAuthState(state);
      });
    } else if (authInitialized) {
      // For protected route, check authentication and role
      if (!userId) {
        // Redirect to login if not authenticated
        navigate("/login");
      } else if (userRole === "admin") {
        setIsAdmin(true);
        // Get current auth state
        inspectAuthState().then(state => {
          setAuthState(state);
        });
      }
    }
  }, [userId, userRole, authInitialized, navigate]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Authentication System Debugging</h1>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to Dashboard
        </Button>
      </div>

      {!authInitialized && window.location.pathname !== "/debug/auth-public" ? (
        <div className="text-center py-8">
          <p>Loading authentication state...</p>
        </div>
      ) : !isAdmin ? (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
          <h2 className="text-lg font-medium text-yellow-800">Access Restricted</h2>
          <p className="text-yellow-700">
            This page is only accessible to administrators.
          </p>
          <p className="text-sm mt-2">
            For troubleshooting without login, use the <a href="/debug/auth-public" className="underline">public debug page</a>.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
            <h2 className="text-lg font-medium text-blue-800">Authentication Debug Mode</h2>
            <p className="text-blue-700">
              This page provides tools to diagnose and troubleshoot authentication issues.
              Use the diagnostics tool below to identify potential problems.
            </p>
            {window.location.pathname === "/debug/auth-public" && (
              <div className="mt-2 p-2 bg-yellow-100 rounded text-sm">
                <strong>Note:</strong> You are using the public debug page. Some features may be limited without authentication.
              </div>
            )}
          </div>

          {authState && (
            <div className="bg-gray-50 border rounded-md p-4">
              <h2 className="text-lg font-medium mb-2">Current Auth State</h2>
              <pre className="text-xs overflow-auto max-h-40 p-2 bg-gray-100 rounded">
                {JSON.stringify(authState, null, 2)}
              </pre>
            </div>
          )}

          {/* Add the Auth Fixes Test Panel */}
          <AuthFixesTestPanel />

          <AuthDiagnostics />

          <div className="bg-gray-50 border rounded-md p-4">
            <h2 className="text-lg font-medium mb-2">Recent Migrations</h2>
            <p className="text-sm mb-2">
              The following recent migrations might be affecting authentication:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>
                <strong>20250508_audit_correct_user_data.sql</strong>: Audits and corrects user data inconsistencies
              </li>
              <li>
                <strong>20250508_ensure_app_role.sql</strong>: Creates app_role enum if it doesn't exist
              </li>
              <li>
                <strong>20250508_fix_send_welcome_email.sql</strong>: Replaces the trigger_send_welcome_email function with a safer version
              </li>
              <li>
                <strong>20250508_fix_welcome_email_trigger.sql</strong>: Temporarily disables the profiles_welcome_email_trigger
              </li>
              <li>
                <strong>20250508_update_handle_new_user.sql</strong>: Updates the handle_new_user function and trigger
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 border rounded-md p-4">
            <h2 className="text-lg font-medium mb-2">Potential Issues</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>
                <strong>Email Delivery Issues</strong>: The Resend email service might not be configured correctly or the API key might be invalid.
              </li>
              <li>
                <strong>Redirect URL Configuration</strong>: The redirect URL for password reset might not be properly configured in Supabase.
              </li>
              <li>
                <strong>User Metadata Issues</strong>: Recent migrations might have affected user metadata or role assignments.
              </li>
              <li>
                <strong>Trigger Function Issues</strong>: The welcome email trigger function might be causing issues with user creation or updates.
              </li>
              <li>
                <strong>Environment Variables</strong>: Required environment variables might be missing or incorrect.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthDebugPage;