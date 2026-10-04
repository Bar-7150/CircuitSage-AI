/**
 * CircuitSage AI — Authentication and Cases API Tests
 */

const request = require('supertest');
const app = require('../src/app');
const { ERROR_CODES } = require('@circuitsage/shared');

describe('CircuitSage AI Authentication & Authorization Tests', () => {
  describe('Protected Route Token Enforcement (GET /api/v1/diagnoses)', () => {
    it('should reject requests missing Authorization header with 401 UNAUTHORIZED', async () => {
      const response = await request(app)
        .get('/api/v1/diagnoses')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', ERROR_CODES.UNAUTHORIZED);
      expect(response.body.error.message).toMatch(/Authentication required/i);
      expect(response.body.error).toHaveProperty('requestId');
    });

    it('should reject malformed Authorization headers with 401 UNAUTHORIZED', async () => {
      const response = await request(app)
        .get('/api/v1/diagnoses')
        .set('Authorization', 'Basic invalid-token-string')
        .expect(401);

      expect(response.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
    });

    it('should accept valid Bearer token in test mode and return cases list', async () => {
      const response = await request(app)
        .get('/api/v1/diagnoses')
        .set('Authorization', 'Bearer valid-test-token')
        .expect(200);

      expect(response.body).toHaveProperty('cases');
      expect(Array.isArray(response.body.cases)).toBe(true);
    });
  });

  describe('Case Creation & Identity Derivation (POST /api/v1/diagnoses)', () => {
    it('should validate input parameters and return 422 for missing or invalid fields', async () => {
      const response = await request(app)
        .post('/api/v1/diagnoses')
        .send({
          target_board: 'NonExistentBoard',
          symptom_description: 'short'
        })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(response.body.error.details.length).toBeGreaterThanOrEqual(1);
    });

    it('should never trust user_id passed in request body, strictly deriving identity from token', async () => {
      const spoofedUserId = 'malicious-attacker-uuid-9999';

      const response = await request(app)
        .post('/api/v1/diagnoses')
        .set('Authorization', 'Bearer valid-test-token')
        .send({
          target_board: 'ESP32 DevKit v1',
          symptom_description: 'Blue LED does not turn on when pin is set HIGH',
          user_id: spoofedUserId // Attack simulation: client attempts to impersonate another user ID
        })
        .expect(201);

      expect(response.body).toHaveProperty('case');
      // The user_id must match the authenticated token ('test-user-uuid-1234'), NOT the spoofed one!
      expect(response.body.case.user_id).toBe('test-user-uuid-1234');
      expect(response.body.case.user_id).not.toBe(spoofedUserId);
    });
  });

  describe('Cross-User Resource Isolation (GET /api/v1/diagnoses/:id)', () => {
    it('should return 404 for non-existent case ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/diagnoses/${nonExistentId}`)
        .expect(404);

      expect(response.body.error.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
    });
  });
});
