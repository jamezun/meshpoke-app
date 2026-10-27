import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.state/host.json' });

test('host flow: hosted spot list + queue empty state', async ({ page }) => {
  await page.goto('/app/host');
  await expect(page.getByRole('heading', { name: 'Host console' })).toBeVisible();
  await expect(page.getByText('E2E Friday drinks')).toBeVisible();
  await page.getByText('E2E Friday drinks').click();
  await expect(page.getByText(/no applications/i)).toBeVisible();
  await expect(page.getByText(/pin the date/i)).toBeVisible();
});
