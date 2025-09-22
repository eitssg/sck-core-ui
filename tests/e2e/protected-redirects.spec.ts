import { test, expect } from '@playwright/test';

const protectedPaths = [
  '/dashboard',
  '/profile',
  '/portfolios',
  '/clients',
  '/settings',
];

test.describe('Protected redirects when unauthenticated', () => {
  for (const path of protectedPaths) {
    test(`visiting ${path} redirects to login`, async ({ page }) => {
      await page.goto(path);
  // Expect redirect to login and login UI visible
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: /Welcome (Back|to Core Automation)/i })).toBeVisible();
    });
  }
});
