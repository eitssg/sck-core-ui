import { expect } from '@playwright/test';
import { test } from './fixtures/auth';

test.describe('Profile Passkeys interactions', () => {
  test('rename a passkey', async ({ authPage }) => {
    await authPage.goto('/profile');
    // Wait for Passkeys section heading (avoid strict matches with labels)
    await expect(authPage.getByRole('heading', { name: 'Passkeys' })).toBeVisible();
    // Ensure list rendered with seeded items
    const rows = authPage.locator('div.border.rounded-md');
    await expect(rows.first()).toBeVisible();
    const row = rows.first();
    await expect(row).toBeVisible();
  // Click rename (pencil) for that row
  await row.scrollIntoViewIfNeeded();
  await row.getByRole('button', { name: 'Rename' }).first().click();
  // Input appears; change name and save (check icon)
  const input = row.locator('input[type="text"]').first();
  await expect(input).toBeVisible();
  await input.fill('Office Mac');
    await row.getByRole('button', { name: 'Save name' }).click();

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
