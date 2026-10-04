/**
 * CircuitSage AI — Health Check Route (/api/v1/health)
 */

const express = require('express');
const config = require('../config/env');

const router = express.Router();

router.get('/health', (req, res) => {
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
        status: config.supabase.url ? 'configured' : 'offline_fallback',
        provider: 'supabase_postgres'
      }
    },
    offline_mode_ready: true,
    requestId: req.id
  });
});

module.exports = router;
