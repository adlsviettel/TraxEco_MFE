import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  setup.setTimeout(120000); // Tăng timeout cho lần đầu tiên Vite build
  // Retrieve credentials from Environment Variables
  const username = process.env.TEST_USERNAME || 'shin';
  const password = process.env.TEST_PASSWORD || '?';

  // Lắng nghe console log để debug tại sao page lại trắng
  page.on('console', msg => console.log(`[Browser Console] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[Browser Error] ${err.message}`));

  // Navigate to login page
  await page.goto('/login');

  // Fill in login form
  const usernameInput = page.getByPlaceholder(/username|mã nhân viên/i).first();
  if (await usernameInput.isVisible()) {
    await usernameInput.fill(username);
  } else {
    // fallback locator
    await page.locator('input[name="username"], input[type="text"]').first().fill(username);
  }

  const passwordInput = page.getByPlaceholder(/password|mật khẩu/i).first();
  if (await passwordInput.isVisible()) {
    await passwordInput.fill(password);
  } else {
    await page.locator('input[name="password"], input[type="password"]').first().fill(password);
  }

  // Click login button
  const loginButton = page.getByRole('button', { name: /login|đăng nhập/i });
  if (await loginButton.isVisible()) {
    await loginButton.click();
  } else {
    await page.locator('button[type="submit"]').first().click();
  }

  // Wait for token to be available in localStorage
  await page.waitForFunction(() => {
    return window.localStorage.getItem('token') !== null;
  }, { timeout: 15000 });

  // Let the dashboard/home load
  await page.waitForTimeout(2000);

  // End of authentication steps.
  // Save storage state to a file so other tests can reuse it
  await page.context().storageState({ path: authFile });
});
