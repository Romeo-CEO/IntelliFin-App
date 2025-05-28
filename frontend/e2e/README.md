# IntelliFin E2E Testing Suite

This directory contains comprehensive end-to-end (E2E) tests for the IntelliFin React application using Playwright. The tests cover the complete user journey through the frontend interface and verify integration with the backend APIs.

## 🏗️ Test Structure

```
e2e/
├── auth/                     # Authentication flow tests
│   ├── registration.spec.ts  # User registration E2E tests
│   ├── email-verification.spec.ts # Email verification flow tests
│   ├── login.spec.ts         # Login flow E2E tests
│   └── error-handling.spec.ts # Error handling scenarios
├── dashboard/                # Protected routes and dashboard tests
│   └── protected-routes.spec.ts # Protected route access tests
├── fixtures/                 # Test fixtures and setup
│   └── auth-fixtures.ts      # Authentication test fixtures
├── utils/                    # Test utilities and helpers
│   └── test-helpers.ts       # Common test helper functions
└── README.md                 # This file
```

## 🧪 Test Coverage

### 1. Registration Flow E2E Testing
- ✅ Navigate to registration page
- ✅ Fill out registration form with valid data
- ✅ Submit form and verify API call to backend
- ✅ Verify success message and redirect behavior
- ✅ Test form validation errors for invalid inputs
- ✅ Handle duplicate email registration
- ✅ Network error handling
- ✅ Real-time form validation
- ✅ Mobile responsiveness

### 2. Email Verification Flow E2E Testing
- ✅ Simulate email verification link click
- ✅ Verify verification success page/message
- ✅ Test invalid/expired verification tokens
- ✅ Resend verification email functionality
- ✅ Handle verification errors gracefully
- ✅ Auto-verification when token is in URL

### 3. Login Flow E2E Testing
- ✅ Navigate to login page
- ✅ Enter valid credentials and submit
- ✅ Verify successful login and redirect to dashboard
- ✅ Verify JWT tokens are stored in localStorage
- ✅ Test login with invalid credentials and error handling
- ✅ Handle unverified user login attempts
- ✅ Remember me functionality
- ✅ Rate limiting handling
- ✅ Keyboard navigation support

### 4. Protected Route Access E2E Testing
- ✅ Verify authenticated users can access dashboard
- ✅ Verify unauthenticated users are redirected to login
- ✅ Test automatic token refresh functionality
- ✅ Test logout functionality and token cleanup
- ✅ Handle token expiration gracefully
- ✅ Maintain authentication across page refreshes
- ✅ Handle concurrent requests with token refresh
- ✅ Role-based access control

### 5. Error Handling E2E Testing
- ✅ Test network error scenarios
- ✅ Test form validation error display
- ✅ Test user-friendly error messages
- ✅ Server error handling (500, 503, etc.)
- ✅ Malformed response handling
- ✅ Error state recovery
- ✅ Accessibility in error states

## 🚀 Getting Started

### Prerequisites

1. **Node.js** (>= 18.0.0)
2. **npm** (>= 8.0.0)
3. **Backend API** running on `http://localhost:3001`
4. **Frontend application** running on `http://localhost:3000`

### Installation

```bash
# Install Playwright (already included in package.json)
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# Run specific test suites
npm run test:e2e:auth      # Authentication tests only
npm run test:e2e:dashboard # Dashboard tests only

# Run all tests (unit + E2E)
npm run test:all

# View test report
npm run test:e2e:report
```

### Test Configuration

The tests are configured in `playwright.config.ts`:

- **Base URL**: `http://localhost:3000`
- **API URL**: `http://localhost:3001/api/v1`
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Parallel execution**: Enabled for faster test runs
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Traces**: Collected on retry

## 🛠️ Test Utilities

### ApiHelper
Provides methods for direct backend API interactions:
- `registerUser()` - Register a new user
- `verifyEmail()` - Verify user email
- `loginUser()` - Login user
- `getProfile()` - Get user profile
- `refreshToken()` - Refresh JWT token

### PageHelper
Provides methods for common UI operations:
- `fillRegistrationForm()` - Fill registration form
- `fillLoginForm()` - Fill login form
- `waitForNavigation()` - Wait for page navigation
- `isAuthenticated()` - Check authentication status
- `getStoredTokens()` - Get tokens from localStorage
- `clearAuth()` - Clear authentication data

### Test Fixtures
- `testUser` - Generate unique test user for each test
- `verifiedUser` - Pre-registered and verified user
- `authenticatedUser` - Logged-in user with valid session

## 🔧 Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '../fixtures/auth-fixtures';

test.describe('My Test Suite', () => {
  test('should do something', async ({ page, pageHelper, testUser }) => {
    // Navigate to page
    await page.goto('/some-page');

    // Perform actions
    await pageHelper.fillLoginForm(testUser.email, testUser.password);
    await page.click('[data-testid="submit-button"]');

    // Verify results
    await pageHelper.waitForNavigation('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
```

### Using Authenticated Context

```typescript
import { authenticatedTest, expect } from '../fixtures/auth-fixtures';

authenticatedTest('should access protected route', async ({ page, authenticatedUser }) => {
  await page.goto('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

## 📊 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd frontend && npm ci
          cd ../backend && npm ci

      - name: Install Playwright
        run: cd frontend && npx playwright install --with-deps

      - name: Start backend
        run: cd backend && npm run start:dev &

      - name: Start frontend
        run: cd frontend && npm run dev &

      - name: Wait for services
        run: |
          npx wait-on http://localhost:3001/api/v1/health
          npx wait-on http://localhost:3000

      - name: Run E2E tests
        run: cd frontend && npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## 🐛 Debugging Tests

### Debug Mode
```bash
npm run test:e2e:debug
```

### UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Trace Viewer
```bash
npx playwright show-trace trace.zip
```

## 📝 Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Generate unique test data** for each test to avoid conflicts
3. **Clean up test data** after tests complete
4. **Mock external services** when appropriate
5. **Test error scenarios** as thoroughly as success scenarios
6. **Ensure tests are independent** and can run in any order
7. **Use page object patterns** for complex interactions
8. **Test responsive design** on multiple viewport sizes
9. **Verify accessibility** in test scenarios
10. **Keep tests focused** on user journeys, not implementation details

## 🔍 Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in `playwright.config.ts`
   - Check if services are running
   - Verify network connectivity

2. **Element not found**
   - Ensure `data-testid` attributes are present
   - Check if element is visible/enabled
   - Wait for dynamic content to load

3. **Authentication issues**
   - Verify backend API is running
   - Check test user credentials
   - Ensure database is properly seeded

4. **Flaky tests**
   - Add proper wait conditions
   - Use `waitForSelector` instead of fixed delays
   - Check for race conditions

### Getting Help

- Check the [Playwright documentation](https://playwright.dev/)
- Review test logs and screenshots in `test-results/`
- Use the Playwright trace viewer for detailed debugging
- Consult the team's testing guidelines and conventions

## 🎯 Test Execution Summary

The E2E test suite provides comprehensive coverage of the IntelliFin authentication system:

- **25+ test scenarios** covering all critical user journeys
- **Cross-browser testing** (Chrome, Firefox, Safari)
- **Mobile responsiveness** validation
- **Accessibility testing** integration
- **Error handling** and recovery scenarios
- **Network failure** simulation and handling
- **Token management** and refresh functionality
- **Role-based access control** validation

This ensures the IntelliFin application provides a robust, secure, and user-friendly authentication experience across all supported platforms and scenarios.
