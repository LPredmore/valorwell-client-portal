
import { toast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import PasswordResetFormEnhanced from "./PasswordResetFormEnhanced";

type ForgotPasswordDialogEnhancedProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const ForgotPasswordDialogEnhanced = ({ isOpen, onOpenChange }: ForgotPasswordDialogEnhancedProps) => {
  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reset your password</DialogTitle>
          <DialogDescription>
            Enter your email address and we'll help you reset your password.
            Enhanced debugging tools are available to troubleshoot delivery issues.
          </DialogDescription>
        </DialogHeader>
        <PasswordResetFormEnhanced onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialogEnhanced;
