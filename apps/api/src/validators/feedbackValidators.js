/**
 * CircuitSage AI — Feedback Request Validators
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_FEEDBACK_TYPES = ['USABILITY', 'ACCURACY', 'SUGGESTION', 'BUG'];

function validateSubmitFeedback(req) {
  const errors = [];
  const { rating, feedback_type, comment, case_id, was_fault_resolved } = req.body;

  if (rating === undefined || rating === null || isNaN(Number(rating))) {
    errors.push({
      field: 'rating',
      issue: 'rating is required and must be an integer between 1 and 5.'
    });
  } else {
    const num = Number(rating);
    if (!Number.isInteger(num) || num < 1 || num > 5) {
      errors.push({
        field: 'rating',
        issue: 'rating must be an integer between 1 and 5.'
      });
    }
  }

  if (feedback_type && !VALID_FEEDBACK_TYPES.includes(feedback_type)) {
    errors.push({
      field: 'feedback_type',
      issue: `feedback_type must be one of: ${VALID_FEEDBACK_TYPES.join(', ')}`
    });
  }

  if (comment && typeof comment === 'string' && comment.length > 1000) {
    errors.push({
      field: 'comment',
      issue: 'comment cannot exceed 1000 characters.'
    });
  }

  if (case_id && typeof case_id === 'string' && !UUID_REGEX.test(case_id) && !case_id.startsWith('demo-') && !case_id.startsWith('case-')) {
    errors.push({
      field: 'case_id',
      issue: 'case_id must be a valid UUID format.'
    });
  }

  if (was_fault_resolved !== undefined && typeof was_fault_resolved !== 'boolean') {
    errors.push({
      field: 'was_fault_resolved',
      issue: 'was_fault_resolved must be a boolean.'
    });
  }

  return { isValid: errors.length === 0, errors };
}

module.exports = {
  validateSubmitFeedback
};
