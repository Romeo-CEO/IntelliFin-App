import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/auth/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecureP@ssw0rd123',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('user');
        expect(res.body).toHaveProperty('message');
        expect(res.body.user).toHaveProperty('email', 'test@example.com');
      });
  });

  it('/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecureP@ssw0rd123',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('user');
        expect(res.body).toHaveProperty('tokens');
        expect(res.body.tokens).toHaveProperty('accessToken');
        expect(res.body.tokens).toHaveProperty('refreshToken');
      });
  });

  it('/auth/me (GET) - should require authentication', () => {
    return request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);
  });

  it('/auth/me (GET) - should return user profile with valid token', async () => {
    // First register a user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test2@example.com',
        password: 'SecureP@ssw0rd123',
        firstName: 'Jane',
        lastName: 'Doe',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
      });

    // Then login to get tokens
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test2@example.com',
        password: 'SecureP@ssw0rd123',
      });

    const { accessToken } = loginResponse.body.tokens;

    // Use the token to access protected route
    return request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('user');
        expect(res.body.user).toHaveProperty('email', 'test2@example.com');
      });
  });
});
