
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Calendar,
  Users,
  Settings,
  Menu,
  X
} from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
};

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const role = 'client'; // Default role for placeholders

  // Navigation items
  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/patient-dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      roles: ['client']
    },
    {
      label: 'Documents',
      href: '/patient-documents',
      icon: <FileText className="h-5 w-5" />,
      roles: ['client']
    },
    {
      label: 'Messages',
      href: '/messages',
      icon: <MessageSquare className="h-5 w-5" />,
      roles: ['client', 'clinician']
    },
    {
      label: 'Appointments',
      href: '/appointments',
      icon: <Calendar className="h-5 w-5" />,
      roles: ['client', 'clinician']
    },
    {
      label: 'Clients',
      href: '/clients',
      icon: <Users className="h-5 w-5" />,
      roles: ['clinician', 'admin']
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: <Settings className="h-5 w-5" />
    }
  ];

  // Filter navigation items based on role (for UI demo purposes only)
  const filteredNavItems = navItems.filter(
    item => !item.roles || item.roles.includes(role)
  );

  const toggleExpanded = () => {
    setExpanded(prev => !prev);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={toggleMobileMenu}
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Mobile sidebar backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white border-r h-screen transition-all duration-300 fixed md:static z-50",
          expanded ? "w-64" : "w-[70px]",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo area */}
          <div 
            className={cn(
              "flex items-center h-16 px-4 border-b",
              expanded ? "justify-between" : "justify-center"
            )}
          >
            {expanded && <span className="text-lg font-semibold">Valorwell</span>}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleExpanded}
              className="hidden md:flex"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-1">
              {filteredNavItems.map((item) => (
                <li key={item.href}>
                  <Button
                    variant={location.pathname === item.href ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      expanded ? "px-3" : "px-2"
                    )}
                    onClick={() => {
                      navigate(item.href);
                      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                    }}
                  >
                    {item.icon}
                    {expanded && <span className="ml-2">{item.label}</span>}
                  </Button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => {
                navigate('/login');
                if (isMobileMenuOpen) setIsMobileMenuOpen(false);
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {expanded && "Logout"}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
