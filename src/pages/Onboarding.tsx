import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, KeyRound, BookOpen, User } from 'lucide-react';

export default function Onboarding() {
  return (
    <DashboardLayout activeItem="dashboard" navMode="onboarding">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-soft">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/90 text-primary-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Welcome!</CardTitle>
            <CardDescription>
              Welcome to the Core Automation Platform. This platform streamlines cloud operations with opinionated workflows, secure multi-tenant controls, and automated deploys across zones and portfolios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To get started, you’ll need to add your AWS credentials. These are used to securely assume roles and interact with your cloud accounts on your behalf. You can change or rotate them at any time.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="gradient">
                <Link to="/aws-credentials" state={{ from: '/dashboard' }} className="gap-2">
                  <KeyRound className="h-4 w-4" />
                  Add AWS Credentials
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/profile" className="gap-2">
                  <User className="h-4 w-4" />
                  Review Profile
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/docs" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Documentation
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
