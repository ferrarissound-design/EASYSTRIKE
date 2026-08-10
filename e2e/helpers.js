import { expect } from '@playwright/test';

export async function prepareGamePage(page) {
  await page.addInitScript(() => {
    localStorage.setItem('firstBlastSettings', JSON.stringify({
      quality: 'low',
      qualityPinned: true,
      sfx: 0,
      bgm: 0,
    }));
  });
}

export function watchRuntimeFailures(page) {
  const failures = [];
  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });
  return () => expect(failures).toEqual([]);
}

export async function expectGameShell(page) {
  await expect(page).toHaveTitle('EASYSTRIKE');
  await expect(page.locator('#start')).toBeVisible();
  await expect(page.locator('#game canvas')).toHaveCount(1);
}

export async function startFirstDuel(page) {
  await page.locator('#duelButton').click();
  await expect(page.locator('#onboarding')).toBeVisible();
  await expect(page.locator('#start')).toBeHidden();
  await page.locator('#onboardingStart').click();
  await expect(page.locator('#hud')).not.toHaveClass(/hidden/);
  await expect(page.locator('#ammo')).toBeVisible();
  await expect(page.locator('#ammo')).toHaveText('24');
}
