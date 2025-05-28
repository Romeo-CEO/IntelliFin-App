import { test, expect } from '../fixtures/auth-fixtures';

test.describe('Email Verification Flow E2E Tests', () => {
  test('should display verification pending page after registration', async ({ page, pageHelper, testUser, apiHelper }) => {
    // Register a new user
    await page.goto('/auth/register');
    await pageHelper.fillRegistrationForm(testUser);
    await page.click('[data-testid="submit-button"]');

    // Should redirect to verification page
    await pageHelper.waitForNavigation('/auth/verify-email');

    // Verify page content
    await expect(page.locator('h1')).toContainText('Verify Your Email');
    await expect(page.locator('[data-testid="verification-message"]')).toContainText('check your email');
    await expect(page.locator('[data-testid="verification-message"]')).toContainText(testUser.email);

    // Verify resend button is present
    await expect(page.locator('[data-testid="resend-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-to-login"]')).toBeVisible();
  });

  test('should successfully verify email with valid token', async ({ page, pageHelper, testUser, apiHelper }) => {
    // Register user first
    const registerResponse = await apiHelper.registerUser(testUser);
    expect(registerResponse.success).toBe(true);

    // Simulate clicking verification link from email
    const mockToken = 'valid-verification-token-123';
    
    // Mock the verification API to succeed
    await page.route('**/api/v1/auth/verify-email', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Email verified successfully'
        })
      });
    });

    // Navigate to verification URL with token
    await page.goto(`/auth/verify-email?token=${mockToken}`);

    // Should show success message
    await pageHelper.waitForToast('Email verified successfully');

    // Should redirect to login page
    await pageHelper.waitForNavigation('/auth/login');

    // Verify success message on login page
    await expect(page.locator('[data-testid="success-message"]')).toContainText('verified');
  });

  test('should handle invalid verification token', async ({ page, pageHelper }) => {
    // Mock the verification API to fail
    await page.route('**/api/v1/auth/verify-email', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Invalid or expired verification token'
        })
      });
    });

    // Navigate to verification URL with invalid token
    await page.goto('/auth/verify-email?token=invalid-token');

    // Should show error message
    await pageHelper.waitForToast('Invalid or expired verification token');

    // Should display error state
    await expect(page.locator('[data-testid="error-message"]')).toContainText('verification failed');
    await expect(page.locator('[data-testid="resend-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-to-login"]')).toBeVisible();
  });

  test('should handle expired verification token', async ({ page, pageHelper }) => {
    // Mock the verification API to return expired token error
    await page.route('**/api/v1/auth/verify-email', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Verification token has expired'
        })
      });
    });

    // Navigate to verification URL with expired token
    await page.goto('/auth/verify-email?token=expired-token');

    // Should show specific expired token message
    await pageHelper.waitForToast('Verification token has expired');

    // Should suggest resending verification email
    await expect(page.locator('[data-testid="error-message"]')).toContainText('expired');
    await expect(page.locator('[data-testid="resend-button"]')).toBeVisible();
  });

  test('should resend verification email', async ({ page, pageHelper, testUser, apiHelper }) => {
    // Register user first
    await apiHelper.registerUser(testUser);

    // Navigate to verification page
    await page.goto('/auth/verify-email');

    // Mock resend verification API
    await page.route('**/api/v1/auth/resend-verification', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Verification email sent'
        })
      });
    });

    // Click resend button
    await page.click('[data-testid="resend-button"]');

    // Should show success message
    await pageHelper.waitForToast('Verification email sent');

    // Button should be disabled temporarily
    await expect(page.locator('[data-testid="resend-button"]')).toBeDisabled();

    // Wait for cooldown period (should re-enable after a few seconds)
    await page.waitForTimeout(3000);
    await expect(page.locator('[data-testid="resend-button"]')).toBeEnabled();
  });

  test('should handle resend verification email errors', async ({ page, pageHelper }) => {
    // Navigate to verification page
    await page.goto('/auth/verify-email');

    // Mock resend verification API to fail
    await page.route('**/api/v1/auth/resend-verification', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Failed to send verification email'
        })
      });
    });

    // Click resend button
    await page.click('[data-testid="resend-button"]');

    // Should show error message
    await pageHelper.waitForToast('Failed to send verification email');

    // Button should remain enabled for retry
    await expect(page.locator('[data-testid="resend-button"]')).toBeEnabled();
  });

  test('should navigate back to login page', async ({ page, pageHelper }) => {
    // Navigate to verification page
    await page.goto('/auth/verify-email');

    // Click back to login link
    await page.click('[data-testid="back-to-login"]');

    // Should navigate to login page
    await pageHelper.waitForNavigation('/auth/login');
    await expect(page.locator('h1')).toContainText('Sign In');
  });

  test('should handle missing token parameter', async ({ page, pageHelper }) => {
    // Navigate to verification page without token
    await page.goto('/auth/verify-email');

    // Should show pending verification state
    await expect(page.locator('[data-testid="verification-message"]')).toContainText('check your email');
    await expect(page.locator('[data-testid="resend-button"]')).toBeVisible();
  });

  test('should handle network errors during verification', async ({ page, pageHelper }) => {
    // Mock network error
    await page.route('**/api/v1/auth/verify-email', route => {
      route.abort('failed');
    });

    // Navigate to verification URL with token
    await page.goto('/auth/verify-email?token=some-token');

    // Should show network error message
    await pageHelper.waitForToast('Network error');

    // Should display error state with retry option
    await expect(page.locator('[data-testid="error-message"]')).toContainText('network');
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should auto-verify when token is in URL', async ({ page, pageHelper }) => {
    // Mock successful verification
    await page.route('**/api/v1/auth/verify-email', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Email verified successfully'
        })
      });
    });

    // Navigate with token - should auto-trigger verification
    await page.goto('/auth/verify-email?token=auto-verify-token');

    // Should automatically attempt verification
    await pageHelper.waitForToast('Email verified successfully');

    // Should redirect to login
    await pageHelper.waitForNavigation('/auth/login');
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to verification page
    await page.goto('/auth/verify-email');

    // Verify all elements are visible and properly sized
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="verification-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="resend-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-to-login"]')).toBeVisible();

    // Verify buttons are properly sized for mobile
    const resendButton = page.locator('[data-testid="resend-button"]');
    const buttonBox = await resendButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThan(40); // Minimum touch target size
  });
});
