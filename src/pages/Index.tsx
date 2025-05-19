import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuth, AuthState } from '@/context/NewAuthContext';
import { useEffect } from 'react';
const Index = () => {
  const navigate = useNavigate();
  const {
    authState
  } = useAuth();

  // Auto-redirect authenticated users
  useEffect(() => {
    if (authState === AuthState.AUTHENTICATED) {
      navigate('/patient-dashboard');
    }
  }, [authState, navigate]);
  return <div className="min-h-screen flex items-center justify-center bg-gray-100">
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
    </div>;
};
export default Index;