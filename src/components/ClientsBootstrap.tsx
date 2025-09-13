import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectIsAuthenticated } from '@/store/slices/authSlice';
import { fetchClients, selectClients, setSelectedClient, selectSelectedClient } from '@/store/slices/clientsSlice';
import { fetchPortfolios } from '@/store/slices/portfoliosSlice';
import { fetchZonesPage, resetZonesPaging } from '@/store/slices/zonesSlice';
import { selectTokens } from '@/store/slices/authSlice';
import { selectUser as selectProfileUser } from '@/store/slices/profileSlice';

// Bootstraps client list globally and ensures a valid selected client.
// Rules:
// - Always fetch clients after auth (TTL guarded by thunk)
// - Read saved selection from localStorage 'sck.selectedClient'
// - If none saved or saved not in list, default to 'core'
// - Never clears localStorage; only writes selected client when changed
export default function ClientsBootstrap() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated as any);
  const clients = useAppSelector(selectClients as any) as Array<{ client: string }>;
  const selected = useAppSelector(selectSelectedClient as any) as string | null;
  const tokens = useAppSelector(selectTokens as any) as { access_token?: string } | null;
  const profileUser = useAppSelector(selectProfileUser as any) as any;
  const hasAwsCreds = Boolean(profileUser?.credentials?.AwsCredentials);

  // Fetch client list when authenticated
  const hasAccess = Boolean(tokens && (tokens as any).access_token);
  useEffect(() => {
    if (!isAuthenticated || !hasAccess) return;
    if (!hasAwsCreds) return; // cannot list clients without AWS creds; wait
    // Fetch full list (no explicit limit param on bootstrap)
    dispatch(fetchClients(undefined) as any);
  }, [dispatch, isAuthenticated, hasAccess, hasAwsCreds]);

  // Enforce default selection policy
  useEffect(() => {
    if (!isAuthenticated) return;

    let saved: string | null = null;
    try { saved = localStorage.getItem('sck.selectedClient'); } catch { /* ignore */ }

    const list = clients || [];
    if (!list.length) return; // nothing to select yet

    const names = new Set(list.map(c => c.client));

    // Determine target selection with robust fallback for server-filtered lists
    // 1) Saved (if still allowed), else 2) 'core' if present, else 3) first client
    const target = (saved && names.has(saved))
      ? saved
      : (names.has('core') ? 'core' : list[0]?.client || null);

    if (target && selected !== target) {
      dispatch(setSelectedClient(target) as any);
    }
  }, [dispatch, isAuthenticated, clients, selected]);

  // After a client is selected and we have access, fetch portfolios list on boot/refresh
  useEffect(() => {
    if (!isAuthenticated) return;
    const client = selected;
    const haveAccess = Boolean(tokens && (tokens as any).access_token);
    if (!client || !haveAccess) return;
    // Fetch with modest page size; list pages can paginate further
    dispatch(fetchPortfolios({ client, limit: 100, cursor: null, force: true }) as any);
  // Refresh zones list as well for dashboard and other pages
  dispatch(resetZonesPaging());
  dispatch(fetchZonesPage({ client, limit: 100, append: false }) as any);
  }, [dispatch, isAuthenticated, selected, tokens]);

  return null;
}
