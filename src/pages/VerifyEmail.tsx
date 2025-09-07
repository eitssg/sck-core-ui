import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { buildApiUrl, API_CONFIG } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-fetch';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function VerifyEmail() {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get('token') || '';
  const client = query.get('client') || '';

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Missing verification token.');
        return;
      }

      setStatus('verifying');
      try {
        const url = new URL(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.VERIFY));
        url.searchParams.set('token', token);
        if (client) url.searchParams.set('client', client);

        const res = await apiFetch(url.toString(), { method: 'GET', cookieFirst: true });
        if (res.ok) {
          setStatus('success');
          try {
            const data = await res.json();
            setMessage(data?.message || 'Email verified successfully.');
          } catch {
            setMessage('Email verified successfully.');
          }
        } else {
          setStatus('error');
          try {
            const data = await res.json();
            setMessage(data?.message || data?.error || 'Verification failed.');
          } catch {
            setMessage('Verification failed.');
          }
        }
      } catch (e) {
        setStatus('error');
        setMessage('Network error while verifying email.');
      }
    };

    run();
  }, [token, client]);

  const goToLogin = () => navigate('/login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-dashboard-bg to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-large animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-theme-gradient rounded-full flex items-center justify-center shadow-medium">
            {status === 'success' ? (
              <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
            ) : status === 'error' ? (
              <XCircle className="h-8 w-8 text-primary-foreground" />
            ) : (
              <Mail className="h-8 w-8 text-primary-foreground" />
            )}
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              {status === 'success' ? 'Email Verified' : status === 'error' ? 'Verification Failed' : 'Verifying Email'}
            </CardTitle>
            <p className="text-muted-foreground">
              {status === 'success'
                ? 'Your email has been successfully verified.'
                : status === 'error'
                ? 'We were unable to verify your email.'
                : 'Please wait while we verify your email...'}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Email Verification</span>
            </div>
          </div>

          {message && (
            <div className={`p-3 text-sm rounded-md border ${status === 'error' ? 'text-destructive-foreground bg-destructive/10 border-destructive/20' : 'text-foreground bg-primary/5 border-primary/20'}`}>
              {message}
            </div>
          )}

          <div className="flex gap-2 justify-center">
            {status !== 'verifying' && (
              <Button onClick={goToLogin} variant="gradient" className="px-6">Go to Login</Button>
            )}
            {status === 'error' && (
              <Link to="/forgot-password" className="text-primary text-sm hover:underline">Need a new link?</Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
