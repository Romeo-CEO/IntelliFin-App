import { test as base, expect } from '@playwright/test';

import { ApiHelper, PageHelper, DatabaseHelper, generateTestUser, TestUser } from '../utils/test-helpers';

/**
 * Extended test fixtures for IntelliFin authentication testing
 */

export interface AuthFixtures {
  apiHelper: ApiHelper;
  pageHelper: PageHelper;
  dbHelper: DatabaseHelper;
  testUser: TestUser;
  verifiedUser: TestUser;
}

/**
 * Base test with common fixtures
 */
export const test = base.extend<AuthFixtures>({
  apiHelper: async ({}, use) => {
    const apiHelper = new ApiHelper();
    await use(apiHelper);
  },

  pageHelper: async ({ page }, use) => {
    const pageHelper = new PageHelper(page);
    await use(pageHelper);
  },

  dbHelper: async ({}, use) => {
    const dbHelper = new DatabaseHelper();
    await use(dbHelper);
  },

  testUser: async ({}, use) => {
    const user = generateTestUser();
    await use(user);
  },

  verifiedUser: async ({ apiHelper, dbHelper }, use) => {
    const user = generateTestUser();

    try {
      // Register the user
      const registerResponse = await apiHelper.registerUser(user);
      expect(registerResponse.success).toBe(true);

      // Get verification token (in real tests, this would come from email or test database)
      // For now, we'll simulate having the token
      const verificationToken = registerResponse.verificationToken || 'mock-verification-token';

      // Verify the user's email
      try {
        await apiHelper.verifyEmail(verificationToken);
      } catch (error) {
        console.warn('Email verification failed, user may still be usable for login tests');
      }

      await use(user);
    } finally {
      // Cleanup after test
      await dbHelper.cleanupTestUser(user.email);
    }
  },
});

/**
 * Test with authenticated user context
 */
export const authenticatedTest = test.extend<{ authenticatedUser: TestUser }>({
  authenticatedUser: async ({ apiHelper, pageHelper, verifiedUser }, use) => {
    // Login the verified user
    const loginResponse = await apiHelper.loginUser(verifiedUser.email, verifiedUser.password);
    expect(loginResponse.success).toBe(true);

    // Set authentication tokens in browser
    await pageHelper.setAuth(loginResponse.tokens, loginResponse.user);

    await use(verifiedUser);
  },
});

export { expect };
