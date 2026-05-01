/**
 * E2E test helpers — shared utilities for Playwright tests.
 */

let userCounter = Date.now();

/**
 * Generate a unique test user to avoid conflicts between test runs.
 */
export function uniqueUser() {
  userCounter++;
  return {
    email: `testuser_${userCounter}@e2e.test`,
    password: 'TestPass123!',
    displayName: `Test User ${userCounter}`,
  };
}

/**
 * Register and log in a user, returning the page ready for use.
 */
export async function registerAndLogin(page, user) {
  await page.goto('/register');
  await page.getByLabel(/display name/i).fill(user.displayName);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /register/i }).click();
  // After registration, should land on boards page
  await page.waitForURL('**/boards');
}

/**
 * Log in an existing user.
 */
export async function login(page, user) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /log in|login|sign in/i }).click();
  await page.waitForURL('**/boards');
}

/**
 * Create a board and return its name.
 */
export async function createBoard(page, name) {
  await page.goto('/boards');
  await page.getByRole('button', { name: /new board|create board|\+ board/i }).click();
  await page.getByPlaceholder(/board name/i).fill(name);
  await page.getByRole('button', { name: /create/i }).click();
  // Wait for the board to appear
  await page.waitForURL(/\/boards\/.+/);
}
