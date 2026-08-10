import { test, expect } from '@playwright/test';
import { expectGameShell, startFirstDuel, watchRuntimeFailures } from './helpers.js';

test('desktop player can enter the first duel without runtime errors', async ({ page }) => {
  const expectNoRuntimeFailures = watchRuntimeFailures(page);

  await page.goto('/?pwa=1&e2e=desktop');
  await expectGameShell(page);
  await expect(page.locator('#mobile')).toBeHidden();
  await startFirstDuel(page);
  await expect(page.locator('#menuButton')).toBeVisible();

  expectNoRuntimeFailures();
});
