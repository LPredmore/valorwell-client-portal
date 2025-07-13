
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuth, AuthState } from '@/context/NewAuthContext';
import { useEffect } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const { authState, isLoading } = useAuth();

  // Auto-redirect authenticated users
  useEffect(() => {
    if (authState === AuthState.AUTHENTICATED) {
      navigate('/patient-portal');
    }
  }, [authState, navigate]);

  // Show loading state while auth is being determined
  if (isLoading || authState === AuthState.INITIALIZING) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
          <p className="text-valorwell-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Valorwell</CardTitle>
          <CardDescription>
            Please select where you would like to go
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => navigate('/login')} className="w-full">
            Login Page
          </Button>
          
          <Button onClick={() => navigate('/signup')} variant="outline" className="w-full">
            Signup Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
