import { expect } from '@playwright/test';
import { test } from './fixtures/auth';

test.describe('Profile Passkeys interactions', () => {
  test('rename a passkey', async ({ authPage }) => {
    await authPage.goto('/profile');
    // Wait for Passkeys section heading (avoid strict matches with labels)
  const passkeysHeading = authPage.getByRole('heading', { name: 'Passkeys' });
  await expect(passkeysHeading).toBeVisible();
  // Ensure list rendered with seeded items
  const row = authPage.getByTestId('passkey-row-pk-1');
    await expect(row).toBeVisible();
  // Click rename (pencil) within the targeted row
  await row.scrollIntoViewIfNeeded();
  await row.getByTestId('passkey-rename-pk-1').click();
  // Wait for row to enter rename mode (Save name button appears)
  await expect(row.locator('button[aria-label="Save name"]')).toBeVisible();
  // Input appears within this row; change name and save (check icon)
  const input = row.locator('[data-testid^="passkey-rename-input-"]');
  await expect(input).toBeVisible();
  await input.fill('Office Mac');
  await row.getByTestId('passkey-save-pk-1').click();

    // Assert updated label appears
    await expect(authPage.getByText('Office Mac', { exact: true })).toBeVisible();
  });

  test('delete a passkey', async ({ authPage }) => {
    await authPage.goto('/profile');
    await expect(authPage.getByRole('heading', { name: 'Passkeys' })).toBeVisible();

    // Delete the row with Phone
  const row = authPage.locator('div.border.rounded-md', { hasText: 'Phone' }).first();
    await row.getByRole('button', { name: 'Delete passkey' }).click();

    // The entry should be gone
    await expect(authPage.getByText('Phone', { exact: true })).toHaveCount(0);
  });
});
