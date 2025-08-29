
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

const Header = () => {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    toast.success("Logged out successfully");
    navigate("/login");
  };
  
  return (
    <header className="border-b bg-background py-4 px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <img 
              src="/lovable-uploads/add4f588-3f1f-426d-a2b4-359be55e2c73.png" 
              alt="Valorwell Logo" 
              className="h-8 w-8" 
            />
            <h1 className="text-xl font-semibold ml-2 text-valorwell-700">Valorwell</h1>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
