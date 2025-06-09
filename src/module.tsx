
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/NewAuthContext";
import AuthMigrationHandler from "@/components/auth/AuthMigrationHandler";
import { Routes, Route } from "react-router-dom";

// Import all pages and components
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PatientDashboard from "./pages/PatientDashboard";
import PatientDocuments from "./pages/PatientDocuments";
import ProfileSetup from "./pages/ProfileSetup";
import TherapistSelection from "./pages/TherapistSelection";
import ResetPasswordEnhanced from "./pages/ResetPasswordEnhanced";
import UpdatePassword from "./pages/UpdatePassword";
import AuthDebugPage from "./pages/AuthDebugPage";
import PatientProfile from "./pages/PatientProfile";
import PatientInsurance from "./pages/PatientInsurance";
import PastAppointments from "./pages/PastAppointments";
import AuthProtectedRoute from "@/components/auth/AuthProtectedRoute";

// Create a query client
const createQueryClient = () => new QueryClient({
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

// Loading component
const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center flex-col">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
    <p className="text-valorwell-600">Loading application...</p>
  </div>
);

export interface ValorwellPortalProps {
  basePath?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  onAuthStateChange?: (user: any, session: any) => void;
}

export const ValorwellPortal: React.FC<ValorwellPortalProps> = ({
  basePath = '',
  supabaseUrl,
  supabaseKey,
  onAuthStateChange
}) => {
  const queryClient = React.useMemo(() => createQueryClient(), []);

  // Set Supabase configuration if provided
  React.useEffect(() => {
    if (supabaseUrl && supabaseKey) {
      // Store in window for the supabase client to use
      (window as any).__VALORWELL_SUPABASE_CONFIG__ = {
        url: supabaseUrl,
        key: supabaseKey
      };
    }
  }, [supabaseUrl, supabaseKey]);

  return (
    <React.StrictMode>
      <BrowserRouter basename={basePath}>
        <QueryClientProvider client={queryClient}>
          <React.Suspense fallback={<LoadingFallback />}>
            <AuthProvider onAuthStateChange={onAuthStateChange}>
              <AuthMigrationHandler>
                <TooltipProvider>
                  <Toaster richColors position="top-right" />
                  <Routes>
                    {/* Public routes */}
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
                    
                    {/* Protected routes - Block New clients */}
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
                    <Route path="/patient-insurance" element={
                      <AuthProtectedRoute allowedRoles={["client"]} blockNewClients={true}>
                        <PatientInsurance />
                      </AuthProtectedRoute>
                    } />
                    <Route path="/past-appointments" element={
                      <AuthProtectedRoute allowedRoles={["client"]} blockNewClients={true}>
                        <PastAppointments />
                      </AuthProtectedRoute>
                    } />
                    <Route path="/therapist-selection" element={
                      <AuthProtectedRoute allowedRoles={["client"]}>
                        <TherapistSelection />
                      </AuthProtectedRoute>
                    } />
                    
                    {/* Debug routes */}
                    <Route path="/debug/auth-public" element={<AuthDebugPage />} />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </TooltipProvider>
              </AuthMigrationHandler>
            </AuthProvider>
          </React.Suspense>
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
};

export default ValorwellPortal;
