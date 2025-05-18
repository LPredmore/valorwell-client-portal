import React from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/NewAuthContext";

// Auth Components
import AuthProtectedRoute from "@/components/auth/AuthProtectedRoute";
import AuthMigrationHandler from "@/components/auth/AuthMigrationHandler";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PatientDashboard from "./pages/PatientDashboard";
import PatientDocuments from "./pages/PatientDocuments";
import ProfileSetup from "./pages/ProfileSetup";
import TherapistSelection from "./pages/TherapistSelection";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import AuthDebugPage from "./pages/AuthDebugPage";
import PatientProfile from "./pages/PatientProfile";

// Create a query client with improved error handling and retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,                // Limit to 2 retries
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff with max of 30 seconds
      staleTime: 60 * 1000,    // 1 minute
      gcTime: 5 * 60 * 1000,   // 5 minutes (updated from cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus to prevent unnecessary requests
      refetchOnReconnect: true, // Refetch when reconnecting to network
    },
    mutations: {
      retry: 1,                // Only retry mutations once
      retryDelay: 1000,        // 1 second delay before retry
    }
  }
});

function App() {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthMigrationHandler>
              <TooltipProvider>
                {/* Sonner Toaster - the only toast component we need */}
                <Toaster richColors position="top-right" />
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/update-password" element={<UpdatePassword />} />
                  <Route path="/profile-setup" element={<ProfileSetup />} />
                  
                  {/* Protected routes - Only authenticated clients can access */}
                  <Route path="/patient-dashboard" element={
                    <AuthProtectedRoute allowedRoles={["client"]} blockNewClients={true}>
                      <PatientDashboard />
                    </AuthProtectedRoute>
                  } />
                  <Route path="/patient-documents" element={
                    <AuthProtectedRoute allowedRoles={["client"]} blockNewClients={true}>
                      <PatientDocuments />
                    </AuthProtectedRoute>
                  } />
                  <Route path="/patient-profile" element={
                    <AuthProtectedRoute allowedRoles={["client"]} blockNewClients={true}>
                      <PatientProfile />
                    </AuthProtectedRoute>
                  } />
                  <Route path="/therapist-selection" element={
                    <AuthProtectedRoute allowedRoles={["client"]}>
                      <TherapistSelection />
                    </AuthProtectedRoute>
                  } />
                  
                  {/* Debug routes - keep minimal diagnostic route */}
                  <Route path="/debug/auth-public" element={<AuthDebugPage />} />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </AuthMigrationHandler>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

export default App;
