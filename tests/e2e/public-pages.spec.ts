import { test, expect } from '@playwright/test';

test.describe('Public pages', () => {
  test('login renders', async ({ page }) => {
    await page.goto('/login');
  await expect(page.getByRole('heading', { name: /Welcome (Back|to Core Automation)/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('signup renders', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('forgot password renders', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading')).toBeVisible();
  });
});
