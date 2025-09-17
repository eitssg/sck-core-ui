import { test as base, expect as baseExpect, Page } from '@playwright/test';

export type AuthFixtures = {
  authPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authPage: async ({ page, context }, useFixture) => {
    // Seed refresh token before any scripts run
    await context.addInitScript(() => {
      try { sessionStorage.setItem('refresh_token', 'e2e_refresh_token'); } catch (e) { /* ignore */ }
      try { sessionStorage.setItem('sck_last_refresh_at', new Date(Date.now() - 60_000).toISOString()); } catch (e) { /* ignore */ }
    });

    // Mock token refresh
    await page.route('**/auth/v1/token', async (route) => {
      const body = {
        access_token: 'e2e_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile email',
        refresh_token: 'e2e_refresh_token_rotated',
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    // Simple in-memory state for mocks (per test context)
    const passkeysDb: Array<any> = [
      {
        user_id: 'user@example.com',
        key_id: 'pk-1',
        name: 'Work Laptop',
        device_type: 'cross-platform',
        last_used_at: new Date().toISOString(),
      },
      {
        user_id: 'user@example.com',
        key_id: 'pk-2',
        name: 'Phone',
        device_type: 'platform',
        last_used_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    let authProfile: any = {
      user_id: 'user@example.com',
      email: 'user@example.com',
      display_name: 'E2E User',
      profile_name: 'default',
      is_active: true,
      session_count: 42,
      credentials: { AwsCredentials: null },
      preferred_region: 'us-east-1',
      language: 'en-US',
    };

    // Mock /auth/v1/me profile; tolerant shape per profile slice
    await page.route('**/auth/v1/me', async (route) => {
      const body = authProfile;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    // Mock /auth/v1/profiles list (return default profile)
    await page.route('**/auth/v1/profiles', async (route) => {
      if (route.request().method() !== 'GET') {
        // For non-GET like POST create, just pass through to default 200 empty
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      }
      const body = {
        data: [
          {
            user_id: 'user@example.com',
            email: 'user@example.com',
            display_name: 'E2E User',
            profile_name: 'default',
            is_active: true,
            credentials: { AwsCredentials: true },
            client: 'core',
            client_name: 'Core',
          },
        ],
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    // Mock /auth/v1/profiles/{profileName}
    await page.route('**/auth/v1/profiles/*', async (route) => {
      const profileName = route.request().url().split('/').pop() || 'default';
      const req = route.request();
      if (req.method() === 'PATCH') {
        let patch: any = {};
        try { patch = JSON.parse(req.postData() || '{}'); } catch { /* ignore */ }
        authProfile = { ...authProfile, ...patch, profile_name: profileName };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(authProfile) });
      }
      const body = { ...authProfile, profile_name: profileName, credentials: { AwsCredentials: true }, client: 'core', client_name: 'Core' };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    // Mock clients list envelope for /api
    await page.route('**/api/v1/registry/clients', async (route) => {
      const body = {
        status: 'ok',
        code: 200,
        data: [
          { client: 'core', client_name: 'Core' },
        ],
        metadata: { count: 1 }
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    // Mock single client details for /api/v1/registry/clients/core
    await page.route('**/api/v1/registry/clients/core', async (route) => {
      const body = {
        status: 'ok',
        code: 200,
        data: { client: 'core', client_name: 'Core', organization_name: 'Core Org' },
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    // Mock portfolios list for selected client
    await page.route('**/api/v1/registry/clients/*/portfolios', async (route) => {
      const body = {
        status: 'ok',
        code: 200,
        data: [],
        metadata: { count: 0 },
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    // Mock passkeys list and item operations used by Profile page
    await page.route('**/auth/v1/passkeys', async (route) => {
      const body = { status: 'ok', code: 200, data: passkeysDb.slice(), metadata: { count: passkeysDb.length } };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.route('**/auth/v1/passkey/*', async (route) => {
      const url = route.request().url();
      const keyId = decodeURIComponent(url.split('/').pop() || '');
      const method = route.request().method();
      if (method === 'PATCH') {
        let patch: any = {};
        try { patch = JSON.parse(route.request().postData() || '{}'); } catch { /* ignore */ }
        const idx = passkeysDb.findIndex(p => p.key_id === keyId);
        if (idx >= 0) {
          passkeysDb[idx] = { ...passkeysDb[idx], ...patch };
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', code: 200, data: passkeysDb[idx] }) });
        }
        return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not found' }) });
      }
      if (method === 'DELETE') {
        const idx = passkeysDb.findIndex(p => p.key_id === keyId);
        if (idx >= 0) {
          passkeysDb.splice(idx, 1);
          return route.fulfill({ status: 204, contentType: 'application/json', body: '' });
        }
        return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not found' }) });
      }
      return route.fallback();
    });

  // Call the fixture continuation (avoid triggering React-hooks lint rule)
  await (useFixture as any)(page);
  }
});

export const expectAuth = baseExpect;
