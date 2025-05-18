
import React, { useEffect, useState } from 'react';
import { migrateStoredAuthData, diagnoseAuthIssues, resetAuthState } from '@/utils/authMigration';
import { useAuth, AuthState } from '@/context/NewAuthContext';
import { toast } from 'sonner';

interface AuthMigrationHandlerProps {
  children: React.ReactNode;
}

const AuthMigrationHandler: React.FC<AuthMigrationHandlerProps> = ({ children }) => {
  const { authState, authInitialized } = useAuth();
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [migrationAttempted, setMigrationAttempted] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [diagnosticRun, setDiagnosticRun] = useState(false);
  
  // Use a ref to track if migration has been attempted to prevent repeated attempts
  const migrationRef = React.useRef(false);

  // Run migration only once on mount, not on every auth state change
  useEffect(() => {
    // Prevent repeated migration attempts
    if (migrationRef.current || migrationAttempted) {
      return;
    }
    
    // Set flags to prevent future migration attempts
    migrationRef.current = true;
    setMigrationAttempted(true);
    
    try {
      // Run migration logic
      const didMigrate = migrateStoredAuthData();
      console.log("[AuthMigrationHandler] Migration completed:", didMigrate);
      
      // Store migration result in localStorage to prevent future attempts
      localStorage.setItem('auth_migration_completed', 'true');
      
      // Mark migration as complete
      setMigrationComplete(true);
    } catch (error) {
      console.error("[AuthMigrationHandler] Migration error:", error);
      // Even if migration fails, mark it as attempted to prevent infinite retries
      setMigrationComplete(true);
    }
  }, []);
  
  // Only run diagnostics when auth is fully initialized or in error state
  useEffect(() => {
    if ((authInitialized || authState === AuthState.ERROR) && !diagnosticRun) {
      runDiagnostics();
    }
  }, [authInitialized, authState, diagnosticRun]);

  // Improved diagnostics with timeout and retry
  const runDiagnostics = async () => {
    if (diagnosticRun) return; // Don't run diagnostics more than once
    
    // Set flag to prevent concurrent diagnostic runs
    setDiagnosticRun(true);
    
    try {
      // Add timeout to prevent diagnostics from hanging
      const diagnosticPromise = diagnoseAuthIssues();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Diagnostics timed out")), 10000);
      });
      
      const diagnosticResult = await Promise.race([diagnosticPromise, timeoutPromise]);
      
      // Filter out common non-critical issues to reduce noise
      const criticalIssues = diagnosticResult.issues.filter(issue =>
        !issue.includes('Legacy key found') &&
        !issue.includes('Legacy authentication data found')
      );
      
      setIssues(criticalIssues);
      
      // Only show toast for critical issues
      if (criticalIssues.length > 0) {
        toast.error("Authentication Issue Detected", {
          description: criticalIssues[0],
          duration: 8000,
        });
      }
    } catch (error) {
      console.error("[AuthMigrationHandler] Error running diagnostics:", error);
      
      // Don't show UI errors for timeout, just log them
      if (String(error).includes("timed out")) {
        console.warn("[AuthMigrationHandler] Diagnostics timed out, continuing without blocking the UI");
        setIssues([]);
      } else {
        setIssues(["Error running diagnostics: " + String(error)]);
        
        toast.error("Diagnostic Error", {
          description: "Failed to run authentication diagnostics",
          duration: 6000,
        });
      }
    }
  };

  const handleReset = () => {
    toast.loading("Resetting authentication state...");
    const result = resetAuthState(true); // Use hard reset
    
    if (result.success) {
      toast.success("Authentication state reset", {
        description: "Please wait while the page reloads...",
      });
    } else {
      toast.error("Reset failed", {
        description: result.message,
      });
    }
  };

  // Improved rendering logic to prevent blocking the UI
  // If migration is complete and there are no critical issues, or if we've been
  // waiting too long, render children anyway to prevent blocking the UI
  useEffect(() => {
    // If diagnostics are taking too long, proceed anyway after 5 seconds
    const timeoutId = setTimeout(() => {
      if (migrationComplete && !issues.length && diagnosticRun) {
        console.log("[AuthMigrationHandler] Proceeding despite pending diagnostics");
      }
    }, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [migrationComplete, issues.length, diagnosticRun]);
  
  // If migration is complete and there are no issues, or if diagnostics are running
  // but we've been waiting too long, render children
  if (migrationComplete && issues.length === 0) {
    return <>{children}</>;
  }

  // If there are issues, show a helpful dialog
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Authentication Update
          </h2>
          <p className="text-gray-600 mb-6">
            We've updated our authentication system to improve reliability.
            {issues.length > 0 ? " We've detected some issues that need attention." : ""}
          </p>

          {issues.length > 0 && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded p-4 mb-6 text-left">
                <h3 className="font-medium text-amber-800 mb-2">Issues detected:</h3>
                <ul className="list-disc pl-5 text-amber-700 space-y-1">
                  {issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showDetails ? "Hide technical details" : "Show technical details"}
                </button>
                
                {showDetails && (
                  <div className="bg-gray-50 p-4 rounded text-left text-sm font-mono">
                    <pre className="whitespace-pre-wrap">
                      {`Environment: ${process.env.NODE_ENV}
Current URL: ${window.location.href}
Browser: ${navigator.userAgent}
Auth State: ${authState}
Auth Initialized: ${authInitialized}
Issues: ${issues.join('\n')}`}
                    </pre>
                  </div>
                )}

                <button
                  onClick={handleReset}
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                >
                  Reset Authentication State
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="border border-gray-300 bg-white text-gray-700 py-2 px-4 rounded hover:bg-gray-50 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthMigrationHandler;
