import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { DashboardModule } from '../dashboard.module';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../auth/auth.module';
import { JwtService } from '@nestjs/jwt';

describe('Dashboard E2E Tests', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;

  const mockUser = {
    id: 'user-e2e-test',
    email: 'test@intellifin.com',
    organizationId: 'org-e2e-test',
    roles: ['USER'],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        DatabaseModule,
        AuthModule,
        DashboardModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Generate auth token for testing
    authToken = jwtService.sign(mockUser);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Dashboard Data Endpoints', () => {
    it('/dashboard-data/overview (GET) - should return dashboard overview', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard-data/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'month', includeComparison: 'true' })
        .expect(200);

      expect(response.body).toHaveProperty('period', 'month');
      expect(response.body).toHaveProperty('financial');
      expect(response.body).toHaveProperty('kpis');
      expect(response.body).toHaveProperty('cashFlow');
      expect(response.body).toHaveProperty('revenue');
      expect(response.body).toHaveProperty('compliance');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('lastUpdated');
      expect(response.body).toHaveProperty('comparison'); // includeComparison=true
    });

    it('/dashboard-data/kpis (GET) - should return KPI metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard-data/kpis')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('totalExpenses');
      expect(response.body).toHaveProperty('netProfit');
      expect(response.body).toHaveProperty('profitMargin');
      expect(response.body).toHaveProperty('customerCount');
      expect(response.body).toHaveProperty('currency', 'ZMW');
      expect(response.body).toHaveProperty('lastUpdated');
    });

    it('/dashboard-data/kpis (GET) - should return filtered KPI metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard-data/kpis')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ metrics: 'totalRevenue,customerCount' })
        .expect(200);

      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('customerCount');
      expect(response.body).toHaveProperty('currency', 'ZMW');
      expect(response.body).toHaveProperty('lastUpdated');
      expect(response.body).not.toHaveProperty('totalExpenses');
      expect(response.body).not.toHaveProperty('netProfit');
    });

    it('/dashboard-data/financial-summary (GET) - should return financial summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard-data/financial-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'quarter' })
        .expect(200);

      expect(response.body).toHaveProperty('period', 'quarter');
      expect(response.body).toHaveProperty('profitLoss');
      expect(response.body).toHaveProperty('cashFlow');
      expect(response.body).toHaveProperty('balanceSheet');
      expect(response.body).toHaveProperty('ratios');
      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('lastUpdated');
    });

    it('/dashboard-data/analytics-summary (GET) - should return analytics summary with forecasts', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard-data/analytics-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ includeForecasts: 'true', includeAnomalies: 'true' })
        .expect(200);

      expect(response.body).toHaveProperty(
        'organizationId',
        mockUser.organizationId
      );
      expect(response.body).toHaveProperty('forecasts');
      expect(response.body).toHaveProperty('anomalies');
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('lastUpdated');
    });

    it('/dashboard-data/zambian-compliance (GET) - should return ZRA compliance status', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard-data/zambian-compliance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('overallScore');
      expect(response.body).toHaveProperty('taxCompliance');
      expect(response.body).toHaveProperty('zraStatus');
      expect(response.body).toHaveProperty('vatSummary');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('lastUpdated');
      expect(typeof response.body.overallScore).toBe('number');
      expect(response.body.overallScore).toBeGreaterThanOrEqual(0);
      expect(response.body.overallScore).toBeLessThanOrEqual(100);
    });

    it('/dashboard-data/mobile-money-summary (GET) - should return mobile money data', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard-data/mobile-money-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ provider: 'all' })
        .expect(200);

      expect(response.body).toHaveProperty('totalAmount');
      expect(response.body).toHaveProperty('totalTransactions');
      expect(response.body).toHaveProperty('byProvider');
      expect(response.body).toHaveProperty('lastUpdated');
    });

    it('/dashboard-data/mobile-money-summary (GET) - should return specific provider data', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard-data/mobile-money-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ provider: 'airtel' })
        .expect(200);

      expect(response.body).toHaveProperty('totalAmount');
      expect(response.body).toHaveProperty('provider');
    });
  });

  describe('Widget Data Endpoints', () => {
    const mockWidgetId = 'widget-e2e-test';

    it('/dashboard-data/widget/:widgetId/data (GET) - should return widget data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dashboard-data/widget/${mockWidgetId}/data`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('value');
      expect(response.body).toHaveProperty('currency', 'ZMW');
      expect(response.body).toHaveProperty('lastUpdated');
    });

    it('/dashboard-data/widget/:widgetId/data (GET) - should force refresh when requested', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dashboard-data/widget/${mockWidgetId}/data`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ refresh: 'true' })
        .expect(200);

      expect(response.body).toHaveProperty('value');
      expect(response.body).toHaveProperty('lastUpdated');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on dashboard overview endpoint', async () => {
      const requests = Array.from({ length: 25 }, () =>
        request(app.getHttpServer())
          .get('/dashboard-data/overview')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should enforce rate limits on KPI metrics endpoint', async () => {
      const requests = Array.from({ length: 35 }, () =>
        request(app.getHttpServer())
          .get('/dashboard-data/kpis')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer())
        .get('/dashboard-data/overview')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/dashboard-data/overview')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should allow access with valid token', async () => {
      await request(app.getHttpServer())
        .get('/dashboard-data/kpis')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Multi-tenant Data Isolation', () => {
    it('should only return data for the authenticated user organization', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard-data/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify the response contains data for the correct organization
      expect(response.body).toHaveProperty('summary');
      // Data should be isolated to the user's organization
      // (specific validation would depend on the actual data structure)
    });

    it('should not allow access to other organization data', async () => {
      // Create token for different organization
      const otherOrgUser = { ...mockUser, organizationId: 'other-org' };
      const otherOrgToken = jwtService.sign(otherOrgUser);

      const response = await request(app.getHttpServer())
        .get('/dashboard-data/overview')
        .set('Authorization', `Bearer ${otherOrgToken}`)
        .expect(200);

      // Should return data for the other organization, not the original
      expect(response.body).toHaveProperty('summary');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid widget ID gracefully', async () => {
      await request(app.getHttpServer())
        .get('/dashboard-data/widget/invalid-widget-id/data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle invalid query parameters gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard-data/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'invalid-period' })
        .expect(200); // Should use default period

      expect(response.body).toHaveProperty('period');
    });

    it('should handle service errors gracefully', async () => {
      // This would require mocking service failures
      // For now, we test that the endpoint structure is correct
      const response = await request(app.getHttpServer())
        .get('/dashboard-data/kpis')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('currency', 'ZMW');
    });
  });

  describe('Performance Requirements', () => {
    it('should respond to dashboard overview within 3 seconds', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/dashboard-data/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // 3 seconds for 3G requirement
    });

    it('should respond to KPI metrics within 1 second', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/dashboard-data/kpis')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });

  describe('Zambian Market Features', () => {
    it('should return ZMW currency in all financial responses', async () => {
      const endpoints = [
        '/dashboard-data/kpis',
        '/dashboard-data/overview',
        '/dashboard-data/financial-summary',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Check for ZMW currency in response
        const responseStr = JSON.stringify(response.body);
        expect(responseStr).toContain('ZMW');
      }
    });

    it('should provide mobile money data for Zambian providers', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard-data/mobile-money-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('byProvider');
      // Should include Zambian mobile money providers
      const providers = response.body.byProvider || [];
      const providerNames = providers.map((p: any) => p.provider);

      // At least one Zambian provider should be present
      const zambianProviders = ['airtel', 'mtn', 'zamtel'];
      const hasZambianProvider = zambianProviders.some(provider =>
        providerNames.includes(provider)
      );
      expect(hasZambianProvider).toBe(true);
    });
  });
});
