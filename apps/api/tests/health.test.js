/**
 * CircuitSage AI — API Integration Tests
 */

const request = require('supertest');
const app = require('../src/app');
const { ERROR_CODES } = require('@circuitsage/shared');

describe('CircuitSage AI Express API Baseline Tests', () => {
  describe('GET /api/v1/health', () => {
    it('should return 200 OK with health status and services object', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('express', 'up');
      expect(response.body).toHaveProperty('offline_mode_ready', true);
      expect(response.headers).toHaveProperty('x-request-id');
    });

    it('should preserve provided X-Request-Id header', async () => {
      const customRequestId = 'test-req-id-12345';
      const response = await request(app)
        .get('/api/v1/health')
        .set('X-Request-Id', customRequestId)
        .expect(200);

      expect(response.headers['x-request-id']).toBe(customRequestId);
      expect(response.body.requestId).toBe(customRequestId);
    });
  });

  describe('Unmatched Routes (404 Handling)', () => {
    it('should return 404 with standardized error JSON schema for unknown routes', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', ERROR_CODES.RESOURCE_NOT_FOUND);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('details');
      expect(response.body.error).toHaveProperty('requestId');
    });
  });
});
