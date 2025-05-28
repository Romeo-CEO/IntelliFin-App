import { test, expect, authenticatedTest } from '../fixtures/auth-fixtures';

test.describe('Protected Routes E2E Tests', () => {
  test('should redirect unauthenticated users to login', async ({ page, pageHelper }) => {
    // Clear any existing authentication
    await pageHelper.clearAuth();

    // Try to access protected dashboard route
    await page.goto('/dashboard');

    // Should redirect to login page
    await pageHelper.waitForNavigation('/auth/login');

    // Verify redirect message
    await expect(page.locator('[data-testid="redirect-message"]')).toContainText('Please sign in');
  });

  test('should redirect unauthenticated users from nested protected routes', async ({ page, pageHelper }) => {
    // Clear any existing authentication
    await pageHelper.clearAuth();

    // Try to access nested protected routes
    const protectedRoutes = [
      '/dashboard/transactions',
      '/dashboard/accounts',
      '/dashboard/reports',
      '/dashboard/settings',
      '/dashboard/profile',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await pageHelper.waitForNavigation('/auth/login');
      
      // Verify we're on login page
      await expect(page.locator('h1')).toContainText('Sign In');
    }
  });

  authenticatedTest('should allow authenticated users to access dashboard', async ({ page, pageHelper, authenticatedUser }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Should successfully load dashboard
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(authenticatedUser.firstName);

    // Verify navigation menu is present
    await expect(page.locator('[data-testid="nav-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  authenticatedTest('should allow access to all protected routes when authenticated', async ({ page, pageHelper }) => {
    const protectedRoutes = [
      { path: '/dashboard', title: 'Dashboard' },
      { path: '/dashboard/transactions', title: 'Transactions' },
      { path: '/dashboard/accounts', title: 'Accounts' },
      { path: '/dashboard/reports', title: 'Reports' },
      { path: '/dashboard/settings', title: 'Settings' },
      { path: '/dashboard/profile', title: 'Profile' },
    ];

    for (const route of protectedRoutes) {
      await page.goto(route.path);
      
      // Should successfully load the page
      await expect(page.locator('h1')).toContainText(route.title);
      
      // Verify user is still authenticated
      const isAuthenticated = await pageHelper.isAuthenticated();
      expect(isAuthenticated).toBe(true);
    }
  });

  authenticatedTest('should handle token expiration gracefully', async ({ page, pageHelper, apiHelper }) => {
    // Navigate to dashboard first
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Mock expired token response
    await page.route('**/api/v1/auth/me', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Token expired'
        })
      });
    });

    // Try to access a protected route
    await page.goto('/dashboard/transactions');

    // Should redirect to login due to expired token
    await pageHelper.waitForNavigation('/auth/login');
    await expect(page.locator('[data-testid="session-expired-message"]')).toContainText('session expired');
  });

  authenticatedTest('should automatically refresh tokens when needed', async ({ page, pageHelper, apiHelper }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Mock access token as expired but refresh token as valid
    await page.route('**/api/v1/auth/me', (route, request) => {
      const authHeader = request.headers()['authorization'];
      if (authHeader?.includes('expired-access-token')) {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Token expired'
          })
        });
      } else {
        route.continue();
      }
    });

    // Mock successful token refresh
    await page.route('**/api/v1/auth/refresh', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          }
        })
      });
    });

    // Simulate expired access token
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'expired-access-token');
    });

    // Try to access protected content
    await page.goto('/dashboard/transactions');

    // Should automatically refresh token and load page
    await expect(page.locator('h1')).toContainText('Transactions');

    // Verify new tokens are stored
    const tokens = await pageHelper.getStoredTokens();
    expect(tokens?.accessToken).toBe('new-access-token');
    expect(tokens?.refreshToken).toBe('new-refresh-token');
  });

  authenticatedTest('should handle refresh token failure', async ({ page, pageHelper }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Mock both access token and refresh token as expired
    await page.route('**/api/v1/auth/me', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Token expired'
        })
      });
    });

    await page.route('**/api/v1/auth/refresh', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Refresh token expired'
        })
      });
    });

    // Try to access protected content
    await page.goto('/dashboard/transactions');

    // Should redirect to login
    await pageHelper.waitForNavigation('/auth/login');
    await expect(page.locator('[data-testid="session-expired-message"]')).toContainText('session expired');

    // Verify tokens are cleared
    const tokens = await pageHelper.getStoredTokens();
    expect(tokens).toBeNull();
  });

  authenticatedTest('should maintain authentication across page refreshes', async ({ page, pageHelper }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Refresh the page
    await page.reload();

    // Should still be authenticated and on dashboard
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Verify authentication state is maintained
    const isAuthenticated = await pageHelper.isAuthenticated();
    expect(isAuthenticated).toBe(true);
  });

  authenticatedTest('should handle logout correctly', async ({ page, pageHelper }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Click logout button
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Should redirect to login page
    await pageHelper.waitForNavigation('/auth/login');

    // Verify tokens are cleared
    const tokens = await pageHelper.getStoredTokens();
    expect(tokens).toBeNull();

    // Verify logout message
    await pageHelper.waitForToast('Logged out successfully');

    // Try to access protected route after logout
    await page.goto('/dashboard');
    await pageHelper.waitForNavigation('/auth/login');
  });

  authenticatedTest('should handle concurrent requests with token refresh', async ({ page, pageHelper }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Mock multiple API calls that would trigger token refresh
    let refreshCallCount = 0;
    await page.route('**/api/v1/auth/refresh', route => {
      refreshCallCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          tokens: {
            accessToken: `new-access-token-${refreshCallCount}`,
            refreshToken: `new-refresh-token-${refreshCallCount}`
          }
        })
      });
    });

    // Simulate expired token
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'expired-token');
    });

    // Make multiple concurrent requests to protected routes
    await Promise.all([
      page.goto('/dashboard/transactions'),
      page.goto('/dashboard/accounts'),
      page.goto('/dashboard/reports'),
    ]);

    // Should only refresh token once despite multiple requests
    expect(refreshCallCount).toBe(1);

    // Should successfully load the last requested page
    await expect(page.locator('h1')).toContainText('Reports');
  });

  authenticatedTest('should handle network errors on protected routes', async ({ page, pageHelper }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Mock network error for API calls
    await page.route('**/api/v1/**', route => {
      route.abort('failed');
    });

    // Try to navigate to a protected route that requires API data
    await page.goto('/dashboard/transactions');

    // Should show error message but remain authenticated
    await expect(page.locator('[data-testid="error-message"]')).toContainText('network error');
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // User should still be authenticated
    const isAuthenticated = await pageHelper.isAuthenticated();
    expect(isAuthenticated).toBe(true);
  });

  authenticatedTest('should handle role-based access control', async ({ page, pageHelper, authenticatedUser }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Try to access admin-only route (if user is not admin)
    await page.goto('/dashboard/admin');

    if (authenticatedUser.email.includes('admin')) {
      // Admin user should have access
      await expect(page.locator('h1')).toContainText('Admin');
    } else {
      // Regular user should be redirected or see access denied
      await expect(page.locator('[data-testid="access-denied"]')).toContainText('Access denied');
    }
  });

  authenticatedTest('should be responsive on mobile devices', async ({ page, pageHelper }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Verify mobile navigation works
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();

    // Navigate to different sections via mobile menu
    await page.click('[data-testid="mobile-nav-transactions"]');
    await expect(page.locator('h1')).toContainText('Transactions');

    // Verify user menu works on mobile
    await page.click('[data-testid="mobile-user-menu"]');
    await expect(page.locator('[data-testid="mobile-logout-button"]')).toBeVisible();
  });
});
