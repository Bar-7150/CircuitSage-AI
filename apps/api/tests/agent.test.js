/**
 * CircuitSage AI — Agent Execution API Tests
 */

const request = require('supertest');
const app = require('../src/app');

describe('CircuitSage AI Agent Routes (/api/v1/agent)', () => {
  describe('GET /api/v1/agent/capabilities', () => {
    it('returns runtime capabilities and model details', async () => {
      const res = await request(app)
        .get('/api/v1/agent/capabilities')
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('model');
      expect(res.body.data).toHaveProperty('functionCalling', true);
    });
  });

  describe('POST /api/v1/agent/run', () => {
    it('rejects empty or invalid prompt with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/v1/agent/run')
        .send({ prompt: '' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('successfully plans, inspects, and proposes firmware patch for DHT22 + MQTT request', async () => {
      const res = await request(app)
        .post('/api/v1/agent/run')
        .send({
          prompt: 'Create ESP32 firmware to read a DHT22 on GPIO 4, connect to Wi-Fi, and publish readings to an MQTT broker.',
          context: {
            selectedBoard: { name: 'ESP32 DevKit v1', fqbn: 'esp32:esp32:esp32' },
            activeFile: 'sketch.ino',
            autoApprovePatches: true
          }
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      const report = res.body.data;
      expect(report.completedActions.length).toBeGreaterThan(0);
      expect(report.proposedPatches.length).toBeGreaterThan(0);
      expect(report.proposedPatches[0].newSnippet).toContain('PubSubClient');
      expect(report.proposedPatches[0].newSnippet).toContain('DHT');
      expect(report.uncertainties.length).toBeGreaterThan(0);
    });
  });
});
