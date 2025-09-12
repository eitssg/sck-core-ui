import { useEffect, useMemo, useState } from 'react';
import { useAppSelector } from '@/store';
import { selectIsAuthenticated } from '@/store/slices/authSlice';
import { selectUser as selectProfileUser } from '@/store/slices/profileSlice';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// A small, global modal that appears when the user lacks AWS credentials.
// It can be snoozed for the current session, and auto-hides on the credentials page.
export default function AwsCredentialsGate() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated as any) as boolean;
  const profileUser = useAppSelector(selectProfileUser as any) as any;
  const hasAwsCreds = useMemo(() => Boolean((profileUser?.credentials || {})?.AwsCredentials), [profileUser]);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Do not show modal on the credentials page itself
  const onCredsPage = location.pathname === '/aws-credentials';

  useEffect(() => {
    // Never show when not authenticated or profile not yet available
    if (!isAuthenticated || !profileUser) {
      setOpen(false);
      return;
    }
    if (onCredsPage) {
      setOpen(false);
      return;
    }
    if (hasAwsCreds) {
      setOpen(false);
      return;
    }
    // Respect session snooze
    try {
      const snoozed = sessionStorage.getItem('aws_gate_snooze');
      setOpen(snoozed !== '1');
    } catch {
      setOpen(true);
    }
  }, [isAuthenticated, profileUser, hasAwsCreds, onCredsPage]);

  const goAdd = () => navigate('/aws-credentials', { state: { from: location.pathname } });
  const snooze = () => {
    try { sessionStorage.setItem('aws_gate_snooze', '1'); } catch { /* ignore */ }
    setOpen(false);
    // If user is on a blocked page (e.g., /dashboard), steer them to an allowed route
    const path = location.pathname || '/';
    const allowed = (
      path.startsWith('/profile') ||
      path.startsWith('/settings') ||
      path.startsWith('/aws-credentials')
    );
    if (!allowed) {
      navigate('/profile', { replace: true });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AWS credentials required</DialogTitle>
          <DialogDescription>
            Add your AWS Access Key and Secret to unlock deployments, apps, and zones. You can save them securely now or later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={snooze}>Remind me later</Button>
          <Button onClick={goAdd}>Add AWS Credentials</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
