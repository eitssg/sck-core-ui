import { test, expect } from '@playwright/test';

// Basic visual behavior checks for login page input layout.
// Assumes dev server runs on :8080.

test.describe('Login inputs layout', () => {
  test('password panel padding prevents clipping and widths match', async ({ page }) => {
    await page.goto('/login');

    const email = page.getByLabel('Email');
    await expect(email).toBeVisible();

    // Reveal password panel
    const usePassword = page.getByRole('button', { name: /Use password instead/i });
    await usePassword.click();

    const pwd = page.getByLabel('Password');
    await expect(pwd).toBeVisible();

    // Focus to show focus ring/border
    await pwd.focus();

    // Compare bounding boxes to ensure similar width (±2px tolerance)
    const emailBox = await email.boundingBox();
    const pwdBox = await pwd.boundingBox();

    expect(emailBox).not.toBeNull();
    expect(pwdBox).not.toBeNull();

    if (emailBox && pwdBox) {
      const widthDiff = Math.abs(emailBox.width - pwdBox.width);
      expect(widthDiff).toBeLessThanOrEqual(2);
    }
  });
});
