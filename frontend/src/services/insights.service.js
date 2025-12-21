import api from './api';

const insightsService = {
  // Dohvati obrasce potrošnje
  async getPatterns(householdId, danaUnazad = 30) {
    const params = { dana_unazad: danaUnazad };
    const response = await api.get(`/households/${householdId}/patterns`, { params });
    return response.data;
  },

  // Dohvati preporuke
  async getRecommendations(householdId) {
    const response = await api.get(`/households/${householdId}/recommendations`);
    return response.data;
  },

  // Dohvati usporedbu s prošlim razdobljem
  async getComparison(householdId, danaUnazad = 30) {
    const params = { dana_unazad: danaUnazad };
    const response = await api.get(`/households/${householdId}/comparison`, { params });
    return response.data;
  },
};

export default insightsService;
