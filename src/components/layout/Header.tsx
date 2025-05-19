import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
const Header = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    toast.success("Logged out successfully");
    navigate("/login");
  };
  return <header className="border-b bg-white py-4 px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Valorwell</h1>
        
        
      </div>
    </header>;
};
export default Header;