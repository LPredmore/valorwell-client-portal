
import React, { Suspense } from "react";
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
import ProfileSetup from "./pages/ProfileSetup";
import TherapistSelection from "./pages/TherapistSelection";
import ResetPasswordEnhanced from "./pages/ResetPasswordEnhanced";
import UpdatePassword from "./pages/UpdatePassword";
import AuthDebugPage from "./pages/AuthDebugPage";
import PatientPortal from "./pages/PatientPortal";


// Create a query client with improved error handling and retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    }
  }
});

// Loading component for suspense fallback
const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center flex-col">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
    <p className="text-valorwell-600">Loading application...</p>
  </div>
);

function App() {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={<LoadingFallback />}>
            <AuthProvider>
              <AuthMigrationHandler>
                <TooltipProvider>
                  <Toaster richColors position="top-right" />
                  <Routes>
                    {/* Public routes - No auth required */}
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/reset-password" element={<ResetPasswordEnhanced />} />
                    <Route path="/update-password" element={<UpdatePassword />} />
                    
                    {/* Profile setup - accessible for all client roles including New */}
                    <Route path="/profile-setup" element={
                      <AuthProtectedRoute allowedRoles={["client"]} blockNewClients={false}>
                        <ProfileSetup />
                      </AuthProtectedRoute>
                    } />
                    
                    {/* Main Patient Portal - Block New clients */}
                    <Route path="/patient-portal" element={
                      <AuthProtectedRoute allowedRoles={["client"]} blockNewClients={true}>
                        <PatientPortal />
                      </AuthProtectedRoute>
                    } />
                    
                    {/* Legacy route redirects - redirect old routes to the new portal */}
                    <Route path="/patient-dashboard" element={
                      <AuthProtectedRoute allowedRoles={["client"]} blockNewClients={true}>
                        <PatientPortal />
                      </AuthProtectedRoute>
                    } />
                    <Route path="/patient-documents" element={
                      <AuthProtectedRoute allowedRoles={["client"]} blockNewClients={true}>
                        <PatientPortal />
                      </AuthProtectedRoute>
                    } />
                    <Route path="/patient-profile" element={
                      <AuthProtectedRoute allowedRoles={["client"]} blockNewClients={true}>
                        <PatientPortal />
                      </AuthProtectedRoute>
                    } />
                    <Route path="/patient-insurance" element={
                      <AuthProtectedRoute allowedRoles={["client"]} blockNewClients={true}>
                        <PatientPortal />
                      </AuthProtectedRoute>
                    } />
                    <Route path="/therapist-selection" element={
                      <AuthProtectedRoute allowedRoles={["client"]}>
                        <PatientPortal />
                      </AuthProtectedRoute>
                    } />
                    
                    {/* Debug routes */}
                    <Route path="/debug/auth-public" element={<AuthDebugPage />} />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </TooltipProvider>
              </AuthMigrationHandler>
            </AuthProvider>
          </Suspense>
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

export default App;
