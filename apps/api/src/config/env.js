/**
 * CircuitSage AI — Environment Configuration
 */

const path = require('path');
const dotenv = require('dotenv');

// Load .env file from apps/api if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 8000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },

  gemma: {
    runtimeUrl: process.env.GEMMA_RUNTIME_URL || 'http://127.0.0.1:11434',
    modelName: process.env.GEMMA_MODEL_NAME || 'gemma4:latest',
    timeoutMs: parseInt(process.env.INFERENCE_TIMEOUT_MS, 10) || 30000
  },

  storage: {
    localDataDir: process.env.LOCAL_DATA_DIR || './data'
  }
};

module.exports = config;
