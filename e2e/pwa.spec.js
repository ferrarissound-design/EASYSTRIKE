import { test, expect } from '@playwright/test';
import { expectGameShell, watchRuntimeFailures } from './helpers.js';

test('PWA shell starts from cache on a new offline navigation URL', async ({ page, context }) => {
  const expectNoRuntimeFailures = watchRuntimeFailures(page);
  const serviceWorker = context.waitForEvent('serviceworker');

  await page.goto('/?pwa=1&e2e=pwa-seed');
  await expectGameShell(page);
  await serviceWorker;
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Service Worker did not take control')), 10_000);
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
    });
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  expect(context.serviceWorkers()).toHaveLength(1);

  await context.setOffline(true);
  try {
    await page.goto('/?pwa=1&e2e=pwa-offline', { waitUntil: 'domcontentloaded' });
    await expectGameShell(page);
  } finally {
    await context.setOffline(false);
  }

  expectNoRuntimeFailures();
});
