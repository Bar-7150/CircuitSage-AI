/**
 * CircuitSage AI — Diagnosis Controller
 * Handles diagnostic case intake, listings, detail retrieval, messaging, and multimeter measurements.
 */

const caseRepository = require('../db/caseRepository');
const diagnosisService = require('../services/diagnosisService');
const { EPISTEMIC_STATUS } = require('@circuitsage/shared');

/**
 * POST /api/v1/diagnoses
 * Creates a new diagnostic case with optional circuit photo and generates initial hypotheses.
 */
async function createDiagnosis(req, res, next) {
  try {
    const { target_board, symptom_description, title, connected_components, pin_connections } = req.body;

    // Derive user ID strictly from authenticated identity (never trust request body user_id)
    const userId = req.user ? req.user.id : null;

    // Handle uploaded circuit image if present
    let imagePath = null;
    if (req.file) {
      // Safe, randomized filename; never accept user-provided path
      imagePath = `/uploads/circuit-${Date.now()}-${Math.round(Math.random() * 1e6)}.${req.file.mimetype.split('/')[1]}`;
    }

    // 1. Run deterministic rules & synthesize hypotheses
    const diagnosticAnalysis = diagnosisService.synthesizeDiagnosis({
      target_board,
      symptom_description,
      connected_components,
      pin_connections
    });

    // 2. Persist diagnostic case
    const createdCase = await caseRepository.createCase({
      userId,
      target_board,
      symptom_description,
      title,
      image_path: imagePath,
      userClient: req.userClient
    });

    // 3. Persist initial hypotheses
    const savedHypotheses = await caseRepository.saveHypotheses({
      caseId: createdCase.id,
      hypotheses: diagnosticAnalysis.hypotheses,
      userClient: req.userClient
    });

    // 4. Record initial message
    await caseRepository.addMessage({
      caseId: createdCase.id,
      sender: 'USER',
      messageText: symptom_description,
      userClient: req.userClient
    });

    return res.status(201).json({
      case: createdCase,
      epistemic_summary: diagnosticAnalysis.epistemic_summary,
      deterministic_checks: diagnosticAnalysis.deterministic_checks,
      hypotheses: savedHypotheses
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/diagnoses
 * Retrieves past diagnostic cases belonging to the authenticated user.
 */
async function listDiagnoses(req, res, next) {
  try {
    const userId = req.user.id;
    const { limit, offset, status } = req.query;

    const { total, cases } = await caseRepository.listCasesByUser({
      userId,
      limit,
      offset,
      status,
      userClient: req.userClient
    });

    return res.status(200).json({
      total,
      cases
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/diagnoses/:id
 * Retrieves full diagnostic state, hypotheses, messages, and measurements.
 */
async function getDiagnosisById(req, res, next) {
  try {
    const caseId = req.params.id;
    const caseItem = req.caseItem; // Verified by checkCaseOwnership middleware

    const [messages, hypotheses, measurements] = await Promise.all([
      caseRepository.listMessagesByCase({ caseId, userClient: req.userClient }),
      caseRepository.listHypothesesByCase({ caseId, userClient: req.userClient }),
      caseRepository.listMeasurementsByCase({ caseId, userClient: req.userClient })
    ]);

    // Compute epistemic counts
    let verifiedFactsCount = 0;
    let aiInferencesCount = 0;
    let unknownAssumptionsCount = 0;

    for (const h of hypotheses) {
      if (h.epistemic_status === EPISTEMIC_STATUS.VERIFIED_FACT) verifiedFactsCount++;
      else if (h.epistemic_status === EPISTEMIC_STATUS.AI_INFERENCE) aiInferencesCount++;
      else unknownAssumptionsCount++;
    }

    return res.status(200).json({
      case: caseItem,
      epistemic_summary: {
        verified_facts_count: verifiedFactsCount,
        ai_inferences_count: aiInferencesCount,
        unknown_assumptions_count: unknownAssumptionsCount
      },
      hypotheses,
      messages,
      measurements
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/diagnoses/:id/messages
 * Appends a follow-up observation or message to an active case.
 */
async function createMessage(req, res, next) {
  try {
    const caseId = req.params.id;
    const { message_text } = req.body;

    const createdMessage = await caseRepository.addMessage({
      caseId,
      sender: 'USER',
      messageText: message_text,
      userClient: req.userClient
    });

    return res.status(201).json({
      message_id: createdMessage.id,
      case_id: caseId,
      sender: createdMessage.sender,
      message_text: createdMessage.message_text,
      created_at: createdMessage.created_at
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/diagnoses/:id/measurements
 * Submits a physical multimeter measurement, re-evaluating deterministic rules and hypotheses.
 */
async function submitMeasurement(req, res, next) {
  try {
    const caseId = req.params.id;
    const caseItem = req.caseItem;

    // 1. Fetch active hypotheses
    const currentHypotheses = await caseRepository.listHypothesesByCase({
      caseId,
      userClient: req.userClient
    });

    // 2. Evaluate measurement against hypotheses
    const evaluation = diagnosisService.evaluateMeasurement({
      measurement: req.body,
      currentHypotheses,
      target_board: caseItem.target_board
    });

    // 3. Record measurement
    const createdMeasurement = await caseRepository.addMeasurement({
      caseId,
      measurementData: req.body,
      userClient: req.userClient
    });

    // 4. Update hypotheses in repository if any changed
    if (evaluation.updated_hypotheses) {
      await caseRepository.saveHypotheses({
        caseId,
        hypotheses: evaluation.updated_hypotheses,
        userClient: req.userClient
      });
    }

    return res.status(200).json({
      measurement: createdMeasurement,
      deterministic_evaluation: evaluation.deterministic_evaluation,
      eliminated_hypotheses: evaluation.eliminated_hypotheses,
      updated_hypotheses: evaluation.updated_hypotheses
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createDiagnosis,
  listDiagnoses,
  getDiagnosisById,
  createMessage,
  submitMeasurement
};
