import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ArrowLeft, Briefcase, RotateCcw } from "lucide-react";
import { authAPI } from "@/lib/auth-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EnterCode() {
  const [code, setCode] = useState(["", "", "", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get token and email from navigation state
  const { email, token, tokenType: initialTokenType } = location.state || {};

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      navigate('/forgot-password');
    }
  }, [token, navigate]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take the last character
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    
    // Only allow numeric paste and ensure it's exactly 8 digits
    if (!/^\d{8}$/.test(paste)) {
      setError('Please paste an 8-digit code');
      return;
    }

    // Clear any existing error
    setError('');
    
    // Split the pasted code into individual digits
    const digits = paste.split('');
    setCode(digits);
    
    // Focus the last input after pasting
    inputRefs.current[7]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeString = code.join('');
    
    if (codeString.length !== 8) {
      setError('Please enter all 8 digits');
      return;
    }

    if (!token) {
      setError('No verification token available. Please request a new code.');
      return;
    }

    setIsLoading(true);
    setError("");
    
    try {
      // Pass both the code and the token to verifyResetCode
      const result = await authAPI.verifyResetCode(codeString, token);
      
      if (result.error) {
        setError(result.error);
      } else {
        const nextToken = result.token || token;
        const nextTokenType = result.token_type || initialTokenType || 'Bearer';
        navigate("/new-password", { 
          state: { 
            token: nextToken,
            tokenType: nextTokenType,
            email
          } 
        });
      }
    } catch (error) {
      console.error('Code verification failed:', error);
      setError('Invalid or expired code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dashboard-bg to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-large animate-fade-in">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-theme-gradient rounded-full flex items-center justify-center shadow-medium">
              <Briefcase className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Enter Verification Code</CardTitle>
              <p className="text-muted-foreground">
                Enter the 8-digit code sent to your email
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 8-Digit Code Input */}
              <div className="space-y-4">
                <div className="grid grid-cols-8 gap-2">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      className="w-full aspect-square text-center text-2xl font-bold border-2 rounded-lg bg-background border-input focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  ))}
                </div>
              </div>

              <Button 
                type="submit" 
                size="lg"
                className="w-full"
                variant="gradient"
                disabled={isLoading || code.join('').length !== 8}
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
            </form>

            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Don't have a code?
              </p>
              
              <Link 
                to="/forgot-password"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Request New Code
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
