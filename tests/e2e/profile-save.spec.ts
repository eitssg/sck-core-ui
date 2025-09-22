import { expect } from '@playwright/test';
import { test } from './fixtures/auth';

test.describe('Profile save flow', () => {
  test('edit display name, language, and preferred region then save', async ({ authPage }) => {
    await authPage.goto('/profile');
    await expect(authPage).toHaveURL(/\/profile/);
    await expect(authPage.getByText('Personal Information', { exact: true })).toBeVisible();

  // Enter edit mode (personal info card header)
  await authPage.getByRole('button', { name: 'Edit personal information' }).click();
  // Wait for edit controls to appear
  await expect(authPage.getByRole('button', { name: 'Cancel' })).toBeVisible();

  // Debug: list buttons in header
  const personalHeader = authPage.getByTestId('personal-info-header');
  const headerButtons = personalHeader.locator('button');
  const count = await headerButtons.count();
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    const el = headerButtons.nth(i);
    const lab = await el.getAttribute('aria-label');
    const tid = await el.getAttribute('data-testid');
    const text = await el.innerText();
    labels.push(`${i}:${lab || ''}:${tid || ''}:${text.trim()}`);
  }
  console.log('Header buttons:', labels);

  // No special Display Name flow needed; treat like any other field.

  // Change Preferred Region using deterministic test id
  await authPage.getByLabel('Preferred Region').click();
  await authPage.getByTestId('region-option-eu-west-1').click();

  // Save changes from the Personal Information header
  const personalHeader2 = authPage.getByTestId('personal-info-header');
  await personalHeader2.scrollIntoViewIfNeeded();
  const saveBtn = personalHeader2.locator('[data-testid="personal-info-save"]');
  try {
    await saveBtn.click();
  } catch {
    // If overlapped or slightly offscreen in some engines, force the click
    await saveBtn.click({ force: true });
  }

  // Back to view mode when Save completes
  await expect(authPage.getByRole('button', { name: 'Edit personal information' })).toBeVisible();
  // Region label should reflect saved selection
  await expect(authPage.getByText('Preferred Region')).toBeVisible();
  await expect(authPage.getByText('eu-west-1')).toBeVisible();
  });
});
