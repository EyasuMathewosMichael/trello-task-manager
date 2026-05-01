/**
 * E2E Test 26.4 — Dark/light mode toggle and persistence
 *
 * Covers: Requirements 14.1, 14.2
 * Flow: Toggle theme → reload page → assert theme is preserved
 */

import { test, expect } from '@playwright/test';
import { uniqueUser, registerAndLogin } from './helpers.js';

test.describe('Dark/light mode toggle and persistence', () => {
  test('toggles to dark mode and persists after reload', async ({ page }) => {
    const user = uniqueUser();
    await registerAndLogin(page, user);

    // Check initial state — body should not have dark class by default
    // (or it may already be dark depending on localStorage; we'll detect current state)
    const isDarkInitially = await page.evaluate(() =>
      document.body.classList.contains('dark')
    );

    // Click the theme toggle
    await page.getByRole('button', { name: /toggle theme|dark mode|light mode|theme/i }).click();

    // After toggle, dark class should be opposite of initial
    const isDarkAfterToggle = await page.evaluate(() =>
      document.body.classList.contains('dark')
    );
    expect(isDarkAfterToggle).toBe(!isDarkInitially);

    // Verify localStorage was updated
    const storedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(storedTheme).toBeTruthy();

    // Reload and verify theme persists
    await page.reload();
    const isDarkAfterReload = await page.evaluate(() =>
      document.body.classList.contains('dark')
    );
    expect(isDarkAfterReload).toBe(isDarkAfterToggle);
  });

  test('toggles back to light mode and persists', async ({ page }) => {
    const user = uniqueUser();
    await registerAndLogin(page, user);

    // Force dark mode first
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.body.classList.add('dark');
    });
    await page.reload();

    // Should be dark after reload
    const isDark = await page.evaluate(() => document.body.classList.contains('dark'));
    expect(isDark).toBe(true);

    // Toggle to light
    await page.getByRole('button', { name: /toggle theme|dark mode|light mode|theme/i }).click();

    const isLightAfterToggle = await page.evaluate(() =>
      !document.body.classList.contains('dark')
    );
    expect(isLightAfterToggle).toBe(true);

    // Reload and verify light mode persists
    await page.reload();
    const isLightAfterReload = await page.evaluate(() =>
      !document.body.classList.contains('dark')
    );
    expect(isLightAfterReload).toBe(true);
  });
});
