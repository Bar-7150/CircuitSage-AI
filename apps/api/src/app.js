/**
 * CircuitSage AI — Express Application Setup
 */

const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const requestIdMiddleware = require('./middleware/requestId');
const loggingMiddleware = require('./middleware/logging');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const healthRoutes = require('./routes/health');
const diagnosesRoutes = require('./routes/diagnoses');
const knowledgeRoutes = require('./routes/knowledge');
const feedbackRoutes = require('./routes/feedback');
const agentRoutes = require('./routes/agent');

const app = express();

// Security and request tracking middlewares
app.use(requestIdMiddleware);
app.use(loggingMiddleware);

// CORS configuration for actual frontend origin
app.use(
  cors({
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
  })
);

// Body parsing with strict request size limits (1MB for JSON/form-urlencoded)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Mount API routes with prefix /api/v1
app.use(config.apiPrefix, healthRoutes);
app.use(config.apiPrefix, diagnosesRoutes);
app.use(config.apiPrefix, knowledgeRoutes);
app.use(config.apiPrefix, feedbackRoutes);
app.use(config.apiPrefix, agentRoutes);

// 404 Handler for unmatched routes
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
