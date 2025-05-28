import { test, expect } from '../fixtures/auth-fixtures';

test.describe('Error Handling E2E Tests', () => {
  test.describe('Network Error Scenarios', () => {
    test('should handle complete network failure during registration', async ({ page, pageHelper, testUser }) => {
      await page.goto('/auth/register');

      // Simulate complete network failure
      await page.route('**/*', route => {
        route.abort('failed');
      });

      // Fill and submit registration form
      await pageHelper.fillRegistrationForm(testUser);
      await page.click('[data-testid="submit-button"]');

      // Should show network error message
      await pageHelper.waitForToast('Network error');
      await expect(page.locator('[data-testid="error-message"]')).toContainText('connection');

      // Should show retry button
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should handle network timeout during login', async ({ page, pageHelper, verifiedUser }) => {
      await page.goto('/auth/login');

      // Simulate network timeout
      await page.route('**/api/v1/auth/login', route => {
        // Never resolve the request to simulate timeout
        // In real scenarios, this would timeout after the configured timeout period
      });

      // Fill and submit login form
      await pageHelper.fillLoginForm(verifiedUser.email, verifiedUser.password);
      await page.click('[data-testid="submit-button"]');

      // Should show loading state initially
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

      // After timeout, should show error message
      await pageHelper.waitForToast('Request timeout', 30000);
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should handle intermittent network issues with retry', async ({ page, pageHelper, testUser }) => {
      await page.goto('/auth/register');

      let attemptCount = 0;
      await page.route('**/api/v1/auth/register', route => {
        attemptCount++;
        if (attemptCount < 3) {
          // Fail first two attempts
          route.abort('failed');
        } else {
          // Succeed on third attempt
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Registration successful'
            })
          });
        }
      });

      // Fill and submit form
      await pageHelper.fillRegistrationForm(testUser);
      await page.click('[data-testid="submit-button"]');

      // Should show error first
      await pageHelper.waitForToast('Network error');

      // Click retry button
      await page.click('[data-testid="retry-button"]');

      // Should show error again
      await pageHelper.waitForToast('Network error');

      // Click retry button again
      await page.click('[data-testid="retry-button"]');

      // Should succeed on third attempt
      await pageHelper.waitForToast('Registration successful');
    });
  });

  test.describe('Server Error Scenarios', () => {
    test('should handle 500 internal server error', async ({ page, pageHelper, testUser }) => {
      await page.goto('/auth/register');

      // Mock 500 error
      await page.route('**/api/v1/auth/register', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Internal server error'
          })
        });
      });

      // Fill and submit form
      await pageHelper.fillRegistrationForm(testUser);
      await page.click('[data-testid="submit-button"]');

      // Should show server error message
      await pageHelper.waitForToast('Server error');
      await expect(page.locator('[data-testid="error-message"]')).toContainText('server');
    });

    test('should handle 503 service unavailable', async ({ page, pageHelper, verifiedUser }) => {
      await page.goto('/auth/login');

      // Mock 503 error
      await page.route('**/api/v1/auth/login', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Service temporarily unavailable'
          })
        });
      });

      // Fill and submit form
      await pageHelper.fillLoginForm(verifiedUser.email, verifiedUser.password);
      await page.click('[data-testid="submit-button"]');

      // Should show service unavailable message
      await pageHelper.waitForToast('Service unavailable');
      await expect(page.locator('[data-testid="error-message"]')).toContainText('temporarily unavailable');
    });

    test('should handle malformed server response', async ({ page, pageHelper, testUser }) => {
      await page.goto('/auth/register');

      // Mock malformed response
      await page.route('**/api/v1/auth/register', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json response'
        });
      });

      // Fill and submit form
      await pageHelper.fillRegistrationForm(testUser);
      await page.click('[data-testid="submit-button"]');

      // Should show parsing error message
      await pageHelper.waitForToast('Invalid response');
      await expect(page.locator('[data-testid="error-message"]')).toContainText('response');
    });
  });

  test.describe('Form Validation Error Display', () => {
    test('should display multiple validation errors simultaneously', async ({ page, pageHelper }) => {
      await page.goto('/auth/register');

      // Submit empty form
      await page.click('[data-testid="submit-button"]');

      // Should show all validation errors
      await pageHelper.checkValidationError('firstName', 'First name is required');
      await pageHelper.checkValidationError('lastName', 'Last name is required');
      await pageHelper.checkValidationError('email', 'Email is required');
      await pageHelper.checkValidationError('password', 'Password is required');

      // Verify all errors are visible simultaneously
      await expect(page.locator('[data-testid="firstName-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="lastName-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    });

    test('should clear validation errors when fields are corrected', async ({ page, pageHelper }) => {
      await page.goto('/auth/register');

      // Submit empty form to trigger errors
      await page.click('[data-testid="submit-button"]');
      await pageHelper.checkValidationError('email', 'Email is required');

      // Fix the email field
      await page.fill('[data-testid="email"]', 'valid@example.com');
      await page.blur('[data-testid="email"]');

      // Email error should disappear
      await expect(page.locator('[data-testid="email-error"]')).not.toBeVisible();

      // Other errors should still be visible
      await expect(page.locator('[data-testid="firstName-error"]')).toBeVisible();
    });

    test('should show server-side validation errors', async ({ page, pageHelper, testUser }) => {
      await page.goto('/auth/register');

      // Mock server validation error
      await page.route('**/api/v1/auth/register', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Validation failed',
            errors: {
              email: 'Email domain not allowed',
              password: 'Password too common'
            }
          })
        });
      });

      // Fill and submit form
      await pageHelper.fillRegistrationForm(testUser);
      await page.click('[data-testid="submit-button"]');

      // Should show server validation errors
      await pageHelper.checkValidationError('email', 'Email domain not allowed');
      await pageHelper.checkValidationError('password', 'Password too common');
    });
  });

  test.describe('User-Friendly Error Messages', () => {
    test('should show user-friendly messages for technical errors', async ({ page, pageHelper, testUser }) => {
      await page.goto('/auth/register');

      // Mock various technical errors and verify user-friendly messages
      const errorScenarios = [
        {
          status: 400,
          serverMessage: 'Bad Request',
          expectedUserMessage: 'Invalid request'
        },
        {
          status: 401,
          serverMessage: 'Unauthorized',
          expectedUserMessage: 'Authentication failed'
        },
        {
          status: 403,
          serverMessage: 'Forbidden',
          expectedUserMessage: 'Access denied'
        },
        {
          status: 404,
          serverMessage: 'Not Found',
          expectedUserMessage: 'Service not found'
        },
        {
          status: 429,
          serverMessage: 'Too Many Requests',
          expectedUserMessage: 'Too many attempts'
        }
      ];

      for (const scenario of errorScenarios) {
        await page.route('**/api/v1/auth/register', route => {
          route.fulfill({
            status: scenario.status,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: scenario.serverMessage
            })
          });
        });

        await pageHelper.fillRegistrationForm(testUser);
        await page.click('[data-testid="submit-button"]');

        // Should show user-friendly message
        await pageHelper.waitForToast(scenario.expectedUserMessage);

        // Reset form for next test
        await page.reload();
      }
    });

    test('should provide helpful error recovery suggestions', async ({ page, pageHelper, testUser }) => {
      await page.goto('/auth/login');

      // Mock account locked error
      await page.route('**/api/v1/auth/login', route => {
        route.fulfill({
          status: 423,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Account temporarily locked due to too many failed attempts'
          })
        });
      });

      await pageHelper.fillLoginForm(testUser.email, testUser.password);
      await page.click('[data-testid="submit-button"]');

      // Should show helpful recovery message
      await pageHelper.waitForToast('Account locked');
      await expect(page.locator('[data-testid="recovery-suggestion"]')).toContainText('try again in');
      await expect(page.locator('[data-testid="contact-support-link"]')).toBeVisible();
    });
  });

  test.describe('Error State Recovery', () => {
    test('should allow users to recover from errors', async ({ page, pageHelper, testUser }) => {
      await page.goto('/auth/register');

      // First, simulate an error
      await page.route('**/api/v1/auth/register', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Server error'
          })
        });
      });

      await pageHelper.fillRegistrationForm(testUser);
      await page.click('[data-testid="submit-button"]');
      await pageHelper.waitForToast('Server error');

      // Now fix the server and retry
      await page.route('**/api/v1/auth/register', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Registration successful'
          })
        });
      });

      // Click retry button
      await page.click('[data-testid="retry-button"]');

      // Should succeed
      await pageHelper.waitForToast('Registration successful');
    });

    test('should maintain form data during error recovery', async ({ page, pageHelper, testUser }) => {
      await page.goto('/auth/register');

      // Fill form
      await pageHelper.fillRegistrationForm(testUser);

      // Simulate error
      await page.route('**/api/v1/auth/register', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Server error'
          })
        });
      });

      await page.click('[data-testid="submit-button"]');
      await pageHelper.waitForToast('Server error');

      // Verify form data is preserved
      await expect(page.locator('[data-testid="firstName"]')).toHaveValue(testUser.firstName);
      await expect(page.locator('[data-testid="lastName"]')).toHaveValue(testUser.lastName);
      await expect(page.locator('[data-testid="email"]')).toHaveValue(testUser.email);
      // Password fields should be cleared for security
      await expect(page.locator('[data-testid="password"]')).toHaveValue('');
      await expect(page.locator('[data-testid="confirmPassword"]')).toHaveValue('');
    });
  });

  test.describe('Accessibility in Error States', () => {
    test('should announce errors to screen readers', async ({ page, pageHelper }) => {
      await page.goto('/auth/register');

      // Submit empty form
      await page.click('[data-testid="submit-button"]');

      // Verify error messages have proper ARIA attributes
      await expect(page.locator('[data-testid="firstName-error"]')).toHaveAttribute('role', 'alert');
      await expect(page.locator('[data-testid="email-error"]')).toHaveAttribute('aria-live', 'polite');

      // Verify form fields are properly associated with errors
      await expect(page.locator('[data-testid="firstName"]')).toHaveAttribute('aria-describedby', 'firstName-error');
      await expect(page.locator('[data-testid="firstName"]')).toHaveAttribute('aria-invalid', 'true');
    });

    test('should maintain keyboard navigation in error states', async ({ page, pageHelper }) => {
      await page.goto('/auth/register');

      // Submit empty form to trigger errors
      await page.click('[data-testid="submit-button"]');

      // Verify keyboard navigation still works
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="firstName"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="lastName"]')).toBeFocused();

      // Verify error messages are keyboard accessible
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="retry-button"]')).toBeFocused();
    });
  });
});
