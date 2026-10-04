/**
 * CircuitSage AI — Diagnostic Case Repository
 *
 * Encapsulates database access for diagnostic cases, messages, hypotheses, and measurements.
 * Automatically enforces Row Level Security (RLS) via userClient when Supabase is configured,
 * and maintains an isolated, parameterized fallback store for local development and unit tests.
 */

const crypto = require('crypto');
const { isConfigured } = require('../lib/supabaseClient');

// Local fallback store for offline development, guest sessions, and testing
const localCases = new Map();
const localMessages = new Map();
const localHypotheses = new Map();
const localMeasurements = new Map();

class CaseRepository {
  /**
   * Resets local in-memory store (used for test isolation)
   */
  _clearLocalStore() {
    localCases.clear();
    localMessages.clear();
    localHypotheses.clear();
    localMeasurements.clear();
  }

  /**
   * Creates a new diagnostic case
   */
  async createCase({ userId = null, target_board, symptom_description, title, image_path = null, userClient = null }) {
    const caseId = crypto.randomUUID();
    const now = new Date().toISOString();
    const caseTitle = title ? title.trim() : `${target_board} Circuit Diagnosis`;

    // 1. Live Supabase Postgres with RLS
    if (isConfigured && userClient && userId) {
      const { data, error } = await userClient
        .from('diagnostic_cases')
        .insert({
          id: caseId,
          user_id: userId,
          title: caseTitle,
          target_board,
          symptom_description,
          status: 'ACTIVE',
          image_path,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Database error creating diagnostic case: ${error.message}`);
      }
      return data;
    }

    // 2. Local Fallback / Test Mode Store
    const newCase = {
      id: caseId,
      user_id: userId, // May be null for guest session or string UUID for authenticated
      title: caseTitle,
      target_board,
      symptom_description,
      status: 'ACTIVE',
      image_path,
      created_at: now,
      updated_at: now
    };

    localCases.set(caseId, newCase);
    return newCase;
  }

  /**
   * Lists diagnostic cases belonging to the authenticated user
   */
  async listCasesByUser({ userId, limit = 10, offset = 0, status = null, userClient = null }) {
    if (isConfigured && userClient && userId) {
      let query = userClient
        .from('diagnostic_cases')
        .select('id, user_id, title, target_board, symptom_description, status, image_path, created_at, updated_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query;
      if (error) {
        throw new Error(`Database error listing diagnostic cases: ${error.message}`);
      }
      return { total: count || data.length, cases: data || [] };
    }

    // Local Fallback Store
    let userCases = Array.from(localCases.values()).filter((c) => c.user_id === userId);
    if (status) {
      userCases = userCases.filter((c) => c.status === status);
    }
    userCases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = userCases.length;
    const paginated = userCases.slice(offset, offset + limit);
    return { total, cases: paginated };
  }

  /**
   * Retrieves a case by ID and checks ownership
   */
  async findCaseById({ id, userClient = null }) {
    if (isConfigured && userClient) {
      const { data, error } = await userClient
        .from('diagnostic_cases')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return data;
    }

    return localCases.get(id) || null;
  }

  /**
   * Verifies if caller owns the case or has guest access
   */
  async checkOwnership({ id, userId = null, userClient = null }) {
    const caseItem = await this.findCaseById({ id, userClient });
    if (!caseItem) {
      return { exists: false, isOwner: false, caseItem: null };
    }

    // If case has no user_id (created as unauthenticated guest), anyone with the caseId can access
    if (!caseItem.user_id) {
      return { exists: true, isOwner: true, caseItem };
    }

    // If case has a user_id, caller MUST match that user_id
    const isOwner = Boolean(userId && caseItem.user_id === userId);
    return { exists: true, isOwner, caseItem };
  }

  /**
   * Appends a message to a case
   */
  async addMessage({ caseId, sender = 'USER', messageText, userClient = null }) {
    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();

    if (isConfigured && userClient) {
      const { data, error } = await userClient
        .from('case_messages')
        .insert({
          id: messageId,
          case_id: caseId,
          sender,
          message_text: messageText,
          created_at: now
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Database error appending message: ${error.message}`);
      }
      return data;
    }

    const msg = {
      id: messageId,
      case_id: caseId,
      sender,
      message_text: messageText,
      created_at: now
    };

    if (!localMessages.has(caseId)) {
      localMessages.set(caseId, []);
    }
    localMessages.get(caseId).push(msg);
    return msg;
  }

