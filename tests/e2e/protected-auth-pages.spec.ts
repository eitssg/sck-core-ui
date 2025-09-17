import { expect } from '@playwright/test';
import { test } from './fixtures/auth';

// Authenticated smokes for key protected pages

test.describe('Protected pages (authenticated smokes)', () => {
  test('Profile renders and edit controls appear', async ({ authPage }) => {
    await authPage.goto('/profile');
    await expect(authPage).toHaveURL(/\/profile/);
    // Wait for a stable section unique to this page
    await expect(authPage.getByText('Personal Information', { exact: true })).toBeVisible();
    // Enter edit mode to reveal labeled inputs
    await authPage.getByRole('button', { name: /^Edit$/ }).click();
    await expect(authPage.getByLabel('Display Name')).toBeVisible();
    await expect(authPage.getByLabel('Preferred Region')).toBeVisible();
  });

  test('Portfolios renders header and actions', async ({ authPage }) => {
    await authPage.goto('/portfolios');
    await expect(authPage).toHaveURL(/\/portfolios/);
    await expect(authPage.getByRole('link', { name: /New/i, exact: false })).toBeVisible();
  });

  test('Clients renders heading and New button', async ({ authPage }) => {
    await authPage.goto('/clients');
    await expect(authPage).toHaveURL(/\/clients/);
  await expect(authPage.getByRole('link', { name: /New/i, exact: false })).toBeVisible();
  });
});
