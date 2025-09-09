import { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectUser as selectProfileUser, updateProfileGlobally, fetchUserProfile as fetchUserProfileThunk } from '@/store/slices/profileSlice';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/lib/auth-api';

export default function MFAToken() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const profileUser = useAppSelector(selectProfileUser as any);

  const mfaEnabledProfile = useMemo(() => Boolean((profileUser as any)?.mfa_enabled), [profileUser]);

  const [loading, setLoading] = useState(false);
  const [provisioningUri, setProvisioningUri] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  // Track MFA status from server to avoid racing on initial hydration
  const [apiMfaEnabled, setApiMfaEnabled] = useState<boolean | null>(null);
  const [setupStarted, setSetupStarted] = useState<boolean>(false);
  // Inline verify feedback for enabled flow
  const [verifyFeedback, setVerifyFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const onCopyCode = async () => {
    if (!verifyCode) return;
    try {
      await navigator.clipboard.writeText(verifyCode);
      toast({ title: 'Code copied' });
    } catch {
      toast({ title: 'Copy failed', description: 'Clipboard not available.', variant: 'destructive' });
    }
  };
  const onCopySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      toast({ title: 'Secret copied' });
    } catch {
      toast({ title: 'Copy failed', description: 'Clipboard not available.', variant: 'destructive' });
    }
  };

  // Start setup if MFA not enabled (server-verified)
  const beginSetup = async () => {
    setLoading(true);
    try {
      const res = await authAPI.mfaTotpSetup();
      if ('error' in res) {
        toast({ title: 'MFA setup failed', description: res.error_description || res.error, variant: 'destructive' });
        return;
      }
      setProvisioningUri(res.provisioning_uri || '');
      setSecret(res.secret || '');
      setRecoveryCodes(res.recovery_codes || []);
    } catch {
      toast({ title: 'Network error', description: 'Could not start MFA setup.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const confirmSetup = async () => {
    if (!verifyCode.trim()) {
      toast({ title: 'Enter the 6-digit code', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.mfaTotpConfirm(verifyCode.trim());
      if ('error' in res) {
        toast({ title: 'Invalid code', description: res.error_description || res.error, variant: 'destructive' });
        return;
      }
      setConfirmed(true);
      toast({ title: 'MFA enabled', description: 'Your authenticator is now linked.' });
      // Optimistically mark MFA active in local store for current profile
      try {
        const p: any = profileUser || {};
        if (p.profile_name) {
          dispatch(updateProfileGlobally({ profile_name: p.profile_name, mfa_enabled: true, mfa_methods: Array.from(new Set([...(p.mfa_methods || []), 'totp'])) } as any));
        }
        // Then refresh from server to ensure consistency
        dispatch(fetchUserProfileThunk({ force: true } as any));
      } catch {
        // no-op: best-effort optimistic update
      }
    } catch {
      toast({ title: 'Network error', description: 'Could not confirm MFA setup.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const verifyLogin = async () => {
    if (!verifyCode.trim()) {
      setVerifyFeedback({ ok: false, message: 'Enter the 6-digit code.' });
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.mfaVerify(verifyCode.trim());
      if ('error' in res) {
        setVerifyFeedback({ ok: false, message: res.error_description || 'Verification failed.' });
        return;
      }
      setVerifyFeedback({ ok: true, message: 'Token is valid.' });
      // Ensure profile reflects enabled state if not already
      try {
        const p: any = profileUser || {};
        if (!p.mfa_enabled && p.profile_name) {
          dispatch(updateProfileGlobally({ profile_name: p.profile_name, mfa_enabled: true } as any));
          dispatch(fetchUserProfileThunk({ force: true } as any));
        }
      } catch {
        // no-op: background refresh best-effort
      }
    } catch {
      setVerifyFeedback({ ok: false, message: 'Network error. Could not verify MFA code.' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch server MFA status on first mount
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await authAPI.mfaStatus();
        if (ignore) return;
        if ('error' in res) {
          // Keep unknown to avoid accidentally triggering setup without a session
          setApiMfaEnabled(null);
          toast({ title: 'Session not ready', description: 'Retrying shortly…', variant: 'default' });
        } else {
          setApiMfaEnabled(Boolean(res.mfa_enabled));
        }
      } catch {
        setApiMfaEnabled(null);
      }
    })();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After status known and not enabled, trigger setup once
  useEffect(() => {
    if (apiMfaEnabled === false && !setupStarted) {
      setSetupStarted(true);
      beginSetup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiMfaEnabled, setupStarted]);

  return (
    <div className="min-h-screen w-full flex flex-col">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full">
        <Card>
          <CardHeader className="flex flex-col gap-1">
            <div className="flex items-start justify-between">
              <CardTitle>Multi‑Factor Authentication (TOTP)</CardTitle>
              <div
                role="link"
                onClick={() => navigate('/profile')}
                className="ml-4 cursor-pointer inline-flex items-center gap-1 text-sm hover:opacity-80"
                aria-label="Back to Profile"
                title="Back"
              >
                {/* Back icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Back</span>
              </div>
            </div>
            <CardDescription>Use an authenticator app (e.g., Google Authenticator, 1Password, Authy).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {apiMfaEnabled === null ? (
              <div className="space-y-3">
                <p className="text-sm">Restoring your session…</p>
                <Button variant="secondary" onClick={() => {
                  // re-check status on demand
                  (async () => {
                    setLoading(true);
                    try {
                      const res = await authAPI.mfaStatus();
                      if ('error' in res) {
                        toast({ title: 'Still restoring', description: res.error_description || res.error });
                      } else {
                        setApiMfaEnabled(Boolean(res.mfa_enabled));
                      }
                    } finally {
                      setLoading(false);
                    }
                  })();
                }}>Retry</Button>
              </div>
            ) : (apiMfaEnabled ?? mfaEnabledProfile) ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-green-100 text-green-600">
                    {/* Checkmark in a circle */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </span>
                  <p className="text-sm">MFA is currently <span className="font-medium">enabled</span> for your account.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="verify_code">Enter code to verify</Label>
                  <div className="flex items-center gap-2">
                    <Input id="verify_code" inputMode="numeric" maxLength={6} value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" />
                    <Button onClick={verifyLogin} disabled={loading}>Verify</Button>
                  </div>
                  {verifyFeedback ? (
                    <p className={`text-sm ${verifyFeedback.ok ? 'text-green-600' : 'text-red-600'}`}>{verifyFeedback.message}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-center">Scan the QR code in your favorite authenticator app, or enter the code manually:</p>

                {provisioningUri ? (
                  <div className="space-y-2">
                    <div className="flex justify-center">
                      <div className="rounded border p-3 inline-block bg-white">
                        <QRCode value={provisioningUri} size={200} />
                      </div>
                    </div>
                  </div>
                ) : null}

                {secret ? (
                  <div className="space-y-1">
                    <Label htmlFor="totp_secret">Or enter this secret manually</Label>
                    <div className="flex items-center gap-2">
                      <Input id="totp_secret" readOnly value={secret} className="font-mono" />
                      <button type="button" onClick={onCopySecret} aria-label="Copy secret" title="Copy secret" className="inline-flex items-center justify-center rounded-md border px-2 py-2 text-sm hover:bg-muted">
                        {/* simple copy icon (two squares) */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="totp_code">Enter the 6‑digit code</Label>
                  <div className="flex items-center gap-2">
                    <Input id="totp_code" inputMode="numeric" maxLength={6} value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" />
                    <Button onClick={confirmSetup} disabled={loading || !verifyCode}>Confirm</Button>
                  </div>
                </div>

                {confirmed && recoveryCodes.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Recovery Codes</Label>
                    <p className="text-xs text-muted-foreground">Store these codes in a safe place. Each can be used once if you lose your device.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {recoveryCodes.map((c, i) => (
                        <div key={i} className="text-sm font-mono p-2 rounded bg-muted">{c}</div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            {/* Back link moved to header */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
