/**
 * E2E Test 26.5 — Responsive layout at 320px, 768px, and 1280px viewports
 *
 * Covers: Requirements 14.3, 14.4
 * Asserts: single-column layout below 768px, no horizontal overflow at all breakpoints
 */

import { test, expect } from '@playwright/test';
import { uniqueUser, registerAndLogin } from './helpers.js';

const VIEWPORTS = [
  { name: '320px (mobile)', width: 320, height: 568 },
  { name: '768px (tablet)', width: 768, height: 1024 },
  { name: '1280px (desktop)', width: 1280, height: 720 },
];

test.describe('Responsive layout', () => {
  let boardUrl;
  let user;

  // Set up a board with two lists once, reuse across viewport tests
  test.beforeAll(async ({ browser }) => {
    user = uniqueUser();
    const page = await browser.newPage();
    await registerAndLogin(page, user);

    await page.getByRole('button', { name: /new board|create board|\+ board/i }).click();
    await page.getByPlaceholder(/board name/i).fill('Responsive Board');
    await page.getByRole('button', { name: /^create$/i }).click();
    await page.waitForURL(/\/boards\/.+/);
    boardUrl = page.url();

    await page.getByRole('button', { name: /add list|new list|\+ list/i }).click();
    await page.getByPlaceholder(/list name/i).fill('List One');
    await page.getByRole('button', { name: /^add$|^create$/i }).click();

    await page.getByRole('button', { name: /add list|new list|\+ list/i }).click();
    await page.getByPlaceholder(/list name/i).fill('List Two');
    await page.getByRole('button', { name: /^add$|^create$/i }).click();

    await page.close();
  });

  for (const viewport of VIEWPORTS) {
    test(`no horizontal overflow at ${viewport.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();

      // Log in
      await page.goto('/login');
      await page.getByLabel(/email/i).fill(user.email);
      await page.getByLabel(/password/i).fill(user.password);
      await page.getByRole('button', { name: /log in|login|sign in/i }).click();
      await page.waitForURL('**/boards');

      // Check boards page for overflow
      const boardsOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(boardsOverflow, `Horizontal overflow on boards page at ${viewport.name}`).toBe(false);

      // Check board view for overflow
      await page.goto(boardUrl);
      const boardOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(boardOverflow, `Horizontal overflow on board view at ${viewport.name}`).toBe(false);

      await context.close();
    });
  }

  test('board columns stack vertically below 768px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('/login');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /log in|login|sign in/i }).click();
    await page.waitForURL('**/boards');
    await page.goto(boardUrl);

    // On mobile, the board-columns container should have flex-direction: column
    const flexDirection = await page.evaluate(() => {
      const el = document.querySelector('.board-columns');
      if (!el) return null;
      return window.getComputedStyle(el).flexDirection;
    });

    expect(flexDirection).toBe('column');
    await context.close();
  });

  test('hamburger menu is visible on mobile and hidden on desktop', async ({ browser }) => {
    // Mobile
    const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const mobilePage = await mobileCtx.newPage();
    await mobilePage.goto('/login');
    await mobilePage.getByLabel(/email/i).fill(user.email);
    await mobilePage.getByLabel(/password/i).fill(user.password);
    await mobilePage.getByRole('button', { name: /log in|login|sign in/i }).click();
    await mobilePage.waitForURL('**/boards');

    const hamburger = mobilePage.getByRole('button', { name: /open navigation menu/i });
    await expect(hamburger).toBeVisible();
    await mobileCtx.close();

    // Desktop
    const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const desktopPage = await desktopCtx.newPage();
    await desktopPage.goto('/login');
    await desktopPage.getByLabel(/email/i).fill(user.email);
    await desktopPage.getByLabel(/password/i).fill(user.password);
    await desktopPage.getByRole('button', { name: /log in|login|sign in/i }).click();
    await desktopPage.waitForURL('**/boards');

    const hamburgerDesktop = desktopPage.getByRole('button', { name: /open navigation menu/i });
    await expect(hamburgerDesktop).not.toBeVisible();
    await desktopCtx.close();
  });
});
