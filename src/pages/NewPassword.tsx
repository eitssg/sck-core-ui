import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Eye, EyeOff, Lock, Briefcase, Check } from "lucide-react";
import { authAPI } from "@/lib/auth-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { token, tokenType } = location.state || {};

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      navigate("/enter-code");
    }
  }, [token, navigate]);

  // Password validation
  const passwordValidation = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      setError('Please meet all password requirements');
      return;
    }
    
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError("");
    
    try {
      const result = await authAPI.updatePassword(token, tokenType, password);
      
      if (result.error) {
        // Check if it's a 404 (user profile not found)
        if (result.error.includes('User profile not found') || result.error.includes('404')) {
          // Extract email from token for the no-account page
          const email = location.state?.email || 'your email address';
          navigate("/no-account", { 
            state: { 
              email: email,
              from: 'password-reset'
            } 
          });
          return;
        }
        
        setError(result.error);
      } else {
        // Success - redirect to login with success message
        navigate("/login", { 
          state: { 
            message: "Password reset successfully. Please log in with your new password." 
          } 
        });
      }
    } catch (error) {
      console.error('Password reset failed:', error);
      setError('Failed to reset password. The token may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-dashboard-bg to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-large animate-fade-in">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center shadow-medium">
              <Briefcase className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
              <p className="text-muted-foreground">
                Create a new secure password for your account
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Password Requirements */}
              {password && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Password Requirements:</p>
                  <div className="space-y-1">
                    {[
                      { key: 'minLength', text: 'At least 8 characters' },
                      { key: 'hasUppercase', text: 'One uppercase letter' },
                      { key: 'hasLowercase', text: 'One lowercase letter' },
                      { key: 'hasNumber', text: 'One number' },
                      { key: 'hasSpecial', text: 'One special character' },
                    ].map((req) => (
                      <div key={req.key} className="flex items-center gap-2 text-sm">
                        <Check 
                          className={`h-4 w-4 ${
                            passwordValidation[req.key as keyof typeof passwordValidation]
                              ? 'text-green-500' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                        <span className={
                          passwordValidation[req.key as keyof typeof passwordValidation]
                            ? 'text-green-600' 
                            : 'text-muted-foreground'
                        }>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="flex items-center gap-2 text-sm">
                  <Check 
                    className={`h-4 w-4 ${
                      passwordsMatch ? 'text-green-500' : 'text-destructive'
                    }`} 
                  />
                  <span className={passwordsMatch ? 'text-green-600' : 'text-destructive'}>
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </span>
                </div>
              )}

              <Button 
                type="submit" 
                size="lg"
                className="w-full"
                variant="gradient"
                disabled={isLoading || !isPasswordValid || !passwordsMatch}
              >
                {isLoading ? "Updating Password..." : "Update Password"}
              </Button>
            </form>

            <div className="text-center">
              <Link 
                to="/enter-code"
                className="text-sm text-primary hover:underline"
              >
                Back to Reset Password
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}