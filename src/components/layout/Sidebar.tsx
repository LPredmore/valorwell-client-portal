
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  UserSearch,
  User,
  ChevronLeft
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { userRole, clientStatus, isLoading, userId, authInitialized } = useUser();
  const { toast } = useToast();
  const isClient = userRole === 'client';
  const isNewClient = isClient && clientStatus === 'New';
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Add timeout mechanism to prevent indefinite loading
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isLoading || !authInitialized) {
      console.log("[Sidebar] Starting loading timeout check");
      timeoutId = setTimeout(() => {
        console.log("[Sidebar] Loading timeout reached after 10 seconds");
        setLoadingTimeout(true);
      }, 10000); // 10 seconds timeout
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoading, authInitialized]);
  
  const isActive = (path: string) => {
    return currentPath === path;
  };

  if (isLoading || !authInitialized) {
    return (
      <div className="w-[220px] min-h-screen border-r bg-white flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
        <p className="text-sm text-valorwell-600">
          {loadingTimeout ? "Taking longer than expected..." : "Loading..."}
        </p>
      </div>
    );
  }
  
  if (loadingError) {
    return (
      <div className="w-[220px] min-h-screen border-r bg-white flex flex-col items-center justify-center p-4">
        <div className="text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <p className="text-sm text-center text-red-600">{loadingError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-valorwell-600 text-white rounded-md text-sm"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="w-[220px] min-h-screen border-r bg-white flex flex-col">
      <div className="p-4 flex items-center gap-2 border-b">
        <Link to="/" className="flex items-center gap-2">
          <img 
            src="/lovable-uploads/47fe3428-4c8d-48fd-9f59-8040e817c9a8.png" 
            alt="ValorWell" 
            className="h-8 w-8" 
          />
          <span className="text-xl font-semibold text-valorwell-700">ValorWell</span>
        </Link>
        <button className="ml-auto text-gray-500">
          <ChevronLeft size={18} />
        </button>
      </div>
      
      <nav className="flex-1 py-4 space-y-1 px-2">
        {/* Links only visible to non-new clients */}
        {isClient && !isNewClient && (
          <>
            <Link 
              to="/patient-dashboard" 
              className={`sidebar-link ${isActive('/patient-dashboard') ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Patient Dashboard</span>
            </Link>
            
            <Link 
              to="/therapist-selection" 
              className={`sidebar-link ${isActive('/therapist-selection') ? 'active' : ''}`}
            >
              <UserSearch size={18} />
              <span>Therapist Selection</span>
            </Link>
            
            {userId && (
              <Link 
                to={`/clients/${userId}`} 
                className={`sidebar-link ${isActive(`/clients/${userId}`) ? 'active' : ''}`}
              >
                <User size={18} />
                <span>Patient Profile</span>
              </Link>
            )}

            <Link 
              to="/patient-documents" 
              className={`sidebar-link ${isActive('/patient-documents') ? 'active' : ''}`}
            >
              <User size={18} />
              <span>Documents</span>
            </Link>
          </>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;
