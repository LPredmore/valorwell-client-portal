import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LogOut } from 'lucide-react';
import { useAuth } from '@/context/NewAuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

// Function to determine if a route is active
const isRouteActive = (currentPath: string, route: string) => {
  if (route === "/" && currentPath === "/") return true;
  if (route !== "/" && currentPath.startsWith(route)) return true;
  return false;
};

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const { logout } = useAuth();
  const { state } = useSidebar();

  // Navigation items specific to patients
  const navItems = [{
    name: 'Patient Portal',
    path: '/patient-portal',
    icon: Home
  }];

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
          <img 
            src="/lovable-uploads/add4f588-3f1f-426d-a2b4-359be55e2c73.png" 
            alt="Valorwell Logo" 
            className="h-8 w-8 shrink-0" 
          />
          {state !== "collapsed" && (
            <h1 className="text-xl font-bold ml-2 text-valorwell-700">Valorwell</h1>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => {
                const Icon = item.icon;
                const active = isRouteActive(currentPath, item.path);
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      isActive={active}
                      tooltip={state === "collapsed" ? item.name : undefined}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip={state === "collapsed" ? "Logout" : undefined}
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;