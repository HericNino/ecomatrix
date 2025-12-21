import api from './api';

const costsService = {
  // Dohvati cijenu struje
  async getElectricityPrice(householdId) {
    const response = await api.get(`/households/${householdId}/electricity-price`);
    return response.data;
  },

  // Postavi cijenu struje
  async setElectricityPrice(householdId, cijenaKwh, valuta = 'EUR') {
    const response = await api.put(`/households/${householdId}/electricity-price`, {
      cijena_kwh: cijenaKwh,
      valuta,
    });
    return response.data;
  },

  // Dohvati troškove
  async getCosts(householdId, datumOd = null, datumDo = null) {
    const params = {};
    if (datumOd) params.datum_od = datumOd;
    if (datumDo) params.datum_do = datumDo;

    const response = await api.get(`/households/${householdId}/costs`, { params });
    return response.data;
  },

  // Dohvati dnevne troškove
  async getDailyCosts(householdId, danaUnazad = 30) {
    const response = await api.get(`/households/${householdId}/costs/daily`, {
      params: { dana_unazad: danaUnazad },
    });
    return response.data;
  },
};

export default costsService;
