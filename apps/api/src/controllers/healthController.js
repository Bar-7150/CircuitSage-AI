/**
 * CircuitSage AI — Health Controller
 */

const config = require('../config/env');
const { isConfigured } = require('../lib/supabaseClient');

function getHealth(req, res) {
  res.status(200).json({
    status: 'healthy',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    services: {
      express: 'up',
      local_ai_inference: {
        status: 'configured',
        runtime_url: config.gemma.runtimeUrl,
        model_name: config.gemma.modelName
      },
      database: {
        status: isConfigured ? 'connected' : 'offline_fallback',
        provider: 'supabase_postgres'
      }
    },
    offline_mode_ready: true,
    requestId: req.id || 'unknown'
  });
}

module.exports = {
  getHealth
};
