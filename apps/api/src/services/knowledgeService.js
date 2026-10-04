/**
 * CircuitSage AI — Knowledge Service
 */

const knowledgeRepository = require('../db/knowledgeRepository');

class KnowledgeService {
  async searchComponents({ query, category, limit }) {
    return knowledgeRepository.search({ query, category, limit });
  }

  async getComponentById(id) {
    return knowledgeRepository.findById(id);
  }
}

module.exports = new KnowledgeService();
