const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * Centralized Express error handler.
 * Matches API_STYLE_GUIDE format: { error, code }
 */
function errorHandler(err, req, res, _next) {
    // Log the error
    if (err instanceof AppError) {
        logger.warn({ err, path: req.path }, err.message);
    } else {
        logger.error({ err, path: req.path }, 'Unhandled error');
    }

    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = err.statusCode ? err.message : 'Internal server error';

    res.status(statusCode).json({ error: message, code });
}

module.exports = errorHandler;