  /**
   * Lists messages for a case
   */
  async listMessagesByCase({ caseId, userClient = null }) {
    if (isConfigured && userClient) {
      const { data, error } = await userClient
        .from('case_messages')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Database error listing messages: ${error.message}`);
      }
      return data || [];
    }

    return localMessages.get(caseId) || [];
  }

  /**
   * Persists hypotheses for a case
   */
  async saveHypotheses({ caseId, hypotheses = [], userClient = null }) {
    const saved = [];
    const now = new Date().toISOString();

    for (const hyp of hypotheses) {
      const hypId = hyp.id && !hyp.id.startsWith('hyp_') ? hyp.id : crypto.randomUUID();
      const record = {
        id: hypId,
        case_id: caseId,
        title: hyp.title,
        category: hyp.category,
        epistemic_status: hyp.epistemic_status,
        confidence_score: hyp.confidence_score,
        explanation: hyp.explanation,
        eliminated: hyp.eliminated || false,
        elimination_reason: hyp.elimination_reason || null,
        suggested_test: hyp.suggested_test || null,
        created_at: now
      };

      if (isConfigured && userClient) {
        await userClient
          .from('diagnostic_hypotheses')
          .insert({
            id: record.id,
            case_id: record.case_id,
            title: record.title,
            category: record.category,
            epistemic_status: record.epistemic_status,
            confidence_score: record.confidence_score,
            explanation: record.explanation,
            eliminated: record.eliminated,
            elimination_reason: record.elimination_reason,
            created_at: record.created_at
          });
      }

      saved.push(record);
    }

    if (!localHypotheses.has(caseId)) {
      localHypotheses.set(caseId, []);
    }
    localHypotheses.set(caseId, saved);
    return saved;
  }

  /**
   * Lists hypotheses for a case
   */
  async listHypothesesByCase({ caseId, userClient = null }) {
    if (isConfigured && userClient) {
      const { data, error } = await userClient
        .from('diagnostic_hypotheses')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Database error listing hypotheses: ${error.message}`);
      }
      return data || [];
    }

    return localHypotheses.get(caseId) || [];
  }

  /**
   * Records a physical multimeter measurement
   */
  async addMeasurement({ caseId, measurementData, userClient = null }) {
    const measurementId = crypto.randomUUID();
    const now = new Date().toISOString();

    const record = {
      id: measurementId,
      case_id: caseId,
      measurement_type: measurementData.measurement_type,
      numeric_value: parseFloat(measurementData.numeric_value),
      unit: measurementData.unit,
      probe_positive: measurementData.probe_positive,
      probe_negative: measurementData.probe_negative,
      notes: measurementData.notes || null,
      created_at: now
    };

    if (isConfigured && userClient) {
      const { data, error } = await userClient
        .from('case_measurements')
        .insert({
          id: record.id,
          case_id: record.case_id,
          measurement_type: record.measurement_type,
          numeric_value: record.numeric_value,
          unit: record.unit,
          probe_positive: record.probe_positive,
          probe_negative: record.probe_negative,
          notes: record.notes,
          created_at: record.created_at
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Database error inserting measurement: ${error.message}`);
      }
      return data;
    }

    if (!localMeasurements.has(caseId)) {
      localMeasurements.set(caseId, []);
    }
    localMeasurements.get(caseId).push(record);
    return record;
  }

  /**
   * Lists measurements for a case
   */
  async listMeasurementsByCase({ caseId, userClient = null }) {
    if (isConfigured && userClient) {
      const { data, error } = await userClient
        .from('case_measurements')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Database error listing measurements: ${error.message}`);
      }
      return data || [];
    }

    return localMeasurements.get(caseId) || [];
  }
}

module.exports = new CaseRepository();
