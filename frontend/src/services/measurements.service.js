import api from './api';

const measurementsService = {
  // Dohvati mjerenja za kućanstvo
  async getHouseholdMeasurements(householdId, startDate, endDate) {
    const params = {};
    if (startDate) params.datum_od = startDate;
    if (endDate) params.datum_do = endDate;

    const response = await api.get(`/households/${householdId}/measurements`, { params });
    return response.data;
  },

  // Dohvati statistiku za kućanstvo
  async getHouseholdStats(householdId, startDate, endDate) {
    const params = {
      datum_od: startDate,
      datum_do: endDate,
    };

    const response = await api.get(`/households/${householdId}/stats`, { params });
    return response.data;
  },

  // Prikupi podatke sa svih uređaja u kućanstvu
  async collectAllDevices(householdId) {
    const response = await api.post(`/households/${householdId}/collect-all`);
    return response.data;
  },

  // Dohvati mjerenja za uređaj
  async getDeviceMeasurements(deviceId, startDate, endDate, limit = 100) {
    const params = { limit };
    if (startDate) params.datum_od = startDate;
    if (endDate) params.datum_do = endDate;

    const response = await api.get(`/devices/${deviceId}/measurements`, { params });
    return response.data;
  },

  // Dohvati dnevnu potrošnju za uređaj
  async getDailyConsumption(deviceId, date) {
    const params = date ? { datum: date } : {};
    const response = await api.get(`/devices/${deviceId}/daily-consumption`, { params });
    return response.data;
  },

  // Prikupi podatke sa uređaja
  async collectDeviceData(deviceId) {
    const response = await api.post(`/devices/${deviceId}/collect`);
    return response.data;
  },

  // Ručno dodaj mjerenje
  async addManualMeasurement(deviceId, measurementData) {
    const response = await api.post(`/devices/${deviceId}/measurements`, measurementData);
    return response.data;
  },
};

export default measurementsService;
