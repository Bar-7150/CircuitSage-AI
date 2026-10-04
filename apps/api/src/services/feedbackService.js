/**
 * CircuitSage AI — Feedback Service
 */

const feedbackRepository = require('../db/feedbackRepository');

class FeedbackService {
  async submitFeedback({ userId, caseId, rating, feedback_type, comment, was_fault_resolved, userClient }) {
    return feedbackRepository.createFeedback({
      userId,
      caseId,
      rating,
      feedback_type,
      comment,
      was_fault_resolved,
      userClient
    });
  }
}

module.exports = new FeedbackService();
