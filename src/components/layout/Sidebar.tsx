
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  FileText, 
  Calendar, 
  Settings, 
  PlusCircle,
  Home,
  Users,
  LogOut
} from 'lucide-react';

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
  
  // Determine user type: for now just using a hardcoded value for demonstration
  const userType = 'clinician'; // or 'admin', 'patient'
  
  // Navigation items shared between different user types
  const commonNavItems = [
    { name: 'Home', path: '/', icon: Home }
  ];
  
  // Navigation items specific to clinicians
  const clinicianNavItems = [
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Documents', path: '/documents', icon: FileText }
  ];
  
  // Navigation items specific to patients
  const patientNavItems = [
    { name: 'My Dashboard', path: '/patient-dashboard', icon: Home },
    { name: 'Appointments', path: '/patient-appointments', icon: Calendar },
    { name: 'Documents', path: '/patient-documents', icon: FileText },
    { name: 'Profile', path: '/patient-profile', icon: User }
  ];
  
  // Determine which navigation items to show based on user type
  let navItems = [...commonNavItems];
  if (userType === 'clinician' || userType === 'admin') {
    navItems = [...navItems, ...clinicianNavItems];
  } else if (userType === 'patient') {
    navItems = [...patientNavItems];
  }

  // Define action buttons based on user type
  const actionButtons = userType === 'clinician' || userType === 'admin' ? [
    {
      name: 'New Client',
      action: () => navigate('/clients/new'),
      icon: PlusCircle,
      primary: true
    }
  ] : [];

  return (
    <div className="flex flex-col h-screen w-64 bg-white border-r shadow-sm">
      <div className="px-4 py-6">
        <div 
          className="flex items-center cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold">V</span>
          </div>
          <h1 className="text-xl font-bold ml-2">Valorwell</h1>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <nav className="px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(currentPath, item.path);
            return (
              <Button
                key={item.name}
                variant={active ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start mb-1",
                  active ? "bg-blue-50 text-blue-700" : "text-gray-700"
                )}
                onClick={() => navigate(item.path)}
              >
                <Icon className="h-5 w-5 mr-2" />
                {item.name}
              </Button>
            );
          })}
        </nav>
        
        {actionButtons.length > 0 && (
          <div className="px-4 mt-6">
            <Separator className="mb-4" />
            {actionButtons.map((button) => {
              const Icon = button.icon;
              return (
                <Button
                  key={button.name}
                  onClick={button.action}
                  variant={button.primary ? "default" : "outline"}
                  className="w-full mb-2 flex items-center"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {button.name}
                </Button>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-700 hover:bg-gray-100"
          onClick={() => navigate('/login')}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Logout
        </Button>
        
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-700 hover:bg-gray-100"
          onClick={() => navigate('/settings')}
        >
          <Settings className="h-5 w-5 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
