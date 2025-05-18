
import React from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/NewAuthContext";

// Protected Route Component
import AuthProtectedRoute from "@/components/auth/AuthProtectedRoute";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PatientDashboard from "./pages/PatientDashboard";
import PatientDocuments from "./pages/PatientDocuments";
import ProfileSetup from "./pages/ProfileSetup";
import TherapistSelection from "./pages/TherapistSelection";
import ClientDetails from "./pages/ClientDetails";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import AuthDebugPage from "./pages/AuthDebugPage";
import Clients from "./pages/Clients";
import PatientProfile from "./pages/PatientProfile";

// Create a query client
const queryClient = new QueryClient();

function App() {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
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
                
                {/* Clinician routes */}
                <Route path="/clients" element={
                  <AuthProtectedRoute allowedRoles={["clinician", "admin"]}>
                    <Clients />
                  </AuthProtectedRoute>
                } />
                <Route path="/clients/:clientId" element={
                  <AuthProtectedRoute allowedRoles={["clinician", "admin"]}>
                    <ClientDetails />
                  </AuthProtectedRoute>
                } />
                
                {/* Debug routes */}
                <Route path="/debug/auth-public" element={<AuthDebugPage />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

export default App;
