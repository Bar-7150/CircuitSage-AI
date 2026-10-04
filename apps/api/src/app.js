/**
 * CircuitSage AI — Express Application Setup
 */

const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const requestIdMiddleware = require('./middleware/requestId');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const healthRoutes = require('./routes/health');

const app = express();

// Security and basic middlewares
app.use(requestIdMiddleware);
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
}));
app.use(express.json({ limit: '1mb' }));

// Mount API routes
app.use(config.apiPrefix, healthRoutes);

// 404 Handler for unmatched routes
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
