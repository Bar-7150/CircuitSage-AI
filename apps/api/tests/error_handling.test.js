/**
 * CircuitSage AI — Centralized Error Handling & Security Tests
 */

const request = require('supertest');
const app = require('../src/app');
const { ERROR_CODES } = require('@circuitsage/shared');

describe('CircuitSage AI Centralized Error Handling & Security', () => {
  it('returns standardized 404 error envelope for unregistered routes', async () => {
    const res = await request(app)
      .get('/api/v1/unknown-endpoint-route')
      .expect(404);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', ERROR_CODES.RESOURCE_NOT_FOUND);
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error).toHaveProperty('requestId');
    expect(res.body.error).toHaveProperty('details');
  });

  it('sets X-Request-Id header on all responses and matches error envelope', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .expect(200);

    const headerRequestId = res.headers['x-request-id'];
    expect(headerRequestId).toBeDefined();
    expect(res.body.requestId).toBe(headerRequestId);
  });

  it('preserves client-supplied X-Request-Id header', async () => {
    const customId = 'client-tracer-uuid-9876';
    const res = await request(app)
      .get('/api/v1/health')
      .set('X-Request-Id', customId)
      .expect(200);

    expect(res.headers['x-request-id']).toBe(customId);
    expect(res.body.requestId).toBe(customId);
  });
});
