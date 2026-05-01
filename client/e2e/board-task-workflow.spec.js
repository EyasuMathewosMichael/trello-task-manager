/**
 * E2E Test 26.1 — Board creation and list/task management workflow
 *
 * Covers: Requirements 4.1, 5.1, 6.1
 * Flow: Register → create board → add lists → create tasks → verify persistence
 */

import { test, expect } from '@playwright/test';
import { uniqueUser, registerAndLogin } from './helpers.js';

test.describe('Board, list and task workflow', () => {
  let user;

  test.beforeEach(async ({ page }) => {
    user = uniqueUser();
    await registerAndLogin(page, user);
  });

  test('creates a board and it appears in the board list', async ({ page }) => {
    await page.goto('/boards');
    await page.getByRole('button', { name: /new board|create board|\+ board/i }).click();
    await page.getByPlaceholder(/board name/i).fill('My E2E Board');
    await page.getByRole('button', { name: /^create$/i }).click();

    // Should navigate to the new board
    await expect(page).toHaveURL(/\/boards\/.+/);

    // Go back to board list and verify it's there
    await page.goto('/boards');
    await expect(page.getByText('My E2E Board')).toBeVisible();
  });

  test('adds lists to a board', async ({ page }) => {
    // Create board
    await page.getByRole('button', { name: /new board|create board|\+ board/i }).click();
    await page.getByPlaceholder(/board name/i).fill('List Test Board');
    await page.getByRole('button', { name: /^create$/i }).click();
    await page.waitForURL(/\/boards\/.+/);

    // Add a list
    await page.getByRole('button', { name: /add list|new list|\+ list/i }).click();
    await page.getByPlaceholder(/list name/i).fill('To Do');
    await page.getByRole('button', { name: /^add$|^create$/i }).click();

    await expect(page.getByText('To Do')).toBeVisible();

    // Add a second list
    await page.getByRole('button', { name: /add list|new list|\+ list/i }).click();
    await page.getByPlaceholder(/list name/i).fill('In Progress');
    await page.getByRole('button', { name: /^add$|^create$/i }).click();

    await expect(page.getByText('In Progress')).toBeVisible();
  });

  test('creates a task in a list and it persists after reload', async ({ page }) => {
    // Create board
    await page.getByRole('button', { name: /new board|create board|\+ board/i }).click();
    await page.getByPlaceholder(/board name/i).fill('Task Persist Board');
    await page.getByRole('button', { name: /^create$/i }).click();
    await page.waitForURL(/\/boards\/.+/);
    const boardUrl = page.url();

    // Add a list
    await page.getByRole('button', { name: /add list|new list|\+ list/i }).click();
    await page.getByPlaceholder(/list name/i).fill('Backlog');
    await page.getByRole('button', { name: /^add$|^create$/i }).click();
    await expect(page.getByText('Backlog')).toBeVisible();

    // Add a task
    await page.getByRole('button', { name: /add (a )?task|new task|\+ (a )?task/i }).first().click();
    await page.getByLabel(/title/i).fill('My First Task');
    await page.getByRole('button', { name: /create task/i }).click();

    await expect(page.getByText('My First Task')).toBeVisible();

    // Reload and verify persistence
    await page.goto(boardUrl);
    await expect(page.getByText('My First Task')).toBeVisible();
  });

  test('deletes a task', async ({ page }) => {
    // Create board + list + task
    await page.getByRole('button', { name: /new board|create board|\+ board/i }).click();
    await page.getByPlaceholder(/board name/i).fill('Delete Task Board');
    await page.getByRole('button', { name: /^create$/i }).click();
    await page.waitForURL(/\/boards\/.+/);

    await page.getByRole('button', { name: /add list|new list|\+ list/i }).click();
    await page.getByPlaceholder(/list name/i).fill('Todo');
    await page.getByRole('button', { name: /^add$|^create$/i }).click();

    await page.getByRole('button', { name: /add (a )?task|new task|\+ (a )?task/i }).first().click();
    await page.getByLabel(/title/i).fill('Task To Delete');
    await page.getByRole('button', { name: /create task/i }).click();
    await expect(page.getByText('Task To Delete')).toBeVisible();

    // Open task modal and delete
    await page.getByText('Task To Delete').click();
    await page.getByRole('button', { name: /delete/i }).click();
    await page.getByRole('button', { name: /yes.*delete|confirm/i }).click();

    await expect(page.getByText('Task To Delete')).not.toBeVisible();
  });
});
