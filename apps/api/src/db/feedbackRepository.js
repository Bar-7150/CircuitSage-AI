/**
 * CircuitSage AI — Feedback Repository
 * Records user validation feedback and satisfaction metrics for the evaluation loop.
 */

const crypto = require('crypto');
const { isConfigured } = require('../lib/supabaseClient');

const localFeedback = [];

class FeedbackRepository {
  async createFeedback({ userId = null, caseId = null, rating, feedback_type = 'USABILITY', comment = null, was_fault_resolved = null, userClient = null }) {
    const feedbackId = crypto.randomUUID();
    const now = new Date().toISOString();

    const record = {
      id: feedbackId,
      user_id: userId,
      case_id: caseId,
      rating: parseInt(rating, 10),
      feedback_type,
      comment,
      was_fault_resolved: was_fault_resolved !== null ? Boolean(was_fault_resolved) : null,
      created_at: now
    };

    if (isConfigured && userClient && userId) {
      const { data, error } = await userClient
        .from('feedback')
        .insert(record)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error saving feedback: ${error.message}`);
      }
      return data;
    }

    localFeedback.push(record);
    return record;
  }
}

module.exports = new FeedbackRepository();
