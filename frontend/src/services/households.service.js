import api from './api';

const householdsService = {
  // Dohvati sva kućanstva
  async getAll() {
    const response = await api.get('/households');
    return response.data;
  },

  // Dohvati pojedinačno kućanstvo
  async getById(id) {
    const response = await api.get(`/households/${id}`);
    return response.data;
  },

  // Kreiraj novo kućanstvo
  async create(householdData) {
    const response = await api.post('/households', householdData);
    return response.data;
  },

  // Ažuriraj kućanstvo
  async update(id, householdData) {
    const response = await api.put(`/households/${id}`, householdData);
    return response.data;
  },

  // Obriši kućanstvo
  async delete(id) {
    const response = await api.delete(`/households/${id}`);
    return response.data;
  },

  // Dohvati prostorije za kućanstvo
  async getRooms(householdId) {
    const response = await api.get(`/households/${householdId}/rooms`);
    return response.data;
  },

  // Kreiraj novu prostoriju
  async createRoom(householdId, roomData) {
    const response = await api.post(`/households/${householdId}/rooms`, roomData);
    return response.data;
  },

  // Ažuriraj prostoriju
  async updateRoom(householdId, roomId, roomData) {
    const response = await api.put(`/households/${householdId}/rooms/${roomId}`, roomData);
    return response.data;
  },

  // Obriši prostoriju
  async deleteRoom(householdId, roomId) {
    const response = await api.delete(`/households/${householdId}/rooms/${roomId}`);
    return response.data;
  },

  // Dohvati uređaje za kućanstvo
  async getDevices(householdId) {
    const response = await api.get(`/households/${householdId}/devices`);
    return response.data;
  },

  // Kreiraj novi uređaj
  async createDevice(householdId, deviceData) {
    const response = await api.post(`/households/${householdId}/devices`, deviceData);
    return response.data;
  },

  // Dohvati statistiku za kućanstvo
  async getStats(householdId, startDate, endDate) {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await api.get(`/households/${householdId}/stats`, { params });
    return response.data;
  },

  // Dohvati mjerenja za kućanstvo
  async getMeasurements(householdId, startDate, endDate) {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await api.get(`/households/${householdId}/measurements`, { params });
    return response.data;
  },

  // Prikupi podatke sa svih uređaja
  async collectAll(householdId) {
    const response = await api.post(`/households/${householdId}/collect-all`);
    return response.data;
  },
};

export default householdsService;