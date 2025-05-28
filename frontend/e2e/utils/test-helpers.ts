import { Page, expect } from '@playwright/test';

/**
 * Test utilities for IntelliFin E2E tests
 */

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate a unique test user for each test
 */
export function generateTestUser(): TestUser {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    email: `e2e.test.${timestamp}.${random}@intellifin.test`,
    password: 'SecureTestPass123!',
    firstName: 'E2E',
    lastName: `Test${timestamp}`,
  };
}

/**
 * API helper for backend operations
 */
export class ApiHelper {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001/api/v1') {
    this.baseUrl = baseUrl;
  }

  async registerUser(user: TestUser): Promise<any> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId || '4399f439-5da7-413a-bf9f-35b2415f497b', // Add required tenantId (same as frontend)
      }),
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.status} ${await response.text()}`);
    }

    return response.json();
  }

  async verifyEmail(token: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error(`Email verification failed: ${response.status} ${await response.text()}`);
    }

    return response.json();
  }

  async loginUser(email: string, password: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${await response.text()}`);
    }

    return response.json();
  }

  async getProfile(accessToken: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Get profile failed: ${response.status} ${await response.text()}`);
    }

    return response.json();
  }

  async refreshToken(refreshToken: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${await response.text()}`);
    }

    return response.json();
  }

  async getEmailVerificationToken(email: string): Promise<string | null> {
    // In a real test environment, you would query your test database
    // For now, we'll simulate this by making a request to get the token
    // This would typically be done through a test-only endpoint
    try {
      const response = await fetch(`${this.baseUrl}/test/email-verification-token/${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        return data.token;
      }
    } catch (error) {
      console.warn('Could not retrieve email verification token:', error);
    }
    return null;
  }
}

/**
 * Page helper for common UI operations
 */
export class PageHelper {
  constructor(private page: Page) {}

  /**
   * Fill registration form
   */
  async fillRegistrationForm(user: TestUser) {
    await this.page.fill('[data-testid="firstName"]', user.firstName);
    await this.page.fill('[data-testid="lastName"]', user.lastName);
    await this.page.fill('[data-testid="email"]', user.email);
    await this.page.fill('[data-testid="password"]', user.password);
    await this.page.fill('[data-testid="confirmPassword"]', user.password);

    // Accept terms and conditions
    await this.page.check('[data-testid="acceptTerms"]');
  }

  /**
   * Fill login form
   */
  async fillLoginForm(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
  }

  /**
   * Wait for navigation and verify URL
   */
  async waitForNavigation(expectedPath: string, timeout: number = 10000) {
    await this.page.waitForURL(`**${expectedPath}`, { timeout });
    expect(this.page.url()).toContain(expectedPath);
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout: number = 10000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Check if user is authenticated by verifying localStorage
   */
  async isAuthenticated(): Promise<boolean> {
    const tokens = await this.page.evaluate(() => {
      return {
        accessToken: localStorage.getItem('accessToken'),
        refreshToken: localStorage.getItem('refreshToken'),
      };
    });
    return !!(tokens.accessToken && tokens.refreshToken);
  }

  /**
   * Get stored tokens from localStorage
   */
  async getStoredTokens(): Promise<AuthTokens | null> {
    const tokens = await this.page.evaluate(() => {
      return {
        accessToken: localStorage.getItem('accessToken'),
        refreshToken: localStorage.getItem('refreshToken'),
      };
    });

    if (tokens.accessToken && tokens.refreshToken) {
      return tokens as AuthTokens;
    }
    return null;
  }

  /**
   * Clear authentication tokens
   */
  async clearAuth() {
    await this.page.evaluate(() => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    });
  }

  /**
   * Set authentication tokens
   */
  async setAuth(tokens: AuthTokens, user?: any) {
    await this.page.evaluate(({ tokens, user }) => {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    }, { tokens, user });
  }

  /**
   * Wait for toast message
   */
  async waitForToast(message?: string, timeout: number = 10000) {
    // react-hot-toast renders toasts with specific patterns
    // We'll look for the actual toast content, not just the container
    const toastSelectors = [
      'div[data-hot-toast]', // react-hot-toast specific attribute
      'div[role="status"]', // ARIA role for notifications
      'div[aria-live="polite"]', // ARIA live region
      '.react-hot-toast', // common class name
      'div[style*="transform"]', // react-hot-toast uses transform animations
      '.toast-notification' // our custom class
    ];

    // Wait for any toast to appear first
    let toastContainer = null;
    for (const selector of toastSelectors) {
      try {
        await this.page.waitForSelector(selector, { state: 'visible', timeout: 2000 });
        toastContainer = this.page.locator(selector);
        break;
      } catch (error) {
        continue;
      }
    }

    // If no toast container found, try looking for any element containing the message
    if (!toastContainer && message) {
      try {
        await this.page.waitForSelector(`text=${message}`, { timeout: timeout });
        return;
      } catch (error) {
        // Continue with other approaches
      }
    }

    // If we found a container but need to check for specific message
    if (toastContainer && message) {
      try {
        await expect(toastContainer).toContainText(message, { timeout: timeout });
        return;
      } catch (error) {
        // Try looking for the message anywhere on the page
        await this.page.waitForSelector(`text=${message}`, { timeout: 2000 });
        return;
      }
    }

    // If no specific message required, just verify a toast appeared
    if (!message && toastContainer) {
      return;
    }

    throw new Error(`Toast notification not found after ${timeout}ms. Tried selectors: ${toastSelectors.join(', ')}`);
  }

  /**
   * Check for form validation errors
   */
  async checkValidationError(fieldName: string, expectedError: string) {
    const errorSelector = `[data-testid="${fieldName}-error"]`;
    await this.page.waitForSelector(errorSelector, { state: 'visible' });
    await expect(this.page.locator(errorSelector)).toContainText(expectedError);
  }
}

/**
 * Database helper for test data cleanup
 */
export class DatabaseHelper {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001/api/v1') {
    this.baseUrl = baseUrl;
  }

  /**
   * Clean up test user data
   */
  async cleanupTestUser(email: string): Promise<void> {
    try {
      // This would typically be a test-only endpoint for cleanup
      await fetch(`${this.baseUrl}/test/cleanup-user/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Could not cleanup test user:', error);
    }
  }
}
