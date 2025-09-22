import { expect } from '@playwright/test';
import { test } from './fixtures/auth';

// Cancel should discard any unsaved edits, including Preferred Region
// Initial seeded region in fixture: us-east-1

test.describe('Profile cancel flow', () => {
  test('change preferred region then cancel reverts to original', async ({ authPage }) => {
    await authPage.goto('/profile');
    await expect(authPage).toHaveURL(/\/profile/);

    // Enter edit mode
    await authPage.getByRole('button', { name: 'Edit personal information' }).click();
    await expect(authPage.getByRole('button', { name: 'Cancel' })).toBeVisible();

    // Change Preferred Region but do NOT save
    await authPage.getByLabel('Preferred Region').click();
    await authPage.getByTestId('region-option-eu-west-1').click();

    // Click Cancel to discard staged changes
    await authPage.getByRole('button', { name: 'Cancel' }).click();

    // Back in view mode, Preferred Region should remain original (us-east-1)
    await expect(authPage.getByText('Preferred Region')).toBeVisible();
    await expect(authPage.getByText('us-east-1')).toBeVisible();
  });
});
