import api from './api';

const goalsService = {
  // Kreiraj novi cilj
  async create(householdId, goalData) {
    const response = await api.post(`/households/${householdId}/goals`, goalData);
    return response.data;
  },

  // Dohvati sve ciljeve
  async getAll(householdId, onlyActive = false) {
    const params = {};
    if (onlyActive) params.active = 'true';

    const response = await api.get(`/households/${householdId}/goals`, { params });
    return response.data;
  },

  // Dohvati pojedinačni cilj
  async getById(householdId, goalId) {
    const response = await api.get(`/households/${householdId}/goals/${goalId}`);
    return response.data;
  },

  // Ažuriraj cilj
  async update(householdId, goalId, goalData) {
    const response = await api.put(`/households/${householdId}/goals/${goalId}`, goalData);
    return response.data;
  },

  // Obriši cilj
  async delete(householdId, goalId) {
    const response = await api.delete(`/households/${householdId}/goals/${goalId}`);
    return response.data;
  },
};

export default goalsService;
