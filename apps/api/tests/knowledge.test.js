/**
 * CircuitSage AI — Knowledge Catalog API Integration Tests
 */

const request = require('supertest');
const app = require('../src/app');
const { ERROR_CODES } = require('@circuitsage/shared');

describe('CircuitSage AI Knowledge API (/api/v1/knowledge/search)', () => {
  it('returns curated hardware components without requiring authentication', async () => {
    const res = await request(app)
      .get('/api/v1/knowledge/search')
      .expect(200);

    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('results');
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThanOrEqual(3);

    const esp32 = res.body.results.find((c) => c.component_name.includes('ESP32'));
    expect(esp32).toBeDefined();
    expect(esp32).toHaveProperty('pinout_data');
    expect(esp32).toHaveProperty('known_pitfalls');
    expect(esp32.operating_voltage_max).toBe(3.6);
  });

  it('filters components by search query string', async () => {
    const res = await request(app)
      .get('/api/v1/knowledge/search?q=Arduino')
      .expect(200);

    expect(res.body.results.length).toBeGreaterThanOrEqual(1);
    expect(res.body.results[0].component_name).toMatch(/Arduino Uno/i);
  });

  it('filters components by category', async () => {
    const res = await request(app)
      .get('/api/v1/knowledge/search?category=PASSIVE')
      .expect(200);

    expect(res.body.results.length).toBeGreaterThanOrEqual(1);
    expect(res.body.results.every((c) => c.category === 'PASSIVE')).toBe(true);
  });

  it('validates query parameter bounds', async () => {
    const res = await request(app)
      .get('/api/v1/knowledge/search?limit=100')
      .expect(422);

    expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(res.body.error.details.some((d) => d.field === 'limit')).toBe(true);
  });
});
