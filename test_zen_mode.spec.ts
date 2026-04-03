import { test, expect } from '@playwright/test';

test('Zen mode toast appears', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // Wait for 3D scene to load, usually there's an 'Enter' button after loading
  const enterButton = page.getByRole('button', { name: 'Enter' });
  await expect(enterButton).toBeVisible({ timeout: 60000 });
  await enterButton.click();

  // Wait a bit for intro animations
  await page.waitForTimeout(3000);

  // Find the Zen Mode button
  const zenModeButton = page.getByLabel('Zen Mode');
  await expect(zenModeButton).toBeVisible();
  await zenModeButton.click();

  // Wait for the toast text to appear
  const toastText = page.getByText('Zen Mode Active');
  await expect(toastText).toBeVisible();

  await page.screenshot({ path: '/home/jules/verification/zen_toast_final.png' });
});
