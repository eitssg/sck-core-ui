import { expect } from '@playwright/test';
import { test } from './fixtures/auth';

test.describe('Profile save flow', () => {
  test('edit display name, language, and preferred region then save', async ({ authPage }) => {
    await authPage.goto('/profile');
    await expect(authPage).toHaveURL(/\/profile/);
    await expect(authPage.getByText('Personal Information', { exact: true })).toBeVisible();

    // Enter edit mode
    await authPage.getByRole('button', { name: /^Edit$/ }).click();

    // Change Display Name
    const displayInput = authPage.getByLabel('Display Name');
    await displayInput.fill('E2E Tester');

  // Change Language via combobox (only en-US available but exercise control)
  await authPage.getByLabel('Language').click();
  // Type filter text then press Enter to choose first result
  await authPage.keyboard.type('English');
  await authPage.keyboard.press('Enter');

  // Change Preferred Region via combobox
  await authPage.getByLabel('Preferred Region').click();
  await authPage.keyboard.type('us-east-1');
  await authPage.keyboard.press('Enter');

    // Save
    await authPage.getByRole('button', { name: /^Save$/ }).click();

    // Back to view mode; check Display Name changed
    await expect(authPage.getByText('Display Name')).toBeVisible();
    await expect(authPage.getByText('E2E Tester')).toBeVisible();
  });
});
