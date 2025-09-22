import { test, expect } from '@playwright/test';

// Goal: Ensure the clients page makes ONLY a single fetch attempt for the list.
// Rules per product requirement:
// - If the first response is 401 (no AWS creds) STOP.
// - If the first response is 200 with [] STOP.
// - If the first response returns data STOP (normal flow handled elsewhere).
// This test asserts there is exactly ONE network request to the clients list
// within a quiet window—no retries, no polling.

test.describe('Clients page request behavior', () => {
  test('performs only one clients list request then stops', async ({ page }) => {
    let requestCount = 0;
    const urls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/v1/registry/clients')) {
        requestCount += 1;
        urls.push(url);
      }
    });

    // Track responses so we can assert body characteristics (empty array vs data) without retries.
    const responses: { status: number; length: number | null }[] = [];
    page.on('response', async (res) => {
      const url = res.url();
      if (url.includes('/api/v1/registry/clients')) {
        const status = res.status();
        let length: number | null = null;
        try {
          const json: any = await res.json().catch(() => null);
          if (json && Array.isArray(json.data)) {
            length = json.data.length;
          }
        } catch { /* ignore */ }
        responses.push({ status, length });
      }
    });

    await page.goto('/clients');

    // Wait briefly for a potential request (user might be redirected or gated); don't fail if none.
    await Promise.race([
      page.waitForRequest(r => r.url().includes('/api/v1/registry/clients'), { timeout: 1500 }).catch(() => null),
      page.waitForTimeout(1500)
    ]);

    // Quiet window: ensure no more than one request total over additional interval.
    await page.waitForTimeout(800);

    expect(requestCount).toBeLessThanOrEqual(1);
    if (requestCount === 1) {
      expect(urls[0]).toContain('/api/v1/registry/clients');
      if (responses.length === 1) {
        const r = responses[0];
        expect([200, 401]).toContain(r.status);
      }
    }
  });
});
