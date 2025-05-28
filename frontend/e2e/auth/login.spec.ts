import { test, expect } from '../fixtures/auth-fixtures';

test.describe('Login Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');
  });

  test('should display login form correctly', async ({ page }) => {
    // Verify page title and heading
    await expect(page).toHaveTitle(/Sign In.*IntelliFin/);
    await expect(page.locator('h1')).toContainText('Sign In');

    // Verify all form fields are present
    await expect(page.locator('[data-testid="email"]')).toBeVisible();
    await expect(page.locator('[data-testid="password"]')).toBeVisible();
    await expect(page.locator('[data-testid="remember-me"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-button"]')).toBeVisible();

    // Verify links
    await expect(page.locator('[data-testid="register-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="forgot-password-link"]')).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page, pageHelper, verifiedUser, apiHelper }) => {
    // Fill login form
    await pageHelper.fillLoginForm(verifiedUser.email, verifiedUser.password);

    // Submit form
    await page.click('[data-testid="submit-button"]');

    // Wait for success message
    await pageHelper.waitForToast('Login successful');

    // Verify redirect to dashboard
    await pageHelper.waitForNavigation('/dashboard');

    // Verify user is authenticated
    const isAuthenticated = await pageHelper.isAuthenticated();
    expect(isAuthenticated).toBe(true);

    // Verify tokens are stored
    const tokens = await pageHelper.getStoredTokens();
    expect(tokens).not.toBeNull();
    expect(tokens?.accessToken).toBeTruthy();
    expect(tokens?.refreshToken).toBeTruthy();

    // Verify user data is stored
    const userData = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('user') || '{}');
    });
    expect(userData.email).toBe(verifiedUser.email);
  });

  test('should handle invalid credentials', async ({ page, pageHelper, testUser }) => {
    // Try to login with non-existent user
    await pageHelper.fillLoginForm(testUser.email, testUser.password);
    await page.click('[data-testid="submit-button"]');

    // Should show error message
    await pageHelper.waitForToast('Invalid credentials');

    // Should remain on login page
    expect(page.url()).toContain('/auth/login');

    // Should not be authenticated
    const isAuthenticated = await pageHelper.isAuthenticated();
    expect(isAuthenticated).toBe(false);
  });

  test('should handle wrong password', async ({ page, pageHelper, verifiedUser }) => {
    // Try to login with wrong password
    await pageHelper.fillLoginForm(verifiedUser.email, 'WrongPassword123!');
    await page.click('[data-testid="submit-button"]');

    // Should show error message
    await pageHelper.waitForToast('Invalid credentials');

    // Should remain on login page
    expect(page.url()).toContain('/auth/login');

    // Should not be authenticated
    const isAuthenticated = await pageHelper.isAuthenticated();
    expect(isAuthenticated).toBe(false);
  });

  test('should handle unverified user login attempt', async ({ page, pageHelper, testUser, apiHelper }) => {
    // Register user but don't verify email
    await apiHelper.registerUser(testUser);

    // Try to login
    await pageHelper.fillLoginForm(testUser.email, testUser.password);
    await page.click('[data-testid="submit-button"]');

    // Should show verification required message
    await pageHelper.waitForToast('Please verify your email');

    // Should redirect to verification page
    await pageHelper.waitForNavigation('/auth/verify-email');
  });

  test('should validate form fields', async ({ page, pageHelper }) => {
    // Test empty form submission
    await page.click('[data-testid="submit-button"]');

    // Check for validation errors
    await pageHelper.checkValidationError('email', 'Email is required');
    await pageHelper.checkValidationError('password', 'Password is required');

    // Test invalid email format
    await page.fill('[data-testid="email"]', 'invalid-email');
    await page.click('[data-testid="submit-button"]');
    await pageHelper.checkValidationError('email', 'Invalid email format');

    // Test valid email but empty password
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', '');
    await page.click('[data-testid="submit-button"]');
    await pageHelper.checkValidationError('password', 'Password is required');
  });

  test('should handle remember me functionality', async ({ page, pageHelper, verifiedUser }) => {
    // Login with remember me checked
    await pageHelper.fillLoginForm(verifiedUser.email, verifiedUser.password);
    await page.check('[data-testid="remember-me"]');
    await page.click('[data-testid="submit-button"]');

    // Wait for successful login
    await pageHelper.waitForNavigation('/dashboard');

    // Verify remember me preference is stored
    const rememberMe = await page.evaluate(() => {
      return localStorage.getItem('rememberMe') === 'true';
    });
    expect(rememberMe).toBe(true);

    // Verify longer token expiration (this would be validated by checking token payload)
    const tokens = await pageHelper.getStoredTokens();
    expect(tokens).not.toBeNull();
  });

  test('should navigate to registration page', async ({ page, pageHelper }) => {
    // Click register link
    await page.click('[data-testid="register-link"]');

    // Verify navigation to registration page
    await pageHelper.waitForNavigation('/auth/register');
    await expect(page.locator('h1')).toContainText('Create Account');
  });

  test('should navigate to forgot password page', async ({ page, pageHelper }) => {
    // Click forgot password link
    await page.click('[data-testid="forgot-password-link"]');

    // Verify navigation to forgot password page
    await pageHelper.waitForNavigation('/auth/forgot-password');
    await expect(page.locator('h1')).toContainText('Reset Password');
  });

  test('should handle network errors gracefully', async ({ page, pageHelper, verifiedUser }) => {
    // Intercept login API call and make it fail
    await page.route('**/api/v1/auth/login', route => {
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
    await pageHelper.fillLoginForm(verifiedUser.email, verifiedUser.password);
    await page.click('[data-testid="submit-button"]');

    // Should show error message
    await pageHelper.waitForToast('Login failed');

    // Should remain on login page
    expect(page.url()).toContain('/auth/login');

    // Should not be authenticated
    const isAuthenticated = await pageHelper.isAuthenticated();
    expect(isAuthenticated).toBe(false);
  });

  test('should show loading state during login', async ({ page, pageHelper, verifiedUser }) => {
    // Intercept login API to add delay
    await page.route('**/api/v1/auth/login', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.continue();
    });

    // Fill and submit form
    await pageHelper.fillLoginForm(verifiedUser.email, verifiedUser.password);
    await page.click('[data-testid="submit-button"]');

    // Verify loading state
    await expect(page.locator('[data-testid="submit-button"]')).toBeDisabled();
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // Wait for login to complete
    await pageHelper.waitForNavigation('/dashboard');
  });

  test('should handle rate limiting', async ({ page, pageHelper, verifiedUser }) => {
    // Mock rate limiting response
    await page.route('**/api/v1/auth/login', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Too many login attempts. Please try again later.'
        })
      });
    });

    // Try to login
    await pageHelper.fillLoginForm(verifiedUser.email, verifiedUser.password);
    await page.click('[data-testid="submit-button"]');

    // Should show rate limiting message
    await pageHelper.waitForToast('Too many login attempts');

    // Submit button should be disabled temporarily
    await expect(page.locator('[data-testid="submit-button"]')).toBeDisabled();
  });

  test('should redirect authenticated users away from login page', async ({ page, pageHelper, verifiedUser, apiHelper }) => {
    // Login user first
    const loginResponse = await apiHelper.loginUser(verifiedUser.email, verifiedUser.password);
    await pageHelper.setAuth(loginResponse.tokens, loginResponse.user);

    // Try to navigate to login page
    await page.goto('/auth/login');

    // Should redirect to dashboard
    await pageHelper.waitForNavigation('/dashboard');
  });

  test('should be responsive on mobile devices', async ({ page, pageHelper, verifiedUser }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify form is still usable on mobile
    await expect(page.locator('[data-testid="email"]')).toBeVisible();
    await expect(page.locator('[data-testid="password"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-button"]')).toBeVisible();

    // Verify form can be filled and submitted on mobile
    await pageHelper.fillLoginForm(verifiedUser.email, verifiedUser.password);
    await page.click('[data-testid="submit-button"]');

    // Should successfully login
    await pageHelper.waitForNavigation('/dashboard');

    // Verify mobile navigation works
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page, pageHelper, verifiedUser }) => {
    // Navigate using Tab key
    await page.keyboard.press('Tab'); // Focus email field
    await expect(page.locator('[data-testid="email"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Focus password field
    await expect(page.locator('[data-testid="password"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Focus remember me checkbox
    await expect(page.locator('[data-testid="remember-me"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Focus submit button
    await expect(page.locator('[data-testid="submit-button"]')).toBeFocused();

    // Fill form using keyboard
    await page.focus('[data-testid="email"]');
    await page.keyboard.type(verifiedUser.email);
    await page.keyboard.press('Tab');
    await page.keyboard.type(verifiedUser.password);

    // Submit using Enter key
    await page.keyboard.press('Enter');

    // Should successfully login
    await pageHelper.waitForNavigation('/dashboard');
  });
});
