
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { User, FileText, Settings, Home, LogOut, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '@/context/NewAuthContext';

// Function to determine if a route is active
const isRouteActive = (currentPath: string, route: string) => {
  if (route === "/" && currentPath === "/") return true;
  if (route !== "/" && currentPath.startsWith(route)) return true;
  return false;
};

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const {
    logout
  } = useAuth();

  // Navigation items specific to patients
  const navItems = [{
    name: 'Dashboard',
    path: '/patient-dashboard',
    icon: Home
  }, {
    name: 'My Profile',
    path: '/patient-profile',
    icon: User
  }, {
    name: 'Documents',
    path: '/patient-documents',
    icon: FileText
  }, {
    name: 'Insurance',
    path: '/patient-insurance',
    icon: Shield
  }, {
    name: 'Therapist Selection',
    path: '/therapist-selection',
    icon: UserCheck
  }];

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen w-64 bg-white border-r shadow-sm">
      <div className="px-4 py-6">
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
          <img 
            src="/lovable-uploads/add4f588-3f1f-426d-a2b4-359be55e2c73.png" 
            alt="Valorwell Logo" 
            className="h-8 w-8" 
          />
          <h1 className="text-xl font-bold ml-2 text-valorwell-700">Valorwell</h1>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <nav className="px-2 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isRouteActive(currentPath, item.path);
            return (
              <Button 
                key={item.name} 
                variant={active ? "secondary" : "ghost"} 
                className={cn(
                  "w-full justify-start mb-1", 
                  active ? "bg-valorwell-100 text-valorwell-700" : "text-gray-700 hover:bg-valorwell-50 hover:text-valorwell-700"
                )} 
                onClick={() => navigate(item.path)}
              >
                <Icon className="h-5 w-5 mr-2" />
                {item.name}
              </Button>
            );
          })}
        </nav>
      </div>
      
      <div className="p-4 border-t">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-700 hover:bg-valorwell-50 hover:text-valorwell-700" 
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
