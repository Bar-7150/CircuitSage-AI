/**
 * CircuitSage AI — Feedback Controller
 */

const feedbackService = require('../services/feedbackService');

async function submitFeedback(req, res, next) {
  try {
    const { rating, feedback_type, comment, case_id, was_fault_resolved } = req.body;
    const userId = req.user ? req.user.id : null;

    const feedback = await feedbackService.submitFeedback({
      userId,
      caseId: case_id,
      rating,
      feedback_type,
      comment,
      was_fault_resolved,
      userClient: req.userClient
    });

    return res.status(201).json({
      feedback_id: feedback.id,
      status: 'received',
      created_at: feedback.created_at
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitFeedback
};
