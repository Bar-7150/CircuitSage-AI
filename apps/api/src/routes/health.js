/**
 * CircuitSage AI — Health Check Route (/api/v1/health)
 */

const express = require('express');
const healthController = require('../controllers/healthController');

const router = express.Router();

router.get('/health', healthController.getHealth);

module.exports = router;
