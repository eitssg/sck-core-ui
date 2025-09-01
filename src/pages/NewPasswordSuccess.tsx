import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { CheckCircle, LogIn, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewPasswordSuccess() {
    const navigate = useNavigate();
    const location = useLocation();
    const { message } = location.state || {};

    useEffect(() => {
        // If no state or didn't come from password reset flow, redirect to login
        if (!location.state) {
            navigate('/login', { replace: true });
        }
    }, [location.state, navigate]);

    const handleLoginRedirect = () => {
        navigate("/login", { replace: true });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-dashboard-bg to-primary/5 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card className="shadow-large animate-fade-in">
                    <CardHeader className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-medium">
                            <CheckCircle className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold text-green-700">Password Updated!</CardTitle>
                            <p className="text-muted-foreground">
                                Your password has been successfully changed
                            </p>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="text-center space-y-4">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Shield className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-800">Security Update</span>
                                </div>
                                <p className="text-green-700 text-sm">
                                    {message || "Your password has been updated successfully and your account is now secure."}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span>Password strength requirements met</span>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span>Account security enhanced</span>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span>Ready to sign in</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Button
                                onClick={handleLoginRedirect}
                                size="lg"
                                className="w-full"
                                variant="gradient"
                            >
                                <LogIn className="h-4 w-4 mr-2" />
                                Sign In to Your Account
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </div>

                        <div className="text-center pt-4 border-t">
                            <p className="text-xs text-muted-foreground">
                                For your security, please use your new password to sign in.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
