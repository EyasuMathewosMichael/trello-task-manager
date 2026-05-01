/**
 * E2E Test 26.3 — Real-time collaboration
 *
 * Covers: Requirement 8.2
 * Flow: Open two browser contexts on the same board → create a task in one →
 *       verify it appears in the other without refresh
 */

import { test, expect } from '@playwright/test';
import { uniqueUser, registerAndLogin } from './helpers.js';

test.describe('Real-time collaboration', () => {
  test('task created in one tab appears in another tab without refresh', async ({ browser }) => {
    const user = uniqueUser();

    // ── Context 1: set up board ───────────────────────────────────────────
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await registerAndLogin(page1, user);

    // Create board
    await page1.getByRole('button', { name: /new board|create board|\+ board/i }).click();
    await page1.getByPlaceholder(/board name/i).fill('Realtime Board');
    await page1.getByRole('button', { name: /^create$/i }).click();
    await page1.waitForURL(/\/boards\/.+/);
    const boardUrl = page1.url();

    // Add a list
    await page1.getByRole('button', { name: /add list|new list|\+ list/i }).click();
    await page1.getByPlaceholder(/list name/i).fill('Live List');
    await page1.getByRole('button', { name: /^add$|^create$/i }).click();
    await expect(page1.getByText('Live List')).toBeVisible();

    // ── Context 2: open the same board ───────────────────────────────────
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // Log in as the same user in context 2
    await page2.goto('/login');
    await page2.getByLabel(/email/i).fill(user.email);
    await page2.getByLabel(/password/i).fill(user.password);
    await page2.getByRole('button', { name: /log in|login|sign in/i }).click();
    await page2.waitForURL('**/boards');

    // Navigate to the same board
    await page2.goto(boardUrl);
    await expect(page2.getByText('Live List')).toBeVisible();

    // ── Context 1: create a task ──────────────────────────────────────────
    await page1.getByRole('button', { name: /add (a )?task|new task|\+ (a )?task/i }).first().click();
    await page1.getByLabel(/title/i).fill('Realtime Task');
    await page1.getByRole('button', { name: /create task/i }).click();
    await expect(page1.getByText('Realtime Task')).toBeVisible();

    // ── Context 2: verify task appears without refresh ────────────────────
    await expect(page2.getByText('Realtime Task')).toBeVisible({ timeout: 5000 });

    await context1.close();
    await context2.close();
  });
});
