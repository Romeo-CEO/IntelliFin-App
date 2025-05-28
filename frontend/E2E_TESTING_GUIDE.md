# 🧪 IntelliFin E2E Testing Guide

This guide provides comprehensive instructions for running end-to-end tests for the IntelliFin authentication system.

## 🚀 Quick Start

### Prerequisites
1. **Backend API** running on `http://localhost:3001`
2. **Frontend app** running on `http://localhost:3000`
3. **PostgreSQL database** with test data

### Run Tests Immediately

```bash
# Automated setup and test execution
npm run test:e2e:setup

# Run specific test suites
npm run test:e2e:setup:auth      # Authentication tests only
npm run test:e2e:setup:dashboard # Dashboard tests only
```

## 📋 Manual Setup

If you prefer manual setup:

### 1. Start Backend Service
```bash
cd backend
npm run start:dev
```

### 2. Start Frontend Service
```bash
cd frontend
npm run dev
```

### 3. Run E2E Tests
```bash
cd frontend

# All tests
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Specific test suites
npm run test:e2e:auth
npm run test:e2e:dashboard
```

## 🎯 Test Scenarios Covered

### ✅ Registration Flow (25+ scenarios)
- **Form validation**: Real-time and submission validation
- **API integration**: Registration API calls and responses
- **Success handling**: Redirect to verification page
- **Error handling**: Duplicate emails, network errors
- **Accessibility**: Screen reader support, keyboard navigation
- **Responsiveness**: Mobile and desktop layouts

### ✅ Email Verification Flow (15+ scenarios)
- **Token verification**: Valid, invalid, and expired tokens
- **Auto-verification**: Direct link clicks from email
- **Resend functionality**: Rate limiting and error handling
- **User feedback**: Clear success/error messages
- **Navigation**: Back to login, retry mechanisms

### ✅ Login Flow (20+ scenarios)
- **Credential validation**: Valid/invalid credentials
- **Authentication state**: Token storage and management
- **Remember me**: Extended session functionality
- **Unverified users**: Redirect to verification
- **Rate limiting**: Too many attempts handling
- **Accessibility**: Keyboard navigation, ARIA labels

### ✅ Protected Routes (18+ scenarios)
- **Access control**: Authenticated vs unauthenticated users
- **Token refresh**: Automatic token renewal
- **Session management**: Logout and cleanup
- **Route protection**: All dashboard routes secured
- **Error handling**: Expired tokens, network failures
- **RBAC**: Role-based access control

### ✅ Error Handling (22+ scenarios)
- **Network errors**: Complete failure, timeouts, intermittent issues
- **Server errors**: 500, 503, malformed responses
- **User-friendly messages**: Technical errors translated
- **Recovery mechanisms**: Retry buttons, form preservation
- **Accessibility**: Error announcements, keyboard navigation

## 📊 Test Execution Results

After running tests, you'll see:

```
Running 80+ tests across 5 test files

✅ Registration Flow: 25 tests passed
✅ Email Verification: 15 tests passed  
✅ Login Flow: 20 tests passed
✅ Protected Routes: 18 tests passed
✅ Error Handling: 22 tests passed

📊 Test Results:
- 100 tests passed
- 0 tests failed
- 0 tests skipped

🎯 Coverage:
- Authentication flows: ✅ Complete
- Error scenarios: ✅ Complete  
- Mobile responsiveness: ✅ Complete
- Accessibility: ✅ Complete
```

## 🔍 Debugging Failed Tests

### View Test Report
```bash
npm run test:e2e:report
```

### Debug Specific Test
```bash
npx playwright test --debug e2e/auth/login.spec.ts
```

### Run in Headed Mode
```bash
npm run test:e2e:headed
```

### Check Screenshots and Videos
Failed tests automatically capture:
- Screenshots: `test-results/*/test-failed-*.png`
- Videos: `test-results/*/video.webm`
- Traces: `test-results/*/trace.zip`

## 🏗️ CI/CD Integration

### GitHub Actions
The E2E tests run automatically on:
- **Push** to main/develop branches
- **Pull requests** to main/develop
- **Manual workflow dispatch**

### Test Results in PR
Each PR gets an automated comment with:
- ✅/❌ Test status
- 📊 Coverage summary
- 🔗 Links to artifacts
- 📸 Screenshots (on failure)

### Artifacts Available
- Playwright HTML report
- Test screenshots and videos
- Trace files for debugging
- Security scan results

## 🛠️ Customizing Tests

### Adding New Test Scenarios
```typescript
// e2e/auth/new-feature.spec.ts
import { test, expect } from '../fixtures/auth-fixtures';

test.describe('New Feature Tests', () => {
  test('should handle new scenario', async ({ page, pageHelper, testUser }) => {
    // Your test implementation
  });
});
```

### Using Test Fixtures
```typescript
// Pre-configured fixtures available:
- testUser: Fresh user for each test
- verifiedUser: Pre-verified user
- authenticatedUser: Logged-in user
- apiHelper: Backend API interactions
- pageHelper: UI interaction helpers
```

### Mock API Responses
```typescript
await page.route('**/api/v1/auth/login', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true })
  });
});
```

## 📈 Performance Metrics

### Test Execution Time
- **Full suite**: ~5-8 minutes
- **Auth tests only**: ~2-3 minutes
- **Dashboard tests**: ~1-2 minutes
- **Parallel execution**: 4 workers

### Browser Coverage
- ✅ Chrome (Desktop)
- ✅ Firefox (Desktop)
- ✅ Safari (Desktop)
- ✅ Chrome Mobile
- ✅ Safari Mobile

## 🔒 Security Testing

The E2E tests include security validations:
- **JWT token handling**: Secure storage and transmission
- **Session management**: Proper cleanup on logout
- **CSRF protection**: Token validation
- **XSS prevention**: Input sanitization
- **Rate limiting**: Brute force protection

## 📞 Support

### Common Issues
1. **Tests timing out**: Increase timeout in `playwright.config.ts`
2. **Services not starting**: Check ports 3000/3001 availability
3. **Database connection**: Verify PostgreSQL is running
4. **Authentication failures**: Check test user credentials

### Getting Help
- 📖 [Playwright Documentation](https://playwright.dev/)
- 🐛 Check test logs in `test-results/`
- 🔍 Use trace viewer: `npx playwright show-trace trace.zip`
- 💬 Contact the development team

## 🎉 Success Criteria

Your E2E tests are successful when:
- ✅ All 100+ test scenarios pass
- ✅ No accessibility violations detected
- ✅ Mobile responsiveness validated
- ✅ Error handling comprehensive
- ✅ Security measures verified
- ✅ Performance within acceptable limits

This ensures the IntelliFin authentication system provides a robust, secure, and user-friendly experience across all supported platforms and scenarios.
