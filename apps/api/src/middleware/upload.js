/**
 * CircuitSage AI — Circuit Image Upload Middleware
 * Enforces file size (10 MB max) and format limits (JPEG, PNG, WebP only).
 * Uses memory storage to prevent writing untrusted files to arbitrary filesystem paths.
 */

const multer = require('multer');
const { ERROR_CODES } = require('@circuitsage/shared');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const err = new Error(`Unsupported image format (${file.mimetype}). Permitted formats: image/jpeg, image/png, image/webp.`);
      err.code = 'INVALID_FILE_TYPE';
      return cb(err, false);
    }
    cb(null, true);
  }
});

/**
 * Wraps multer single file upload to return standardized 422 error on validation failure
 */
function handleCircuitImageUpload(fieldName = 'image') {
  const uploadSingle = upload.single(fieldName);

  return (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(422).json({
            error: {
              code: ERROR_CODES.VALIDATION_ERROR,
              message: 'The request contains invalid input.',
              details: [
                {
                  field: fieldName,
                  issue: `Image size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)} MB.`
                }
              ],
              requestId: req.id || 'unknown'
            }
          });
        }

        if (err.code === 'INVALID_FILE_TYPE' || err.message) {
          return res.status(422).json({
            error: {
              code: ERROR_CODES.VALIDATION_ERROR,
              message: 'The request contains invalid input.',
              details: [
                {
                  field: fieldName,
                  issue: err.message
                }
              ],
              requestId: req.id || 'unknown'
            }
          });
        }

        return next(err);
      }
      next();
    });
  };
}

module.exports = {
  handleCircuitImageUpload
};
