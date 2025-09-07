import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Mail } from "lucide-react";

export default function Welcome() {
  const location = useLocation();
  const state = (location.state as { email?: string } | null) || null;
  const params = new URLSearchParams(location.search || "");
  const email = state?.email || params.get("email") || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-dashboard-bg to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-large animate-fade-in">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-theme-gradient rounded-full flex items-center justify-center shadow-medium">
            <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Account created</CardTitle>
            <p className="text-muted-foreground">You're almost there</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3 text-center">
            <p>
              We sent a welcome email{email ? ` to ${email}` : ""}. If prompted, please verify your email address to
              secure your account.
            </p>
            <p className="text-sm text-muted-foreground">
              Next, sign in to continue and complete the OAuth login flow to access your dashboard.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Continue</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button asChild className="w-full" size="lg" variant="gradient">
              <Link to="/login">Go to Login</Link>
            </Button>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              <span>Didn't get an email? Check your spam folder or try again later.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
