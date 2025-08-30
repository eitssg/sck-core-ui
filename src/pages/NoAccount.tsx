import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react"; 
import { UserPlus, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NoAccount() {
    const navigate = useNavigate();
    const location = useLocation();
    const { email, from } = location.state || {};

    useEffect(() => {
        // If no state or didn't come from password-reset flow, redirect to login
        if (!location.state || from !== 'password-reset') {
            navigate('/login', { replace: true });
        }
    }, [location.state, from, navigate]);

    const handleCreateAccount = () => {
        // Navigate to signup with pre-filled email
        navigate("/signup", {
            state: {
                email: email,
                from: from || 'no-account'
            }
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-dashboard-bg to-primary/5 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card className="shadow-large animate-fade-in">
                    <CardHeader className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-medium">
                            <UserPlus className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold">Account Not Found</CardTitle>
                            <p className="text-muted-foreground">
                                No account exists for this email address
                            </p>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="text-center space-y-4">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Mail className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">Email Address</span>
                                </div>
                                <p className="text-blue-700 font-mono text-sm break-all">
                                    {email || 'your email address'}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                    We see that you do not have an account for this email address.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    To access the system, you will need to create a new account.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={handleCreateAccount}
                                size="lg"
                                className="w-full"
                                variant="gradient"
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Create New Account
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>

                            <Button
                                onClick={() => navigate("/login")}
                                size="lg"
                                variant="outline"
                                className="w-full"
                            >
                                Back to Login
                            </Button>
                        </div>

                        <div className="text-center pt-4 border-t">
                            <p className="text-xs text-muted-foreground">
                                Already have an account with a different email?{" "}
                                <button
                                    onClick={() => navigate("/login")}
                                    className="text-primary hover:underline font-medium"
                                >
                                    Sign in here
                                </button>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
