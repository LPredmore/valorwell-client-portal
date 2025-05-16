
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
  const [issues, setIssues] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [diagnosticRun, setDiagnosticRun] = useState(false);

  useEffect(() => {
    // Run migration logic
    const didMigrate = migrateStoredAuthData();
    console.log("[AuthMigrationHandler] Migration completed:", didMigrate);
    
    // Only check for issues if auth is initialized or we have an error
    if (authInitialized || authState === AuthState.ERROR) {
      runDiagnostics();
    }
    
    // Mark migration as complete
    setMigrationComplete(true);
  }, [authInitialized, authState]);

  // Run diagnostics when auth state changes to error or when explicitly called
  const runDiagnostics = () => {
    if (diagnosticRun) return; // Don't run diagnostics more than once
    
    const { issues } = diagnoseAuthIssues();
    setIssues(issues);
    setDiagnosticRun(true);
    
    // If there are critical issues, show a toast notification
    if (issues.length > 0) {
      toast.error("Authentication Configuration Issue", {
        description: "There might be an issue with your authentication setup",
        duration: 6000,
      });
    }
  };

  const handleReset = async () => {
    toast.loading("Resetting authentication state...");
    await resetAuthState();
  };

  // If there are no issues or migration is complete, render children
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
