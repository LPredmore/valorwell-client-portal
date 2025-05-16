
import { ReactNode, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth, AuthState } from '@/context/NewAuthContext';
import AuthStateMonitor from '@/components/auth/AuthStateMonitor';

interface LayoutProps {
  children: ReactNode;
}

const NewLayout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { userId, authState, authInitialized, isLoading } = useAuth();

  useEffect(() => {
    console.log("[NewLayout] Initializing layout, userContextLoading:", isLoading, "authInitialized:", authInitialized);
    
    if (authInitialized) {
      if (authState === AuthState.UNAUTHENTICATED) {
        console.log("[NewLayout] No authenticated user found, redirecting to login");
        navigate('/login');
      } else if (authState === AuthState.ERROR) {
        toast.error("Authentication Error", {
          description: "There was a problem with your authentication. Please try again."
        });
      }
    }
  }, [navigate, authState, authInitialized, isLoading]);

  // Show loading state while checking auth
  if (authState === AuthState.INITIALIZING || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
        <p className="text-valorwell-600">
          {authState === AuthState.INITIALIZING ? "Initializing authentication..." : "Loading user data..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Add AuthStateMonitor for development environment */}
      {process.env.NODE_ENV === 'development' && <AuthStateMonitor visible={true} />}
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default NewLayout;
