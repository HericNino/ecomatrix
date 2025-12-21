import api from './api';

const devicesService = {
  // Dohvati pojedinačni uređaj
  async getById(deviceId) {
    const response = await api.get(`/devices/${deviceId}`);
    return response.data;
  },

  // Ažuriraj uređaj
  async update(deviceId, deviceData) {
    const response = await api.put(`/devices/${deviceId}`, deviceData);
    return response.data;
  },

  // Obriši uređaj
  async delete(deviceId) {
    const response = await api.delete(`/devices/${deviceId}`);
    return response.data;
  },

  // Dohvati pametnu utičnicu za uređaj
  async getPlug(deviceId) {
    const response = await api.get(`/devices/${deviceId}/plug`);
    return response.data;
  },

  // Pridruži pametnu utičnicu uređaju
  async attachPlug(deviceId, plugData) {
    const response = await api.post(`/devices/${deviceId}/plug`, plugData);
    return response.data;
  },

  // Ažuriraj pametnu utičnicu
  async updatePlug(deviceId, plugData) {
    const response = await api.put(`/devices/${deviceId}/plug`, plugData);
    return response.data;
  },

  // Dohvati mjerenja za uređaj
  async getMeasurements(deviceId, startDate, endDate) {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await api.get(`/devices/${deviceId}/measurements`, { params });
    return response.data;
  },

  // Prikupi podatke sa uređaja
  async collect(deviceId) {
    const response = await api.post(`/devices/${deviceId}/collect`);
    return response.data;
  },

  // Dohvati dnevnu potrošnju
  async getDailyConsumption(deviceId, date) {
    const params = date ? { date } : {};
    const response = await api.get(`/devices/${deviceId}/daily-consumption`, { params });
    return response.data;
  },

  // Ručno dodaj mjerenje
  async addMeasurement(deviceId, measurementData) {
    const response = await api.post(`/devices/${deviceId}/measurements`, measurementData);
    return response.data;
  },
};

export default devicesService;
