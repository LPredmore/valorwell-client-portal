
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  User,
  FileText,
  Settings,
  Home,
  LogOut,
  UserCheck,
  CalendarCheck
} from 'lucide-react';
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
  const { logout } = useAuth();
  
  // Navigation items specific to patients
  const navItems = [
    { name: 'Dashboard', path: '/patient-dashboard', icon: Home },
    { name: 'My Profile', path: '/patient-profile', icon: User },
    { name: 'Documents', path: '/patient-documents', icon: FileText },
    { name: 'Past Appointments', path: '/past-appointments', icon: CalendarCheck },
    { name: 'Therapist Selection', path: '/therapist-selection', icon: UserCheck }
  ];

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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
      </div>
      
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-700 hover:bg-gray-100"
          onClick={handleLogout}
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
