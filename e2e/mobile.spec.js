import { test, expect } from '@playwright/test';
import { expectGameShell, startFirstDuel, watchRuntimeFailures } from './helpers.js';

test('mobile player gets touch controls without horizontal overflow', async ({ page }) => {
  const expectNoRuntimeFailures = watchRuntimeFailures(page);

  await page.goto('/?pwa=1&forceTouch=1&e2e=mobile');
  await expectGameShell(page);
  await expect(page.locator('html')).toHaveClass(/touch/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await startFirstDuel(page);
  expect(await page.locator('#mobile').evaluate(element => getComputedStyle(element).display)).toBe('block');
  await expect(page.locator('#fire')).toBeVisible();
  await expect(page.locator('#jump')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  expectNoRuntimeFailures();
});
