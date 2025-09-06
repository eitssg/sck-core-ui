import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link, useSearchParams } from "react-router-dom";
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
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get token from URL params OR state (for direct email links vs navigation)
  const urlCode = searchParams.get('code');
  const urlToken = searchParams.get('token');
  const urlTokenType = searchParams.get('token_type');
  const { token: stateToken, tokenType: stateTokenType, email } = location.state || {};

  const finalToken = urlToken || stateToken;
  const finalTokenType = urlTokenType || stateTokenType || 'Bearer';
  const finalEmail = email || searchParams.get('email');

  // Auto-verify code if coming from email link
  useEffect(() => {
    const autoVerifyFromEmail = async () => {
      if (urlCode && urlToken && !stateToken) {
        // This is a direct email link - auto-verify the code
        setIsVerifying(true);
        
        try {
          const result = await authAPI.verifyResetCode(urlCode, urlToken);
          
          if (result.error) {
            setError(`Code verification failed: ${result.error}`);
            // Redirect to enter-code page for manual entry
            navigate("/enter-code", { 
              state: { 
                token: urlToken, 
                email: finalEmail,
                error: "Invalid link. Please enter the code manually." 
              } 
            });
            return;
          }
          
          // Verification successful - stay on this page for password entry
          console.log('Email link verified successfully');
          
        } catch (error) {
          console.error('Auto-verification failed:', error);
          setError('Invalid or expired link. Please enter the code manually.');
          navigate("/enter-code", { 
            state: { 
              token: urlToken, 
              email: finalEmail,
              error: "Link verification failed." 
            } 
          });
          return;
        } finally {
          setIsVerifying(false);
        }
      }
    };

    autoVerifyFromEmail();
  }, [urlCode, urlToken, stateToken, navigate, finalEmail]);

  // Redirect if no token at all
  useEffect(() => {
    if (!finalToken && !isVerifying) {
      navigate("/enter-code");
    }
  }, [finalToken, navigate, isVerifying]);

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
      // Use the final token (from URL or state)
      const result = await authAPI.updatePassword(finalToken, finalTokenType, password);
      
      if (result.error) {
        // Check if it's a 404 (user profile not found)
        if (result.error.includes('User profile not found') || result.error.includes('404')) {
          const email = finalEmail || 'your email address';
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
        navigate("/new-password-success", { 
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

  // Show loading state during auto-verification
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dashboard-bg to-primary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-large animate-fade-in">
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Verifying reset link...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!finalToken) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-dashboard-bg to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-large animate-fade-in">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-theme-gradient rounded-full flex items-center justify-center shadow-medium">
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
                    autoComplete="new-password"
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
                    autoComplete="new-password"
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
                              ? 'text-primary' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                        <span className={
                          passwordValidation[req.key as keyof typeof passwordValidation]
                            ? 'text-primary' 
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
                      passwordsMatch ? 'text-primary' : 'text-destructive'
                    }`} 
                  />
                  <span className={passwordsMatch ? 'text-primary' : 'text-destructive'}>
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