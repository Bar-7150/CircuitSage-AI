/**
 * CircuitSage AI — Request Validation Middleware
 * Validates request body, query parameters, and path parameters, returning
 * standardized error envelopes upon failure.
 */

const { ERROR_CODES } = require('@circuitsage/shared');

/**
 * Creates a middleware that executes a validator function against req.
 * @param {Function} validatorFn - Function receiving req, returning { isValid: boolean, errors: Array<{field, issue}> }
 */
function validate(validatorFn) {
  return (req, res, next) => {
    try {
      const { isValid, errors } = validatorFn(req);

      if (!isValid && errors && errors.length > 0) {
        return res.status(422).json({
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'The request contains invalid input.',
            details: errors,
            requestId: req.id || 'unknown'
          }
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = validate;
