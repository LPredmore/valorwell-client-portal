
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const Index = () => {
  const navigate = useNavigate();

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
          <Button 
            onClick={() => navigate('/login')} 
            className="w-full"
          >
            Login Page
          </Button>
          
          <Button 
            onClick={() => navigate('/signup')} 
            variant="outline"
            className="w-full"
          >
            Signup Page
          </Button>
          
          <div className="pt-4">
            <h3 className="font-medium text-sm mb-2">Direct access links (temporary):</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => navigate('/patient-dashboard')} 
                variant="secondary" 
                size="sm"
              >
                Patient Dashboard
              </Button>
              
              <Button 
                onClick={() => navigate('/patient-documents')} 
                variant="secondary" 
                size="sm"
              >
                Patient Documents
              </Button>
              
              <Button 
                onClick={() => navigate('/therapist-selection')} 
                variant="secondary" 
                size="sm"
              >
                Therapist Selection
              </Button>
              
              <Button 
                onClick={() => navigate('/profile-setup')} 
                variant="secondary" 
                size="sm"
              >
                Profile Setup
              </Button>
              
              <Button 
                onClick={() => navigate('/clients')} 
                variant="secondary" 
                size="sm"
              >
                Clients List
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
