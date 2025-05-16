
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/context/NewAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormProps = {
  onForgotPassword: () => void;
};

const NewLoginForm = ({ onForgotPassword }: LoginFormProps) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log(`[NewLoginForm] Login attempt started for email: ${values.email}`);
    setLoginError(null);
    setIsSubmitting(true);
    
    try {
      const result = await login(values.email, values.password);

      if (!result.success) {
        let errorMessage = result.error?.message || "Invalid email or password";
        setLoginError(errorMessage);
        toast.error("Login failed", { description: errorMessage });
        return;
      }

      console.log("[NewLoginForm] Login successful, navigating to home");
      toast.success("Login successful", { description: "Welcome back!" });
      
      // Navigate after a short delay to allow auth state to propagate
      setTimeout(() => {
        navigate("/");
      }, 100);
    } catch (error: any) {
      console.error("[NewLoginForm] Login error:", error);
      const errorMessage = error.message || "There was a problem signing in";
      setLoginError(errorMessage);
      toast.error("Login failed", { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter your email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter your password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {loginError && (
          <p className="text-sm text-red-500">{loginError}</p>
        )}
        
        <div className="text-right">
          <button 
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            Forgot password?
          </button>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : "Sign in"}
        </Button>
      </form>
    </Form>
  );
};

export default NewLoginForm;
