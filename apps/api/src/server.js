/**
 * CircuitSage AI — API Server Entrypoint
 */

const app = require('./app');
const config = require('./config/env');

const server = app.listen(config.port, '127.0.0.1', () => {
  console.log(`[CircuitSage AI API] Running on http://127.0.0.1:${config.port}${config.apiPrefix}`);
  console.log(`[CircuitSage AI API] Environment: ${config.nodeEnv}`);
});

// Handle graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n[CircuitSage AI API] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[CircuitSage AI API] HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = server;
