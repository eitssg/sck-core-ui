import { test, expect } from '@playwright/test';

test.describe('Error bridge (/error) sanitization and handoff', () => {
  test('redirect=/login with error=isf shows friendly message on /login without query', async ({ page }) => {
    await page.goto('/error?error=isf&redirect=/login');

    // Should end up at /login without params
    await expect(page).toHaveURL(/\/login$/);

    // Error message mapped from code
    await expect(page.getByRole('alert')).toContainText('Invalid state format.');

    // Session storage one-shot should be cleared after consumption
    const hasPending = await page.evaluate(() => ({
      code: sessionStorage.getItem('pending_auth_error_code'),
      msg: sessionStorage.getItem('pending_auth_error_message'),
    }));
    expect(hasPending.code).toBeNull();
    expect(hasPending.msg).toBeNull();
  });

  test('off-site redirect is stripped and lands on /login; message persists', async ({ page }) => {
    await page.goto('/error?error=upro&redirect=https://evil.com');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('alert')).toContainText('Cannot create user profile.');
  });

  test('disallowed path redirect falls back to /login; message displayed', async ({ page }) => {
    await page.goto('/error?error=rle&redirect=/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('alert')).toContainText('Too many requests. Please wait and try again.');
  });

  test('invalid error code becomes generic login failure', async ({ page }) => {
    // invalid code -> sanitized to server_error -> generic message from Login pending-error mapping
    await page.goto('/error?error=%3Cscript%3E&redirect=/login');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('alert')).toContainText('Login failed. Please try again.');
  });
});
