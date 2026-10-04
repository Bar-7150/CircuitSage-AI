/**
 * CircuitSage AI — Feedback API Integration Tests
 */

const request = require('supertest');
const app = require('../src/app');
const { ERROR_CODES } = require('@circuitsage/shared');

describe('CircuitSage AI Feedback API (/api/v1/feedback)', () => {
  it('records user usability and accuracy feedback with 201 Created', async () => {
    const payload = {
      rating: 5,
      feedback_type: 'USABILITY',
      comment: 'Multimeter step-by-step guidance accurately identified my reversed LED!',
      was_fault_resolved: true
    };

    const res = await request(app)
      .post('/api/v1/feedback')
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('feedback_id');
    expect(res.body).toHaveProperty('status', 'received');
    expect(res.body).toHaveProperty('created_at');
  });

  it('rejects invalid rating outside 1-5 range with 422 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/feedback')
      .send({ rating: 10 })
      .expect(422);

    expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(res.body.error.details.some((d) => d.field === 'rating')).toBe(true);
  });

  it('rejects missing rating with 422 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/feedback')
      .send({ comment: 'No rating provided' })
      .expect(422);

    expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  });
});
