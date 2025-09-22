import { expectAuth as expect, test } from './fixtures/auth';

test.describe('Authenticated protected page smoke', () => {
  test('dashboard renders when authenticated', async ({ authPage }) => {
    await authPage.goto('/dashboard');
    await expect(authPage).toHaveURL(/\/dashboard/);
  await expect(authPage.locator('h1.sck-page-title')).toHaveText(/Dashboard/i);
  });
});
