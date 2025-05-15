
import React from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

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

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <UserProvider>
              {/* Sonner Toaster - the only toast component we need */}
              <Toaster richColors position="top-right" />
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/update-password" element={<UpdatePassword />} />
                
                {/* Client accessible routes */}
                <Route path="/profile-setup" element={<ProfileSetup />} />
                
                {/* Routes that block "New" clients */}
                <Route path="/therapist-selection" element={
                  <ProtectedRoute allowedRoles={['client']} blockNewClients={true}>
                    <TherapistSelection />
                  </ProtectedRoute>
                } />
                
                <Route path="/patient-dashboard" element={
                  <ProtectedRoute allowedRoles={['client']} blockNewClients={true}>
                    <PatientDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="/patient-documents" element={
                  <ProtectedRoute allowedRoles={['client']} blockNewClients={true}>
                    <PatientDocuments />
                  </ProtectedRoute>
                } />
                
                {/* Allow clients to view their details */}
                <Route path="/clients/:clientId" element={
                  <ProtectedRoute allowedRoles={['client']} blockNewClients={true}>
                    <ClientDetails />
                  </ProtectedRoute>
                } />
                
                {/* Debug routes */}
                <Route path="/debug/auth-public" element={<AuthDebugPage />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </UserProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

export default App;
