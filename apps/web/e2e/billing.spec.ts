import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.state/member.json' });

test('billing: plans render with transparent HKD prices + founding banner', async ({ page }) => {
  await page.goto('/app/billing');
  await expect(page.getByText(/founding/i).first()).toBeVisible();
  // flat transparent pricing — real HKD numbers on web (never in-app on mobile)
  await expect(page.getByText('128')).toBeVisible();
  await expect(page.getByText('198')).toBeVisible();
});

test('settings: notification prefs toggle persists', async ({ page }) => {
  await page.goto('/app/settings');
  await page.getByText('Notification preferences').click();
  const prox = page.getByRole('checkbox').nth(1); // [promo, proximity, quiet]
  if (!(await prox.isChecked())) await prox.check();
  await expect(prox).toBeChecked();
  await page.reload();
  await page.getByText('Notification preferences').click();
  const prox2 = page.getByRole('checkbox').nth(1);
  await expect(prox2).toBeChecked();
});
