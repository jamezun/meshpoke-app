import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.state/member.json' });

test('member flow: browse districts → see seeded spot → open detail', async ({ page }) => {
  await page.goto('/app/spots');
  await page.getByRole('combobox').first().selectOption('Central and Western 中西區');
  await expect(page.getByText('E2E Friday drinks')).toBeVisible();
  await page.getByText('E2E Friday drinks').click();
  await expect(page.getByText(/needs: finance/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply', exact: true })).toBeVisible();
});
