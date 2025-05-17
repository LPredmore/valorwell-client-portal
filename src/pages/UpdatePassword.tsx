import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hashPresent, setHashPresent] = useState(false);
  const [sessionVerified, setSessionVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 1. Parse and set session from hash tokens on mount
  useEffect(() => {
    const setSessionFromHash = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const isRecovery = params.get("type") === "recovery";
      const hasTokens = !!access_token && !!refresh_token && isRecovery;

      setHashPresent(hasTokens);

      if (hasTokens) {
        // Set Supabase session so updateUser works
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          setError("Session could not be restored from recovery link. Try requesting a new password reset.");
        } else {
          // Confirm session is valid
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            setCurrentUser(null); // Means not currently logged in as someone else
            setSessionVerified(true);
          } else {
            setError("Session is not valid. Try requesting a new password reset.");
          }
        }
      } else {
        setHashPresent(false);
        setError("Missing or invalid password reset token. Make sure to use the full link from your email.");
      }
    };
    setSessionFromHash();
    // eslint-disable-next-line
  }, []);

  // Optional: Sign out if currently logged in as someone else (safety check)
  const signOutBeforeReset = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
      await new Promise((resolve) => setTimeout(resolve, 500));
      window.location.reload();
    } catch (error) {
      // ignore
    }
  };

  // 2. Password update logic
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      setError("Password too short");
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!hashPresent) {
      setError("Missing or invalid password reset token");
      toast({
        title: "Invalid reset link",
        description: "Please use the complete password reset link from your email or request a new one.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      setError("The request timed out. Please try again or request a new reset link.");
      toast({
        title: "Request timed out",
        description: "The password update took too long. Please try again.",
        variant: "destructive",
      });
    }, 45000);

    try {
      // Now update the user's password
      const { error } = await supabase.auth.updateUser({ password });
      clearTimeout(timeoutId);

      if (error) {
        setError(`Failed to update password: ${error.message}`);
        toast({
          title: "Failed to update password",
          description: error.message || "There was a problem updating your password. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });

      // Sign out after password update
      try {
        await supabase.auth.signOut({ scope: "global" });
      } catch (signOutError) {}

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      clearTimeout(timeoutId);
      setError("There was a problem updating your password. Please try again.");
      toast({
        title: "Failed to update password",
        description: error.message || "There was a problem updating your password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Update Password</CardTitle>
          <CardDescription className="text-center">
            {hashPresent
              ? "Enter your new password below"
              : "This page is for resetting your password after clicking the link in the reset email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {!hashPresent && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md">
              <p className="text-sm font-medium">
                No valid reset token found. You need to access this page using the complete link from your password reset email.
              </p>
              <p className="text-xs mt-1">
                The link may have expired or been used already. Make sure you're using the most recent email and clicking the complete link.
              </p>
              <Button
                variant="link"
                className="text-sm p-0 h-auto text-yellow-800 underline"
                onClick={() => navigate("/reset-password")}
              >
                Request a new password reset email
              </Button>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">New Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                disabled={isLoading || !hashPresent}
                className={!hashPresent ? "bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                disabled={isLoading || !hashPresent}
                className={!hashPresent ? "bg-gray-100" : ""}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !hashPresent}
            >
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" onClick={() => navigate("/login")}>
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UpdatePassword;
