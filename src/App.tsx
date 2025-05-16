
import React from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
              
              {/* All routes accessible without authentication */}
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/therapist-selection" element={<TherapistSelection />} />
              <Route path="/patient-dashboard" element={<PatientDashboard />} />
              <Route path="/patient-documents" element={<PatientDocuments />} />
              <Route path="/patient-profile" element={<PatientProfile />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:clientId" element={<ClientDetails />} />
              <Route path="/debug/auth-public" element={<AuthDebugPage />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

export default App;
