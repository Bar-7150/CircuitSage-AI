/**
 * CircuitSage AI — Diagnostic Routes Comprehensive Integration Tests
 * Tests valid requests, input validations, file uploads, authentication,
 * ownership enforcement, and cross-user access denial.
 */

const request = require('supertest');
const app = require('../src/app');
const caseRepository = require('../src/db/caseRepository');
const { ERROR_CODES, EPISTEMIC_STATUS } = require('@circuitsage/shared');

describe('CircuitSage AI Diagnostics API (/api/v1/diagnoses)', () => {
  beforeEach(() => {
    caseRepository._clearLocalStore();
  });

  describe('POST /api/v1/diagnoses', () => {
    it('creates a new diagnostic case with valid inputs and returns ranked hypotheses', async () => {
      const payload = {
        target_board: 'ESP32 DevKit v1',
        symptom_description: 'Blue 5mm LED connected to GPIO 18 never turns on when blink sketch runs.',
        connected_components: ['Blue LED', '220Ω Resistor'],
        pin_connections: 'GPIO 18 -> 220Ω Resistor -> LED Anode, GND -> Cathode'
      };

      const res = await request(app)
        .post('/api/v1/diagnoses')
        .send(payload)
        .expect(201);

      expect(res.body).toHaveProperty('case');
      expect(res.body.case).toHaveProperty('id');
      expect(res.body.case.target_board).toBe('ESP32 DevKit v1');
      expect(res.body.case.status).toBe('ACTIVE');

      expect(res.body).toHaveProperty('epistemic_summary');
      expect(res.body.epistemic_summary.ai_inferences_count).toBeGreaterThanOrEqual(1);

      expect(res.body).toHaveProperty('deterministic_checks');
      expect(Array.isArray(res.body.deterministic_checks)).toBe(true);

      expect(res.body).toHaveProperty('hypotheses');
      expect(res.body.hypotheses.length).toBeGreaterThanOrEqual(1);
      const topHyp = res.body.hypotheses[0];
      expect(topHyp).toHaveProperty('title');
      expect(topHyp).toHaveProperty('category');
      expect(topHyp).toHaveProperty('suggested_test');
    });

    it('accepts optional circuit photo upload and validates format', async () => {
      const res = await request(app)
        .post('/api/v1/diagnoses')
        .field('target_board', 'Arduino Uno R3')
        .field('symptom_description', 'I2C OLED display remains black on 0x3C.')
        .attach('image', Buffer.from('fake-png-binary-content'), {
          filename: 'circuit.png',
          contentType: 'image/png'
        })
        .expect(201);

      expect(res.body.case).toHaveProperty('image_path');
      expect(res.body.case.image_path).toMatch(/^\/uploads\/circuit-/);
    });

    it('rejects unsupported image file formats with standardized 422 error', async () => {
      const res = await request(app)
        .post('/api/v1/diagnoses')
        .field('target_board', 'Arduino Uno R3')
        .field('symptom_description', 'I2C OLED display remains black on 0x3C.')
        .attach('image', Buffer.from('pdf-content'), {
          filename: 'schematic.pdf',
          contentType: 'application/pdf'
        })
        .expect(422);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(res.body.error.message).toMatch(/invalid input/i);
      expect(res.body.error.details[0].field).toBe('image');
      expect(res.body.error.details[0].issue).toMatch(/unsupported image format/i);
    });

    it('rejects missing or unsupported target_board with 422 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/diagnoses')
        .send({
          target_board: 'Unknown-Micro-XYZ',
          symptom_description: 'Valid description that is longer than ten characters'
        })
        .expect(422);

      expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(res.body.error.details.some((d) => d.field === 'target_board')).toBe(true);
    });

    it('rejects symptom_description shorter than 10 characters with 422', async () => {
      const res = await request(app)
        .post('/api/v1/diagnoses')
        .send({
          target_board: 'ESP32 DevKit v1',
          symptom_description: 'too short'
        })
        .expect(422);

      expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(res.body.error.details.some((d) => d.field === 'symptom_description')).toBe(true);
    });

    it('strictly derives authenticated user identity from Bearer token, ignoring client body user_id', async () => {
      const res = await request(app)
        .post('/api/v1/diagnoses')
        .set('Authorization', 'Bearer valid-test-token')
        .send({
          target_board: 'ESP32 DevKit v1',
          symptom_description: 'ESP32 repeatedly resets with brownout detector message.',
          user_id: 'spoofed-attacker-id-0000'
        })
        .expect(201);

      expect(res.body.case.user_id).toBe('test-user-uuid-1234');
      expect(res.body.case.user_id).not.toBe('spoofed-attacker-id-0000');
    });
  });

  describe('GET /api/v1/diagnoses (User Case Listing)', () => {
    it('requires Bearer token authentication and returns 401 when missing', async () => {
      const res = await request(app)
        .get('/api/v1/diagnoses')
        .expect(401);

      expect(res.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
    });

    it('returns only cases belonging to the authenticated caller', async () => {
      // Create case for User 1
      await request(app)
        .post('/api/v1/diagnoses')
        .set('Authorization', 'Bearer valid-test-token')
        .send({
          target_board: 'ESP32 DevKit v1',
          symptom_description: 'Case belonging strictly to User 1'
        });

      // Create case for User 2
      await request(app)
        .post('/api/v1/diagnoses')
        .set('Authorization', 'Bearer other-user-token')
        .send({
          target_board: 'Arduino Uno R3',
          symptom_description: 'Case belonging strictly to User 2'
        });

      // Fetch as User 1
      const resUser1 = await request(app)
        .get('/api/v1/diagnoses')
        .set('Authorization', 'Bearer valid-test-token')
        .expect(200);

      expect(resUser1.body.total).toBe(1);
      expect(resUser1.body.cases[0].user_id).toBe('test-user-uuid-1234');

      // Fetch as User 2
      const resUser2 = await request(app)
        .get('/api/v1/diagnoses')
        .set('Authorization', 'Bearer other-user-token')
        .expect(200);

      expect(resUser2.body.total).toBe(1);
      expect(resUser2.body.cases[0].user_id).toBe('other-user-uuid-5678');
    });

    it('validates query pagination parameters', async () => {
      const res = await request(app)
        .get('/api/v1/diagnoses?limit=100')
        .set('Authorization', 'Bearer valid-test-token')
        .expect(422);

      expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(res.body.error.details.some((d) => d.field === 'limit')).toBe(true);
    });
  });

  describe('GET /api/v1/diagnoses/:id & Cross-User Ownership Isolation', () => {
    it('returns 422 for malformed non-UUID case ID', async () => {
      const res = await request(app)
        .get('/api/v1/diagnoses/invalid-uuid-string')
        .expect(422);

      expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('returns 404 for non-existent case ID', async () => {
      const nonExistent = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/diagnoses/${nonExistent}`)
        .expect(404);

      expect(res.body.error.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
    });

    it('allows owner to retrieve full case state including hypotheses and messages', async () => {
      const createRes = await request(app)
        .post('/api/v1/diagnoses')
        .set('Authorization', 'Bearer valid-test-token')
        .send({
          target_board: 'ESP32 DevKit v1',
          symptom_description: 'Blue LED on GPIO 18 never turns on when sketch runs.'
        });

      const caseId = createRes.body.case.id;

      const getRes = await request(app)
        .get(`/api/v1/diagnoses/${caseId}`)
        .set('Authorization', 'Bearer valid-test-token')
        .expect(200);

      expect(getRes.body.case.id).toBe(caseId);
      expect(getRes.body).toHaveProperty('hypotheses');
      expect(getRes.body).toHaveProperty('messages');
      expect(getRes.body).toHaveProperty('measurements');
      expect(getRes.body).toHaveProperty('epistemic_summary');
    });

    it('denies cross-user access with 403 FORBIDDEN when User B attempts to access User A private case', async () => {
      // User 1 creates private case
      const createRes = await request(app)
        .post('/api/v1/diagnoses')
        .set('Authorization', 'Bearer valid-test-token')
        .send({
          target_board: 'ESP32 DevKit v1',
          symptom_description: 'User 1 private hardware troubleshooting data'
        });

      const user1CaseId = createRes.body.case.id;

      // User 2 attempts to read User 1's case
      const resOtherUser = await request(app)
        .get(`/api/v1/diagnoses/${user1CaseId}`)
        .set('Authorization', 'Bearer other-user-token')
        .expect(403);

      expect(resOtherUser.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
      expect(resOtherUser.body.error.message).toMatch(/permission/i);

      // Unauthenticated user attempts to read User 1's private case
      const resUnauth = await request(app)
        .get(`/api/v1/diagnoses/${user1CaseId}`)
        .expect(403);

      expect(resUnauth.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
    });
  });

  describe('POST /api/v1/diagnoses/:id/messages (Case Messaging)', () => {
    it('allows owner to append follow-up message to case', async () => {
      const createRes = await request(app)
        .post('/api/v1/diagnoses')
        .set('Authorization', 'Bearer valid-test-token')
        .send({
          target_board: 'ESP32 DevKit v1',
          symptom_description: 'Blue LED on GPIO 18 is completely dark.'
        });

      const caseId = createRes.body.case.id;

      const msgRes = await request(app)
        .post(`/api/v1/diagnoses/${caseId}/messages`)
        .set('Authorization', 'Bearer valid-test-token')
        .send({
          message_text: 'I measured the resistor and it is 220 ohms.'
        })
        .expect(201);

      expect(msgRes.body).toHaveProperty('message_id');
      expect(msgRes.body.case_id).toBe(caseId);
      expect(msgRes.body.sender).toBe('USER');
      expect(msgRes.body.message_text).toBe('I measured the resistor and it is 220 ohms.');
    });

    it('rejects empty message_text with 422 VALIDATION_ERROR', async () => {
      const createRes = await request(app)
        .post('/api/v1/diagnoses')
        .set('Authorization', 'Bearer valid-test-token')
        .send({
          target_board: 'ESP32 DevKit v1',
          symptom_description: 'Blue LED on GPIO 18 is completely dark.'
        });

      const caseId = createRes.body.case.id;

      const res = await request(app)
        .post(`/api/v1/diagnoses/${caseId}/messages`)
        .set('Authorization', 'Bearer valid-test-token')
        .send({
          message_text: ''
        })
        .expect(422);

      expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('denies unauthorized user from appending messages to another user case with 403', async () => {
      const createRes = await request(app)
        .post('/api/v1/diagnoses')
        .set('Authorization', 'Bearer valid-test-token')
        .send({
          target_board: 'ESP32 DevKit v1',
          symptom_description: 'User 1 private diagnostic session.'
        });

      const caseId = createRes.body.case.id;

      const res = await request(app)
        .post(`/api/v1/diagnoses/${caseId}/messages`)
        .set('Authorization', 'Bearer other-user-token')
        .send({
          message_text: 'Intruder message'
        })
        .expect(403);

      expect(res.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
    });
  });

  describe('POST /api/v1/diagnoses/:id/measurements (Multimeter Probing Loop)', () => {
    it('evaluates DC voltage measurement and eliminates firmware hypothesis upon valid 3.3V reading', async () => {
      const createRes = await request(app)
        .post('/api/v1/diagnoses')
        .set('Authorization', 'Bearer valid-test-token')
        .send({
          target_board: 'ESP32 DevKit v1',
          symptom_description: 'Blue LED on GPIO 18 never turns on when sketch runs.'
        });

      const caseId = createRes.body.case.id;

      const measRes = await request(app)
        .post(`/api/v1/diagnoses/${caseId}/measurements`)
        .set('Authorization', 'Bearer valid-test-token')
        .send({
          test_id: 'test_gpio_voltage',
          measurement_type: 'VOLTAGE_DC',
          numeric_value: 3.28,
          unit: 'V',
          probe_positive: 'ESP32 GPIO 18',
          probe_negative: 'GND Rail',
          notes: 'Multimeter set to DC 20V range.'
        })
        .expect(200);

      expect(measRes.body).toHaveProperty('measurement');
      expect(measRes.body.measurement.numeric_value).toBe(3.28);
      expect(measRes.body.deterministic_evaluation.status).toBe('VERIFIED_PASS');

      // Firmware hypothesis should be eliminated
      expect(Array.isArray(measRes.body.eliminated_hypotheses)).toBe(true);
      const eliminated = measRes.body.eliminated_hypotheses.find((e) => e.title.includes('Firmware'));
      expect(eliminated).toBeDefined();

      // Polarity hypothesis should be promoted to VERIFIED_FACT
      const updated = measRes.body.updated_hypotheses;
      expect(updated[0].epistemic_status).toBe(EPISTEMIC_STATUS.VERIFIED_FACT);
    });

    it('rejects invalid measurement data with 422 VALIDATION_ERROR', async () => {
      const createRes = await request(app)
        .post('/api/v1/diagnoses')
        .set('Authorization', 'Bearer valid-test-token')
        .send({
          target_board: 'ESP32 DevKit v1',
          symptom_description: 'Blue LED on GPIO 18 never turns on when sketch runs.'
        });

      const caseId = createRes.body.case.id;

      const res = await request(app)
        .post(`/api/v1/diagnoses/${caseId}/measurements`)
        .set('Authorization', 'Bearer valid-test-token')
        .send({
          measurement_type: 'INVALID_MODE',
          numeric_value: 'not-a-number'
        })
        .expect(422);

      expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('denies unauthorized user from submitting measurements to another user case with 403', async () => {
      const createRes = await request(app)
        .post('/api/v1/diagnoses')
        .set('Authorization', 'Bearer valid-test-token')
        .send({
          target_board: 'ESP32 DevKit v1',
          symptom_description: 'User 1 private diagnostic session.'
        });

      const caseId = createRes.body.case.id;

      const res = await request(app)
        .post(`/api/v1/diagnoses/${caseId}/measurements`)
        .set('Authorization', 'Bearer other-user-token')
        .send({
          test_id: 'test_gpio_voltage',
          measurement_type: 'VOLTAGE_DC',
          numeric_value: 3.28,
          unit: 'V',
          probe_positive: 'ESP32 GPIO 18',
          probe_negative: 'GND'
        })
        .expect(403);

      expect(res.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
    });
  });
});
