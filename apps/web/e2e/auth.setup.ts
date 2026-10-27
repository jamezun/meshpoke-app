import { test as setup, expect } from '@playwright/test';

// sign in each e2e user through the real UI (auth server = e2e/auth-server.mjs)
const users = [
  { name: 'member', email: 'member@e2e.test' },
  { name: 'host', email: 'host@e2e.test' },
];

for (const u of users) {
  setup(`authenticate ${u.name}`, async ({ page }) => {
    page.on('requestfailed', (r) => console.log('NETFAIL', r.url(), r.failure()?.errorText));
    page.on('console', (m) => console.log('CONSOLE', m.text().slice(0, 150)));
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill(u.email);
    await page.getByPlaceholder(/^password/i).fill('E2ePassw0rd!');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    await expect(page).toHaveURL(/app/);
    await expect(page.getByText('Activity').first()).toBeVisible();
    await page.context().storageState({ path: `e2e/.state/${u.name}.json` });
  });
}
